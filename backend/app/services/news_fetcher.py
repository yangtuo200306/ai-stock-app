from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

import akshare as ak
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# 缓存配置
NEWS_CACHE_TTL_SECONDS = 1800  # 30 分钟
_news_cache: dict[str, tuple[list[dict[str, Any]], datetime]] = {}

# 搜狗新闻搜索（备源）
SOGOU_NEWS_URL = "https://news.sogou.com/news"
SOGOU_NEWS_PARAMS = {
    "sort": "1",  # 按时间排序
}
SOGOU_NEWS_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
}


def _extract_short_name(stock_name: str) -> str:
    """提取股票简称，如 '贵州茅台' → '茅台'。"""
    for prefix in ["贵州", "内蒙古", "新疆", "西藏", "宁夏", "广西", "黑龙江", "股份", "集团"]:
        stock_name = stock_name.replace(prefix, "")
    return stock_name


def _is_relevant(title: str, stock_code: str, stock_name: str) -> bool:
    """检查新闻标题是否与目标股票相关。"""
    short_name = _extract_short_name(stock_name)
    keywords = [stock_code, stock_name, short_name]
    return any(kw in title for kw in keywords)


def _parse_sogou_news(html: str, stock_code: str, stock_name: str) -> list[dict[str, Any]]:
    """解析搜狗新闻搜索结果的 HTML。"""
    soup = BeautifulSoup(html, "html.parser")
    items: list[dict[str, Any]] = []

    for item in soup.select(".vrwrap"):
        title_el = item.select_one("h3 a")
        if not title_el:
            continue
        title = title_el.get_text(strip=True)
        url = title_el.get("href", "")
        if not url.startswith("http"):
            url = f"https://news.sogou.com{url}"
        if not _is_relevant(title, stock_code, stock_name):
            continue

        # 提取来源和时间
        source = "搜狗新闻"
        published_at = ""
        info_el = item.select_one(".news-from")
        if info_el:
            spans = info_el.select("span")
            if len(spans) >= 1:
                source = spans[0].get_text(strip=True)
            if len(spans) >= 2:
                published_at = spans[1].get_text(strip=True)

        items.append({
            "title": title,
            "url": url,
            "source": source,
            "published_at": published_at,
        })

    return items


def _fetch_from_akshare(stock_code: str) -> list[dict[str, Any]]:
    """从东方财富（akshare）获取个股新闻。"""
    try:
        df = ak.stock_news_em(symbol=stock_code)
        items: list[dict[str, Any]] = []
        for _, row in df.iterrows():
            items.append({
                "title": row.get("新闻标题", ""),
                "url": row.get("新闻链接", ""),
                "source": row.get("文章来源", "东方财富"),
                "published_at": row.get("发布时间", ""),
            })
        logger.info(
            "akshare 新闻获取成功: stock=%s, count=%d", stock_code, len(items)
        )
        return items
    except Exception as error:
        logger.warning("akshare 新闻获取失败: stock=%s, error=%s", stock_code, error)
        return []


def _fetch_from_sogou(stock_code: str, stock_name: str) -> list[dict[str, Any]]:
    """从搜狗新闻搜索新闻（备源）。"""
    params = {**SOGOU_NEWS_PARAMS, "query": f"{stock_code} {stock_name}"}
    try:
        resp = requests.get(
            SOGOU_NEWS_URL, params=params, headers=SOGOU_NEWS_HEADERS, timeout=10,
        )
        resp.encoding = "utf-8"
        items = _parse_sogou_news(resp.text, stock_code, stock_name)
        logger.info("搜狗新闻获取成功: stock=%s, count=%d", stock_code, len(items))
        return items
    except Exception as error:
        logger.warning("搜狗新闻获取失败: stock=%s, error=%s", stock_code, error)
        return []


def fetch_news(stock_code: str, stock_name: str) -> list[dict[str, Any]]:
    """获取指定股票的相关新闻。

    优先从缓存读取，缓存未命中则从 akshare（东方财富）获取。
    失败时降级到搜狗新闻，再失败则返回空列表，不影响主流程。
    """
    cache_key = f"{stock_code}"
    cached = _news_cache.get(cache_key)
    now = datetime.now()

    if cached:
        cached_items, cached_at = cached
        if now - cached_at <= timedelta(seconds=NEWS_CACHE_TTL_SECONDS):
            logger.debug("新闻缓存命中: %s", stock_code)
            return cached_items

    # 主源：akshare（东方财富）
    items = _fetch_from_akshare(stock_code)

    # 备源：搜狗新闻
    if not items:
        items = _fetch_from_sogou(stock_code, stock_name)

    # 取最近 3 条
    items = items[:3]

    # 写入缓存
    _news_cache[cache_key] = (items, now)
    logger.info("新闻获取完成: stock=%s, total=%d", stock_code, len(items))
    return items

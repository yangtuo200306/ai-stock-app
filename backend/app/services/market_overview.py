from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

import akshare as ak

logger = logging.getLogger(__name__)

# 缓存配置
INDICES_CACHE_TTL_SECONDS = 120  # 大盘 2 分钟
SECTOR_CACHE_TTL_SECONDS = 300   # 板块 5 分钟

_indices_cache: dict[str, tuple[list[dict[str, Any]], datetime]] = {}
_sector_cache: dict[str, tuple[dict[str, Any], datetime]] = {}

# 主要指数代码映射
MAIN_INDICES = {
    "sh000001": "上证指数",
    "sz399001": "深证成指",
    "sz399006": "创业板指",
    "sh000688": "科创50",
    "sh000300": "沪深300",
}


def _build_indices_summary(indices: list[dict[str, Any]]) -> str:
    """生成大盘摘要文本，方便 LLM 直接引用。"""
    if not indices:
        return "大盘数据暂时不可用"
    parts = [f"{i['name']} {i['price']}（{i['change_pct']}）" for i in indices]
    return "，".join(parts)


def _build_sector_summary(
    top: list[dict[str, Any]], bottom: list[dict[str, Any]],
) -> str:
    """生成板块排行摘要文本。"""
    lines = []
    if top:
        top_str = "、".join(f"{s['name']}（{s['change_pct']}）" for s in top)
        lines.append(f"涨幅前列：{top_str}")
    if bottom:
        bottom_str = "、".join(f"{s['name']}（{s['change_pct']}）" for s in bottom)
        lines.append(f"跌幅前列：{bottom_str}")
    return "；".join(lines) if lines else "板块排行数据暂时不可用"


def get_market_indices() -> dict[str, Any]:
    """获取 A 股主要指数实时行情。

    返回格式：
    {
        "indices": [
            {"name": "上证指数", "code": "000001", "price": 2967.25,
             "change_pct": 0.50, "change_amount": 15.20}
        ],
        "summary": "上证指数 2967.25（+0.50%），深证成指..."
    }
    """
    cache_key = "main_indices"
    cached = _indices_cache.get(cache_key)
    now = datetime.now()

    if cached:
        cached_data, cached_at = cached
        if now - cached_at <= timedelta(seconds=INDICES_CACHE_TTL_SECONDS):
            logger.debug("大盘数据缓存命中")
            return cached_data

    try:
        df = ak.stock_zh_index_spot_sina()
        indices: list[dict[str, Any]] = []
        for _, row in df.iterrows():
            code = str(row.get("代码", ""))
            if code in MAIN_INDICES:
                indices.append({
                    "name": MAIN_INDICES[code],
                    "code": code.replace("sh", "").replace("sz", ""),
                    "price": round(float(row.get("最新价", 0)), 2),
                    "change_pct": round(float(row.get("涨跌幅", 0)), 2),
                    "change_amount": round(float(row.get("涨跌额", 0)), 2),
                })

        result = {
            "indices": indices,
            "summary": _build_indices_summary(indices),
        }
        _indices_cache[cache_key] = (result, now)
        logger.info("大盘数据获取成功: count=%d", len(indices))
        return result
    except Exception as e:
        logger.warning("大盘数据获取失败: %s", e)
        return {"indices": [], "summary": "大盘数据暂时不可用"}


def get_sector_rankings(top_n: int = 5) -> dict[str, Any]:
    """获取行业板块涨跌排行。

    参数：
        top_n: 返回涨幅榜和跌幅榜的前 N 个板块，默认 5

    返回格式：
    {
        "top": [{"name": "半导体", "code": "BK...", "change_pct": 3.25}],
        "bottom": [{"name": "房地产", "code": "BK...", "change_pct": -2.10}],
        "summary": "涨幅前列：半导体（+3.25%）...；跌幅前列：..."
    }
    """
    cache_key = f"sector_rankings_{top_n}"
    cached = _sector_cache.get(cache_key)
    now = datetime.now()

    if cached:
        cached_data, cached_at = cached
        if now - cached_at <= timedelta(seconds=SECTOR_CACHE_TTL_SECONDS):
            logger.debug("板块排行数据缓存命中")
            return cached_data

    try:
        df = ak.stock_board_industry_name_em()
        change_col = "涨跌幅"
        name_col = "板块名称"
        code_col = "板块代码"

        df_sorted = df.sort_values(by=change_col, ascending=False)

        top: list[dict[str, Any]] = []
        for _, row in df_sorted.head(top_n).iterrows():
            top.append({
                "name": str(row.get(name_col, "")),
                "code": str(row.get(code_col, "")),
                "change_pct": round(float(row.get(change_col, 0)), 2),
            })

        bottom: list[dict[str, Any]] = []
        for _, row in df_sorted.tail(top_n).iterrows():
            bottom.append({
                "name": str(row.get(name_col, "")),
                "code": str(row.get(code_col, "")),
                "change_pct": round(float(row.get(change_col, 0)), 2),
            })
        # tail 是升序的，反转成降序（跌幅最大的在前）
        bottom.reverse()

        result = {
            "top": top,
            "bottom": bottom,
            "summary": _build_sector_summary(top, bottom),
        }
        _sector_cache[cache_key] = (result, now)
        logger.info("板块排行获取成功: top=%d, bottom=%d", len(top), len(bottom))
        return result
    except Exception as e:
        logger.warning("板块排行获取失败: %s", e)
        return {"top": [], "bottom": [], "summary": "板块排行数据暂时不可用"}

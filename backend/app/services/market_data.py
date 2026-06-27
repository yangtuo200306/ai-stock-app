import logging
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta

import efinance as ef
import requests

from app.config.settings import settings

logger = logging.getLogger(__name__)

QUOTE_CACHE_TTL_SECONDS = settings.QUOTE_CACHE_TTL_SECONDS
PRIMARY_MARKET_SOURCE = settings.PRIMARY_MARKET_SOURCE
FALLBACK_MARKET_SOURCE = settings.FALLBACK_MARKET_SOURCE
_quote_cache: dict[str, tuple["StockQuote", datetime]] = {}

SINA_QUOTE_URL = "https://hq.sinajs.cn/list={symbol}"
SINA_HISTORY_URL = (
    "https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/"
    "CN_MarketData.getKLineData?symbol={symbol}&scale=240&ma=no&datalen={datalen}"
)
SINA_HEADERS = {
    "Referer": "https://finance.sina.com.cn",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
}


class MarketDataError(Exception):
    pass


class InvalidStockCodeError(MarketDataError):
    pass


class MarketSourceNetworkError(MarketDataError):
    pass


class MarketSourceEmptyError(MarketDataError):
    pass


class StockQuoteNotFoundError(MarketDataError):
    pass


class MarketFieldEmptyError(MarketDataError):
    pass


class MarketFieldFormatError(MarketDataError):
    pass


@dataclass
class StockQuote:
    code: str
    name: str
    price: float
    change_pct: float
    turnover_rate: float | None = None
    amplitude: float | None = None
    source: str = ""
    fetched_at: str = ""

    def to_dict(self):
        return asdict(self)


@dataclass
class StockDailyPrice:
    date: str
    open: float
    close: float
    high: float
    low: float
    volume: float


def normalize_a_share_code(code: str) -> str:
    normalized = code.strip().upper()

    if not normalized:
        raise InvalidStockCodeError("请输入股票代码")

    if normalized.startswith(("SH", "SZ")):
        normalized = normalized[2:]
    elif normalized.endswith((".SH", ".SS", ".SZ")):
        normalized = normalized[:6]

    if not normalized.isdigit() or len(normalized) != 6:
        raise InvalidStockCodeError("目前仅支持 6 位 A 股代码")

    return normalized


def _to_float(value) -> float:
    if value is None:
        raise MarketFieldEmptyError("行情字段为空")

    text = str(value).replace("%", "").replace(",", "").strip()
    if text in {"", "-", "--", "None", "nan"}:
        raise MarketFieldEmptyError("行情字段为空")

    try:
        return float(text)
    except ValueError as error:
        raise MarketFieldFormatError("行情字段格式异常") from error


def _safe_float(value) -> float | None:
    """安全的浮点数转换，失败时返回 None 而非抛异常。"""
    if value is None:
        return None
    try:
        text = str(value).replace("%", "").replace(",", "").strip()
        if text in {"", "-", "--", "None", "nan"}:
            return None
        return float(text)
    except (ValueError, TypeError):
        return None


def _to_sina_symbol(stock_code: str) -> str:
    if stock_code.startswith("6"):
        return f"sh{stock_code}"
    if stock_code.startswith(("0", "3")):
        return f"sz{stock_code}"
    raise InvalidStockCodeError(
        f"备用行情源 {FALLBACK_MARKET_SOURCE} 暂不支持该股票代码前缀"
    )


def _clean_stock_name(name: str) -> str:
    """去除股票名称中的特殊前缀（XD除息、XR除权、DR除权除息、ST等）"""
    prefixes = ("XD", "XR", "DR", "ST", "*ST", "N", "C", "U")
    for prefix in prefixes:
        if name.startswith(prefix) and len(name) > len(prefix):
            return name[len(prefix):]
    return name


def _get_stock_quote_from_efinance(
    stock_code: str, fetched_at: datetime
) -> StockQuote:
    try:
        quotes = ef.stock.get_realtime_quotes()
    except Exception as error:
        raise MarketSourceNetworkError(
            f"主行情源 {PRIMARY_MARKET_SOURCE} 网络连接失败，请稍后重试"
        ) from error

    if quotes is None or quotes.empty:
        raise MarketSourceEmptyError(
            f"主行情源 {PRIMARY_MARKET_SOURCE} 未返回实时行情数据"
        )

    row = quotes[quotes["股票代码"].astype(str) == stock_code]
    if row.empty:
        raise StockQuoteNotFoundError(
            f"主行情源 {PRIMARY_MARKET_SOURCE} 未找到该股票行情"
        )

    item = row.iloc[0]

    # 兼容 efinance 不同版本的列名
    turnover_col = "换手率" if "换手率" in quotes.columns else ("turnover_rate" if "turnover_rate" in quotes.columns else None)

    # 振幅：优先直接取，没有则用 (最高-最低)/昨收×100 计算
    if "振幅" in quotes.columns:
        amplitude = _safe_float(item["振幅"])
    elif "amplitude" in quotes.columns:
        amplitude = _safe_float(item["amplitude"])
    else:
        high = _safe_float(item.get("最高"))
        low = _safe_float(item.get("最低"))
        yesterday_close = _safe_float(item.get("昨日收盘"))
        if high is not None and low is not None and yesterday_close is not None and yesterday_close > 0:
            amplitude = round((high - low) / yesterday_close * 100, 2)
        else:
            amplitude = None

    return StockQuote(
        code=stock_code,
        name=_clean_stock_name(str(item["股票名称"])),
        price=_to_float(item["最新价"]),
        change_pct=_to_float(item["涨跌幅"]),
        turnover_rate=_safe_float(item[turnover_col]) if turnover_col else None,
        amplitude=amplitude,
        source=PRIMARY_MARKET_SOURCE,
        fetched_at=fetched_at.isoformat(timespec="seconds"),
    )


def _get_stock_quote_from_fallback(
    stock_code: str, fetched_at: datetime
) -> StockQuote:
    symbol = _to_sina_symbol(stock_code)
    url = SINA_QUOTE_URL.format(symbol=symbol)

    try:
        resp = requests.get(url, headers=SINA_HEADERS, timeout=10)
        resp.encoding = "gbk"
        text = resp.text.strip()
    except Exception as error:
        raise MarketSourceNetworkError(
            f"备用行情源 {FALLBACK_MARKET_SOURCE} 网络连接失败，请稍后重试"
        ) from error

    if not text or '=""' in text:
        raise StockQuoteNotFoundError(
            f"备用行情源 {FALLBACK_MARKET_SOURCE} 未找到该股票行情"
        )

    try:
        data = text.split('"')[1]
        fields = data.split(",")
    except (IndexError, ValueError) as error:
        raise MarketFieldFormatError(
            f"备用行情源 {FALLBACK_MARKET_SOURCE} 返回格式异常"
        ) from error

    if len(fields) < 32:
        raise MarketFieldFormatError(
            f"备用行情源 {FALLBACK_MARKET_SOURCE} 返回字段不足"
        )

    name = _clean_stock_name(fields[0].strip())
    if not name:
        raise StockQuoteNotFoundError(
            f"备用行情源 {FALLBACK_MARKET_SOURCE} 未找到该股票行情"
        )

    try:
        yesterday_close = _to_float(fields[2])
        current_price = _to_float(fields[3])
        high_price = _to_float(fields[4])
        low_price = _to_float(fields[5])
    except (MarketFieldEmptyError, MarketFieldFormatError) as error:
        raise MarketFieldFormatError(
            f"备用行情源 {FALLBACK_MARKET_SOURCE} 价格字段异常"
        ) from error

    if yesterday_close == 0:
        raise MarketFieldFormatError(
            f"备用行情源 {FALLBACK_MARKET_SOURCE} 昨收价为零，无法计算涨跌幅"
        )

    change_pct = round((current_price - yesterday_close) / yesterday_close * 100, 2)
    amplitude = round((high_price - low_price) / yesterday_close * 100, 2)

    return StockQuote(
        code=stock_code,
        name=name,
        price=current_price,
        change_pct=change_pct,
        turnover_rate=None,
        amplitude=amplitude,
        source=FALLBACK_MARKET_SOURCE,
        fetched_at=fetched_at.isoformat(timespec="seconds"),
    )


def get_stock_quote(code: str) -> StockQuote:
    stock_code = normalize_a_share_code(code)
    cached = _quote_cache.get(stock_code)
    now = datetime.now()

    if cached:
        cached_quote, cached_at = cached
        if now - cached_at <= timedelta(seconds=QUOTE_CACHE_TTL_SECONDS):
            logger.debug("行情缓存命中: %s", stock_code)
            return cached_quote

    try:
        quote = _get_stock_quote_from_efinance(stock_code, now)
        _quote_cache[stock_code] = (quote, now)
        logger.info("行情获取成功: %s, source=%s", stock_code, PRIMARY_MARKET_SOURCE)
        return quote
    except MarketDataError as primary_error:
        logger.warning("主行情源失败，切换备用: stock=%s, error=%s",
                       stock_code, primary_error)

    try:
        quote = _get_stock_quote_from_fallback(stock_code, now)
        _quote_cache[stock_code] = (quote, now)
        return quote
    except MarketDataError as fallback_error:
        raise MarketSourceNetworkError(
            f"行情获取失败：主行情源 efinance 失败（{primary_error}），"
            f"备用行情源 sina 也失败（{fallback_error}）"
        ) from fallback_error


def _get_stock_history_from_efinance(
    stock_code: str, days: int
) -> list[StockDailyPrice]:
    try:
        df = ef.stock.get_quote_history(stock_code)
    except Exception as error:
        raise MarketSourceNetworkError(
            f"主行情源 {PRIMARY_MARKET_SOURCE} 历史行情网络连接失败，请稍后重试"
        ) from error

    if df is None or df.empty:
        raise MarketSourceEmptyError(
            f"主行情源 {PRIMARY_MARKET_SOURCE} 未返回历史行情数据"
        )

    history: list[StockDailyPrice] = []
    for _, row in df.iterrows():
        try:
            price = StockDailyPrice(
                date=str(row["日期"]),
                open=_to_float(row["开盘"]),
                close=_to_float(row["收盘"]),
                high=_to_float(row["最高"]),
                low=_to_float(row["最低"]),
                volume=_to_float(row["成交量"]),
            )
            history.append(price)
        except (MarketFieldEmptyError, MarketFieldFormatError):
            continue

    recent_history = history[-days:]
    if len(recent_history) < 20:
        raise MarketSourceEmptyError(
            f"主行情源 {PRIMARY_MARKET_SOURCE} 历史行情数据不足"
            f"（当前 {len(recent_history)} 条，至少需要 20 条）"
        )

    return recent_history


def _get_stock_history_from_fallback(
    stock_code: str, days: int
) -> list[StockDailyPrice]:
    symbol = _to_sina_symbol(stock_code)
    url = SINA_HISTORY_URL.format(symbol=symbol, datalen=days)

    try:
        resp = requests.get(url, headers=SINA_HEADERS, timeout=10)
        data = resp.json()
    except Exception as error:
        raise MarketSourceNetworkError(
            f"备用行情源 {FALLBACK_MARKET_SOURCE} 历史行情网络连接失败，请稍后重试"
        ) from error

    if not data or not isinstance(data, list):
        raise MarketSourceEmptyError(
            f"备用行情源 {FALLBACK_MARKET_SOURCE} 未返回历史行情数据"
        )

    history: list[StockDailyPrice] = []
    for item in data:
        try:
            price = StockDailyPrice(
                date=str(item.get("day", "")),
                open=_to_float(item.get("open")),
                close=_to_float(item.get("close")),
                high=_to_float(item.get("high")),
                low=_to_float(item.get("low")),
                volume=_to_float(item.get("volume")),
            )
            history.append(price)
        except (MarketFieldEmptyError, MarketFieldFormatError):
            continue

    recent_history = history[-days:]
    if len(recent_history) < 20:
        raise MarketSourceEmptyError(
            f"备用行情源 {FALLBACK_MARKET_SOURCE} 历史行情数据不足"
            f"（当前 {len(recent_history)} 条，至少需要 20 条）"
        )

    return recent_history


def get_stock_history(code: str, days: int = 30) -> list[StockDailyPrice]:
    stock_code = normalize_a_share_code(code)

    try:
        return _get_stock_history_from_efinance(stock_code, days)
    except MarketDataError as primary_error:
        pass

    try:
        return _get_stock_history_from_fallback(stock_code, days)
    except MarketDataError as fallback_error:
        raise MarketSourceNetworkError(
            f"历史行情获取失败：主行情源 efinance 失败（{primary_error}），"
            f"备用行情源 sina 也失败（{fallback_error}）"
        ) from fallback_error

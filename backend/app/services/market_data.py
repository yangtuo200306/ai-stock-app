from dataclasses import asdict, dataclass
from datetime import datetime, timedelta

import efinance as ef


QUOTE_CACHE_TTL_SECONDS = 60
PRIMARY_MARKET_SOURCE = "efinance"
_quote_cache: dict[str, tuple["StockQuote", datetime]] = {}


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
    source: str
    fetched_at: str

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

    return StockQuote(
        code=stock_code,
        name=str(item["股票名称"]),
        price=_to_float(item["最新价"]),
        change_pct=_to_float(item["涨跌幅"]),
        source=PRIMARY_MARKET_SOURCE,
        fetched_at=fetched_at.isoformat(timespec="seconds"),
    )


def _get_stock_quote_from_fallback(
    stock_code: str, fetched_at: datetime
) -> StockQuote:
    raise MarketSourceNetworkError("备用实时行情数据源暂未配置")


def get_stock_quote(code: str) -> StockQuote:
    stock_code = normalize_a_share_code(code)
    cached = _quote_cache.get(stock_code)
    now = datetime.now()

    if cached:
        cached_quote, cached_at = cached
        if now - cached_at <= timedelta(seconds=QUOTE_CACHE_TTL_SECONDS):
            return cached_quote

    quote = _get_stock_quote_from_efinance(stock_code, now)
    _quote_cache[stock_code] = (quote, now)

    return quote


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
    raise MarketSourceNetworkError("备用历史行情数据源暂未配置")


def get_stock_history(code: str, days: int = 30) -> list[StockDailyPrice]:
    stock_code = normalize_a_share_code(code)
    return _get_stock_history_from_efinance(stock_code, days)

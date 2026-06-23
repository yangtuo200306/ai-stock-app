from dataclasses import asdict, dataclass
from datetime import datetime, timedelta

import efinance as ef


QUOTE_CACHE_TTL_SECONDS = 60
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


def get_stock_quote(code: str) -> StockQuote:
    stock_code = normalize_a_share_code(code)
    cached = _quote_cache.get(stock_code)
    now = datetime.now()

    if cached:
        cached_quote, cached_at = cached
        if now - cached_at <= timedelta(seconds=QUOTE_CACHE_TTL_SECONDS):
            return cached_quote

    try:
        quotes = ef.stock.get_realtime_quotes()
    except Exception as error:
        raise MarketSourceNetworkError("行情源网络连接失败，请稍后重试") from error

    if quotes is None or quotes.empty:
        raise MarketSourceEmptyError("行情接口未返回数据")

    row = quotes[quotes["股票代码"].astype(str) == stock_code]
    if row.empty:
        raise StockQuoteNotFoundError("未找到该股票行情")

    item = row.iloc[0]

    quote = StockQuote(
        code=stock_code,
        name=str(item["股票名称"]),
        price=_to_float(item["最新价"]),
        change_pct=_to_float(item["涨跌幅"]),
        source="efinance",
        fetched_at=now.isoformat(timespec="seconds"),
    )
    _quote_cache[stock_code] = (quote, now)

    return quote

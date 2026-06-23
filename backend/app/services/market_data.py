from dataclasses import asdict, dataclass
from datetime import datetime

import efinance as ef


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
    normalized = code.strip()

    if not normalized.isdigit() or len(normalized) != 6:
        raise ValueError("目前仅支持 6 位 A 股代码")

    return normalized


def _to_float(value) -> float:
    if value is None:
        raise ValueError("行情字段为空")

    text = str(value).replace("%", "").replace(",", "").strip()
    if text in {"", "-", "--", "None", "nan"}:
        raise ValueError("行情字段为空")

    return float(text)


def get_stock_quote(code: str) -> StockQuote:
    stock_code = normalize_a_share_code(code)

    try:
        quotes = ef.stock.get_realtime_quotes()
    except Exception as error:
        raise ValueError("行情数据获取失败，请稍后重试") from error

    if quotes is None or quotes.empty:
        raise ValueError("行情接口未返回数据")

    row = quotes[quotes["股票代码"].astype(str) == stock_code]
    if row.empty:
        raise ValueError("未找到该股票行情")

    item = row.iloc[0]

    return StockQuote(
        code=stock_code,
        name=str(item["股票名称"]),
        price=_to_float(item["最新价"]),
        change_pct=_to_float(item["涨跌幅"]),
        source="efinance",
        fetched_at=datetime.now().isoformat(timespec="seconds"),
    )

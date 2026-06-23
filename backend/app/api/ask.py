from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.market_data import MarketDataError, get_stock_history, get_stock_quote
from app.services.report_builder import build_analysis_report
from app.services.technical_indicators import build_technical_indicators

router = APIRouter(prefix="/api", tags=["ask"])


class AskCreate(BaseModel):
    stock_code: str


class AskResponse(BaseModel):
    stock_code: str
    stock_name: str
    price: float
    change_pct: float
    trend: str
    action: str
    score: int
    answer: str
    risks: list[str]
    indicators: dict


@router.post("/ask", response_model=AskResponse)
def ask_stock(ask: AskCreate):
    try:
        quote = get_stock_quote(ask.stock_code)
        history = get_stock_history(ask.stock_code)
    except MarketDataError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    technicals = build_technical_indicators(quote.price, history)
    report = build_analysis_report(quote, technicals)

    answer = (
        f"{report['stock_name']}（{report['stock_code']}）当前价 {report['price']}，"
        f"涨跌幅 {report['indicators']['change_pct']}%。"
        f"当前趋势判断为{report['trend']}，基础建议为{report['action']}。"
        f"{report['summary']}以上内容仅供学习和参考，不构成投资建议。"
    )

    return {
        "stock_code": report["stock_code"],
        "stock_name": report["stock_name"],
        "price": report["price"],
        "change_pct": report["indicators"]["change_pct"],
        "trend": report["trend"],
        "action": report["action"],
        "score": report["score"],
        "answer": answer,
        "risks": report["risks"],
        "indicators": report["indicators"],
    }

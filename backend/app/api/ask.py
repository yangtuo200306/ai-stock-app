import os
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.llm_client import LlmError, ask_llm
from app.services.market_data import MarketDataError, get_stock_history, get_stock_quote
from app.services.report_builder import build_analysis_report
from app.services.technical_indicators import build_technical_indicators

router = APIRouter(prefix="/api", tags=["ask"])


class AskCreate(BaseModel):
    question: str | None = None
    stock_code: str | None = None


class AskResponse(BaseModel):
    stock_code: str
    stock_name: str
    price: float
    change_pct: float
    trend: str
    action: str
    score: int
    question: str | None = None
    answer: str
    answer_type: str = "rule"
    risks: list[str]
    indicators: dict
    model: str | None = None
    llm_error: str | None = None


def _extract_stock_code(text: str) -> str | None:
    match = re.search(r"\b(\d{6})\b", text)
    if match:
        return match.group(1)
    return None


def _build_rule_answer(report: dict) -> str:
    return (
        f"{report['stock_name']}（{report['stock_code']}）当前价 {report['price']}，"
        f"涨跌幅 {report['indicators']['change_pct']}%。"
        f"当前趋势判断为{report['trend']}，基础建议为{report['action']}。"
        f"{report['summary']}以上内容仅供学习和参考，不构成投资建议。"
    )


@router.post("/ask", response_model=AskResponse)
def ask_stock(ask: AskCreate):
    stock_code = None

    if ask.question:
        extracted = _extract_stock_code(ask.question)
        if not extracted:
            raise HTTPException(
                status_code=400,
                detail="问题中未找到 6 位股票代码，请提供例如：600519 怎么看？",
            )
        stock_code = extracted
    elif ask.stock_code:
        stock_code = ask.stock_code
    else:
        raise HTTPException(
            status_code=400,
            detail="请提供股票代码或包含股票代码的问题",
        )

    try:
        quote = get_stock_quote(stock_code)
        history = get_stock_history(stock_code)
    except MarketDataError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    technicals = build_technical_indicators(quote.price, history)
    report = build_analysis_report(quote, technicals)

    answer_type = "rule"
    model_name = os.environ.get("LLM_MODEL")
    llm_error = None
    answer = _build_rule_answer(report)

    try:
        ai_answer = ask_llm(
            stock_code=report["stock_code"],
            stock_name=report["stock_name"],
            price=report["price"],
            change_pct=report["indicators"]["change_pct"],
            trend=report["trend"],
            action=report["action"],
            score=report["score"],
            summary=report["summary"],
            risks=report["risks"],
            indicators=report["indicators"],
            question=ask.question or f"{stock_code} 怎么样？",
        )
        answer_type = "ai"
        answer = ai_answer
    except LlmError as error:
        llm_error = str(error)

    return {
        "stock_code": report["stock_code"],
        "stock_name": report["stock_name"],
        "price": report["price"],
        "change_pct": report["indicators"]["change_pct"],
        "trend": report["trend"],
        "action": report["action"],
        "score": report["score"],
        "question": ask.question,
        "answer": answer,
        "answer_type": answer_type,
        "risks": report["risks"],
        "indicators": report["indicators"],
        "model": model_name,
        "llm_error": llm_error,
    }

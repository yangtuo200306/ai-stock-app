import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.config.settings import settings
from app.database import get_current_user_id
from app.errors import ErrorCode, api_error
from app.services.ask_service import (
    _build_rule_answer,
    _build_conversation_title,
    _create_ask_session,
    _get_ask_session,
    _update_ask_session,
    _write_ask_message,
    _get_ask_messages,
    _write_or_update_ask_record,
)
from app.services.llm_client import LlmError, ask_llm
from app.services.market_data import MarketDataError, get_stock_history, get_stock_quote
from app.services.report_builder import build_analysis_report
from app.services.stock_resolver import get_supported_names, resolve_stock_input
from app.services.technical_indicators import build_technical_indicators

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["ask"])


class AskCreate(BaseModel):
    question: str | None = None
    stock_code: str | None = None
    session_id: str | None = None


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
    ai_status: str = "ok"
    risks: list[str]
    indicators: dict
    model: str | None = None
    session_id: str | None = None
    message_id: int | None = None
    is_new_session: bool = False
    conversation_title: str | None = None


def _extract_stock_code(text: str) -> str | None:
    return resolve_stock_input(text)


@router.post("/ask", response_model=AskResponse)
def ask_stock(ask: AskCreate, user_id: str = Depends(get_current_user_id)):
    logger.info("问股请求: session=%s, stock=%s, question=%.40s",
                 ask.session_id, ask.stock_code, ask.question or "")
    # --- resolve session ---
    session = None
    is_new_session = False
    if ask.session_id:
        session = _get_ask_session(ask.session_id, user_id)
        if session is None:
            raise api_error(400, ErrorCode.SESSION_NOT_FOUND, "会话不存在")

    # --- resolve stock code ---
    stock_code = None
    if session:
        stock_code = session["stock_code"]
        requested_stock_code = _extract_stock_code(ask.question or "")
        if requested_stock_code and requested_stock_code != stock_code:
            # 用户问了其他股票，允许但提示切换
            stock_code = requested_stock_code
            session = None  # 重新获取新股票的数据
    elif ask.stock_code:
        stock_code = ask.stock_code.strip()
    elif ask.question:
        extracted = _extract_stock_code(ask.question)
        if not extracted:
            supported = "、".join(get_supported_names())
            raise api_error(400, ErrorCode.STOCK_NOT_FOUND,
                             f"问题中未找到 6 位股票代码或已支持的股票名称（当前支持：{supported}），请提供例如：600519 怎么看？")
        stock_code = extracted
    else:
        raise api_error(400, ErrorCode.MISSING_STOCK_CODE, "请提供股票代码或包含股票代码的问题")

    # --- fetch market data ---
    try:
        quote = get_stock_quote(stock_code)
        history = get_stock_history(stock_code)
    except MarketDataError as error:
        raise api_error(400, ErrorCode.MARKET_DATA_ERROR, str(error)) from error

    technicals = build_technical_indicators(quote.price, history)
    report = build_analysis_report(quote, technicals)

    # --- generate answer ---
    answer_type = "rule"
    ai_status = "fallback"
    model_name = settings.LLM_MODEL or None
    answer = _build_rule_answer(report)

    try:
        conversation_messages = None
        if session:
            conversation_messages = _get_ask_messages(session["session_id"], user_id)

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
            conversation_messages=conversation_messages,
        )
        answer_type = "ai"
        ai_status = "ok"
        answer = ai_answer
    except LlmError:
        logger.warning("LLM 调用失败，降级为规则回答: stock=%s", stock_code)

    # --- save session & messages ---
    if session:
        # existing session: update and append messages
        summary = answer[:80] if len(answer) > 80 else answer
        _update_ask_session(
            session["session_id"], ask.question or "", answer, summary,
            answer_type, ai_status, model_name,
        )
        _write_ask_message(session["session_id"], user_id, "user", ask.question or "")
        message_id = _write_ask_message(
            session["session_id"], user_id, "assistant", answer,
            answer_type=answer_type, ai_status=ai_status, model=model_name,
        )
        _write_or_update_ask_record(
            report, ask.question or "", answer, answer_type, ai_status,
            model_name, user_id, session["session_id"], is_new=False,
        )
        session_id = session["session_id"]
        title = session["title"]
    else:
        # new session
        title = _build_conversation_title(report["stock_name"], report["stock_code"])
        summary = answer[:80] if len(answer) > 80 else answer
        session_id = _create_ask_session(
            user_id, report["stock_code"], report["stock_name"], title, summary,
            ask.question or "", answer, answer_type, ai_status, model_name,
        )
        _write_ask_message(session_id, user_id, "user", ask.question or "")
        message_id = _write_ask_message(
            session_id, user_id, "assistant", answer,
            answer_type=answer_type, ai_status=ai_status, model=model_name,
        )
        _write_or_update_ask_record(
            report, ask.question or "", answer, answer_type, ai_status,
            model_name, user_id, session_id, is_new=True,
        )
        is_new_session = True

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
        "ai_status": ai_status,
        "risks": report["risks"],
        "indicators": report["indicators"],
        "model": model_name,
        "session_id": session_id,
        "message_id": message_id,
        "is_new_session": is_new_session,
        "conversation_title": title,
    }

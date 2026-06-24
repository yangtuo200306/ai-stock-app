import json
import os
import re
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.database import get_current_user_id, get_connection
from app.services.llm_client import LlmError, ask_llm
from app.services.market_data import MarketDataError, get_stock_history, get_stock_quote
from app.services.report_builder import build_analysis_report
from app.services.stock_resolver import get_supported_names, resolve_stock_input
from app.services.technical_indicators import build_technical_indicators

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


def _build_rule_answer(report: dict) -> str:
    return (
        f"{report['stock_name']}（{report['stock_code']}）当前价 {report['price']}，"
        f"涨跌幅 {report['indicators']['change_pct']}%。"
        f"当前趋势判断为{report['trend']}，基础建议为{report['action']}。"
        f"{report['summary']}以上内容仅供学习和参考，不构成投资建议。"
    )


def _build_conversation_title(stock_name: str, stock_code: str) -> str:
    return f"问股：{stock_name}（{stock_code}）"


def _create_ask_session(
    user_id: str, stock_code: str, stock_name: str, title: str, summary: str,
    question: str, answer: str, answer_type: str, ai_status: str, model: str | None,
) -> str:
    session_id = str(uuid4())
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO ask_sessions
                (session_id, user_id, stock_code, stock_name, title, summary,
                 last_question, last_answer, answer_type, ai_status, model)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (session_id, user_id, stock_code, stock_name, title, summary,
             question, answer, answer_type, ai_status, model),
        )
    return session_id


def _get_ask_session(session_id: str, user_id: str) -> dict | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT session_id, user_id, stock_code, stock_name, title, summary,
                   last_question, last_answer, answer_type, ai_status, model
            FROM ask_sessions
            WHERE session_id = ? AND user_id = ?
            """,
            (session_id, user_id),
        ).fetchone()
    if row is None:
        return None
    return dict(row)


def _update_ask_session(
    session_id: str, question: str, answer: str, summary: str,
    answer_type: str, ai_status: str, model: str | None,
):
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE ask_sessions
            SET summary = ?, last_question = ?, last_answer = ?, answer_type = ?,
                ai_status = ?, model = ?, updated_at = CURRENT_TIMESTAMP
            WHERE session_id = ?
            """,
            (summary, question, answer, answer_type, ai_status, model, session_id),
        )


def _write_ask_message(
    session_id: str, user_id: str, role: str, content: str,
    answer_type: str | None = None, ai_status: str | None = None, model: str | None = None,
) -> int:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO ask_messages
                (session_id, user_id, role, content, answer_type, ai_status, model)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (session_id, user_id, role, content, answer_type, ai_status, model),
        )
        return cursor.lastrowid


def _get_ask_messages(session_id: str, user_id: str, limit: int = 4) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, session_id, role, content, answer_type, ai_status, model, created_at
            FROM ask_messages
            WHERE session_id = ? AND user_id = ?
            ORDER BY id ASC
            """,
            (session_id, user_id),
        ).fetchall()
    messages = [dict(row) for row in rows]
    return messages[-limit:]


def _write_or_update_ask_record(
    report: dict, question: str, answer: str, answer_type: str, ai_status: str,
    model: str | None, user_id: str, session_id: str, is_new: bool,
):
    summary = answer[:80] if len(answer) > 80 else answer
    if not summary:
        summary = f"{report['stock_name']} 当前价 {report['price']}，评分 {report['score']}，建议 {report['action']}"

    metadata = {
        "price": report["price"],
        "change_pct": report["indicators"]["change_pct"],
        "score": report["score"],
        "action": report["action"],
        "trend": report["trend"],
        "answer_type": answer_type,
        "ai_status": ai_status,
        "model": model,
    }

    with get_connection() as connection:
        if is_new:
            connection.execute(
                """
                INSERT INTO records (user_id, record_type, stock_code, stock_name,
                                     title, summary, question, answer, answer_type,
                                     metadata_json, session_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    "ask",
                    report["stock_code"],
                    report["stock_name"],
                    _build_conversation_title(report["stock_name"], report["stock_code"]),
                    summary,
                    question,
                    answer,
                    answer_type,
                    json.dumps(metadata, ensure_ascii=False),
                    session_id,
                ),
            )
        else:
            connection.execute(
                """
                UPDATE records
                SET summary = ?, question = ?, answer = ?, answer_type = ?,
                    metadata_json = ?
                WHERE session_id = ? AND user_id = ?
                """,
                (
                    summary,
                    question,
                    answer,
                    answer_type,
                    json.dumps(metadata, ensure_ascii=False),
                    session_id,
                    user_id,
                ),
            )


@router.post("/ask", response_model=AskResponse)
def ask_stock(ask: AskCreate, user_id: str = Depends(get_current_user_id)):
    # --- resolve session ---
    session = None
    is_new_session = False
    if ask.session_id:
        session = _get_ask_session(ask.session_id, user_id)
        if session is None:
            raise HTTPException(
                status_code=400,
                detail="会话不存在",
            )

    # --- resolve stock code ---
    stock_code = None
    if session:
        stock_code = session["stock_code"]
        requested_stock_code = _extract_stock_code(ask.question or "")
        if requested_stock_code and requested_stock_code != stock_code:
            raise HTTPException(
                status_code=400,
                detail=f"当前会话围绕 {session['stock_name']}（{stock_code}），如需分析其他股票请新开问题",
            )
    elif ask.stock_code:
        stock_code = ask.stock_code.strip()
    elif ask.question:
        extracted = _extract_stock_code(ask.question)
        if not extracted:
            supported = "、".join(get_supported_names())
            raise HTTPException(
                status_code=400,
                detail=f"问题中未找到 6 位股票代码或已支持的股票名称（当前支持：{supported}），请提供例如：600519 怎么看？",
            )
        stock_code = extracted
    else:
        raise HTTPException(
            status_code=400,
            detail="请提供股票代码或包含股票代码的问题",
        )

    # --- fetch market data ---
    try:
        quote = get_stock_quote(stock_code)
        history = get_stock_history(stock_code)
    except MarketDataError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    technicals = build_technical_indicators(quote.price, history)
    report = build_analysis_report(quote, technicals)

    # --- generate answer ---
    answer_type = "rule"
    ai_status = "fallback"
    model_name = os.environ.get("LLM_MODEL")
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
        pass

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

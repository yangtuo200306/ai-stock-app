import json
import logging
from uuid import uuid4

from app.database import get_connection

logger = logging.getLogger(__name__)


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
    logger.debug("创建会话: session=%s, user=%s, stock=%s", session_id, user_id, stock_code)
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
                    metadata_json = ?, updated_at = CURRENT_TIMESTAMP
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

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends

from app.database import get_current_user_id, get_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["sessions"])


@router.get("/sessions")
def get_sessions(
    user_id: str = Depends(get_current_user_id),
    limit: int = 20,
):
    """获取最近会话列表。"""
    logger.debug("查询会话列表: user=%s, limit=%d", user_id, limit)
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT s.session_id, s.stock_code, s.stock_name, s.title,
                   s.last_question, s.updated_at,
                   (SELECT COUNT(*) FROM ask_messages m
                    WHERE m.session_id = s.session_id AND m.user_id = s.user_id) as message_count
            FROM ask_sessions s
            WHERE s.user_id = ?
            ORDER BY s.updated_at DESC, s.session_id DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()

    items = []
    for row in rows:
        title = row["title"]
        # 无 stock_code 的 session 用 last_question 作为标题
        if not row["stock_code"] and row["last_question"]:
            title = row["last_question"][:20]
        items.append({
            "id": row["session_id"],
            "title": title,
            "stock_code": row["stock_code"] or "",
            "stock_name": row["stock_name"] or "",
            "updated_at": row["updated_at"],
            "message_count": row["message_count"],
        })

    return items


@router.get("/ask/messages")
def get_session_messages(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """获取指定会话的消息列表。"""
    logger.debug("查询会话消息: session=%s, user=%s", session_id, user_id)
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, session_id, role, content, answer_type, ai_status, model, thinking_json, created_at
            FROM ask_messages
            WHERE session_id = ? AND user_id = ?
            ORDER BY id ASC
            """,
            (session_id, user_id),
        ).fetchall()

    messages = []
    for row in rows:
        messages.append({
            "id": row["id"],
            "role": row["role"],
            "content": row["content"],
            "answer_type": row["answer_type"],
            "ai_status": row["ai_status"],
            "model": row["model"],
            "thinking_json": row["thinking_json"],
            "created_at": row["created_at"],
        })

    return messages

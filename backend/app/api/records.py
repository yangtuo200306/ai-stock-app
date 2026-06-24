import json

from fastapi import APIRouter, Depends

from app.database import get_current_user_id, get_connection

router = APIRouter(prefix="/api", tags=["records"])


@router.get("/records")
def get_records(user_id: str = Depends(get_current_user_id)):
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, record_type, stock_code, stock_name, title, summary,
                   question, answer_type, report_id, metadata_json, created_at
            FROM records
            WHERE user_id = ?
            ORDER BY id DESC
            """,
            (user_id,),
        ).fetchall()

    items = []
    for row in rows:
        metadata = json.loads(row["metadata_json"]) if row["metadata_json"] else {}

        items.append({
            "id": row["id"],
            "record_type": row["record_type"],
            "stock_code": row["stock_code"],
            "stock_name": row["stock_name"],
            "title": row["title"],
            "summary": row["summary"],
            "question": row["question"],
            "answer_type": row["answer_type"],
            "report_id": row["report_id"],
            "metadata": metadata,
            "created_at": row["created_at"],
        })

    return {"items": items}


@router.get("/records/{record_id}")
def get_record(record_id: int, user_id: str = Depends(get_current_user_id)):
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, record_type, stock_code, stock_name, title, summary,
                   question, answer, answer_type, report_id, metadata_json, created_at
            FROM records
            WHERE id = ? AND user_id = ?
            """,
            (record_id, user_id),
        ).fetchone()

    if row is None:
        return {
            "message": "record not found",
            "record_id": record_id,
        }

    metadata = json.loads(row["metadata_json"]) if row["metadata_json"] else {}

    return {
        "id": row["id"],
        "record_type": row["record_type"],
        "stock_code": row["stock_code"],
        "stock_name": row["stock_name"],
        "title": row["title"],
        "summary": row["summary"],
        "question": row["question"],
        "answer": row["answer"],
        "answer_type": row["answer_type"],
        "report_id": row["report_id"],
        "metadata": metadata,
        "created_at": row["created_at"],
    }

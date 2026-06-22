from fastapi import APIRouter
from pydantic import BaseModel

from app.database import get_connection

router = APIRouter(prefix="/api", tags=["stocks"])


class StockCreate(BaseModel):
    code: str
    name: str


@router.get("/stocks")
def get_stocks():
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT code, name FROM stocks ORDER BY id"
        ).fetchall()

    items = [
        {
            "code": row["code"],
            "name": row["name"],
        }
        for row in rows
    ]

    return {"items": items}


@router.post("/stocks")
def add_stock(stock: StockCreate):
    item = {
        "code": stock.code,
        "name": stock.name,
    }

    with get_connection() as connection:
        connection.execute(
            "INSERT OR IGNORE INTO stocks (code, name) VALUES (?, ?)",
            (stock.code, stock.name),
        )

    return {
        "message": "stock added",
        "item": item,
    }


@router.delete("/stocks/{code}")
def delete_stock(code: str):
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM stocks WHERE code = ?",
            (code,),
        )

    if cursor.rowcount > 0:
        return {
            "message": "stock deleted",
            "code": code,
        }

    return {
        "message": "stock not found",
        "code": code,
    }

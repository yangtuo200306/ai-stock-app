import json
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.database import get_current_user_id, get_connection
from app.services.market_data import get_stock_quote, MarketDataError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["stocks"])


class StockCreate(BaseModel):
    code: str
    name: str


@router.get("/stocks")
def get_stocks(user_id: str = Depends(get_current_user_id)):
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT s.code, s.name,
                   lr.id AS latest_record_id,
                   lr.record_type AS latest_record_type,
                   lr.summary AS latest_summary,
                   lr.updated_at AS latest_updated_at
            FROM stocks s
            LEFT JOIN (
                SELECT id, stock_code, record_type, summary, updated_at,
                       ROW_NUMBER() OVER (
                           PARTITION BY stock_code
                           ORDER BY updated_at DESC, id DESC
                       ) AS rn
                FROM records
                WHERE user_id = ? AND record_type IN ('analysis', 'report')
            ) lr ON s.code = lr.stock_code AND lr.rn = 1
            WHERE s.user_id = ?
            ORDER BY s.id
            """,
            (user_id, user_id),
        ).fetchall()

    items = []
    for row in rows:
        code = row["code"]
        price = None
        change_pct = None
        try:
            quote = get_stock_quote(code)
            price = quote.price
            change_pct = quote.change_pct
        except MarketDataError:
            pass

        items.append({
            "code": code,
            "name": row["name"],
            "price": price,
            "change_pct": change_pct,
            "latest_record_id": row["latest_record_id"],
            "latest_record_type": row["latest_record_type"],
            "latest_summary": row["latest_summary"],
            "latest_updated_at": row["latest_updated_at"],
        })

    return {"items": items}


# 股票索引缓存
_stock_index: list[tuple[str, str]] | None = None


def _load_stock_index() -> list[tuple[str, str]]:
    global _stock_index
    if _stock_index is not None:
        return _stock_index

    index_path = Path(__file__).resolve().parent.parent.parent / "data" / "stocks.index.json"
    if index_path.exists():
        try:
            with open(index_path, encoding="utf-8") as f:
                data = json.load(f)
            _stock_index = [(item[0], item[1]) for item in data]
        except (json.JSONDecodeError, IndexError, OSError):
            _stock_index = []
    else:
        _stock_index = []
    return _stock_index


@router.get("/stocks/search")
def search_stocks(q: str = Query(..., min_length=1, max_length=20)):
    """搜索股票，按代码前缀或名称模糊匹配，返回前 10 条。"""
    index = _load_stock_index()
    if not index:
        return {"items": []}

    lower_q = q.lower()
    results: list[dict[str, str]] = []

    # 先按代码前缀匹配
    for code, name in index:
        if code.startswith(lower_q):
            results.append({"code": code, "name": name})
            if len(results) >= 10:
                return {"items": results}

    # 再按名称模糊匹配
    for code, name in index:
        if lower_q in name.lower():
            # 避免重复
            if not any(r["code"] == code for r in results):
                results.append({"code": code, "name": name})
                if len(results) >= 10:
                    return {"items": results}

    return {"items": results}


@router.post("/stocks")
def add_stock(stock: StockCreate, user_id: str = Depends(get_current_user_id)):
    item = {
        "code": stock.code,
        "name": stock.name,
    }

    with get_connection() as connection:
        connection.execute(
            "INSERT OR IGNORE INTO stocks (code, name, user_id) VALUES (?, ?, ?)",
            (stock.code, stock.name, user_id),
        )

    logger.info("添加自选: user=%s, code=%s, name=%s", user_id, stock.code, stock.name)
    return {
        "message": "stock added",
        "item": item,
    }


@router.delete("/stocks/{code}")
def delete_stock(code: str, user_id: str = Depends(get_current_user_id)):
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM stocks WHERE code = ? AND user_id = ?",
            (code, user_id),
        )

    if cursor.rowcount > 0:
        logger.info("删除自选: user=%s, code=%s", user_id, code)
        return {
            "message": "stock deleted",
            "code": code,
        }

    logger.warning("删除自选失败，未找到: user=%s, code=%s", user_id, code)
    return {
        "message": "stock not found",
        "code": code,
    }

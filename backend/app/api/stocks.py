from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["stocks"])

stocks = []


class StockCreate(BaseModel):
    code: str
    name: str


@router.get("/stocks")
def get_stocks():
    return {"items": stocks}


@router.post("/stocks")
def add_stock(stock: StockCreate):
    item = {
        "code": stock.code,
        "name": stock.name,
    }
    stocks.append(item)

    return {
        "message": "stock added",
        "item": item,
    }


@router.delete("/stocks/{code}")
def delete_stock(code: str):
    for item in stocks:
        if item["code"] == code:
            stocks.remove(item)
            return {
                "message": "stock deleted",
                "code": code,
            }

    return {
        "message": "stock not found",
        "code": code,
    }

from fastapi import APIRouter, HTTPException

from app.services.market_data import get_stock_quote

router = APIRouter(prefix="/api", tags=["market"])


@router.get("/market/quote/{code}")
def get_market_quote(code: str):
    try:
        quote = get_stock_quote(code)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    return quote.to_dict()

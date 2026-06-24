from fastapi import APIRouter, HTTPException

from app.services.market_data import MarketDataError, get_stock_quote

router = APIRouter(prefix="/api", tags=["market"])


@router.get("/market/quote/{code}")
def get_market_quote(code: str):
    try:
        quote = get_stock_quote(code)
    except MarketDataError as error:
        raise HTTPException(status_code=400, detail={"error_code": "MARKET_DATA_ERROR", "message": str(error)})

    return quote.to_dict()

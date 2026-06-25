import logging

from fastapi import APIRouter

from app.errors import ErrorCode, api_error
from app.services.market_data import MarketDataError, get_stock_quote

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["market"])


@router.get("/market/quote/{code}")
def get_market_quote(code: str):
    logger.debug("查询行情: code=%s", code)
    try:
        quote = get_stock_quote(code)
    except MarketDataError as error:
        raise api_error(400, ErrorCode.MARKET_DATA_ERROR, str(error))

    return quote.to_dict()

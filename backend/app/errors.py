from enum import Enum

from fastapi import HTTPException


class ErrorCode(str, Enum):
    INVALID_TOKEN_FORMAT = "INVALID_TOKEN_FORMAT"
    INVALID_TOKEN = "INVALID_TOKEN"
    USERNAME_EXISTS = "USERNAME_EXISTS"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    USER_NOT_FOUND = "USER_NOT_FOUND"
    SESSION_NOT_FOUND = "SESSION_NOT_FOUND"
    SESSION_STOCK_MISMATCH = "SESSION_STOCK_MISMATCH"
    STOCK_NOT_FOUND = "STOCK_NOT_FOUND"
    MISSING_STOCK_CODE = "MISSING_STOCK_CODE"
    MARKET_DATA_ERROR = "MARKET_DATA_ERROR"
    RECORD_NOT_FOUND = "RECORD_NOT_FOUND"
    REPORT_NOT_FOUND = "REPORT_NOT_FOUND"
    TASK_NOT_FOUND = "TASK_NOT_FOUND"


def error_response(error_code: ErrorCode, message: str) -> dict:
    return {"error_code": error_code.value, "message": message}


def api_error(status_code: int, error_code: ErrorCode, message: str):
    return HTTPException(status_code=status_code, detail=error_response(error_code, message))

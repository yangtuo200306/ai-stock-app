import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.analysis import router as analysis_router
from app.api.ask import router as ask_router
from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.market import router as market_router
from app.api.records import router as records_router
from app.api.reports import router as reports_router
from app.api.stocks import router as stocks_router
from app.config.settings import settings
from app.database import init_db
from app.logging_config import setup_logging
from app.error_handler import add_error_handlers

setup_logging(log_dir=settings.LOG_DIR, log_level=settings.LOG_LEVEL)

logger = logging.getLogger(__name__)

app = FastAPI(title="AI Stock App Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

add_error_handlers(app)
init_db()

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(stocks_router)
app.include_router(analysis_router)
app.include_router(ask_router)
app.include_router(market_router)
app.include_router(records_router)
app.include_router(reports_router)

logger.info("应用启动完成，路由已注册: health, auth, stocks, analysis, ask, market, records, reports")

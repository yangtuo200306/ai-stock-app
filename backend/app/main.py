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
from app.database import init_db

app = FastAPI(title="AI Stock App Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(stocks_router)
app.include_router(analysis_router)
app.include_router(ask_router)
app.include_router(market_router)
app.include_router(records_router)
app.include_router(reports_router)

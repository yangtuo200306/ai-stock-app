from fastapi import FastAPI

from app.api.analysis import router as analysis_router
from app.api.health import router as health_router
from app.api.stocks import router as stocks_router
from app.database import init_db

app = FastAPI(title="AI Stock App Backend")

init_db()

app.include_router(health_router)
app.include_router(stocks_router)
app.include_router(analysis_router)

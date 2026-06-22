from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.stocks import router as stocks_router

app = FastAPI(title="AI Stock App Backend")

app.include_router(health_router)
app.include_router(stocks_router)

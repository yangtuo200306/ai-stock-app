from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = ""
    LLM_MODEL: str = ""

    # Database（相对于 backend/ 目录）
    DATABASE_PATH: Path = Path("ai_stock.db")

    # CORS 允许的来源（逗号分隔）
    CORS_ORIGINS: str = "http://localhost:8081,http://127.0.0.1:8081"

    # 行情数据
    QUOTE_CACHE_TTL_SECONDS: int = 60
    PRIMARY_MARKET_SOURCE: str = "efinance"
    FALLBACK_MARKET_SOURCE: str = "sina"

    # 日志
    LOG_DIR: str = "logs"
    LOG_LEVEL: str = "INFO"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()

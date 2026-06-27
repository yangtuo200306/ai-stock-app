from __future__ import annotations

from pydantic import BaseModel


class Indicators(BaseModel):
    """标准化技术指标数据结构"""
    change_pct: float | None = None
    source: str | None = None
    fetched_at: str | None = None
    ma5: float | None = None
    ma10: float | None = None
    ma20: float | None = None
    bias_ma5: float | None = None
    bias_ma10: float | None = None
    bias_ma20: float | None = None
    ma_trend: str | None = None
    score_reasons: list[str] | None = None
    rsi6: float | None = None
    rsi12: float | None = None
    volume_ratio: float | None = None
    volume_signal: str | None = None
    turnover_rate: float | None = None
    amplitude: float | None = None

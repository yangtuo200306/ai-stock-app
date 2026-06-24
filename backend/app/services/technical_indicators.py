from app.services.market_data import StockDailyPrice


def calculate_ma(close_prices: list[float], period: int) -> float:
    if len(close_prices) < period:
        return 0.0
    return round(sum(close_prices[-period:]) / period, 2)


def calculate_bias(current_price: float, ma_value: float) -> float:
    if ma_value == 0:
        return 0.0
    return round((current_price - ma_value) / ma_value * 100, 2)


def determine_ma_trend(ma5: float, ma10: float, ma20: float) -> str:
    if ma5 > ma10 > ma20:
        return "多头排列"
    if ma5 < ma10 < ma20:
        return "空头排列"
    return "震荡"


def calculate_rsi(close_prices: list[float], period: int) -> float:
    """计算 RSI（相对强弱指标）。"""
    if len(close_prices) < period + 1:
        return 0.0

    gains = 0.0
    losses = 0.0
    for i in range(-period, 0):
        change = close_prices[i] - close_prices[i - 1]
        if change > 0:
            gains += change
        else:
            losses += abs(change)

    avg_gain = gains / period
    avg_loss = losses / period

    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss
    return round(100.0 - (100.0 / (1.0 + rs)), 2)


def calculate_volume_ratio(history: list[StockDailyPrice]) -> float:
    """计算最近一日成交量与最近 5 日平均成交量的比值。"""
    if len(history) < 6:
        return 0.0

    latest_volume = history[-1].volume
    recent_volumes = [item.volume for item in history[-6:-1]]
    if len(recent_volumes) == 0:
        return 0.0

    avg_volume = sum(recent_volumes) / len(recent_volumes)
    if avg_volume == 0:
        return 0.0

    return round(latest_volume / avg_volume, 2)


def determine_volume_signal(volume_ratio: float) -> str:
    if volume_ratio >= 1.5:
        return "放量"
    if volume_ratio <= 0.7:
        return "缩量"
    return "平稳"


def build_technical_indicators(
    current_price: float, history: list[StockDailyPrice]
) -> dict:
    close_prices = [item.close for item in history]

    ma5 = calculate_ma(close_prices, 5)
    ma10 = calculate_ma(close_prices, 10)
    ma20 = calculate_ma(close_prices, 20)

    bias_ma5 = calculate_bias(current_price, ma5)
    bias_ma10 = calculate_bias(current_price, ma10)
    bias_ma20 = calculate_bias(current_price, ma20)

    ma_trend = determine_ma_trend(ma5, ma10, ma20)

    rsi6 = calculate_rsi(close_prices, 6)
    rsi12 = calculate_rsi(close_prices, 12)

    volume_ratio = calculate_volume_ratio(history)
    volume_signal = determine_volume_signal(volume_ratio)

    return {
        "ma5": ma5,
        "ma10": ma10,
        "ma20": ma20,
        "bias_ma5": bias_ma5,
        "bias_ma10": bias_ma10,
        "bias_ma20": bias_ma20,
        "ma_trend": ma_trend,
        "rsi6": rsi6,
        "rsi12": rsi12,
        "volume_ratio": volume_ratio,
        "volume_signal": volume_signal,
    }

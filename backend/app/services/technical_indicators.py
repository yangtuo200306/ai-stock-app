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

    return {
        "ma5": ma5,
        "ma10": ma10,
        "ma20": ma20,
        "bias_ma5": bias_ma5,
        "bias_ma10": bias_ma10,
        "bias_ma20": bias_ma20,
        "ma_trend": ma_trend,
    }

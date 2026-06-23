from app.services.market_data import StockQuote


def _calculate_score(
    change_pct: float,
    bias_ma5: float,
    ma_trend: str,
) -> int:
    score = 50

    if ma_trend == "多头排列":
        score += 20
    elif ma_trend == "空头排列":
        score -= 20

    if change_pct > 3:
        score -= 5
    elif 1 < change_pct <= 3:
        score += 5
    elif -3 <= change_pct < -1:
        score -= 5
    elif change_pct < -3:
        score -= 10

    if bias_ma5 > 8:
        score -= 10
    elif bias_ma5 < -8:
        score -= 5
    elif -3 <= bias_ma5 <= 3:
        score += 5

    return max(0, min(100, score))


def _determine_action(score: int) -> str:
    if score >= 75:
        return "关注"
    if score >= 50:
        return "观望"
    return "谨慎"


def _determine_trend(ma_trend: str) -> str:
    if ma_trend == "多头排列":
        return "偏强"
    if ma_trend == "空头排列":
        return "偏弱"
    return "震荡"


def _build_summary(
    quote: StockQuote,
    ma5: float,
    ma10: float,
    ma20: float,
    ma_trend: str,
    action: str,
) -> str:
    return (
        f"基于实时行情和技术指标分析：{quote.name}（{quote.code}）"
        f"当前价 {quote.price}，涨跌幅 {quote.change_pct}%。"
        f"MA5 {ma5}，MA10 {ma10}，MA20 {ma20}，"
        f"均线呈{ma_trend}。当前建议：{action}。"
    )


def _build_risks(quote: StockQuote, bias_ma5: float) -> list[str]:
    risks = [
        "行情数据来自第三方接口（efinance），仅供学习和参考",
        "技术指标基于历史行情计算，不能预测未来走势",
    ]

    if abs(bias_ma5) > 8:
        risks.append("当前价格相对短期均线偏离较大，需注意短期波动风险")

    return risks


def _build_score_reasons(
    change_pct: float,
    bias_ma5: float,
    ma_trend: str,
) -> list[str]:
    reasons = []

    if ma_trend == "多头排列":
        reasons.append("均线呈多头排列，趋势偏强")
    elif ma_trend == "空头排列":
        reasons.append("均线呈空头排列，趋势偏弱")

    if 1 < change_pct <= 3:
        reasons.append("涨幅适中，表现稳健")
    elif change_pct > 3:
        reasons.append("涨幅较大，需注意回调风险")
    elif -3 <= change_pct < -1:
        reasons.append("跌幅适中，市场偏弱")
    elif change_pct < -3:
        reasons.append("跌幅较大，市场情绪偏空")

    if -3 <= bias_ma5 <= 3:
        reasons.append("价格紧贴短期均线，走势相对平稳")
    elif bias_ma5 > 8:
        reasons.append("价格偏离短期均线较大，存在回调压力")
    elif bias_ma5 < -8:
        reasons.append("价格低于短期均线较多，存在反弹可能")

    return reasons


def build_analysis_report(
    quote: StockQuote,
    technicals: dict,
) -> dict:
    ma5 = technicals["ma5"]
    ma10 = technicals["ma10"]
    ma20 = technicals["ma20"]
    bias_ma5 = technicals["bias_ma5"]
    bias_ma10 = technicals["bias_ma10"]
    bias_ma20 = technicals["bias_ma20"]
    ma_trend = technicals["ma_trend"]

    score = _calculate_score(quote.change_pct, bias_ma5, ma_trend)
    action = _determine_action(score)
    trend = _determine_trend(ma_trend)
    summary = _build_summary(quote, ma5, ma10, ma20, ma_trend, action)
    risks = _build_risks(quote, bias_ma5)
    score_reasons = _build_score_reasons(quote.change_pct, bias_ma5, ma_trend)

    indicators = {
        "change_pct": quote.change_pct,
        "source": quote.source,
        "fetched_at": quote.fetched_at,
        "ma5": ma5,
        "ma10": ma10,
        "ma20": ma20,
        "bias_ma5": bias_ma5,
        "bias_ma10": bias_ma10,
        "bias_ma20": bias_ma20,
        "ma_trend": ma_trend,
        "score_reasons": score_reasons,
    }

    return {
        "stock_code": quote.code,
        "stock_name": quote.name,
        "price": quote.price,
        "score": score,
        "action": action,
        "trend": trend,
        "summary": summary,
        "risks": risks,
        "indicators": indicators,
    }

import logging

import requests

from app.config.settings import settings

logger = logging.getLogger(__name__)


class LlmError(Exception):
    pass


class LlmConfigError(LlmError):
    pass


class LlmApiError(LlmError):
    pass


def _get_llm_config():
    if not settings.LLM_API_KEY:
        raise LlmConfigError("环境变量 LLM_API_KEY 未配置")
    if not settings.LLM_BASE_URL:
        raise LlmConfigError("环境变量 LLM_BASE_URL 未配置")
    if not settings.LLM_MODEL:
        raise LlmConfigError("环境变量 LLM_MODEL 未配置")
    return settings.LLM_API_KEY, settings.LLM_BASE_URL, settings.LLM_MODEL


def _build_prompt(
    stock_code: str,
    stock_name: str,
    price: float,
    change_pct: float,
    trend: str,
    action: str,
    score: int,
    summary: str,
    risks: list[str],
    indicators: dict,
    question: str,
) -> str:
    ma5 = indicators.get("ma5", "-")
    ma10 = indicators.get("ma10", "-")
    ma20 = indicators.get("ma20", "-")
    bias_ma5 = indicators.get("bias_ma5", "-")
    bias_ma10 = indicators.get("bias_ma10", "-")
    bias_ma20 = indicators.get("bias_ma20", "-")
    ma_trend = indicators.get("ma_trend", "-")
    score_reasons = indicators.get("score_reasons", [])
    rsi6 = indicators.get("rsi6", "-")
    rsi12 = indicators.get("rsi12", "-")
    volume_ratio = indicators.get("volume_ratio", "-")
    volume_signal = indicators.get("volume_signal", "-")

    reasons_text = "；".join(score_reasons) if score_reasons else "无"

    return (
        f"你是股票分析助手。请基于以下真实行情和技术指标数据，回答用户的问题。\n\n"
        f"## 用户问题\n{question}\n\n"
        f"## 股票信息\n"
        f"- 代码：{stock_code}\n"
        f"- 名称：{stock_name}\n"
        f"- 当前价：{price}\n"
        f"- 涨跌幅：{change_pct}%\n\n"
        f"## 技术指标\n"
        f"- MA5：{ma5}\n"
        f"- MA10：{ma10}\n"
        f"- MA20：{ma20}\n"
        f"- 乖离率（MA5）：{bias_ma5}%\n"
        f"- 乖离率（MA10）：{bias_ma10}%\n"
        f"- 乖离率（MA20）：{bias_ma20}%\n"
        f"- 均线趋势：{ma_trend}\n"
        f"- RSI(6)：{rsi6}\n"
        f"- RSI(12)：{rsi12}\n"
        f"- 成交量比值：{volume_ratio}\n"
        f"- 成交量信号：{volume_signal}\n\n"
        f"## 规则分析结果\n"
        f"- 综合评分：{score}/100\n"
        f"- 评分原因：{reasons_text}\n"
        f"- 趋势判断：{trend}\n"
        f"- 基础建议：{action}\n"
        f"- 分析摘要：{summary}\n\n"
        f"## 风险提示\n"
        + "\n".join(f"- {r}" for r in risks)
        + "\n\n"
        f"## 回答要求\n"
        f"1. 只能基于以上提供的数据进行分析。\n"
        f"2. 不编造实时行情或未提供的数据。\n"
        f"3. 不给确定性买卖指令。\n"
        f"4. 回答末尾必须包含：仅供学习参考，不构成投资建议。\n"
        f"5. 风格简洁、清楚、适合新手理解。\n"
        f"6. 先直接回答用户问题，再补充技术指标分析。\n"
        f"7. 当前会话围绕 {stock_name}（{stock_code}），如果用户问到其他股票，提示当前会话只分析该股票。"
    )


def ask_llm(
    stock_code: str,
    stock_name: str,
    price: float,
    change_pct: float,
    trend: str,
    action: str,
    score: int,
    summary: str,
    risks: list[str],
    indicators: dict,
    question: str,
    conversation_messages: list[dict] | None = None,
) -> str:
    api_key, base_url, model = _get_llm_config()

    url = f"{base_url.rstrip('/')}/chat/completions"
    prompt = _build_prompt(
        stock_code=stock_code,
        stock_name=stock_name,
        price=price,
        change_pct=change_pct,
        trend=trend,
        action=action,
        score=score,
        summary=summary,
        risks=risks,
        indicators=indicators,
        question=question,
    )

    messages = [{"role": "system", "content": "你是股票分析助手。"}]

    if conversation_messages:
        for msg in conversation_messages:
            messages.append({
                "role": msg["role"],
                "content": msg["content"],
            })

    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1024,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    logger.info("LLM 请求开始: model=%s", model)
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=60)
        resp.raise_for_status()
        data = resp.json()
    except requests.Timeout as error:
        logger.error("LLM 请求超时: model=%s", model)
        raise LlmApiError("大模型请求超时，请稍后重试") from error
    except requests.RequestException as error:
        logger.error("LLM 请求失败: model=%s, error=%s", model, error)
        raise LlmApiError(f"大模型请求失败：{error}") from error

    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as error:
        logger.error("LLM 返回格式异常: %s", error)
        raise LlmApiError("大模型返回格式异常") from error

    logger.info("LLM 请求成功: model=%s, tokens=%s",
                model, data.get("usage", {}).get("total_tokens", "N/A"))
    return content.strip()

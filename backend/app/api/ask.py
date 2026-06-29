from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config.settings import settings
from app.database import get_current_user_id
from app.errors import ErrorCode, api_error
from app.services.ask_service import (
    _build_rule_answer,
    _build_conversation_title,
    _create_ask_session,
    _get_ask_session,
    _update_ask_session,
    _write_ask_message,
    _get_ask_messages,
    _write_or_update_ask_record,
)
from app.services.agent_loop import run_agent_loop
from app.services.llm_client import LlmError, ask_llm, ask_llm_stream
from app.services.indicators_schema import Indicators
from app.services.market_data import MarketDataError, get_stock_history, get_stock_quote
from app.services.news_fetcher import fetch_news
from app.services.report_builder import build_analysis_report
from app.services.stock_resolver import get_supported_names, resolve_stock_input
from app.services.technical_indicators import build_technical_indicators

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["ask"])


class AskCreate(BaseModel):
    question: str | None = None
    stock_code: str | None = None
    session_id: str | None = None


class AskResponse(BaseModel):
    stock_code: str
    stock_name: str
    price: float
    change_pct: float
    trend: str
    action: str
    score: int
    question: str | None = None
    answer: str
    answer_type: str = "rule"
    ai_status: str = "ok"
    risks: list[str]
    indicators: Indicators
    model: str | None = None
    session_id: str | None = None
    message_id: int | None = None
    is_new_session: bool = False
    conversation_title: str | None = None
    news: list[dict] | None = None


def _extract_stock_code(text: str) -> str | None:
    return resolve_stock_input(text)


@router.post("/ask", response_model=AskResponse)
def ask_stock(ask: AskCreate, user_id: str = Depends(get_current_user_id)):
    logger.info("问股请求: session=%s, stock=%s, question=%.40s",
                 ask.session_id, ask.stock_code, ask.question or "")
    # --- resolve session ---
    session = None
    is_new_session = False
    if ask.session_id:
        session = _get_ask_session(ask.session_id, user_id)
        if session is None:
            raise api_error(400, ErrorCode.SESSION_NOT_FOUND, "会话不存在")

    # --- resolve stock code ---
    stock_code = None
    if session:
        stock_code = session["stock_code"]
        requested_stock_code = _extract_stock_code(ask.question or "")
        if requested_stock_code and requested_stock_code != stock_code:
            # 用户问了其他股票，允许但提示切换
            stock_code = requested_stock_code
            session = None  # 重新获取新股票的数据
    elif ask.stock_code:
        stock_code = ask.stock_code.strip()
    elif ask.question:
        extracted = _extract_stock_code(ask.question)
        if not extracted:
            supported = "、".join(get_supported_names())
            raise api_error(400, ErrorCode.STOCK_NOT_FOUND,
                             f"问题中未找到 6 位股票代码或已支持的股票名称（当前支持：{supported}），请提供例如：600519 怎么看？")
        stock_code = extracted
    else:
        raise api_error(400, ErrorCode.MISSING_STOCK_CODE, "请提供股票代码或包含股票代码的问题")

    # --- fetch market data ---
    try:
        quote = get_stock_quote(stock_code)
        history = get_stock_history(stock_code)
    except MarketDataError as error:
        raise api_error(400, ErrorCode.MARKET_DATA_ERROR, str(error)) from error

    technicals = build_technical_indicators(quote, history)
    report = build_analysis_report(quote, technicals)

    # --- fetch news ---
    news = fetch_news(stock_code, report["stock_name"])

    # --- generate answer ---
    answer_type = "rule"
    ai_status = "fallback"
    model_name = settings.LLM_MODEL or None
    answer = _build_rule_answer(report)

    try:
        conversation_messages = None
        if session:
            conversation_messages = _get_ask_messages(session["session_id"], user_id)

        ai_answer = ask_llm(
            stock_code=report["stock_code"],
            stock_name=report["stock_name"],
            price=report["price"],
            change_pct=report["indicators"]["change_pct"],
            trend=report["trend"],
            action=report["action"],
            score=report["score"],
            summary=report["summary"],
            risks=report["risks"],
            indicators=report["indicators"],
            question=ask.question or f"{stock_code} 怎么样？",
            conversation_messages=conversation_messages,
            news=news,
        )
        answer_type = "ai"
        ai_status = "ok"
        answer = ai_answer
    except LlmError:
        logger.warning("LLM 调用失败，降级为规则回答: stock=%s", stock_code)

    # --- save session & messages ---
    if session:
        # existing session: update and append messages
        summary = answer[:80] if len(answer) > 80 else answer
        _update_ask_session(
            session["session_id"], ask.question or "", answer, summary,
            answer_type, ai_status, model_name,
        )
        _write_ask_message(session["session_id"], user_id, "user", ask.question or "")
        message_id = _write_ask_message(
            session["session_id"], user_id, "assistant", answer,
            answer_type=answer_type, ai_status=ai_status, model=model_name,
        )
        _write_or_update_ask_record(
            report, ask.question or "", answer, answer_type, ai_status,
            model_name, user_id, session["session_id"], is_new=False,
        )
        session_id = session["session_id"]
        title = session["title"]
    else:
        # new session
        title = _build_conversation_title(report["stock_name"], report["stock_code"])
        summary = answer[:80] if len(answer) > 80 else answer
        session_id = _create_ask_session(
            user_id, report["stock_code"], report["stock_name"], title, summary,
            ask.question or "", answer, answer_type, ai_status, model_name,
        )
        _write_ask_message(session_id, user_id, "user", ask.question or "")
        message_id = _write_ask_message(
            session_id, user_id, "assistant", answer,
            answer_type=answer_type, ai_status=ai_status, model=model_name,
        )
        _write_or_update_ask_record(
            report, ask.question or "", answer, answer_type, ai_status,
            model_name, user_id, session_id, is_new=True,
        )
        is_new_session = True

    return {
        "stock_code": report["stock_code"],
        "stock_name": report["stock_name"],
        "price": report["price"],
        "change_pct": report["indicators"]["change_pct"],
        "trend": report["trend"],
        "action": report["action"],
        "score": report["score"],
        "question": ask.question,
        "answer": answer,
        "answer_type": answer_type,
        "ai_status": ai_status,
        "risks": report["risks"],
        "indicators": report["indicators"],
        "model": model_name,
        "session_id": session_id,
        "message_id": message_id,
        "is_new_session": is_new_session,
        "conversation_title": title,
        "news": news,
    }


def _build_report(stock_code: str) -> dict:
    """获取行情数据、计算指标、生成分析报告。"""
    quote = get_stock_quote(stock_code)
    history = get_stock_history(stock_code)
    technicals = build_technical_indicators(quote, history)
    return build_analysis_report(quote, technicals)


@router.post("/ask/stream")
def ask_stock_stream(
    ask: AskCreate,
    authorization: str = Header(...),
):
    user_id = get_current_user_id(authorization)

    # --- resolve stock code ---
    stock_code = None
    if ask.stock_code:
        stock_code = ask.stock_code.strip()
    elif ask.question:
        extracted = _extract_stock_code(ask.question)
        if not extracted:
            supported = "、".join(get_supported_names())
            raise api_error(400, ErrorCode.STOCK_NOT_FOUND,
                             f"问题中未找到 6 位股票代码或已支持的股票名称（当前支持：{supported}），请提供例如：600519 怎么看？")
        stock_code = extracted
    else:
        raise api_error(400, ErrorCode.MISSING_STOCK_CODE, "请提供股票代码或包含股票代码的问题")

    # --- fetch market data & build report ---
    try:
        report = _build_report(stock_code)
    except MarketDataError as error:
        raise api_error(400, ErrorCode.MARKET_DATA_ERROR, str(error)) from error

    # --- fetch news ---
    news = fetch_news(stock_code, report["stock_name"])

    # --- resolve conversation context ---
    conversation_messages = None
    session = None
    is_new_session = False
    if ask.session_id:
        session = _get_ask_session(ask.session_id, user_id)
        if session:
            conversation_messages = _get_ask_messages(ask.session_id, user_id)

    # --- create session & write user message before streaming ---
    answer_type = "ai"
    ai_status = "ok"
    model_name = settings.LLM_MODEL or None

    if session:
        session_id = session["session_id"]
        title = session["title"]
        stock_name = session["stock_name"]
        _write_ask_message(session_id, user_id, "user", ask.question or "")
    else:
        title = _build_conversation_title(report["stock_name"], report["stock_code"])
        session_id = _create_ask_session(
            user_id, report["stock_code"], report["stock_name"], title, "",
            ask.question or "", "", answer_type, ai_status, model_name,
        )
        _write_ask_message(session_id, user_id, "user", ask.question or "")
        is_new_session = True

    # --- build result data for frontend ---
    result_data = json.dumps({
        "stock_code": report["stock_code"],
        "stock_name": report["stock_name"],
        "price": report["price"],
        "change_pct": report["indicators"]["change_pct"],
        "trend": report["trend"],
        "action": report["action"],
        "score": report["score"],
        "risks": report["risks"],
        "indicators": report["indicators"],
        "session_id": session_id,
        "is_new_session": is_new_session,
        "conversation_title": title,
        "news": news,
    })

    # --- stream LLM answer with post-save ---
    def _stream_and_save():
        full_answer = ""
        used_llm = True
        try:
            for chunk in ask_llm_stream(
                stock_code=report["stock_code"],
                stock_name=report["stock_name"],
                price=report["price"],
                change_pct=report["indicators"]["change_pct"],
                trend=report["trend"],
                action=report["action"],
                score=report["score"],
                summary=report["summary"],
                risks=report["risks"],
                indicators=report["indicators"],
                question=ask.question or f"{stock_code} 怎么样？",
                conversation_messages=conversation_messages,
                news=news,
            ):
                full_answer += chunk
                yield chunk
        except LlmError:
            logger.warning("LLM 流式调用失败，降级为规则回答: stock=%s", stock_code)
            used_llm = False
            rule_answer = _build_rule_answer(report)
            full_answer = rule_answer
            yield rule_answer
        finally:
            # save session & record after streaming ends
            if full_answer:
                summary = full_answer[:80] if len(full_answer) > 80 else full_answer
                final_answer_type = "ai" if used_llm else "rule"
                final_ai_status = "ok" if used_llm else "fallback"
                if session:
                    _update_ask_session(session_id, ask.question or "", full_answer, summary,
                                        final_answer_type, final_ai_status, model_name)
                    _write_ask_message(session_id, user_id, "assistant", full_answer,
                                       answer_type=final_answer_type, ai_status=final_ai_status, model=model_name)
                    _write_or_update_ask_record(
                        report, ask.question or "", full_answer, final_answer_type, final_ai_status,
                        model_name, user_id, session_id, is_new=False,
                    )
                else:
                    _update_ask_session(session_id, ask.question or "", full_answer, summary,
                                        final_answer_type, final_ai_status, model_name)
                    _write_ask_message(session_id, user_id, "assistant", full_answer,
                                       answer_type=final_answer_type, ai_status=final_ai_status, model=model_name)
                    _write_or_update_ask_record(
                        report, ask.question or "", full_answer, final_answer_type, final_ai_status,
                        model_name, user_id, session_id, is_new=True,
                    )

    return StreamingResponse(
        _stream_and_save(),
        media_type="text/event-stream",
        headers={
            "X-Result-Data": result_data,
            "Cache-Control": "no-cache",
        },
    )


@router.post("/ask/agent/stream")
def ask_agent_stream(
    ask: AskCreate,
    authorization: str = Header(...),
):
    """Agent 模式问股（Function Calling），流式返回 SSE 事件。"""
    user_id = get_current_user_id(authorization)

    # --- resolve session (必须先于 stock_code，因为多轮对话时问题可能不含股票代码) ---
    session = None
    is_new_session = False
    if ask.session_id:
        session = _get_ask_session(ask.session_id, user_id)

    # --- resolve stock code (不再强制校验，让 LLM 自行通过 search_stock 搜索) ---
    stock_code = None
    stock_name = None
    if session:
        stock_code = session["stock_code"]
        stock_name = session["stock_name"]
    elif ask.stock_code:
        stock_code = ask.stock_code.strip()
    elif ask.question:
        extracted = _extract_stock_code(ask.question)
        if extracted:
            stock_code = extracted
    # stock_code 为 None 时由 LLM 自行处理

    # --- build conversation messages ---
    conversation_messages = None
    if session:
        conversation_messages = _get_ask_messages(session["session_id"], user_id)

    # --- create session & write user message before streaming ---
    model_name = settings.LLM_MODEL or None

    if session:
        session_id = session["session_id"]
        title = session["title"]
        stock_name = session["stock_name"]
        _write_ask_message(session_id, user_id, "user", ask.question or "")
    else:
        # 未指定股票时创建通用会话
        if stock_code:
            from app.services.market_data import get_stock_quote
            try:
                quote = get_stock_quote(stock_code)
                stock_name = quote.name
            except Exception:
                stock_name = stock_code
        else:
            stock_name = "通用"
        title = ask.question[:20] if ask.question and not stock_code else _build_conversation_title(stock_name or "通用", stock_code or "未知")
        session_id = _create_ask_session(
            user_id, stock_code or "", stock_name or "通用", title, "",
            ask.question or "", "", "ai", "ok", model_name,
        )
        _write_ask_message(session_id, user_id, "user", ask.question or "")
        is_new_session = True

    # --- build system prompt (原则式，LLM 自主决定回答结构) ---
    system_prompt = (
        "你是专业的股票分析助手，面向个人投资者。\n"
        "你的原则：\n"
        "  1. 所有结论必须基于通过工具获取的真实数据，不猜测、不编造。\n"
        "  2. 引用新闻时使用 Markdown 链接格式：[标题](url)，方便用户点击查看。\n"
        "  3. 如果用户未明确指定股票代码或名称，先调用 search_stock 搜索。\n"
        "  4. 搜索不到则基于已有知识回答或请用户补充说明。\n"
        "  5. 回答末尾必须包含：仅供学习参考，不构成投资建议。\n"
        "你可以使用以下工具：\n"
        "  - search_stock：搜索股票代码或名称\n"
        "  - get_stock_quote：获取实时行情\n"
        "  - get_technical_indicators：获取技术指标\n"
        "  - get_stock_news：获取相关新闻\n"
        "  - get_analysis_report：获取综合分析报告\n"
        "根据用户问题，自主决定调用哪些工具以及如何组织回答。"
    )

    # --- build user messages (含多轮对话上下文) ---
    user_messages = []
    if session:
        # 注入上一轮的股票上下文
        context_parts = [f"当前对话围绕 {session['stock_name']}（{session['stock_code']}）。"]
        if session.get("last_question"):
            context_parts.append(f"上一轮用户问题：{session['last_question']}")
        user_messages.append({
            "role": "system",
            "content": " ".join(context_parts),
        })
    if conversation_messages:
        for msg in conversation_messages:
            user_messages.append({"role": msg["role"], "content": msg["content"]})
    user_messages.append({"role": "user", "content": ask.question or ""})

    # --- build minimal report for record saving ---
    def _build_minimal_report(code: str) -> dict:
        from app.services.market_data import get_stock_history, get_stock_quote
        from app.services.technical_indicators import build_technical_indicators
        from app.services.report_builder import build_analysis_report
        try:
            quote = get_stock_quote(code)
            history = get_stock_history(code)
            technicals = build_technical_indicators(quote, history)
            report = build_analysis_report(quote, technicals)
            return {
                "stock_code": quote.code,
                "stock_name": quote.name,
                "price": quote.price,
                "score": report["score"],
                "action": report["action"],
                "trend": report["trend"],
                "risks": report.get("risks", []),
                "indicators": {
                    "change_pct": quote.change_pct,
                    "turnover_rate": quote.turnover_rate,
                    "amplitude": quote.amplitude,
                    **technicals,
                },
            }
        except Exception:
            return {
                "stock_code": code,
                "stock_name": code,
                "price": 0,
                "score": 0,
                "action": "分析",
                "trend": "待评估",
                "risks": [],
                "indicators": {"change_pct": 0},
            }

    # --- run agent loop ---
    def _stream_agent():
        full_answer = ""
        thinking_steps = []  # 收集 thinking 事件
        try:
            for sse_event in run_agent_loop(
                system_prompt=system_prompt,
                messages=user_messages,
                session_id=session_id,
            ):
                yield sse_event
                # 解析 JSON 事件
                try:
                    data_str = sse_event
                    if data_str.startswith("data: "):
                        data_str = data_str[6:]
                    evt = json.loads(data_str.strip())
                    evt_type = evt.get("type")
                    if evt_type in ("thinking", "tool_start", "tool_done"):
                        thinking_steps.append(evt)
                    elif evt_type == "text" and evt.get("content"):
                        full_answer += evt["content"]
                except Exception:
                    pass
        finally:
            # 保存会话 & 记录
            logger.info("[DEBUG] Agent 流结束: full_answer_len=%d, session_id=%s, has_session=%s",
                        len(full_answer), session_id, session is not None)
            if full_answer:
                try:
                    thinking_json = json.dumps(thinking_steps, ensure_ascii=False) if thinking_steps else None
                    summary = full_answer[:80] if len(full_answer) > 80 else full_answer
                    final_answer_type = "ai"
                    final_ai_status = "ok"
                    if stock_code:
                        logger.info("[DEBUG] 开始构建 minimal_report")
                        minimal_report = _build_minimal_report(stock_code)
                        logger.info("[DEBUG] minimal_report 构建完成: score=%s", minimal_report.get("score"))
                    else:
                        minimal_report = None
                    if session:
                        logger.info("[DEBUG] 更新已有会话: session=%s", session_id)
                        _update_ask_session(session_id, ask.question or "", full_answer, summary,
                                            final_answer_type, final_ai_status, model_name)
                        _write_ask_message(session_id, user_id, "assistant", full_answer,
                                           answer_type=final_answer_type, ai_status=final_ai_status,
                                           model=model_name, thinking_json=thinking_json)
                        if minimal_report:
                            _write_or_update_ask_record(
                                minimal_report, ask.question or "", full_answer, final_answer_type, final_ai_status,
                                model_name, user_id, session_id, is_new=False,
                            )
                    else:
                        logger.info("[DEBUG] 创建新会话: stock=%s", stock_code)
                        _update_ask_session(session_id, ask.question or "", full_answer, summary,
                                            final_answer_type, final_ai_status, model_name)
                        _write_ask_message(session_id, user_id, "assistant", full_answer,
                                           answer_type=final_answer_type, ai_status=final_ai_status,
                                           model=model_name, thinking_json=thinking_json)
                        if minimal_report:
                            _write_or_update_ask_record(
                                minimal_report, ask.question or "", full_answer, final_answer_type, final_ai_status,
                                model_name, user_id, session_id, is_new=True,
                            )
                    logger.info("[DEBUG] Agent 记录保存成功")
                except Exception as e:
                    logger.error("[DEBUG] 保存 Agent 会话记录失败: %s", e, exc_info=True)
            else:
                logger.warning("[DEBUG] full_answer 为空，跳过保存")

    return StreamingResponse(
        _stream_agent(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

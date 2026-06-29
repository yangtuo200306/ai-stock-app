from __future__ import annotations

import json
import logging
import time
from typing import Any, Generator

from app.services.llm_client import LlmError, ask_llm_with_tools_stream
from app.services.tool_factory import create_tool_registry
from app.services.tool_registry import TOOL_DISPLAY_NAMES

logger = logging.getLogger(__name__)

# 全局缓存工具注册表（跨请求共享）
_tool_registry = None


def _get_tool_registry():
    global _tool_registry
    if _tool_registry is None:
        _tool_registry = create_tool_registry()
    return _tool_registry


def run_agent_loop(
    system_prompt: str,
    messages: list[dict[str, Any]],
    session_id: str = "",
    max_steps: int = 5,
    step_timeout: float = 30.0,
    overall_timeout: float = 120.0,
) -> Generator[str, None, None]:
    """
    Agent 执行循环，逐条 yield SSE 事件字符串。

    事件类型:
      - {"type":"thinking","message":str}
      - {"type":"tool_start","tool":str,"display_name":str}
      - {"type":"tool_done","tool":str,"success":bool,"duration":float}
      - {"type":"text","content":str}
      - {"type":"done","success":bool,"error":str|None}
    """
    registry = _get_tool_registry()
    # 排除 search_stock（股票代码已在 ask.py 中预解析）
    tools = [t for t in registry.get_openai_tools() if t["function"]["name"] != "search_stock"]
    start_time = time.time()

    # 构建完整的 messages 列表（含 system prompt）
    full_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        full_messages.append({"role": msg["role"], "content": msg["content"]})

    # 只在开始时发一次 thinking 事件
    yield _event("thinking", message="AI 正在分析...")

    for step in range(max_steps):
        # 检查整体超时
        if time.time() - start_time > overall_timeout:
            yield _event("done", success=False, error="Agent 执行超时")
            return

        # 调用 LLM（流式，带 tools）
        llm_result = {"content": "", "tool_calls": []}
        step_start = time.time()

        try:
            for event in ask_llm_with_tools_stream(full_messages, tools):
                if event["type"] == "text":
                    llm_result["content"] += event["content"]
                    # 还没检测到 tool_calls → 这是最终答案的流式文本，透传
                    if not llm_result["tool_calls"]:
                        yield _event("text", content=event["content"])
                elif event["type"] == "tool_call_start":
                    # 开始收到 tool_call，记录 id 和 name
                    llm_result["tool_calls"].append({
                        "id": event["id"],
                        "name": event["name"],
                        "arguments": "",
                    })
                elif event["type"] == "tool_call_arg":
                    # 累积参数
                    for tc in llm_result["tool_calls"]:
                        if tc["id"] == event["id"]:
                            tc["arguments"] += event["arguments"]
                            break
        except LlmError as e:
            logger.error("Agent 第 %d 步 LLM 调用失败: %s", step + 1, e)
            yield _event("done", success=False, error=str(e))
            return

        # 检查单步超时
        if time.time() - step_start > step_timeout:
            yield _event("done", success=False, error=f"第 {step + 1} 步执行超时")
            return

        # 判断 LLM 返回了 tool_calls 还是文本
        if llm_result["tool_calls"]:
            # --- 执行工具 ---
            # 将 assistant 消息（含 tool_calls）追加到 full_messages
            assistant_msg = {"role": "assistant", "content": llm_result["content"]}
            openai_tool_calls = []
            for tc in llm_result["tool_calls"]:
                openai_tool_calls.append({
                    "id": tc["id"],
                    "type": "function",
                    "function": {
                        "name": tc["name"],
                        "arguments": tc["arguments"],
                    },
                })
            if openai_tool_calls:
                assistant_msg["tool_calls"] = openai_tool_calls
            full_messages.append(assistant_msg)

            # 逐个执行工具
            for tc in llm_result["tool_calls"]:
                tool_name = tc["name"]
                display_name = TOOL_DISPLAY_NAMES.get(tool_name, tool_name)

                yield _event("tool_start", tool=tool_name, display_name=display_name)

                # 解析参数
                try:
                    args = json.loads(tc["arguments"]) if tc["arguments"] else {}
                except json.JSONDecodeError:
                    args = {}

                # 执行
                tool_start = time.time()
                result_str = registry.execute(tool_name, **args)
                tool_duration = time.time() - tool_start

                yield _event(
                    "tool_done",
                    tool=tool_name,
                    display_name=display_name,
                    success=True,
                    duration=round(tool_duration, 2),
                )

                # 将 tool 结果追加到 messages
                full_messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": result_str,
                })

            # 继续下一轮循环
            continue
        else:
            # --- LLM 返回文本，没有 tool_calls → 最终答案 ---
            # 文本已经在流式循环中逐 chunk yield 了
            logger.info("[DEBUG] LLM 最终返回: content_len=%d, content_preview=%s",
                        len(llm_result["content"]), llm_result["content"][:100] if llm_result["content"] else "EMPTY")
            if llm_result["content"]:
                full_messages.append({"role": "assistant", "content": llm_result["content"]})

            yield _event("done", success=True, session_id=session_id, full_answer=llm_result["content"])
            return

    # 超过 max_steps
    yield _event("done", success=False, error=f"Agent 执行超过最大步数（{max_steps}）")


def _event(type_: str, **kwargs) -> str:
    """构造 SSE 事件字符串。"""
    data = {"type": type_, **kwargs}
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

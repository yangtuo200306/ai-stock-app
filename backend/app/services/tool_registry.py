from __future__ import annotations

import json
import logging
from typing import Any, Callable

logger = logging.getLogger(__name__)


class ToolDefinition:
    """单个工具定义，包含 OpenAI 格式的 function schema 和 handler。"""

    def __init__(
        self,
        name: str,
        description: str,
        parameters: dict[str, Any],
        handler: Callable[..., Any],
    ):
        self.name = name
        self.description = description
        self.parameters = parameters
        self.handler = handler

    def to_openai_tool(self) -> dict[str, Any]:
        """转换为 OpenAI Function Calling 格式。"""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


class ToolRegistry:
    """工具注册表，管理所有可用工具。"""

    def __init__(self):
        self._tools: dict[str, ToolDefinition] = {}

    def register(self, tool: ToolDefinition) -> None:
        self._tools[tool.name] = tool
        logger.debug("工具已注册: %s", tool.name)

    def get(self, name: str) -> ToolDefinition | None:
        return self._tools.get(name)

    def get_openai_tools(self) -> list[dict[str, Any]]:
        return [t.to_openai_tool() for t in self._tools.values()]

    def execute(self, name: str, **kwargs: Any) -> str:
        """执行工具，返回 JSON 字符串结果。"""
        tool = self.get(name)
        if not tool:
            return json.dumps({"error": f"未知工具: {name}"}, ensure_ascii=False)

        logger.info("执行工具: %s, 参数: %s", name, kwargs)
        try:
            result = tool.handler(**kwargs)
            # 确保结果可 JSON 序列化
            return json.dumps(result, ensure_ascii=False, default=str)
        except Exception as e:
            logger.error("工具执行失败: %s, error=%s", name, e)
            return json.dumps({"error": str(e)}, ensure_ascii=False)


# 工具显示名称映射（前端展示用）
TOOL_DISPLAY_NAMES: dict[str, str] = {
    "get_stock_quote": "获取实时行情",
    "get_technical_indicators": "计算技术指标",
    "get_stock_news": "获取相关新闻",
    "get_analysis_report": "生成分析报告",
    "search_stock": "搜索股票",
    "get_market_indices": "获取大盘行情",
    "get_sector_rankings": "获取板块排行",
}

from __future__ import annotations

from app.services.market_data import get_stock_quote as _get_stock_quote
from app.services.technical_indicators import build_technical_indicators as _build_technical_indicators
from app.services.market_data import get_stock_history as _get_stock_history
from app.services.news_fetcher import fetch_news as _fetch_news
from app.services.report_builder import build_analysis_report as _build_analysis_report
from app.services.stock_resolver import resolve_stock_input as _resolve_stock_input
from app.services.tool_registry import ToolRegistry, ToolDefinition


def _handle_get_stock_quote(stock_code: str) -> dict:
    """获取个股实时行情。"""
    from app.services.market_data import get_stock_quote
    quote = get_stock_quote(stock_code)
    return {
        "stock_code": quote.code,
        "stock_name": quote.name,
        "price": quote.price,
        "change_pct": quote.change_pct,
        "turnover_rate": quote.turnover_rate,
        "amplitude": quote.amplitude,
    }


def _handle_get_technical_indicators(stock_code: str) -> dict:
    """计算技术指标。"""
    quote = _get_stock_quote(stock_code)
    history = _get_stock_history(stock_code)
    indicators = _build_technical_indicators(quote, history)
    return indicators


def _handle_get_stock_news(stock_code: str, stock_name: str | None = None) -> list[dict]:
    """获取个股相关新闻。"""
    if not stock_name:
        quote = _get_stock_quote(stock_code)
        stock_name = quote.name
    news = _fetch_news(stock_code, stock_name)
    return news


def _handle_get_analysis_report(stock_code: str) -> dict:
    """获取综合分析报告（评分+趋势+建议）。"""
    quote = _get_stock_quote(stock_code)
    history = _get_stock_history(stock_code)
    indicators = _build_technical_indicators(quote, history)
    report = _build_analysis_report(quote, indicators)
    return report


def _handle_search_stock(query: str) -> dict:
    """搜索股票代码/名称。"""
    code = _resolve_stock_input(query)
    if code:
        return {"found": True, "stock_code": code}
    return {"found": False, "stock_code": None}


def create_tool_registry() -> ToolRegistry:
    """创建并注册所有工具。"""
    registry = ToolRegistry()

    registry.register(ToolDefinition(
        name="get_stock_quote",
        description="获取 A 股个股实时行情数据，包括当前价格、涨跌幅、成交量、成交额等。",
        parameters={
            "type": "object",
            "properties": {
                "stock_code": {
                    "type": "string",
                    "description": "6 位股票代码，如 600519",
                },
            },
            "required": ["stock_code"],
        },
        handler=_handle_get_stock_quote,
    ))

    registry.register(ToolDefinition(
        name="get_technical_indicators",
        description="获取个股技术指标数据，包括均线（MA5/MA10/MA20）、RSI、成交量比、乖离率等。",
        parameters={
            "type": "object",
            "properties": {
                "stock_code": {
                    "type": "string",
                    "description": "6 位股票代码，如 600519",
                },
            },
            "required": ["stock_code"],
        },
        handler=_handle_get_technical_indicators,
    ))

    registry.register(ToolDefinition(
        name="get_stock_news",
        description="获取个股相关的最新新闻资讯，包含标题、来源、发布时间。",
        parameters={
            "type": "object",
            "properties": {
                "stock_code": {
                    "type": "string",
                    "description": "6 位股票代码，如 600519",
                },
                "stock_name": {
                    "type": "string",
                    "description": "股票名称（可选，不传则自动获取）",
                },
            },
            "required": ["stock_code"],
        },
        handler=_handle_get_stock_news,
    ))

    registry.register(ToolDefinition(
        name="get_analysis_report",
        description="获取个股的综合分析报告，包含综合评分（0-100）、趋势判断、操作建议、分析摘要和风险提示。",
        parameters={
            "type": "object",
            "properties": {
                "stock_code": {
                    "type": "string",
                    "description": "6 位股票代码，如 600519",
                },
            },
            "required": ["stock_code"],
        },
        handler=_handle_get_analysis_report,
    ))

    registry.register(ToolDefinition(
        name="search_stock",
        description="搜索股票代码或名称，从用户输入中提取 6 位股票代码。",
        parameters={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "用户输入，如 '600519' 或 '贵州茅台'",
                },
            },
            "required": ["query"],
        },
        handler=_handle_search_stock,
    ))

    return registry

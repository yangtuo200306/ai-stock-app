import re

# 内置常用 A 股名称到代码的映射
_STOCK_NAME_MAP: dict[str, str] = {
    "平安银行": "000001",
    "万科A": "000002",
    "万科Ａ": "000002",
    "贵州茅台": "600519",
    "招商银行": "600036",
    "宁德时代": "300750",
    "比亚迪": "002594",
    "五粮液": "000858",
    "中国平安": "601318",
    "工商银行": "601398",
    "东方财富": "300059",
}


def resolve_stock_input(text: str) -> str | None:
    """从用户输入中解析股票代码。

    优先级：
    1. 6 位股票代码
    2. 内置股票名称映射
    3. 返回 None 表示无法识别
    """
    if not text:
        return None

    # 1. 6 位股票代码
    match = re.search(r"\b(\d{6})\b", text)
    if match:
        return match.group(1)

    # 2. 股票名称映射
    for name, code in _STOCK_NAME_MAP.items():
        if name in text:
            return code

    return None


def get_supported_names() -> list[str]:
    """返回当前支持的股票名称列表。"""
    return list(_STOCK_NAME_MAP.keys())

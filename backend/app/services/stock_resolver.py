import json
import re
from pathlib import Path

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

# 股票索引缓存
_stock_index: list[tuple[str, str]] | None = None


def _load_stock_index() -> list[tuple[str, str]]:
    """加载股票索引文件到内存。"""
    global _stock_index
    if _stock_index is not None:
        return _stock_index

    index_path = Path(__file__).resolve().parent.parent.parent / "data" / "stocks.index.json"
    if index_path.exists():
        try:
            with open(index_path, encoding="utf-8") as f:
                data = json.load(f)
            _stock_index = [(item[0], item[1]) for item in data]
        except (json.JSONDecodeError, IndexError, OSError):
            _stock_index = []
    else:
        _stock_index = []

    return _stock_index


def _search_stock_index(text: str) -> str | None:
    """在股票索引中按代码前缀或名称模糊搜索。"""
    index = _load_stock_index()
    if not index:
        return None

    lower_text = text.lower()

    # 1. 按代码前缀匹配
    for code, name in index:
        if code.startswith(lower_text):
            return code

    # 2. 股票全名出现在用户输入中（如"贵州茅台" in "贵州茅台 怎么样"）
    for code, name in index:
        if name.lower() in lower_text:
            return code

    # 3. 用户输入是股票名称的一部分（如"茅台"→"贵州茅台"）
    for code, name in index:
        if lower_text in name.lower():
            return code

    # 4. 分词匹配：用户输入中的某个词匹配到股票名称
    tokens = re.split(r'[\s,，、.。!！?？]+', lower_text)
    for token in tokens:
        if len(token) < 2:
            continue
        for code, name in index:
            if token in name.lower():
                return code

    return None


def resolve_stock_input(text: str) -> str | None:
    """从用户输入中解析股票代码。

    优先级：
    1. 6 位股票代码
    2. 内置股票名称映射
    3. 股票索引模糊搜索（兜底）
    4. 返回 None 表示无法识别
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

    # 3. 股票索引模糊搜索（兜底）
    result = _search_stock_index(text)
    if result:
        return result

    return None


def get_supported_names() -> list[str]:
    """返回当前支持的股票名称列表。"""
    return list(_STOCK_NAME_MAP.keys())

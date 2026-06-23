# 代码阅读问题与隐患记录

本文件用于记录学习和阅读代码过程中发现的问题、隐患、阶段性限制和后续优化点。

记录原则：

- 简要记录，不展开长篇分析；
- 只记录已经观察到的问题或明确限制；
- 后续修复前再进入计划模式制定具体方案。

## 问题 1：analysis.py 中存在未使用导入

- 位置：`backend/app/api/analysis.py`
- 类型：代码清理
- 现象：导入了 `StockQuote`，但当前文件没有实际使用。
- 影响：不影响运行，但会造成代码噪音。
- 当前是否需要立即修：已修复。
- 后续建议：保持导入简洁，避免留下未使用导入。

## 问题 2：行情获取失败时没有写入 analysis_tasks 表

- 位置：`backend/app/api/analysis.py`
- 类型：功能隐患
- 现象：`get_stock_quote(...)` 失败时直接返回 `failed` 响应，但没有把失败任务写入 `analysis_tasks`。
- 影响：前端拿到 `task_id` 后，如果再调用 `GET /api/analysis/{task_id}`，可能查不到该失败任务。
- 当前是否需要立即修：已修复。
- 后续建议：继续保持失败任务可查询，后续可补充更友好的前端错误展示。

## 问题 3：market_data.py 每次单股票查询会拉取全市场行情

- 位置：`backend/app/services/market_data.py`
- 类型：性能隐患
- 现象：`ef.stock.get_realtime_quotes()` 可能返回整张市场行情表，然后再按股票代码筛选。
- 影响：单查一只股票时也会拉取大量数据，接口可能较慢，第三方接口压力也更大。
- 当前是否需要立即修：否，第三阶段最小接入可以接受。
- 后续建议：增加短时间缓存、寻找单股票行情接口，或后续加入更稳定的数据源 fallback。

## 问题 4：当前仅支持 6 位 A 股代码

- 位置：`backend/app/services/market_data.py`
- 类型：阶段性限制
- 现象：`normalize_a_share_code(...)` 只接受 6 位纯数字代码。
- 影响：`600519.SH`、`SH600519`、`HK00700`、`AAPL` 等格式会失败。
- 当前是否需要立即修：否。
- 后续建议：后续增加股票代码标准化逻辑，先扩展 A 股常见前后缀，再考虑港股、美股。

## 问题 5：前端添加自选股时未校验股票代码格式

- 位置：`mobile-app/src/screens/WatchlistScreen.tsx`
- 类型：输入校验隐患
- 现象：用户可以添加任意字符串作为股票代码。
- 影响：无效股票代码会保存到自选股列表，点击分析时才失败。
- 当前是否需要立即修：否。
- 后续建议：添加自选股前进行基础校验，例如先限制为 6 位数字，或调用后端行情接口验证股票是否存在。

## 问题 6：趋势判断规则过于粗糙

- 位置：`backend/app/api/analysis.py`
- 类型：业务规则限制
- 现象：当前只根据涨跌幅判断趋势：大于 1% 为“偏强”，小于 -1% 为“偏弱”，否则为“震荡”。
- 影响：分析结论比较简单，不具备真实技术分析能力。
- 当前是否需要立即修：否。
- 后续建议：后续接入历史 K 线和技术指标后，再用 MA、MACD、RSI、成交量等信息综合判断。

## 问题 7：ReportDetailScreen 直接读取 indicators 的松散字段

- 位置：`mobile-app/src/screens/ReportDetailScreen.tsx`
- 类型：类型设计隐患
- 现象：`indicators` 当前是 `Record<string, unknown>`，前端直接读取 `change_pct`、`source`、`fetched_at`。
- 影响：如果后端字段名变化，前端不会提前发现，只会运行时显示缺失。
- 当前是否需要立即修：否。
- 后续建议：定义更明确的 `ReportIndicators` 类型，例如 `change_pct?: number`、`source?: string`、`fetched_at?: string`。

## 问题 8：reports.py 对 JSON 字段缺少异常保护

- 位置：`backend/app/api/reports.py`
- 类型：健壮性隐患
- 现象：读取 `risks_json`、`indicators_json` 时依赖 `json.loads(...)`。
- 影响：如果数据库里的 JSON 字符串损坏，报告接口可能返回 500。
- 当前是否需要立即修：否。
- 后续建议：增加 `safe_json_loads` 工具函数，解析失败时返回默认值，例如 `[]` 或 `{}`。

## 问题 9：requirements.txt 没有固定版本号

- 位置：`backend/requirements.txt`
- 类型：依赖稳定性隐患
- 现象：依赖写成 `fastapi`、`uvicorn`、`efinance`，没有固定版本。
- 影响：以后重新安装时可能安装到新版本，第三方库字段或行为变化后可能导致代码失效。
- 当前是否需要立即修：否。
- 后续建议：阶段稳定后固定依赖版本，例如 `efinance==0.5.8`。

## 问题 10：第三方行情接口网络异常未转换为业务错误

- 位置：`backend/app/services/market_data.py`
- 类型：错误处理隐患
- 现象：`efinance` 请求东方财富接口失败时，会抛出网络异常，FastAPI 可能返回 500 Internal Server Error。
- 影响：用户只能看到内部服务器错误，看不到明确的行情失败原因。
- 当前是否需要立即修：已修复。
- 后续建议：继续观察 `efinance` 稳定性；如果频繁失败，考虑增加备用数据源或缓存。

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

## 问题 11：market_data.py 依赖 efinance 中文列名

- 位置：`backend/app/services/market_data.py`
- 类型：第三方数据结构隐患
- 现象：当前直接读取 `股票代码`、`股票名称`、`最新价`、`涨跌幅` 等中文列名。
- 影响：如果 `efinance` 或上游接口字段名变化，行情解析会失败。
- 当前是否需要立即修：否。
- 后续建议：增加字段存在性检查，或把字段名集中为常量并提供更明确的错误提示。

## 问题 12：行情内存缓存没有最大容量限制

- 位置：`backend/app/services/market_data.py`
- 类型：资源占用隐患
- 现象：`_quote_cache` 会按股票代码保存行情，但当前没有最大容量限制或过期清理机制。
- 影响：如果长期查询大量不同股票代码，缓存可能持续增长。
- 当前是否需要立即修：否，学习项目和 A 股代码规模下短期影响较小。
- 后续建议：后续可增加最大缓存数量，或定期清理过期缓存。

## 问题 13：_to_float 对未知格式错误提示不够业务化

- 位置：`backend/app/services/market_data.py`
- 类型：错误处理隐患
- 现象：`_to_float(...)` 会处理空值、`-`、`--`、`None`、`nan`，但没有捕获 `float(text)` 对未知格式的转换异常。
- 影响：如果第三方返回 `停牌`、`N/A` 等未知格式，可能抛出原始转换错误，提示不够友好。
- 当前是否需要立即修：已修复。
- 后续建议：继续观察第三方行情字段异常情况，必要时补充更多字段格式兼容。

## 问题 14：报告评分仍是固定值

- 位置：`backend/app/api/analysis.py`
- 类型：业务规则限制
- 现象：当前 `score` 固定为 `80`，不随行情或技术指标变化。
- 影响：报告评分仍然带有 mock 性质，不能反映真实分析结果。
- 当前是否需要立即修：否。
- 后续建议：接入历史 K 线和 MA / MACD / RSI 后，再设计评分规则。

## 问题 15：操作建议仍是固定值

- 位置：`backend/app/api/analysis.py`
- 类型：业务规则限制
- 现象：当前 `action` 固定为“观望”，未根据行情、趋势或技术指标生成。
- 影响：报告建议仍然带有 mock 性质，不能作为真实分析结论。
- 当前是否需要立即修：否。
- 后续建议：后续结合趋势、技术指标、风险提示生成更合理的建议。

## 问题 16：成功任务和报告的股票代码格式可能不一致

- 位置：`backend/app/api/analysis.py`
- 类型：数据一致性隐患
- 现象：成功报告保存 `quote.code` 标准化代码，但成功任务记录和接口返回仍使用 `analysis.stock_code` 原始输入。
- 影响：如果直接调用分析接口传入 `SH600519` 等格式，任务里的股票代码和报告里的股票代码可能不一致。
- 当前是否需要立即修：否。
- 后续建议：后续讨论是否让成功任务也保存标准化代码，或额外保留原始输入字段。

## 问题 17：历史报告列表接口暂不返回价格

- 位置：`backend/app/api/reports.py`、`mobile-app/src/screens/ReportHistoryScreen.tsx`
- 类型：阶段性限制
- 现象：`GET /api/reports` 当前只返回 `id`、`stock_code`、`stock_name`、`score`、`action`、`trend`、`created_at`，没有返回 `price`。
- 影响：历史报告列表页暂时无法展示“当前价格”，只能在报告详情页查看价格。
- 当前是否需要立即修：否，本阶段先完成历史报告最小列表闭环。
- 后续建议：如果历史列表需要展示行情摘要，可在 `GET /api/reports` 中补充 `price` 字段，或设计更明确的报告列表摘要接口。

## 问题 18：ReportDetailScreen 的路由参数类型未集中复用

- 位置：`mobile-app/src/screens/ReportDetailScreen.tsx`、`mobile-app/src/types/index.ts`
- 类型：类型设计隐患
- 现象：`ReportDetailScreen` 为了同时支持自选模块和报告模块，使用了局部路由类型 `{ ReportDetail: { reportId: number } }`，没有集中复用统一的报告详情参数类型。
- 影响：当前不影响运行，但如果后续多个 Stack 中的 `ReportDetail` 参数定义不一致，可能导致类型维护成本增加。
- 当前是否需要立即修：否，本阶段先保持最小改动。
- 后续建议：后续可抽出统一的 `ReportDetailParams` 类型，并让 `WatchlistStackParamList` 和 `ReportStackParamList` 共同复用。

## 问题 19：“我的”页面暂时复用 SettingsScreen

- 位置：`mobile-app/src/navigation/AppNavigator.tsx`、`mobile-app/src/screens/SettingsScreen.tsx`
- 类型：阶段性限制
- 现象：底部 Tab 已显示为“我的”，但实际组件仍是 `SettingsScreen`，页面内容主要是后端地址配置和连接测试。
- 影响：当前能满足开发调试需要，但还不是真正的个人中心，也没有登录、注册、账号信息等能力。
- 当前是否需要立即修：否，本阶段只做导航方向调整和历史报告闭环。
- 后续建议：实现账号体系时再设计 `MineScreen` 或个人中心 Stack，并将当前设置能力迁移进去。

## 问题 20：get_stock_history 的 days 参数已修复

- 位置：`backend/app/services/market_data.py`
- 类型：代码实现隐患
- 原现象：`get_stock_history(code, days=30)` 定义了 `days` 参数，但实现未按 `days` 截取最近指定天数。
- 当前状态：已修复。
- 修复方式：返回前使用 `history[-days:]` 截取最近 `days` 条有效历史行情。
- 当前影响：`days` 参数语义已与实现一致，仍保留至少 20 条有效数据校验。

## 问题 21：efinance 历史行情接口也存在间歇性网络失败风险

- 位置：`backend/app/services/market_data.py`
- 类型：第三方数据源稳定性隐患
- 现象：本次验收时观察到 `ef.stock.get_quote_history(...)` 也可能出现 `RemoteDisconnected` 等网络异常。
- 影响：即使实时行情可用，历史行情失败也会导致分析任务失败，无法生成 MA 动态报告。
- 当前是否需要立即修：否，v0.2 阶段 1 先按计划返回明确失败信息。
- 后续建议：在 fallback 最小版阶段继续处理，例如增加更清晰错误提示、短期历史行情缓存或备用历史行情数据源。

## 问题 22：历史报告列表接口开始承担摘要提取逻辑

- 位置：`backend/app/api/reports.py`
- 类型：代码结构隐患
- 现象：`GET /api/reports` 现在会从 `indicators_json` 中提取 `change_pct`、`ma_trend`，并组装 `trend_summary`。
- 影响：当前逻辑较简单，可以接受；如果后续列表继续增加 MA、评分原因、风险摘要等字段，`reports.py` 可能变臃肿。
- 当前是否需要立即修：否，v0.2 阶段 2 保持最小改动。
- 后续建议：如果历史列表摘要继续扩展，可考虑抽出报告摘要构建函数。

## 问题 23：前端 TypeScript 类型不校验运行时接口数据

- 位置：`mobile-app/src/types/index.ts`
- 类型：类型边界隐患
- 现象：`ReportHistoryItem` 定义了 `price`、`change_pct`、`trend_summary` 等字段，但 TypeScript 只在编译期检查代码，不会自动校验后端真实返回值。
- 影响：如果后端运行时返回字段类型异常，例如 `price` 返回字符串，前端编译不会提前发现。
- 当前是否需要立即修：否，当前接口简单且已通过手动接口验收。
- 后续建议：接口复杂后可考虑增加响应数据校验或统一 API client。

## 问题 24：历史报告列表涨跌幅颜色逻辑可读性一般

- 位置：`mobile-app/src/screens/ReportHistoryScreen.tsx`
- 类型：可读性隐患
- 现象：涨跌幅颜色通过嵌套三元表达式计算。
- 影响：功能正确，但对新手阅读和后续维护不够直观。
- 当前是否需要立即修：否，v0.2 阶段 2 已按计划完成并通过审查。
- 后续建议：如果该逻辑继续扩展，可抽成 `getChangeColorStyle` 之类的小函数。

## 问题 25：fallback 预留仍是函数级结构

- 位置：`backend/app/services/market_data.py`
- 类型：架构阶段性限制
- 现象：当前通过 `_get_stock_quote_from_efinance`、`_get_stock_history_from_efinance` 和 fallback 占位函数预留多数据源入口。
- 影响：当前只有一个真实数据源时可以接受；如果后续数据源数量增加，继续堆叠函数会让 `market_data.py` 变复杂。
- 当前是否需要立即修：否，v0.2 阶段 3 只做 fallback 最小版。
- 后续建议：数据源复杂后升级为 Provider / Manager 架构，例如 `EfinanceProvider`、`AkshareProvider` 和 `MarketDataManager`。

## 问题 26：备用行情数据源尚未确定且未接入调用链

- 位置：`backend/app/services/market_data.py`
- 类型：阶段性限制
- 现象：`_get_stock_quote_from_fallback` 和 `_get_stock_history_from_fallback` 已存在，但当前只抛出“备用数据源暂未配置”，主数据源失败后也不会自动调用 fallback。
- 影响：当前错误提示更清楚，但还不能在 efinance 失败时自动切换到备用源。
- 当前是否需要立即修：否，本阶段按计划只预留结构，不真正接入第二个数据源。
- 后续建议：选定备用数据源后，再设计调用顺序、错误合并方式和数据字段适配逻辑。

## 问题 27：行情错误仍缺少结构化 error_code

- 位置：`backend/app/services/market_data.py`、`backend/app/api/analysis.py`
- 类型：接口设计隐患
- 现象：当前错误信息已经包含“主行情源 efinance”等上下文，但接口仍主要通过 `error` 文本返回失败原因。
- 影响：对用户阅读友好，但前端如果要按错误类型展示不同 UI，只能依赖文本内容，不够稳定。
- 当前是否需要立即修：否，当前阶段先保证错误提示清楚。
- 后续建议：后续可考虑在失败响应中增加 `error_code`，例如 `MARKET_SOURCE_NETWORK_ERROR`、`INVALID_STOCK_CODE`。

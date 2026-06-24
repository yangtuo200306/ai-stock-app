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

## 问题 28：ask.py 的 answer 与 report summary 有部分重复

- 位置：`backend/app/api/ask.py`
- 类型：文案与结构设计隐患
- 现象：`answer` 会先拼接股票名称、当前价、涨跌幅、趋势和建议，随后又拼接 `report["summary"]`，而 summary 本身也包含这些信息。
- 影响：当前不影响功能，但问股回答可能略显重复。
- 当前是否需要立即修：否，v0.2 阶段 4 先保证最小闭环。
- 后续建议：后续可为问股单独抽一个更简洁的 answer builder。

## 问题 29：“问股最小版”容易被误解为已接入大模型

- 位置：`mobile-app/src/screens/AskScreen.tsx`、`backend/app/api/ask.py`
- 类型：产品表达隐患
- 现象：当前问股最小版使用真实行情、历史行情、MA 指标和规则回答，但尚未调用大模型 API。
- 影响：用户可能误以为当前已经是完整 AI 聊天能力。
- 当前是否需要立即修：否，当前页面已使用“基础分析”表述。
- 后续建议：接入大模型前继续保持“基础分析”表述；接入后再区分规则分析和 AI 回答。

## 问题 30：AskScreen.tsx 错误解析依赖 FastAPI 默认 detail 字段

- 位置：`mobile-app/src/screens/AskScreen.tsx`
- 类型：接口格式隐患
- 现象：前端请求失败时读取 `data.detail` 作为错误提示。
- 影响：当前与 FastAPI `HTTPException` 默认格式匹配；如果后续统一为 `{ error: ... }` 或结构化错误格式，前端需要同步调整。
- 当前是否需要立即修：否。
- 后续建议：后续设计统一 API 错误响应结构。

## 问题 31：执行阶段曾遗漏确认 ask_router 是否实际注册

- 位置：`backend/app/main.py`
- 类型：流程与验证问题
- 现象：首次执行总结时声称已注册 `ask_router`，但用户复查发现 `main.py` 中缺少 `app.include_router(ask_router)`。
- 影响：如果未发现，`POST /api/ask` 会返回 404。
- 当前是否需要立即修：已修复。
- 后续建议：涉及入口文件、路由注册和配置文件的关键改动后，必须重新读取文件确认最终落盘状态。

## 问题 32：当前 AskResponse 为最小版扁平结构

- 位置：`backend/app/api/ask.py`、`mobile-app/src/types/index.ts`
- 类型：接口演进限制
- 现象：当前 `AskResponse` 直接平铺股票信息、行情、分析结果、回答、风险和指标。
- 影响：当前字段少时简单可用；未来接入大模型、多轮问答、模型信息、追问建议时表达能力不足。
- 当前是否需要立即修：否，v0.2 阶段 4 保持最小结构。
- 后续建议：大模型阶段可拆分为 `stock`、`market`、`technicals`、`analysis`、`ai` 等分组结构。

## 问题 33：前后端 AskResponse 类型需要人工保持一致

- 位置：`backend/app/api/ask.py`、`mobile-app/src/types/index.ts`
- 类型：类型同步隐患
- 现象：后端和前端分别手写 `AskResponse`。
- 影响：当前字段较少风险可控；后续字段变化时可能出现后端已改、前端漏改。
- 当前是否需要立即修：否。
- 后续建议：后续可考虑 OpenAPI 生成前端类型，或建立接口字段变更检查习惯。

## 问题 34：ask.py 中 AskResponse.indicators 使用 dict

- 位置：`backend/app/api/ask.py`
- 类型：类型约束隐患
- 现象：后端响应模型中 `indicators` 使用 `dict`，没有明确字段结构。
- 影响：当前可用；但 OpenAPI 文档不够精确，后续字段维护不够清晰。
- 当前是否需要立即修：否。
- 后续建议：后续可补充更明确的 IndicatorsResponse 模型。

## 问题 35：ask.py 将所有 MarketDataError 统一返回 400

- 位置：`backend/app/api/ask.py`
- 类型：错误响应设计隐患
- 现象：无论是输入错误、股票不存在、行情源网络失败还是历史行情不足，都统一返回 400。
- 影响：当前前端能展示错误文字；但无法通过状态码或 error_code 区分错误类型。
- 当前是否需要立即修：否。
- 后续建议：后续可按错误类型返回 400 / 404 / 503，或增加结构化 `error_code`。

## 问题 36：AskScreen.tsx 涨跌幅颜色逻辑可读性一般

- 位置：`mobile-app/src/screens/AskScreen.tsx`
- 类型：可读性隐患
- 现象：涨跌幅颜色通过嵌套三元表达式计算。
- 影响：当前功能正常；后续如果颜色规则扩展，可读性会下降。
- 当前是否需要立即修：否。
- 后续建议：后续可抽成 `getChangeColor` 函数。

## 问题 37：MineScreen.tsx 和 SettingsScreen.tsx 存在后端地址配置逻辑重复

- 位置：`mobile-app/src/screens/MineScreen.tsx`、`mobile-app/src/screens/SettingsScreen.tsx`
- 类型：代码重复隐患
- 现象：`MineScreen.tsx` 迁移了 `SettingsScreen.tsx` 中读取、保存后端地址和测试连接的逻辑。
- 影响：当前可接受；如果后续两个页面都维护，可能出现改一处忘一处。
- 当前是否需要立即修：否，v0.2 阶段 5 保持最小整理。
- 后续建议：后续可删除 `SettingsScreen.tsx`，或抽出 `BackendSettingsSection` 组件。

## 问题 38：SettingsScreen.tsx 当前保留但未挂载

- 位置：`mobile-app/src/screens/SettingsScreen.tsx`、`mobile-app/src/navigation/AppNavigator.tsx`
- 类型：阶段性文件清理问题
- 现象：“我的”Tab 已改为挂载 `MineScreen`，`SettingsScreen.tsx` 当前不再直接挂载。
- 影响：当前不影响运行；后续可能成为无用文件。
- 当前是否需要立即修：否，本阶段按计划保留旧文件。
- 后续建议：确认 `MineScreen` 稳定后，再删除 `SettingsScreen.tsx` 或改为设置子组件。

## 问题 39：backendUrl 存储 key 在多个页面重复定义

- 位置：`mobile-app/src/screens/MineScreen.tsx`、`mobile-app/src/screens/AskScreen.tsx`、`mobile-app/src/screens/SettingsScreen.tsx`
- 类型：常量重复隐患
- 现象：多个页面分别定义 `BACKEND_URL_STORAGE_KEY = 'backendUrl'`。
- 影响：当前可用；如果后续某处 key 改错，会导致页面间读取不一致。
- 当前是否需要立即修：否，当前阶段保持最小改动。
- 后续建议：后续可抽出 `storageKeys.ts` 统一管理。

## 问题 40：MineScreen.tsx 只有登录/注册占位，没有真实账号能力

- 位置：`mobile-app/src/screens/MineScreen.tsx`
- 类型：阶段性功能限制
- 现象：当前只显示“登录 / 注册：后续开放”，没有真实登录、注册、token 或用户信息。
- 影响：符合 v0.2 阶段 5 范围；用户暂时不能真正登录。
- 当前是否需要立即修：否。
- 后续建议：账号阶段再实现注册、登录、token、退出登录和用户数据隔离。

## 问题 41：新浪 fallback 依赖非官方接口

- 位置：`backend/app/services/market_data.py`
- 类型：第三方接口稳定性隐患
- 现象：新浪实时行情和历史 K 线接口都不是官方稳定 API。
- 影响：接口字段、编码、访问限制可能变化，导致 fallback 失效。
- 当前是否需要立即修：否，v0.3 阶段 1 作为学习项目低频备用源可以接受。
- 后续建议：如果后续稳定性要求提高，再考虑更正式的数据源或 Provider 架构。

## 问题 42：当前未强制验证 fallback 路径真实触发

- 位置：`backend/app/services/market_data.py`
- 类型：测试覆盖隐患
- 现象：本次接口验收时 efinance 正常，实际返回 `source = "efinance"`，没有通过真实接口强制模拟 efinance 失败。
- 影响：fallback 代码已实现，但还缺少“主源失败时确实进入新浪”的明确运行时证据。
- 当前是否需要立即修：否。
- 后续建议：后续可通过临时 mock、单元测试或手动制造主源失败来验证 `source = "sina"` 路径。

## 问题 43：新浪实时行情返回文本解析较脆弱

- 位置：`backend/app/services/market_data.py`
- 类型：解析格式隐患
- 现象：当前通过 `text.split('"')[1]` 和逗号拆字段解析新浪返回。
- 影响：如果新浪返回格式变化，解析可能失败。
- 当前是否需要立即修：否。
- 后续建议：后续可增加更明确的格式判断，或集中封装新浪返回解析逻辑。

## 问题 44：fallback 聚合错误仍是纯文本

- 位置：`backend/app/services/market_data.py`
- 类型：接口设计隐患
- 现象：两个行情源都失败时，通过字符串拼接返回聚合错误。
- 影响：用户可读，但前端仍无法结构化区分主源失败、备用源失败、网络失败、字段失败。
- 当前是否需要立即修：否。
- 后续建议：后续可增加结构化 `error_code` 或错误详情对象。

## 问题 45：`requests` 依赖仍未固定版本

- 位置：`backend/requirements.txt`
- 类型：依赖稳定性隐患
- 现象：新增 `requests` 但没有固定版本。
- 影响：未来重新安装环境时可能安装到不同版本。
- 当前是否需要立即修：否，当前项目已有依赖也未固定版本。
- 后续建议：阶段稳定后统一固定依赖版本。

## 问题 46：火山模型调用需要使用 Endpoint ID

- 位置：`.env`、`backend/app/services/llm_client.py`
- 类型：平台接入注意事项
- 现象：使用模型商品名 `deepseek-v4-flash-2604252` 调用失败；改用 `ep-...` Endpoint ID 后调用成功。
- 影响：如果后续换模型，只记模型商品名可能导致接口调用失败。
- 当前是否需要立即修：否。
- 后续建议：在项目规则或常见问题中记录“火山方舟调用使用 Endpoint ID”。

## 问题 47：当前 `llm_error` 是调试字段

- 位置：`backend/app/api/ask.py`
- 类型：调试字段清理问题
- 现象：为了定位大模型调用失败原因，响应中临时增加了 `llm_error`。
- 影响：调试时有用；正式接口中可能不应直接暴露底层错误信息。
- 当前是否需要立即修：建议阶段审查时决定保留或移除。
- 后续建议：如果保留，应改成更安全的用户友好错误或仅后端日志记录。

## 问题 48：大模型调用依赖第三方平台稳定性

- 位置：`backend/app/services/llm_client.py`
- 类型：外部服务稳定性隐患
- 现象：AI 回答依赖火山平台可用性、网络、额度和鉴权状态。
- 影响：平台不可用时只能回退规则回答。
- 当前是否需要立即修：否，已有规则回退兜底。
- 后续建议：后续可增加超时提示、调用日志、错误分类或备用模型。

## 问题 49：Prompt 目前直接拼字符串

- 位置：`backend/app/services/llm_client.py`
- 类型：Prompt 维护隐患
- 现象：当前 Prompt 在 `_build_prompt` 中用长字符串拼接。
- 影响：短期可用；后续 Prompt 变长、多版本或多场景时维护成本会上升。
- 当前是否需要立即修：否。
- 后续建议：后续可引入 Prompt 版本号或单独的 Prompt 构建模块。

## 问题 50：AI 回答未保存历史

- 位置：`backend/app/api/ask.py`
- 类型：阶段性功能限制
- 现象：当前问股是即时回答，不保存问题、回答、模型、时间。
- 影响：用户刷新或离开后无法查看历史问股记录。
- 当前是否需要立即修：否，符合 v0.3 不做聊天历史的范围。
- 后续建议：后续如做多轮问答，再设计 `ask_sessions` / `ask_messages` 表。

## 问题 51：移动端页面整体模板化且视觉体验不足

- 位置：`mobile-app/src/screens/*`
- 类型：UI/UX 阶段性问题
- 现象：当前多个页面以功能跑通为主，页面结构偏模板化，视觉层级、排版、卡片设计、间距、长内容承载和整体美观度都比较基础。
- 影响：问股页接入 AI 长回答后，页面承载压力明显；报告详情页、历史报告页、自选页等后续也可能出现信息堆叠、阅读体验弱的问题；当前 UI 更像开发验证页面，不像正式产品界面。
- 当前是否需要立即修：否，v0.3 当前重点是行情 fallback 和 AI 问股链路跑通。
- 后续建议：单独规划一个 UI/UX 优化阶段，统一页面布局、卡片样式、字体层级、颜色系统和间距；重点重构问股页、报告详情页、历史报告页、自选页；长文本页面使用更适合阅读的结构，逐步从“功能验证型页面”升级为“产品体验型页面”。

## 问题 52：records.metadata_json 仍然是松散 JSON 字段

- 位置：`backend/app/database.py`、`backend/app/api/records.py`
- 类型：字段设计隐患
- 现象：`metadata_json` 存储 JSON 字符串，前后端通过人工约定字段结构。
- 影响：短期灵活；字段越来越多后，前后端需要人工约定，容易不一致。
- 当前是否需要立即修：否。
- 后续建议：后续记录类型稳定后，可拆分更明确字段或定义更严格的响应模型。

## 问题 53：records.py 对 metadata_json 缺少异常保护

- 位置：`backend/app/api/records.py`
- 类型：健壮性隐患
- 现象：直接 `json.loads(row["metadata_json"])`，没有异常保护。
- 影响：如果数据库里 `metadata_json` 损坏，records 接口可能返回 500。
- 当前是否需要立即修：否。
- 后续建议：后续可抽出 `safe_json_loads`，解析失败时返回 `{}`。

## 问题 54：新增 API 文件后容易忘记在 main.py 注册 router

- 位置：`backend/app/main.py`、`backend/app/api/*.py`
- 类型：流程与验证问题
- 现象：新增 API 文件后，如果忘记在 `main.py` 中 `app.include_router(...)`，接口会 404。
- 影响：文件存在但接口不可访问，前端请求会 404。
- 当前是否需要立即修：否，当前已正确注册。
- 后续建议：后续新增 API 文件后，把"main.py 注册 router"作为固定检查项。

## 问题 55：stocks.code 仍保留全局 UNIQUE 约束

- 位置：`backend/app/database.py`、`backend/app/api/stocks.py`
- 类型：数据隔离隐患
- 现象：即使新增了 `user_id`，`stocks.code` 仍是全局 `UNIQUE`。
- 影响：未来多用户时，不同用户不能同时添加同一只股票。
- 当前是否需要立即修：已修复。
- 后续建议：v0.5 已重建 stocks 表唯一约束为 `(user_id, code)`。

## 问题 56：ask.py 捕获 LlmError 后完全吞掉错误

- 位置：`backend/app/api/ask.py`
- 类型：调试与日志隐患
- 现象：`except LlmError: pass`，不记录任何日志。
- 影响：前端不会暴露 llm_error 是正确的，但后端也没有日志，后续排查大模型失败原因会困难。
- 当前是否需要立即修：否。
- 后续建议：后续增加后端日志记录，只给开发者看，不返回给前端。

## 问题 57：answer_type 和 ai_status 当前语义有重叠

- 位置：`backend/app/api/ask.py`、`mobile-app/src/types/index.ts`
- 类型：字段设计隐患
- 现象：当前 `answer_type=ai/rule` 与 `ai_status=ok/fallback` 都在表达 AI 是否成功。
- 影响：短期可用；后续若不明确边界，前端可能不知道该依赖哪个字段。
- 当前是否需要立即修：否。
- 后续建议：后续明确：`answer_type` 表示展示内容来源，`ai_status` 表示模型调用状态。

## 问题 58：analysis.py 写报告和写记录不是显式同一个事务边界

- 位置：`backend/app/api/analysis.py`
- 类型：数据一致性隐患
- 现象：报告和任务在一个 `with get_connection()` 中写入，随后 `_write_analysis_record` 又打开新连接写记录。
- 影响：如果报告和任务写入成功，但记录写入失败，可能出现"有报告但没有记录"。
- 当前是否需要立即修：否。
- 后续建议：后续可把记录写入放入同一个数据库连接中，保证任务、报告、记录一起成功或一起失败。

## 问题 59：问股记录写入失败会影响问股接口返回

- 位置：`backend/app/api/ask.py`
- 类型：健壮性隐患
- 现象：`_write_ask_record` 没有异常保护。
- 影响：如果 records 表异常或写入失败，问股本身已经生成答案，但接口仍可能返回 500。
- 当前是否需要立即修：否。
- 后续建议：后续讨论是否让记录写入失败不影响主流程，或统一事务保证一致性。

## 问题 60：RecordItem / RecordDetail.metadata 仍是前端手写松散结构

- 位置：`mobile-app/src/types/index.ts`
- 类型：类型同步隐患
- 现象：`metadata` 中 `price`、`change_pct`、`score`、`action`、`trend` 等字段由前后端人工约定。
- 影响：后端 `metadata_json` 字段变化时，前端类型不会自动同步。
- 当前是否需要立即修：否。
- 后续建议：后续可考虑让记录 metadata 更结构化，或通过 OpenAPI 生成前端类型。

## 问题 61：记录模块新增页面较多，需检查旧报告模块引用是否清理干净

- 位置：`mobile-app/src/navigation/RecordStackNavigator.tsx`、`mobile-app/src/screens/RecordListScreen.tsx`、`mobile-app/src/screens/RecordDetailScreen.tsx`
- 类型：文件清理问题
- 现象：删除了 `ReportStackNavigator` 和 `ReportHistoryScreen`，新增记录模块文件。
- 影响：如果仍有旧引用，可能导致前端编译失败。
- 当前是否需要立即修：是，审查阶段必须重点检查。
- 后续建议：后续删除文件前先搜索引用，确认无残留后再删除。

## 问题 62：AskScreen 加入自选失败时仍提示"已加入自选"

- 位置：`mobile-app/src/screens/AskScreen.tsx`
- 类型：错误处理隐患
- 现象：`handleAddToWatchlist` 中 `response.ok` 为 false 或 `catch` 时也显示"已加入自选"。
- 影响：如果后端服务异常或写入失败，用户会被误导。
- 当前是否需要立即修：否，符合计划中"重复加入仍提示已加入自选"的最小实现，但实现过宽。
- 后续建议：后续区分重复加入和真实失败；失败时提示"加入自选失败，请稍后重试"。

## 问题 63：AskScreen 的 initialQuestion 参数不会在使用后清空

- 位置：`mobile-app/src/screens/AskScreen.tsx`
- 类型：导航参数隐患
- 现象：从自选页跳转问股后，`initialQuestion` 会填入输入框；如果后续路由参数保留，可能再次影响输入框。
- 影响：短期影响较小；复杂导航场景下可能出现旧问题覆盖用户输入。
- 当前是否需要立即修：否。
- 后续建议：后续可在填入后清理参数，或只在页面聚焦且参数变化时处理。

## 问题 64：WatchlistScreen 使用 useNavigation<any>() 进行跨 Tab 跳转

- 位置：`mobile-app/src/screens/WatchlistScreen.tsx`
- 类型：类型设计隐患
- 现象：为了从自选 Stack 跳到问股 Tab，当前使用了 `any` 类型。
- 影响：功能可用，但失去了 TypeScript 对导航参数的检查，参数名写错时编译期不一定发现。
- 当前是否需要立即修：否。
- 后续建议：后续补充组合导航类型，例如 `NativeStackNavigationProp` + `BottomTabNavigationProp`。

## 问题 65：WatchlistScreen 中从同一个包重复导入 useNavigation

- 位置：`mobile-app/src/screens/WatchlistScreen.tsx`
- 类型：代码清理
- 现象：`import { useNavigation } from '@react-navigation/native';` 和 `import { useNavigation as useTabNavigation } from '@react-navigation/native';` 分开导入。
- 影响：不影响运行，但可读性一般。
- 当前是否需要立即修：否。
- 后续建议：后续可合并为同一行导入，或使用更明确的导航类型。

## 问题 66：logout 当前会删除用户所有 token

- 位置：`backend/app/api/auth.py`
- 类型：账号系统阶段性限制
- 现象：`logout` 根据 `user_id` 删除该用户所有 token，而不是只删除当前请求携带的 token。
- 影响：如果后续支持多设备登录，一个设备退出会让同一用户其他设备也失效。
- 当前是否需要立即修：否，v0.5 最小用户系统可接受。
- 后续建议：后续可让鉴权依赖同时返回当前 token，退出时只删除当前 token。

## 问题 67：前端 API client 没有统一错误处理

- 位置：`mobile-app/src/api/client.ts`
- 类型：接口错误处理隐患
- 现象：`apiGet` / `apiPost` 直接返回 `res.json()`，没有统一判断 `response.ok`。
- 影响：401、400、500 等错误需要页面自行判断返回内容，后续页面多了会重复处理。
- 当前是否需要立即修：否，v0.5 最小闭环可接受。
- 后续建议：后续可统一抛出 API 错误对象，并在 401 时引导重新登录。

## 问题 68：MineScreen 的 health 检查仍使用独立 fetch

- 位置：`mobile-app/src/screens/MineScreen.tsx`
- 类型：代码一致性限制
- 现象：`handleTestConnection` 仍直接调用 `fetch` 检查 `/api/health`。
- 影响：不影响功能，因为 health 接口不需要 token；但和统一 API client 的方向不完全一致。
- 当前是否需要立即修：否。
- 后续建议：后续可给 API client 增加不带 token 的 `apiHealthCheck` 或 `apiPublicGet`。

## 问题 69：旧 default_user 数据与真实用户 ID 格式不一致

- 位置：`backend/app/database.py`、`backend/app/api/stocks.py`、`backend/app/api/reports.py`、`backend/app/api/records.py`
- 类型：数据迁移阶段性限制
- 现象：v0.4 旧数据使用 `default_user`，v0.5 新数据使用数字用户 ID 字符串。
- 影响：旧数据不会自动归属到新注册用户，新用户登录后看不到旧数据。
- 当前是否需要立即修：否，学习项目当前可接受。
- 后续建议：如果需要保留旧数据，可设计一次性迁移，把 `default_user` 数据归属到首个真实用户或指定用户。

## 问题 70：受保护接口改造后，遗漏页面级 fetch 容易导致 401

- 位置：`mobile-app/src/screens/*`
- 类型：认证接入隐患
- 现象：v0.5 后多数业务接口都需要 token，如果某个页面仍直接 `fetch`，就不会带 `Authorization`。
- 影响：页面可能在登录后仍访问失败，表现为任务不存在、报告不存在或加载失败。
- 当前是否需要立即修：已修复 `TaskStatusScreen` 和 `ReportDetailScreen`。
- 后续建议：后续新增受保护接口页面时，默认使用统一 API client。

## 问题 71：数据库结构迁移判断需要检查约束字段而不是只检查约束存在

- 位置：`backend/app/database.py`
- 类型：数据库迁移隐患
- 现象：旧结构 `UNIQUE(code)` 和新结构 `UNIQUE(user_id, code)` 都会生成唯一索引。
- 影响：只判断是否存在唯一索引会误判新旧结构，可能导致重复迁移。
- 当前是否需要立即修：已修复。
- 后续建议：后续迁移索引或约束时，应检查具体字段列表。

## 问题 72：Windows 命令行验收中文 JSON 容易乱码

- 位置：接口手动验收流程
- 类型：调试与验收隐患
- 现象：PowerShell 中使用 `Set-Content -Encoding ASCII` 写入中文 JSON 时，中文会变成 `????`。
- 影响：不影响 App 正常使用，但会影响命令行接口验收的准确性。
- 当前是否需要立即修：否。
- 后续建议：Windows 下接口验收中文 JSON 使用 UTF-8 或 unicode escape。

## 问题 73：StopCommand 停止后台 uvicorn 失败

- 位置：本次手动验收流程
- 类型：本地开发流程隐患
- 现象：尝试停止后台 uvicorn 服务时，工具返回 `invalid type: null`。
- 影响：可能导致本地服务进程继续运行，后续端口被占用。
- 当前是否需要立即修：否。
- 后续建议：验收后确认服务进程状态，必要时手动关闭终端或换端口启动。

## 问题 74：AskScreen 本地 user message id 使用 Date.now

- 位置：`mobile-app/src/screens/AskScreen.tsx`
- 类型：前后端消息同步隐患
- 现象：前端临时构造 user message 时使用 `Date.now()`，assistant message 使用后端返回的 `message_id`。
- 影响：短期可用；但 user message 的真实后端 id 没有返回，前端和后端消息 id 不完全一致。
- 当前是否需要立即修：否，v0.6 最小多轮展示可接受。
- 后续建议：后续可让 `/api/ask` 返回 `user_message_id` 和 `assistant_message_id`。

## 问题 75：ask.py 中会话、消息和记录逻辑集中在一个文件

- 位置：`backend/app/api/ask.py`
- 类型：代码结构隐患
- 现象：v0.6 后 `ask.py` 同时负责股票识别、行情分析、AI 调用、会话管理、消息写入和记录更新。
- 影响：当前最小实现可接受；后续继续扩展会降低可维护性。
- 当前是否需要立即修：否。
- 后续建议：v0.7 或功能稳定后可考虑抽出 ask service。

## 问题 76：records 追问更新后不会按最近追问时间排序

- 位置：`backend/app/api/ask.py`、`backend/app/api/records.py`、`backend/app/database.py`
- 类型：记录排序隐患
- 现象：追问时会更新同一条 records 的 summary/question/answer，但 records 表没有 `updated_at` 字段，列表仍按 `id DESC` 排序。
- 影响：旧会话发生新追问后，不会自动排到记录列表最前。
- 当前是否需要立即修：否。
- 后续建议：后续给 records 增加 `updated_at`，追问更新 records 时同步更新，并按 `updated_at DESC` 排序。

## 问题 77：追问时没有显式阻止用户切换股票

- 位置：`backend/app/api/ask.py`
- 类型：会话边界隐患
- 现象：计划中要求同一会话只围绕一只股票；当前追问时会直接使用 session 内的 `stock_code`，但没有检查用户问题里是否出现另一只股票代码或名称。
- 影响：如果用户在同一个会话里问“那 600519 呢？”，后端仍会按原会话股票回答，可能造成语义混淆。
- 当前是否需要立即修：否，当前 prompt 已提示会话股票边界。
- 后续建议：追问时检测问题中是否出现不同股票代码或已支持名称，若不同于当前会话股票，则提示新开会话。

## 问题 78：股票简称识别当前只支持内置小词典

- 位置：`backend/app/services/stock_resolver.py`
- 类型：阶段性功能限制
- 现象：当前只支持少量写死的股票名称，例如平安银行、贵州茅台、宁德时代等。
- 影响：用户输入未内置名称时无法识别，例如“恒瑞医药怎么看？”。
- 当前是否需要立即修：否，符合 v0.6 最小范围。
- 后续建议：后续可接入完整 A 股股票名称表，或增加本地股票基础信息表。

## 问题 79：股票名称匹配使用简单 substring 判断

- 位置：`backend/app/services/stock_resolver.py`
- 类型：输入识别隐患
- 现象：只要文本中包含某个名称就返回对应代码。
- 影响：短词或别名增多后可能误匹配。
- 当前是否需要立即修：否，当前词典较小风险可控。
- 后续建议：后续做完整股票搜索时引入更明确的分词、别名和歧义处理。

## 问题 80：RSI 计算使用简化版公式

- 位置：`backend/app/services/technical_indicators.py`
- 类型：指标算法阶段性限制
- 现象：当前 RSI 直接用最近周期内平均涨跌计算，没有使用 Wilder 平滑算法。
- 影响：结果可用于学习和辅助判断，但与专业行情软件的 RSI 可能有差异。
- 当前是否需要立即修：否，v0.6 最小指标增强可接受。
- 后续建议：后续如果追求更接近专业软件，可实现 Wilder 平滑 RSI。

## 问题 81：成交量比值规则较简单

- 位置：`backend/app/services/technical_indicators.py`
- 类型：指标规则阶段性限制
- 现象：当前用最近一日成交量 / 前 5 日平均成交量判断放量、缩量。
- 影响：规则简单、容易解释，但对极端行情、停牌、节假日数据可能不够稳健。
- 当前是否需要立即修：否。
- 后续建议：后续可以加入更长周期均量或异常成交量保护。

## 问题 82：不同行情源成交量字段单位可能不完全一致

- 位置：`backend/app/services/market_data.py`
- 类型：数据源一致性隐患
- 现象：efinance 和新浪 fallback 的 volume 字段来源不同。
- 影响：如果单位不同，`volume_ratio` 可能存在偏差。
- 当前是否需要立即修：否，本次验收中可用。
- 后续建议：后续确认两个数据源成交量单位，必要时做统一换算。

## 问题 83：AskScreen 多轮消息只保存在当前页面内存

- 位置：`mobile-app/src/screens/AskScreen.tsx`
- 类型：前端会话体验限制
- 现象：当前 `messages` 是本页面 state；刷新页面或切换会话后，问股页不会自动恢复历史消息。
- 影响：不影响记录详情，因为后端已保存 messages；但问股页本身还不是完整会话恢复体验。
- 当前是否需要立即修：否，v0.6 最小多轮追问可接受。
- 后续建议：后续可支持从记录详情继续追问，或问股页加载最近会话。

## 问题 84：AskScreen 没有显式“新建会话”按钮

- 位置：`mobile-app/src/screens/AskScreen.tsx`
- 类型：前端交互限制
- 现象：当前一旦有 `sessionId`，后续输入都会作为同一会话追问。
- 影响：用户想问另一只股票时，需要离开页面或刷新状态，否则容易沿用旧 session。
- 当前是否需要立即修：否。
- 后续建议：增加“新问题 / 新会话”按钮，清空 `sessionId`、`messages` 和 `latestResult`。

## 问题 85：RecordDetailScreen 只能查看历史，不能继续追问

- 位置：`mobile-app/src/screens/RecordDetailScreen.tsx`
- 类型：前端交互限制
- 现象：记录详情展示完整 messages，但没有输入框继续追问。
- 影响：用户要继续问，只能回问股页重新开始或依赖当前问股页状态。
- 当前是否需要立即修：否，v0.6 先完成历史详情增强。
- 后续建议：后续可在记录详情加入“继续追问”入口，跳转问股页并携带 `session_id`。

## 问题 86：未登录态下业务页面操作提示不够友好

- 位置：`mobile-app/src/screens/*`
- 类型：前端体验限制
- 现象：v0.5 后核心业务功能需要登录，但未登录时部分页面仍可能通过接口失败来表现不可用。
- 影响：用户体验不够直接，容易误以为后端异常或功能不可用。
- 当前是否需要立即修：否。
- 后续建议：v0.7 或 v0.8 中统一未登录态提示，引导用户去登录。

## 问题 87：v0.6 问股页仍偏功能验证型 UI

- 位置：`mobile-app/src/screens/AskScreen.tsx`
- 类型：UI/UX 阶段性限制
- 现象：当前问股页已支持多轮追问和指标展示，但消息气泡、长回答阅读、新建会话、会话恢复等交互仍较基础。
- 影响：功能可用，但操作不够顺滑，体验不像成熟 AI 助手。
- 当前是否需要立即修：否，v0.6 先完成功能闭环。
- 后续建议：v0.8 UI/UX 集中优化时统一处理问股页体验。

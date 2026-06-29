# AI Stock App — 总体发展方案

> 本文档于 v0.9 完成后制定，规划 v1.0 及后续版本的总体方向。
> 与 v0.1~v0.9 的基础学习阶段计划分开管理。

---

## 核心理念

v0.1 ~ v0.9 完成了"功能从无到有"。接下来的三个阶段主题是：

```
阶段一：让代码变结实    阶段二：让产品变好用    阶段三：让服务能上线
```

每个阶段只解决一类问题，不混着做。

---

## 阶段一：全局架构升级

**目标：** 把项目从"学习阶段的最小实现"升级到"生产级质量"，只改骨架不改 UI。

**为什么先做这个？**
- 当前状态管理（各自 useState + 信号模式）在页面间同步数据已经出问题
- 配置散落、日志缺失，出问题查不了原因
- 这些是地基问题，不先解决，后面页面精修时会反复返工

### 子阶段 1A：前端架构升级 ✅ 已完成

**范围：** `mobile-app/src/`

**涉及文件：**

```
mobile-app/src/
  api/client.ts           → 增强（401 自动清 token）
  contexts/
    AuthContext.tsx        → 保留（认证状态）
    DataRefreshContext.tsx → 已删除
  hooks/
    useApiErrorHandler.ts  → 401 时调用 resetAllStores
  stores/                 → 新增目录 ✅
    watchlistStore.ts
    recordsStore.ts
    askStore.ts
  types/
    index.ts              → 已拆分为 5 个领域文件 ✅
```

**完成后效果（已验证）：**
- ✅ 页面间数据自动同步，不再需要手动触发刷新
- ✅ 组件按需订阅，不会因无关状态变化重渲染
- ✅ 每个 store 职责清晰，新增页面直接复用
- ✅ tsc 编译零错误
- ✅ 核心链路验证通过（注册→添加自选→问股→加入自选→记录→删除→退出）

---

### 子阶段 1B：后端架构升级 ✅ 已完成

**范围：** `backend/app/`

**涉及文件：**

```
backend/app/
  config/
    __init__.py           → 新增
    settings.py           → 新增（pydantic-settings 集中管理 10 项配置）
  logging_config.py       → 新增（控制台 + 文件轮转三级输出）
  errors.py               → 新增（13 个 ErrorCode 枚举 + 辅助函数）
  error_handler.py        → 新增（全局异常处理器）
  main.py                 → 引入 settings/logging/error_handler
  database.py             → 版本化迁移（schema_version 表 + 3 个版本）
  api/
    ask.py                → 移除 os.environ.get，替换 error_code
    auth.py               → 替换 error_code + 日志
    analysis.py           → 替换 error_code + 日志 + 修复重复 key bug
    stocks.py             → 日志
    records.py            → 替换 error_code + 日志
    reports.py            → 替换 error_code + 日志
    market.py             → 替换 error_code + 日志
  services/
    llm_client.py         → 移除 load_dotenv，改用 settings
    market_data.py        → 使用 settings
    ask_service.py        → 日志
    report_builder.py     → 日志
  requirements.txt        → 新增 pydantic-settings
  .env.example            → 补充所有配置项
```

**按顺序执行：**

| 步骤 | 内容 | 说明 |
|------|------|------|
| 1 | 配置管理 | 抽 `settings.py`，集中管理 10 项配置 |
| 2 | 日志系统 | 12 个文件添加日志，三级输出 + 文件轮转 |
| 3 | 错误码体系 | 13 个枚举 + 全局异常处理器，替换 17 处字符串 |
| 4 | 数据库迁移 | schema_version 表 + 3 个版本化迁移 |

**不做：**
- 不改数据库引擎（继续 SQLite）
- 不改 API 路由结构
- 不加新接口

**完成后效果（已验证）：**
- ✅ 所有配置在一个文件管理，类型安全
- ✅ 出问题有日志可查（控制台 + 文件轮转）
- ✅ 前端能根据 error_code 做差异化处理
- ✅ 改表结构有版本记录
- ✅ 全局异常处理器兜底未预期错误
- ✅ 前后端编译零错误，核心链路验证通过

---

## 阶段二：页面精修

**目标：** 每个页面从"功能验证型"升级为"产品体验型"。

**为什么放在阶段一之后？**
- 阶段一改的是骨架，如果先精修页面，阶段一改骨架时精修的内容可能要重做
- 阶段一完成后，所有页面已基于 Zustand + 统一 API 层，精修时不需要再操心数据同步问题

**执行顺序（逐个页面精修，不并行）：**

```
问股页(v1.1) → 自选页(v1.2) → 记录页/记录详情(v1.3) → 我的页(v1.4) → 公共组件收口(v1.5) → UX 优化(v1.6)
```

**当前进度：** 三个阶段已全部完成 ✅

**每个页面的精修方式：**
1. 先看当前页面有什么问题（使用中发现的 + code-review-notes 记录的）
2. 你提出想要的效果和想加的小功能
3. 制定该页面的精修计划
4. 执行 → 验证 → 下一个页面

**可能涉及的小功能（由你决定加不加）：**
- 历史记录删除
- 自选股搜索添加
- 问股消息复制
- 删除二次确认
- 自动滚动到底部
- 重试按钮
- 等等

**不做：**
- 不改后端架构（阶段一已完成）
- 不改状态管理模式（阶段一已完成）
- 不引入新的大功能（如持仓、回测）

**完成后效果：**
- 每个页面看起来像正式产品
- 交互细节到位
- 自用时觉得顺手

---

## 阶段三：工程化与部署

**目标：** 让项目能稳定运行、能配置、能排错、能从公网访问。

**为什么放最后？**
- 阶段一和阶段二改代码期间，部署了也要反复更新
- 等功能和 UI 都稳定了，再部署一次到位

**执行步骤：**

| 步骤 | 内容 |
|------|------|
| 1 | 依赖锁定 — requirements.txt 固定版本，生成 lock 文件 |
| 2 | 环境变量梳理 — 确认所有配置项，准备 .env.production 模板 |
| 3 | 启动脚本 — 后端 systemd 服务、启动/停止/重启脚本 |
| 4 | 部署文档 — 服务器准备、后端启动、前端构建、数据库备份、常见问题 |
| 5 | 服务器部署 — 部署到阿里云 ECS（Ubuntu 20.04，2 核 2G） |
| 6 | 验收 — 核心链路走通：登录 → 自选 → 问股 → 记录 |

**不做：**
- 不迁移数据库（继续 SQLite）
- 不做 CI/CD（后续考虑）
- 不做监控告警

**完成后效果：**
- 后端在服务器稳定运行（阿里云 ECS，Ubuntu 20.04，2 核 2G）
- 手机 App 连接 `http://47.114.81.59:8000` 可用
- systemd 开机自启，崩溃自动重启
- 数据持久化到 `/opt/ai-stock-app/data/`，不因重启丢失
- 出错有日志可查（项目日志 + journalctl）

---

## 不做范围（整个方案期间）

- 多市场支持（港股、美股）
- 深色模式
- 推送通知
- 持仓管理 / 交易记录
- 回测功能
- 复杂 Agent 技能系统
- 专业投研工作台
- 数据库迁移到 PostgreSQL

---

## 阶段五：AI 交互升级与智能增强

**目标：** 不新增页面，在现有框架内全面提升 AI 问答质量、交互体验和智能程度。

**为什么放在阶段四之后？**
- 阶段一~四完成了架构、页面、部署、数据体系的基础建设
- 现在数据链路已经跑通，可以专注提升 AI 本身的能力和体验
- 所有改动都在现有页面内完成，不涉及新页面

**执行顺序（递进式，前一个为后一个打基础）：**

```
v1.9.1 (Prompt优化) → v1.9.2 (流式响应) → v1.9.3 (新闻) → v1.9.4 (Agent) → v1.9.5 (多股对比)
```

### v1.9.1：Prompt 工程优化 🔜 进行中

**范围：** `backend/app/services/llm_client.py`

**内容：**
1. **System Prompt 增强** — 从"你是股票分析助手"升级为结构化角色定义 + 回答规范
2. **回答结构强制要求** — 统一输出格式：结论→关键数据→详细分析→风险提示
3. **数据分类呈现** — 指标按趋势/动量/成交量分类，加说明文字

**完成后效果：**
- AI 回答结构清晰，先给结论再展开分析
- 关键数据加粗展示，用户扫一眼就能抓住重点
- 指标分类呈现，小白也能看懂

### v1.9.2：流式响应（Streaming）（规划中）

**范围：** `backend/app/api/ask.py` + `backend/app/services/llm_client.py` + `mobile-app/src/`

**内容：**
1. 后端新增 SSE 流式端点，逐 chunk 输出文本
2. 前端逐 chunk 渲染消息，显示光标闪烁效果
3. 保留非流式降级路径

**完成后效果：**
- 回答逐字出现，用户不用干等 3-5 秒
- 为后续 Agent（多次调工具更慢）做好体验铺垫

### v1.9.3：资讯/新闻集成 ✅ 已完成

**范围：** 新增 `news_fetcher.py` + `backend/app/services/llm_client.py` + `backend/app/api/ask.py` + `backend/app/api/analysis.py` + `mobile-app/src/`

**内容：**
1. 新增 `news_fetcher.py` 独立模块，akshare 东方财富（主源）+ 搜狗（备源）双源获取新闻
2. 问股时自动检索相关新闻，塞入 Prompt，LLM 在回答中引用
3. 前端新增 NewsCard 组件，MessageBubble 底部展示新闻来源卡片
4. 分析报告底部新增"相关资讯"区块，展示新闻链接列表
5. 30 分钟缓存 TTL，三级降级（akshare → 搜狗 → 空列表）

**完成后效果：**
- AI 回答有新闻依据，不再只有技术面分析
- 问股结果附带相关新闻条目，可点击跳转原文
- 分析报告底部展示相关资讯

### v1.9.4：轻量 Agent（Function Calling）✅ 已完成

**范围：** `backend/app/services/` + `backend/app/api/ask.py` + `mobile-app/src/`

**内容：**
1. 定义 4 个工具函数（查行情、算指标、搜新闻、分析报告）
2. 单 Agent + Function Calling 模式，LLM 自主决定调什么工具
3. 前端加思考过程面板（thinking → tool_start → tool_done → text）
4. 两种模式可切换（右上角按钮），默认标准模式
5. 三层降级保护：Agent → 传统流式 → 规则回答

**修复清单：**
- `get_stock_quote` 字段不匹配导致报错
- 流式输出改为逐 chunk 透传
- 记录保存改用 `json.loads()` 正确解析
- 排除 `search_stock` 减少一轮 LLM 调用
- 优化思考过程事件序列
- system prompt 加结构化格式要求
- 新闻用 Markdown 链接输出
- 内容溢出加 CSS 保护

**完成后效果：**
- AI 能主动查数据，不再被动等喂数据
- 用户能看到 AI 思考→查数据→分析的全过程
- 两种模式可对比测试

### v1.9.5：Agent 模式基础优化 ✅ 已完成

**范围：** `backend/app/api/ask.py` + `backend/app/services/` + `mobile-app/src/`

**内容：**
1. **输入零限制** — 去掉 `stock_code` 强制校验，用户想问什么就输入什么
2. **System Prompt 改原则式** — 不给固定模板，让 LLM 自主决定回答结构
3. **加回 `search_stock` 工具** — LLM 自己搜索股票代码，不再在 API 层预解析
4. **多轮对话 context 通道** — 传递上一轮的股票上下文和工具结果摘要
5. **思考过程持久化** — 历史消息的思考过程也能查看

**附加优化：**
- 无 stock_code 时跳过 `_build_minimal_report`，避免无用日志
- 通用会话标题用用户问题前 20 字
- 空状态提示文字随模式切换
- 降级路径兼容无 stock_code 场景

**完成后效果：**
- 用户可输入"茅台怎么样"、"今天大盘如何"等自然语言，不再强制 6 位代码
- AI 回答结构灵活，根据问题自主决定组织形式
- 多轮对话上下文连贯，不丢失上一轮的分析状态
- 历史消息的思考过程可回溯查看

---

## 阶段六：Agent 功能增强（v2.0）

**目标：** 在 v1.9.5 基础优化之上，扩展 Agent 的工具生态和分析能力，让 Agent 覆盖更多股票分析场景。

**为什么放在 v1.9.5 之后？**
- v1.9.5 解决了 Agent 的基础体验问题（输入限制、prompt 模板化、多轮上下文、思考持久化）
- 地基打牢后，加新工具和新能力才稳

**学习主题：** 工具设计模式 — 从"怎么让 LLM 调工具"到"怎么设计 LLM 好调的工具"
- 工具粒度：一个工具该做多少事
- 参数设计：LLM 能理解的参数名和描述
- 返回结构：LLM 好消化的数据格式
- 缓存策略：不同数据的不同 TTL
- 数据源封装：主源 + 备源 + 降级

### 设计决策

| # | 决策 | 结论 | 理由 |
|---|------|------|------|
| 1 | 加几个新工具？ | **3 个**（大盘、板块、基本面） | 技术指标扩展现有工具，不新增 |
| 2 | 工具粒度 | **各 1 个，不拆细** | 工具越少，LLM 选择成本越低 |
| 3 | 并行执行 | **v2.0 不做** | 串行 3 个工具约 6-9 秒，有 thinking 事件顶着可接受 |
| 4 | 跨股票切换 | **交给 LLM 自己处理** | LLM 看到历史消息会自己调 search_stock |
| 5 | 缓存方案 | **cachetools 轻量 TTL 缓存** | 个人 App 不需要 Redis，单实例够用 |
| 6 | 无 stock_code 的对话 | **通过会话列表访问，不存 records** | records 表设计初衷是个股分析记录 |
| 7 | 会话历史入口 | **左侧抽屉导航** | 符合聊天 App 交互习惯 |

### 范围边界

**做：**
- 后端：3 个新工具（大盘行情、板块排行、基本面数据）
- 后端：扩展技术指标（MACD、KDJ）
- 后端：统一缓存层（cachetools）
- 后端：会话列表 API（GET /api/sessions）
- 前端：左侧抽屉会话历史
- 前端：无 stock_code 对话的访问入口
- 文档：更新数据流/架构/学习笔记

**不做：**
- 并行执行（留到 v2.x）
- Redis 缓存（个人 App 不需要）
- 多股对比分析（v2.0.2 再考虑）
- 港股/美股数据（留到 v2.x）
- 策略预设（留到 v2.x）

### 数据源策略

所有新工具基于 **akshare**（已安装），不需要新增依赖库。

| 工具 | akshare 接口 | 备源 |
|------|-------------|------|
| 大盘行情 | `ak.stock_zh_index_spot_sina()` | 无（新浪接口较稳定） |
| 板块排行 | `ak.stock_board_industry_name_em()` | 无 |
| 基本面 | `ak.stock_financial_report_sina()` | 无 |
| MACD/KDJ | 纯 Python 计算 | 无需外部接口 |

### 缓存策略

| 数据类型 | TTL | 理由 |
|---------|-----|------|
| 大盘指数 | 1-2 分钟 | 盘中变化快 |
| 板块排行 | 5-10 分钟 | 一天变化不大 |
| 基本面数据 | 1 天 | 几乎不变 |
| 技术指标 | 5-10 分钟 | 基于历史数据，变化慢 |

### 执行顺序（递进式）

```
v2.0.1 (大盘+板块+会话抽屉) → v2.0.2 (基本面+技术指标) → v2.0.3 (缓存+收尾)
```

---

### v2.0.1：大盘行情 + 板块排行 + 会话历史抽屉 ✅ 已完成

**范围：** 后端 3 个文件 + 前端 4 个文件

**后端改动：**
1. 新增 `backend/app/services/market_service.py` — 大盘行情 + 板块排行数据获取（参考 news_fetcher.py 模式）
2. 修改 `backend/app/services/tool_factory.py` — 注册 `get_market_indices` 和 `get_sector_rankings` 两个工具
3. 新增 `backend/app/api/sessions.py` — `GET /api/sessions` 返回最近会话列表

**前端改动：**
1. 修改 `mobile-app/src/navigation/AppNavigator.tsx` — "问股"tab 指向 DrawerNavigator
2. 新增 `mobile-app/src/components/SessionDrawer.tsx` — 左侧抽屉会话列表组件
3. 新增 `mobile-app/src/stores/sessionStore.ts` — 会话列表状态管理
4. 修改 `mobile-app/src/screens/AskScreen.tsx` — 左上角加 ☰ 按钮

**完成后效果：**
- Agent 能回答"今天大盘怎么样"、"哪些板块涨得好"
- 问股页面左侧可滑出最近会话列表，点击恢复历史对话
- 无股票代码的对话（如"今天大盘怎么样"）也能从会话列表找到

---

### v2.0.2：基本面数据 + 更多技术指标

**范围：** 后端 3 个文件

**后端改动：**
1. 新增 `backend/app/services/fundamental_service.py` — 基本面数据获取（PE/PB/营收/利润/ROE/毛利率）
2. 修改 `backend/app/services/tool_factory.py` — 注册 `get_fundamentals` 工具
3. 修改 `backend/app/services/technical_indicators.py` — 新增 MACD、KDJ 计算

**完成后效果：**
- Agent 能回答"茅台的 PE 是多少"、"五粮液的基本面怎么样"
- 技术面分析更全面，包含 MACD 金叉/死叉、KDJ 超买/超卖信号

---

### v2.0.3：缓存统一 + 收尾

**范围：** 后端 2 个文件 + 前端 1 个文件

**后端改动：**
1. 新增 `backend/app/services/cache_manager.py` — 基于 cachetools 的统一 TTL 缓存层
2. 修改各 service 文件 — 接入统一缓存

**前端改动：**
1. 修改 `mobile-app/src/stores/askStore.ts` — 支持从会话列表恢复对话

**完成后效果：**
- 大盘数据 1-2 分钟缓存，板块数据 5-10 分钟缓存，基本面数据 1 天缓存
- 同一 session 内重复请求不重复调数据源

---

### 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| akshare 大盘接口不稳定 | 大盘数据拿不到 | 工具返回友好错误信息，不阻塞 Agent |
| 板块排行数据量太大 | 响应慢 | top_n 默认 5，限制返回条数 |
| 基本面数据源变化 | 字段名/格式变化 | 参考 news_fetcher 的异常处理模式 |
| Drawer 导航影响 Tab 切换 | 导航结构变化 | 先在小范围测试，不影响其他 Tab |

---

## 版本映射（示意）

| 总体方案 | 版本号 | 状态 |
|---------|--------|------|
| 阶段一（前端+后端架构升级） | v1.0 | ✅ 已完成 |
| 阶段二（问股页精修） | v1.1 | ✅ 已完成 |
| 阶段二（自选页精修） | v1.2 | ✅ 已完成 |
| 阶段二（记录页精修） | v1.3 | ✅ 已完成 |
| 阶段二（我的页精修） | v1.4 | ✅ 已完成 |
| 阶段二（公共组件收口） | v1.5 | ✅ 已完成 |
| 阶段二（UX 优化与体验修复） | v1.6 | ✅ 已完成 |
| 阶段三（工程化与部署） | v1.7 | ✅ 已完成 |
| 阶段四（股票数据体系优化） | v1.8 | ✅ 已完成 |
| 阶段五（Prompt 工程优化） | v1.9.1 | ✅ 已完成 |
| 阶段五（流式响应） | v1.9.2 | ✅ 已完成 |
| 阶段五（外部知识接入） | v1.9.3 | ✅ 已完成 |
| 阶段五（轻量 Agent） | v1.9.4 | ✅ 已完成 |
| 阶段五（Agent 基础优化） | v1.9.5 | ✅ 已完成 |
| 阶段六（Agent 功能增强） | v2.0 | 📋 规划中 |

---

## 文档索引

| 文档 | 用途 |
|------|------|
| 本文档 | 总体方向规划 |
| `docs/archive/plans/v1.0-plan.md` | v1.0 详细计划（已完成） |
| `docs/archive/plans/v1.1-plan.md` | v1.1 问股页精修计划（已完成） |
| `docs/archive/plans/v1.2-plan.md` | v1.2 自选页精修计划（已完成） |
| `docs/archive/plans/v1.3-plan.md` | v1.3 记录页精修计划（已完成） |
| `docs/archive/plans/v1.4-plan.md` | v1.4 我的页精修计划（已完成） |
| `docs/archive/plans/v1.5-plan.md` | v1.5 公共组件收口计划（已完成） |
| `docs/archive/plans/v1.6-plan.md` | v1.6 UX 优化计划（已完成） |
| `docs/archive/releases/v1.8-summary.md` | v1.8 股票数据体系优化总结（已完成） |
| `docs/archive/releases/v1.9-summary.md` | v1.9 版本总结（已完成） |
| `docs/archive/plans/v1.9.1-plan.md` | v1.9.1 Prompt 工程优化计划（已完成） |
| `docs/archive/plans/v1.9.3-plan.md` | v1.9.3 资讯/新闻集成计划（已完成） |
| `docs/archive/learning/learning-notes-v1.0-v1.7.md` | v1.0~v1.7 学习笔记（已归档） |
| `docs/learning-notes.md` | v1.8+ 进阶学习记录 |
| `docs/archive/code-review-notes.md` | 代码问题与隐患记录（已归档） |
| `docs/README.md` | 项目总览 |

# 项目结构速查

> 本文档列出项目中每个文件和目录的职责，方便快速定位。

---

## 根目录

```
ai-stock-app/
├── backend/          # Python FastAPI 后端
├── mobile-app/       # React Native (Expo) 移动端
├── docs/             # 项目文档
├── .gitignore        # Git 忽略规则
└── .trae/
    └── rules/
        └── project_rules.md   # AI 协作规则与项目上下文
```

---

## 后端结构（backend/）

```
backend/
├── .env.example              # 环境变量模板（复制为 .env 后生效）
├── requirements.txt          # Python 依赖清单
├── data/
│   └── stocks.index.json     # A 股股票索引（代码+名称），用于搜索自动补全
│
└── app/
    ├── main.py               # FastAPI 应用入口：创建 app、注册中间件/路由/错误处理/数据库初始化
    ├── database.py           # SQLite 数据库：建表、迁移、连接管理、密码哈希、Token 鉴权
    ├── logging_config.py     # 日志配置：控制台 + 文件轮转（常规日志 + 调试日志）
    ├── errors.py             # 错误码枚举（13 个 ErrorCode）+ 辅助函数
    ├── error_handler.py      # 全局异常处理器：HTTPException、参数校验异常、未预期异常
    │
    ├── config/
    │   └── settings.py       # 集中配置管理（pydantic-settings）：LLM、数据库、CORS、行情、日志
    │
    ├── api/                  # API 路由层（只负责请求接收和响应返回，业务逻辑委托给 services）
    │   ├── health.py         # GET /api/health — 健康检查
    │   ├── auth.py           # POST /api/auth/register, /login, /logout, GET /api/auth/me
    │   ├── stocks.py         # GET/POST/DELETE /api/stocks, GET /api/stocks/search
    │   ├── analysis.py       # POST /api/analysis, GET /api/analysis/{task_id}
    │   ├── ask.py            # POST /api/ask — 问股核心接口
    │   ├── market.py         # GET /api/market/quote/{code}
    │   ├── records.py        # GET /api/records, GET /api/records/{id}, DELETE /api/records/{id}
    │   └── reports.py        # GET /api/reports, GET /api/reports/{id}
    │
    └── services/             # 业务逻辑层（被 api/ 调用）
        ├── market_data.py         # 行情数据服务：efinance（主）+ 新浪（备用），实时行情 + 历史 K 线
        ├── technical_indicators.py # 技术指标计算：MA、RSI、成交量比、偏度
        ├── report_builder.py      # 报告构建：组装分析报告（评分、趋势、建议、风险、摘要）
        ├── llm_client.py          # LLM 客户端：调用火山方舟大模型，含 Prompt 构建
        ├── ask_service.py         # 问股服务：会话管理、消息写入、记录写入、规则回答生成
        ├── stock_resolver.py      # 股票代码解析：从自然语言中提取股票代码/名称
        ├── tool_registry.py       # 工具注册表（v1.9.4+）：ToolDefinition + ToolRegistry，管理工具定义和 handler
        ├── tool_factory.py        # 工具工厂（v1.9.4+）：注册 7 个工具 handler，创建 ToolRegistry 实例
        ├── agent_loop.py          # Agent 执行循环（v1.9.4+）：ReAct 循环引擎，逐条 yield SSE 事件
        ├── news_fetcher.py        # 新闻获取（v1.9.3+）：akshare 东方财富 + 搜狗双源
        ├── market_overview.py      # 大盘行情 + 板块排行（v2.0.1+）：akshare 指数 + 行业板块数据
        └── indicators_schema.py   # 技术指标 Pydantic 模型（v1.8+）
```

### 后端 API 接口一览

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/api/health` | 否 | 健康检查 |
| POST | `/api/auth/register` | 否 | 用户注册 |
| POST | `/api/auth/login` | 否 | 用户登录 |
| POST | `/api/auth/logout` | 是 | 退出登录 |
| GET | `/api/auth/me` | 是 | 获取当前用户信息 |
| GET | `/api/stocks` | 是 | 自选股列表（含行情+最近记录摘要） |
| POST | `/api/stocks` | 是 | 添加自选股 |
| DELETE | `/api/stocks/{code}` | 是 | 删除自选股 |
| GET | `/api/stocks/search?q=` | 否 | 股票搜索自动补全 |
| POST | `/api/analysis` | 是 | 创建分析任务 |
| GET | `/api/analysis/{task_id}` | 是 | 查询任务状态 |
| GET | `/api/sessions` | 是 | 最近会话列表（v2.0.1+） |
| GET | `/api/ask/messages?session_id=` | 是 | 获取会话消息列表（v2.0.1+） |
| POST | `/api/ask` | 是 | 问股（支持新会话和追问） |
| POST | `/api/ask/stream` | 是 | 问股流式端点（SSE 逐 chunk 输出） |
| POST | `/api/ask/agent/stream` | 是 | Agent 模式问股（v1.9.4+，Function Calling + SSE 多类型事件） |
| GET | `/api/market/quote/{code}` | 否 | 查询实时行情 |
| GET | `/api/records` | 是 | 记录列表 |
| GET | `/api/records/{id}` | 是 | 记录详情（含对话消息） |
| DELETE | `/api/records/{id}` | 是 | 删除记录 |
| GET | `/api/reports` | 是 | 报告列表 |
| GET | `/api/reports/{id}` | 是 | 报告详情 |

### 后端数据库表

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `users` | 用户账号 | id, username, password_hash, password_salt |
| `tokens` | 登录令牌 | id, user_id, token |
| `stocks` | 自选股 | id, code, name, user_id, UNIQUE(user_id, code) |
| `analysis_tasks` | 分析任务 | task_id, stock_code, status, report_id, user_id |
| `reports` | 分析报告 | stock_code, stock_name, price, score, risks_json, indicators_json, user_id |
| `records` | 统一记录（问股+报告） | record_type, stock_code, session_id, metadata_json, user_id |
| `ask_sessions` | 问股会话 | session_id, stock_code, user_id, title, summary |
| `ask_messages` | 问股消息 | session_id, role, content, answer_type, ai_status, model, thinking_json |
| `schema_version` | 数据库迁移版本 | version, description, applied_at |

---

## 前端结构（mobile-app/）

```
mobile-app/
├── App.tsx                    # 应用根组件：SafeAreaProvider + AppNavigator
├── index.ts                   # Expo 入口
├── app.json                   # Expo 配置
├── package.json               # Node 依赖
├── tsconfig.json              # TypeScript 配置
├── metro.config.js            # Metro 打包器配置
│
└── src/
    ├── api/
    │   └── client.ts          # 统一 API 客户端：apiGet/apiPost/apiDelete，自动带 Token，结构化错误处理
    │
    ├── constants/
    │   └── app.ts             # 应用常量：APP_VERSION, APP_NAME
    │
    ├── contexts/
    │   └── AuthContext.tsx     # 认证上下文：登录/注册/登出、Token 恢复、用户状态
    │
    ├── hooks/
    │   └── useApiErrorHandler.ts  # API 错误处理 Hook：401 自动清 Token + 重置 Store
    │
    ├── navigation/
    │   ├── AppNavigator.tsx              # 主导航：底部 Tab（自选 | 问股 | 记录 | 我的）
    │   ├── WatchlistStackNavigator.tsx   # 自选 Tab 的 Stack 导航
    │   ├── RecordStackNavigator.tsx      # 记录 Tab 的 Stack 导航
    │   └── MineStackNavigator.tsx        # 我的 Tab 的 Stack 导航
    │
    ├── screens/               # 页面组件
    │   ├── WatchlistScreen.tsx     # 自选页：股票列表、搜索、添加、删除、分析
    │   ├── AskScreen.tsx          # 问股页：输入问题、多轮对话、结果展示、加入自选
    │   ├── TaskStatusScreen.tsx   # 任务状态页：分析任务进度、自动轮询
    │   ├── ReportDetailScreen.tsx # 报告详情页：完整报告展示（评分、指标、风险）
    │   ├── RecordListScreen.tsx   # 记录列表页：所有记录（问股+报告），搜索、删除
    │   ├── RecordDetailScreen.tsx # 记录详情页：完整对话消息 + 继续追问入口
    │   ├── MineScreen.tsx         # 我的页：用户信息、版本、后端地址配置、连接测试
    │   └── LoginScreen.tsx        # 登录页：注册/登录切换、密码可见切换
    │
    ├── components/            # 公共 UI 组件
    │   ├── AppButton.tsx          # 通用按钮（primary/secondary/danger 变体）
    │   ├── AppCard.tsx            # 通用卡片容器
    │   ├── ConfirmDialog.tsx      # 确认弹窗（删除等操作二次确认）
    │   ├── LoginRequiredView.tsx  # 未登录引导提示
    │   ├── MessageBubble.tsx      # 消息气泡（用户/AI 消息样式）
    │   ├── MetricRow.tsx          # 指标行（标签+值左右布局）
    │   ├── ScoreGauge.tsx         # 评分仪表盘（彩色进度条）
    │   ├── StateView.tsx          # 统一状态展示（loading/empty/error）
    │   ├── StockAutocomplete.tsx  # 股票搜索自动补全组件
    │   └── WatchlistStockCard.tsx # 自选股卡片（代码、名称、价格、涨跌幅、记录摘要）
    │
    ├── stores/                # Zustand 状态管理
    │   ├── index.ts              # Store 聚合导出 + resetAllStores
    │   ├── watchlistStore.ts     # 自选股状态：列表加载、增删、分析任务、搜索过滤
    │   ├── recordsStore.ts       # 记录状态：列表加载、删除、搜索过滤
    │   └── askStore.ts           # 问股状态：会话管理、发送问题、加入自选、恢复会话
    │
    ├── theme/                 # 主题常量
    │   ├── colors.ts             # 颜色定义（背景、文字、涨跌色、状态色、记录类型色）
    │   ├── spacing.ts            # 间距定义（xs~xxl、屏幕边距、卡片间距）
    │   └── typography.ts         # 字体定义（标题、正文、辅助、长文本）
    │
    ├── types/                 # TypeScript 类型定义
    │   ├── index.ts              # 聚合导出所有类型
    │   ├── stock.ts              # Stock, AnalysisTask
    │   ├── ask.ts                # AskResponse, AskMessage
    │   ├── record.ts             # RecordItem, RecordDetail
    │   ├── report.ts             # Report, ReportHistoryItem, ReportIndicators
    │   └── navigation.ts         # 导航参数类型（RootTabParamList, StackParamList）
    │
    └── utils/                 # 工具函数
        ├── stockDisplay.ts       # 股票展示：代码标准化、涨跌色、格式
        ├── recordDisplay.ts      # 记录展示：类型标签、摘要截取
        └── taskStatusDisplay.ts  # 任务状态展示：状态文本、颜色
```

### 前端页面导航结构

```
AppNavigator (Bottom Tab)
├── 自选 Tab → WatchlistStackNavigator
│   ├── WatchlistScreen        (自选列表)
│   ├── TaskStatusScreen       (任务状态)
│   ├── RecordDetailScreen     (记录详情)
│   └── ReportDetailScreen     (报告详情)
│
├── 问股 Tab → AskScreen (单页，无 Stack)
│
├── 记录 Tab → RecordStackNavigator
│   ├── RecordListScreen       (记录列表)
│   ├── RecordDetailScreen     (记录详情)
│   └── ReportDetailScreen     (报告详情)
│
└── 我的 Tab → MineStackNavigator
    ├── MineScreen             (我的页面)
    └── LoginScreen            (登录/注册)
```

### 前端状态管理（Zustand Store）

| Store | 状态 | 操作 |
|-------|------|------|
| `watchlistStore` | stocks, taskStatuses, isLoading, loadError, searchQuery | loadStocks, addStock, deleteStock, createAnalysis, loadTaskStatuses |
| `recordsStore` | items, isLoading, loadError, searchQuery | fetchRecords, deleteRecord |
| `askStore` | sessionId, messages, question, isLoading, error, latestResult, thinkingSteps | handleAsk, handleAskStream, handleAskAgentStream, handleNewSession, handleAddToWatchlist, restoreSession |

---

## 文档目录（docs/）

```
docs/
├── README.md                     # 项目总览（快速启动、技术栈、版本历史）
├── overall-roadmap.md            # 总体发展方案（三阶段规划）
├── v1.6-plan.md                  # v1.6 UX 优化计划（已完成）
├── code-review-notes.md          # 代码问题与隐患记录（143 条）
├── common-issues.md              # 常见问题与排查手册
├── learning-notes.md             # 学习笔记
├── learning-summary.md           # 学习总结
│
├── reference/                    # ← 常用参考文档（本文档所在目录）
│   ├── project-structure.md      # 项目结构速查（本文）
│   ├── data-flow.md              # 数据流图
│   └── architecture-overview.md  # 架构总览
│
└── archive/
    ├── plans/                    # 历史版本计划 (v0.2~v1.5)
    ├── releases/                 # 历史版本总结 (v0.1~v1.6)
    ├── backend-learning-notes.md
    ├── frontend-learning-notes.md
    └── learning-plan.md
```

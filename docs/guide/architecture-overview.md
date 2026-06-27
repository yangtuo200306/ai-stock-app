# 架构总览

> 本文档从全局视角描述项目的架构设计、分层、关键模式和设计决策。

---

## 1. 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    移动端 (React Native / Expo)              │
│                                                             │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 自选 Tab │  │ 问股 Tab │  │ 记录 Tab │  │ 我的 Tab │    │
│  └────┬────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │            │             │             │           │
│  ┌────▼────────────▼─────────────▼─────────────▼────┐      │
│  │              Zustand Stores                      │      │
│  │  (watchlistStore / recordsStore / askStore)       │      │
│  └────────────────────┬─────────────────────────────┘      │
│                       │                                    │
│  ┌────────────────────▼─────────────────────────────┐      │
│  │              api/client.ts (统一 API 客户端)       │      │
│  │  自动带 Token、结构化错误处理、401 自动清 Token     │      │
│  └────────────────────┬─────────────────────────────┘      │
│                       │ HTTP (JSON)                        │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   后端 (Python FastAPI)                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              API 路由层 (api/*.py)                   │   │
│  │  health / auth / stocks / analysis / ask / market   │   │
│  │  records / reports                                  │   │
│  │  职责：接收请求、参数校验、调用 Service、返回响应    │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                    │
│  ┌────────────────────▼────────────────────────────────┐   │
│  │              Service 业务层 (services/*.py)          │   │
│  │  market_data  │  technical_indicators  │  llm_client │   │
│  │  report_builder  │  ask_service  │  stock_resolver  │   │
│  └──┬──────────┬──────────┬──────────┬─────────────────┘   │
│     │          │          │          │                      │
│     ▼          ▼          ▼          ▼                      │
│  ┌──────┐ ┌────────┐ ┌────────┐ ┌──────────┐              │
│  │efinance│ │ 新浪  │ │火山方舟│ │ SQLite   │              │
│  │行情源  │ │备用源  │ │ LLM   │ │ 数据库   │              │
│  └──────┘ └────────┘ └────────┘ └──────────┘              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              基础设施层                               │   │
│  │  config/settings.py 集中配置管理                      │   │
│  │  logging_config.py  日志系统（控制台+文件轮转）        │   │
│  │  errors.py + error_handler.py 错误码+全局异常处理     │   │
│  │  database.py 数据库连接+迁移+鉴权                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 分层原则

| 层 | 职责 | 依赖方向 |
|----|------|----------|
| **API 路由层** | 接收 HTTP 请求、参数校验、调用 Service、组装响应 | → Service 层 |
| **Service 业务层** | 业务逻辑实现、调用外部服务、数据加工 | → 基础设施层 |
| **基础设施层** | 配置、日志、数据库、错误处理 | 无上层依赖 |

**关键约束**：API 路由层不能直接操作数据库，必须通过 Service 层。

---

## 2. 前端架构

### 2.1 组件层级

```
App.tsx (根组件)
  └── SafeAreaProvider
      └── AuthProvider (认证上下文，全局)
          └── NavigationContainer
              └── Tab.Navigator (底部 Tab)
                  ├── 自选 Stack → WatchlistScreen / TaskStatusScreen / RecordDetailScreen / ReportDetailScreen
                  ├── 问股 → AskScreen (单页)
                  ├── 记录 Stack → RecordListScreen / RecordDetailScreen / ReportDetailScreen
                  └── 我的 Stack → MineScreen / LoginScreen
```

### 2.2 状态管理模式

项目使用 **Zustand** 进行全局状态管理，替代了早期版本的 useState + DataRefreshContext 模式。

**设计原则：**

```
┌─────────────────────────────────────────────┐
│              Zustand Stores                  │
│                                              │
│  watchlistStore     recordsStore   askStore  │
│  ┌─────────────┐   ┌──────────┐   ┌───────┐ │
│  │ stocks[]    │   │ items[]  │   │messages│ │
│  │ taskStatuses│   │ isLoading│   │session │ │
│  │ isLoading   │   │ loadError│   │question│ │
│  │ loadError   │   │ searchQ  │   │error   │ │
│  │ searchQuery │   └──────────┘   │result  │ │
│  └─────────────┘                  └───────┘ │
│                                              │
│  每个 Store 职责单一，组件按需订阅              │
│  Store 间通过 getState() 互相调用              │
│  resetAllStores() 统一清空（登出/401 时）      │
└─────────────────────────────────────────────┘
```

**Store 间联动关系：**

```
askStore.handleAsk() 成功后
  → watchlistStore.loadStocks()  // 刷新自选摘要
  → recordsStore.fetchRecords()  // 刷新记录列表

askStore.handleAddToWatchlist() 成功后
  → watchlistStore.loadStocks()  // 刷新自选列表
```

### 2.3 主题系统

前端使用三个主题常量文件统一管理视觉风格：

| 文件 | 内容 | 示例 |
|------|------|------|
| `colors.ts` | 颜色定义 | background, primary, danger, changeUp, changeDown |
| `spacing.ts` | 间距定义 | xs(4), sm(8), md(12), lg(16), xl(20), xxl(24) |
| `typography.ts` | 字体定义 | pageTitle(22), sectionTitle(17), body(15), helper(13) |

### 2.4 认证架构

```
AuthContext (React Context)
  ├── 状态: userId, username, token, isLoading, isLoggedIn
  ├── 操作: login(), register(), logout(), clearSession()
  │
  ├── 启动时: 从 AsyncStorage 恢复 token → 调用 /api/auth/me 验证
  ├── 登录后: token 存入 AsyncStorage，更新状态
  ├── 登出时: 调用 /api/auth/logout，清除 AsyncStorage 和状态
  │
  └── 401 时: api/client.ts 自动清 token
               useApiErrorHandler 调用 clearSession() + resetAllStores()
```

### 2.5 导航类型安全

导航参数类型定义在 [navigation.ts](file:///d:/ai-stock-analysis/ai-stock-app/mobile-app/src/types/navigation.ts)：

```
RootTabParamList: 底部 Tab 的参数（自选/问股/记录/我的）
WatchlistStackParamList: 自选 Stack 的参数
RecordStackParamList: 记录 Stack 的参数
MineStackParamList: 我的 Stack 的参数
```

---

## 3. 后端架构

### 3.1 请求处理流程

```
HTTP 请求
  │
  ▼
CORS 中间件 → 允许跨域
  │
  ▼
路由匹配 → api/*.py 中的 router
  │
  ├── 需要认证的接口 → Depends(get_current_user_id)
  │     → 从 Authorization header 提取 token
  │     → 查询 tokens 表验证
  │     → 返回 user_id 注入到路由函数
  │
  ▼
路由函数 → 参数校验 (Pydantic)
  │
  ▼
调用 Service 层 → 业务逻辑处理
  │
  ▼
返回响应 → JSON
  │
  ▼
错误时 → error_handler.py 全局异常处理
  ├── HTTPException → 返回结构化错误 { error_code, message }
  ├── RequestValidationError → 返回 422 + 校验详情
  └── 未预期异常 → 返回 500 + 日志记录
```

### 3.2 错误码体系

13 个结构化 ErrorCode 枚举（定义在 [errors.py](file:///d:/ai-stock-analysis/ai-stock-app/backend/app/errors.py)）：

| 错误码 | 含义 | HTTP 状态码 |
|--------|------|-------------|
| `INVALID_TOKEN_FORMAT` | Token 格式无效 | 401 |
| `INVALID_TOKEN` | Token 无效 | 401 |
| `USERNAME_EXISTS` | 用户名已存在 | 400 |
| `INVALID_CREDENTIALS` | 用户名或密码错误 | 401 |
| `USER_NOT_FOUND` | 用户不存在 | 404 |
| `SESSION_NOT_FOUND` | 会话不存在 | 400 |
| `SESSION_STOCK_MISMATCH` | 会话股票不匹配 | 400 |
| `STOCK_NOT_FOUND` | 股票未找到 | 400 |
| `MISSING_STOCK_CODE` | 缺少股票代码 | 400 |
| `MARKET_DATA_ERROR` | 行情数据错误 | 400 |
| `RECORD_NOT_FOUND` | 记录不存在 | 404 |
| `REPORT_NOT_FOUND` | 报告不存在 | 404 |
| `TASK_NOT_FOUND` | 任务不存在 | 404 |

### 3.3 配置管理

使用 `pydantic-settings` 集中管理配置（定义在 [settings.py](file:///d:/ai-stock-analysis/ai-stock-app/backend/app/config/settings.py)）：

```
Settings 类
├── LLM_API_KEY / LLM_BASE_URL / LLM_MODEL  → 火山方舟配置
├── DATABASE_PATH                            → 数据库路径
├── CORS_ORIGINS                             → 跨域来源
├── QUOTE_CACHE_TTL_SECONDS                  → 行情缓存时间
├── PRIMARY_MARKET_SOURCE                    → 主行情源 (efinance)
├── FALLBACK_MARKET_SOURCE                   → 备用行情源 (sina)
├── LOG_DIR / LOG_LEVEL                      → 日志配置
│
└── 从 .env 文件加载，类型安全，支持 IDE 自动补全
```

### 3.4 日志系统

三级日志输出（定义在 [logging_config.py](file:///d:/ai-stock-analysis/ai-stock-app/backend/app/logging_config.py)）：

| 输出 | 级别 | 格式 | 用途 |
|------|------|------|------|
| 控制台 | INFO | 时间/级别/模块/行号/消息 | 开发调试 |
| app.log | INFO | 同上，10MB 轮转，保留 5 份 | 常规运行日志 |
| app_debug.log | DEBUG | 同上，50MB 轮转，保留 3 份 | 详细排查 |

### 3.5 数据库架构

#### 表关系图

```
users (1) ──── (N) tokens
  │
  ├── (1) ──── (N) stocks          (自选股)
  ├── (1) ──── (N) analysis_tasks  (分析任务)
  ├── (1) ──── (N) reports         (分析报告)
  ├── (1) ──── (N) records         (统一记录)
  ├── (1) ──── (N) ask_sessions    (问股会话)
  └── (1) ──── (N) ask_messages    (问股消息)

ask_sessions (1) ──── (N) ask_messages  (会话包含多条消息)
records (N) ──── (1) ask_sessions       (记录关联会话，通过 session_id)
reports (1) ──── (N) analysis_tasks     (报告关联任务)
records (N) ──── (1) reports            (记录关联报告，通过 report_id)
```

#### 数据库迁移机制

- `schema_version` 表记录已应用的迁移版本
- 启动时 `init_db()` 自动检查并执行未应用的迁移
- 当前版本：`V20260625_003_ensure_columns`
- 迁移历史：
  1. `V20260625_001_initial_baseline` — 初始建表
  2. `V20260625_002_migrate_stocks_unique` — stocks 表唯一约束从 `code` 改为 `(user_id, code)`
  3. `V20260625_003_ensure_columns` — 补充缺失列（report_id, user_id, session_id, updated_at）

---

## 4. 关键设计决策

### 4.1 为什么用 Zustand 而不是 Context + useState？

| 方案 | 问题 | Zustand 解决方式 |
|------|------|-----------------|
| Context + useState | 状态变化时所有消费者重渲染 | 组件按需订阅，只重渲染订阅的部分 |
| Context + useState | 跨页面同步需要手动触发刷新 | Store 数据全局共享，一处修改处处同步 |
| Context + useState | 状态逻辑分散在各页面 | Store 集中管理状态和操作 |

### 4.2 为什么 records 表同时存问股和报告？

早期版本中，问股记录和分析报告分别存在不同的表/接口中。v0.4 后统一为 `records` 表，通过 `record_type` 区分：

- **统一列表展示**：记录 Tab 可以同时展示问股和报告，按时间排序
- **简化前端**：一个 Store、一个 API 接口管理所有记录
- **扩展性好**：后续新增记录类型只需加一个 `record_type` 值

### 4.3 为什么行情数据有主备两个数据源？

- **主源 efinance**：数据全、接口稳定，但依赖第三方库
- **备用源新浪**：接口简单、不依赖额外库，但字段解析较脆弱
- **设计目标**：主源失败时自动切换备用源，不中断用户体验
- **缓存策略**：60 秒内存缓存，减少重复请求

### 4.4 为什么 AI 回答有降级机制？

- **正常流程**：调用火山方舟 LLM → 返回 AI 回答
- **降级流程**：LLM 调用失败（网络/鉴权/限流）→ 使用规则回答
- **规则回答**：由 `ask_service.py` 中的 `_build_rule_answer()` 生成，包含股票名称、价格、涨跌幅、趋势、建议
- **设计目标**：保证问股功能在任何情况下都能返回结果，不因 AI 服务不可用而完全失效

### 4.5 为什么分析任务看起来是同步完成的？

当前 `POST /api/analysis` 接口在请求处理过程中同步完成行情获取、指标计算、报告生成和持久化，然后返回 `status: "completed"`。这是最小实现的选择：

- **优点**：实现简单，前端不需要长时间等待
- **缺点**：如果行情源响应慢，HTTP 请求会阻塞
- **后续**：如果分析任务变复杂（如多数据源、长耗时计算），可改为异步任务队列

---

## 5. 技术栈总结

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 前端框架 | React Native (Expo) | ~56.0.12 | 跨平台移动应用 |
| 前端语言 | TypeScript | - | 类型安全 |
| 导航 | @react-navigation | - | Tab + Stack 导航 |
| 状态管理 | Zustand | ^5.0.14 | 全局状态管理 |
| 本地存储 | @react-native-async-storage | - | Token、配置持久化 |
| 后端框架 | FastAPI | >=0.109.0 | RESTful API |
| 后端语言 | Python | 3.9（服务器）/ 3.11（本地） | - |
| 数据库 | SQLite | - | 嵌入式数据库 |
| 行情数据 | efinance + 新浪备用 | - | A 股实时行情 + 历史 K 线 |
| AI 模型 | 火山方舟 (DeepSeek) | - | AI 问股回答 |
| 配置管理 | pydantic-settings | - | 集中配置 + .env 文件 |
| 日志 | Python logging + RotatingFileHandler | - | 分级日志 + 文件轮转 |

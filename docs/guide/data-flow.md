# 数据流图

> 本文档描述项目中主要业务场景的数据流转路径，从用户操作到后端处理再到数据库的完整链路。

---

## 1. 问股流程（核心链路）

这是项目最核心的功能，涉及前端 → 后端 → 多个 Service → 数据库的完整链路。

```
用户输入 "600519 怎么样？"
        │
        ▼
┌─────────────────────────────────────┐
│  AskScreen.tsx                       │
│  1. 用户输入问题，点击发送            │
│  2. 调用 askStore.handleAsk()        │
│  3. askStore 调用 apiPost('/api/ask') │
│  4. api/client.ts 自动带上 Token     │
└──────────────┬──────────────────────┘
               │ POST /api/ask
               ▼
┌─────────────────────────────────────┐
│  ask.py (API 路由层)                 │
│  1. 解析 session（新会话/追问）       │
│  2. 解析股票代码（从问题中提取）       │
│  3. 调用行情服务获取数据              │
│  4. 计算技术指标                      │
│  5. 构建分析报告                      │
│  6. 调用 LLM 生成 AI 回答（或降级）   │
│  7. 保存会话/消息/记录到数据库        │
│  8. 返回 AskResponse                 │
└──┬──────┬──────┬──────┬─────────────┘
   │      │      │      │
   ▼      ▼      ▼      ▼
┌──────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
│market│ │technical │ │report    │ │ask_service   │
│_data │ │_indicators│ │_builder  │ │(会话/消息/   │
│.py   │ │.py       │ │.py       │ │记录写入)     │
└──┬───┘ └──────────┘ └──────────┘ └──────┬───────┘
   │                                       │
   ▼                                       ▼
┌──────────────┐              ┌───────────────────────┐
│ efinance /   │              │ SQLite 数据库          │
│ 新浪备用     │              │ ├─ ask_sessions        │
│ (实时行情    │              │ ├─ ask_messages        │
│  + 历史K线)  │              │ ├─ records             │
└──────────────┘              │ └─ (report 由 analysis │
                              │    流程写入)            │
                              └───────────────────────┘
```

### 问股请求的详细数据流

```
Step 1: 前端 → API
─────────────────────────────────────────
POST /api/ask
Body: { "question": "600519 怎么样？" }
Header: Authorization: Bearer <token>

Step 2: API 路由层 (ask.py)
─────────────────────────────────────────
a. 解析股票代码 → stock_resolver.py → "600519"
b. 获取实时行情 → market_data.py → { price: 1880.50, change_pct: 1.25 }
c. 获取历史K线 → market_data.py → [30天日线数据]
d. 计算技术指标 → technical_indicators.py → { ma5, ma10, rsi6, volume_ratio, ... }
e. 构建报告 → report_builder.py → { score, trend, action, summary, risks }
f. 调用 LLM → llm_client.py → AI 回答文本（失败则降级为规则回答）
g. 保存会话 → ask_service.py → INSERT INTO ask_sessions
h. 保存消息 → ask_service.py → INSERT INTO ask_messages (user + assistant)
i. 保存记录 → ask_service.py → INSERT INTO records (record_type='ask')

Step 3: API → 前端
─────────────────────────────────────────
Response: {
  stock_code: "600519", stock_name: "贵州茅台",
  price: 1880.50, change_pct: 1.25,
  trend: "偏强", action: "观望", score: 80,
  answer: "...", answer_type: "ai",
  session_id: "xxx", message_id: 123,
  ...
}

Step 4: 前端更新
─────────────────────────────────────────
a. askStore 更新 messages[]、sessionId、latestResult
b. 自动触发 watchlistStore.loadStocks() 刷新自选摘要
c. 自动触发 recordsStore.fetchRecords() 刷新记录列表
```

---

## 2. Agent 模式数据流（v1.9.4+）

Agent 模式是 v1.9.4 新增的问股路径，LLM 通过 Function Calling 自主决定调哪些工具，而不是由后端预先取好所有数据。

### 2.1 整体流程

```
用户输入 "600519 怎么样？"
        │
        ▼
┌──────────────────────────────────────────┐
│  AskScreen.tsx                            │
│  1. 用户输入问题，点击发送                 │
│  2. 右上角切换 Agent/标准模式              │
│  3. Agent 模式 → askStore.handleAskAgentStream()
│  4. askStore 调用 apiPostAgentStream()     │
│  5. api/client.ts 解析 SSE 多类型事件      │
└──────────────────┬───────────────────────┘
                   │ POST /api/ask/agent/stream
                   ▼
┌──────────────────────────────────────────┐
│  ask.py — ask_agent_stream()             │
│  1. 解析 session（多轮对话支持）           │
│  2. 解析股票代码（不再强制校验）            │
│  3. 构建原则式 system prompt               │
│  4. 注入多轮对话 context（stock/上一轮问题）│
│  5. 调用 run_agent_loop() 启动 Agent 循环  │
│  6. finally 块保存会话/消息/记录（含thinking_json）│
└──────────────────┬───────────────────────┘
                   │ Generator[yield SSE events]
                   ▼
┌──────────────────────────────────────────┐
│  agent_loop.py — run_agent_loop()        │
│  ReAct 循环（最多 5 步）：                 │
│                                           │
│  1. yield thinking 事件                    │
│  2. 调用 LLM（带 tool definitions）        │
│  3. LLM 返回 tool_calls → 执行工具         │
│     ├─ tool_start 事件（前端显示）          │
│     ├─ 执行 handler（调用现有 Service）     │
│     └─ tool_done 事件（含耗时）             │
│  4. 工具结果回填到 messages                 │
│  5. 继续下一轮循环                          │
│  6. LLM 返回文本 → yield text 事件（逐chunk）│
│  7. yield done 事件                        │
└──────────────────┬───────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│  tool_registry.py + tool_factory.py      │
│                                           │
│  7 个已注册工具：                          │
│  ├─ search_stock → stock_resolver.py       │
│  ├─ get_stock_quote → market_data.py       │
│  ├─ get_technical_indicators               │
│  │     → technical_indicators.py           │
│  ├─ get_stock_news → news_fetcher.py       │
│  ├─ get_analysis_report                   │
│  │     → report_builder.py                │
│  ├─ get_market_indices                    │
│  │     → market_overview.py (v2.0.1)       │
│  └─ get_sector_rankings                   │
│        → market_overview.py (v2.0.1)       │
└──────────────────────────────────────────┘
```

### 2.2 SSE 事件协议

Agent 循环是多步的，不能等全部完成再返回。用 SSE 逐条推送事件：

```
data: {"type":"thinking","message":"AI 正在分析..."}
data: {"type":"tool_start","tool":"get_stock_quote","display_name":"获取实时行情"}
data: {"type":"tool_done","tool":"get_stock_quote","success":true,"duration":0.5}
data: {"type":"text","content":"根据最新数据..."}
data: {"type":"done","success":true,"session_id":"xxx","full_answer":"..."}
```

| 事件类型 | 触发时机 | 关键字段 |
|---------|---------|---------|
| `thinking` | Agent 循环开始时 | `message` |
| `tool_start` | 每个工具执行前 | `tool`, `display_name` |
| `tool_done` | 每个工具执行后 | `tool`, `success`, `duration` |
| `text` | LLM 生成最终答案时（逐 chunk） | `content` |
| `done` | Agent 循环结束 | `success`, `session_id`, `full_answer` |

事件流结束后，后端将 thinking/tool_start/tool_done 事件序列化为 JSON 存入 `ask_messages.thinking_json` 列，前端恢复会话时可解析并展示历史思考过程。

### 2.3 前端事件处理

```
apiPostAgentStream() 解析 SSE 流
        │
        ▼
askStore.handleAskAgentStream()
  ├── thinking → 追加 ThinkingStep{type:'thinking'}
  ├── tool_start → 追加 ThinkingStep{type:'tool_start'}
  ├── tool_done → 更新上一个 tool_start 为 tool_done
  ├── text → 累积到 accumulatedContent，更新 messages 末尾
  └── done
      ├── success: false → shouldFallback=true → 降级到传统流式
      └── success: true → 更新 sessionId，刷新自选/记录
```

### 2.4 标准模式 vs Agent 模式对比

| 维度 | 标准模式 | Agent 模式 |
|------|---------|-----------|
| 数据获取 | 后端预先全部取好 | LLM 按需调工具 |
| API 端点 | `POST /api/ask/stream` | `POST /api/ask/agent/stream` |
| 返回格式 | SSE 单类型（纯文本） | SSE 多类型（thinking/tool_start/tool_done/text/done） |
| 结果卡片 | ✅ 有（结构化数据） | ❌ 无（纯对话） |
| 新闻展示 | NewsCard 组件 | LLM 输出 Markdown 链接 |
| 思考过程 | 无 | 可折叠面板（工具数 + 总耗时） |
| 降级路径 | 传统流式 → 规则回答 | Agent 失败 → 传统流式 → 规则回答 |

### 2.5 三层降级保护

```
Agent 模式
  ├── HTTP 非 200 → 传统流式
  ├── done: success: false → 传统流式
  └── 传统流式失败 → 非流式 LLM → 规则回答
```

---

## 3. 自选股流程

### 3.1 加载自选列表

```
WatchlistScreen 加载
        │
        ▼
watchlistStore.loadStocks()
        │
        ▼
apiGet('/api/stocks')  ───→  stocks.py (GET /api/stocks)
                                   │
                                   ├── 查询 stocks 表（当前用户的自选股）
                                   ├── LEFT JOIN records 表（取最近记录摘要）
                                   └── 对每只股票调用 get_stock_quote() 获取实时行情
                                   │
                                   ▼
                              返回 Stock[]（含 price, change_pct, latest_summary）
```

### 3.2 添加自选股

```
AskScreen "加入自选" 按钮
        │
        ▼
askStore.handleAddToWatchlist()
        │
        ▼
apiPost('/api/stocks', { code, name })
        │
        ▼
stocks.py (POST /api/stocks)
  → INSERT OR IGNORE INTO stocks (code, name, user_id)
  → 返回 { message: "stock added" }
        │
        ▼
askStore 调用 watchlistStore.loadStocks() 刷新
```

### 3.3 删除自选股

```
WatchlistScreen 点击删除 → ConfirmDialog 确认
        │
        ▼
watchlistStore.deleteStock(code)
        │
        ▼
apiDelete('/api/stocks/{code}')
        │
        ▼
stocks.py (DELETE /api/stocks/{code})
  → DELETE FROM stocks WHERE code = ? AND user_id = ?
  → 同时清理本地 AsyncStorage 中的 taskId 映射
  → 调用 loadStocks() 刷新列表
```

---

## 4. 分析任务流程

```
WatchlistScreen 点击"分析"按钮
        │
        ▼
watchlistStore.createAnalysis(stockCode)
        │
        ▼
apiPost('/api/analysis', { stock_code })
        │
        ▼
analysis.py (POST /api/analysis)
  ├── 获取实时行情 (get_stock_quote)
  ├── 获取历史K线 (get_stock_history)
  ├── 计算技术指标 (build_technical_indicators)
  ├── 构建报告 (build_analysis_report)
  ├── INSERT INTO reports（保存报告）
  ├── INSERT INTO analysis_tasks（保存任务，状态=completed）
  └── INSERT INTO records（保存记录，record_type='report'）
        │
        ▼
返回 { task_id, status: "completed", report_id }
        │
        ▼
watchlistStore 保存 task_id → AsyncStorage
→ 跳转 TaskStatusScreen（轮询任务状态，通常立即完成）
→ 点击"查看报告" → 跳转 ReportDetailScreen
```

---

## 5. 认证流程

### 5.1 注册/登录

```
LoginScreen
  ├── 输入用户名+密码
  ├── 调用 AuthContext.login() / register()
  │       │
  │       ▼
  │   fetch POST /api/auth/login
  │       │
  │       ▼
  │   auth.py
  │     → 验证用户名/密码
  │     → 生成 UUID token
  │     → INSERT INTO tokens
  │     → 返回 { token, user_id, username }
  │       │
  │       ▼
  │   AuthContext 保存 token → AsyncStorage
  │   更新 userId, username, isLoggedIn
  │
  └── 登录成功 → 自动返回 MineScreen
```

### 4.2 Token 验证（每次受保护 API 请求）

```
api/client.ts
  ├── 从 AsyncStorage 读取 token
  ├── 在请求头添加 Authorization: Bearer <token>
  │
  ▼
database.py get_current_user_id()
  ├── 从 Header 提取 token
  ├── SELECT user_id FROM tokens WHERE token = ?
  ├── 不存在 → 抛 401 HTTPException
  └── 存在 → 返回 user_id（注入到 API 路由函数）
```

### 5.3 Token 失效处理

```
API 返回 401
  │
  ▼
api/client.ts handleResponse()
  ├── 自动清除 AsyncStorage 中的 token
  ├── 抛出 ApiError(status=401)
  │
  ▼
页面 catch 到错误
  ├── 使用 useApiErrorHandler
  │     ├── 检测到 401 → clearSession()
  │     ├── resetAllStores() 清空所有 Zustand Store
  │     └── 返回 "登录状态已失效，请重新登录"
  └── 页面展示错误提示
```

---

## 6. 记录流程

### 6.1 记录列表

```
RecordListScreen 加载
        │
        ▼
recordsStore.fetchRecords()
        │
        ▼
apiGet('/api/records')
        │
        ▼
records.py (GET /api/records)
  → SELECT FROM records WHERE user_id = ? ORDER BY updated_at DESC
  → 解析 metadata_json 为 metadata 对象
  → 返回 RecordItem[]
```

### 6.2 记录详情

```
RecordListScreen 点击某条记录
        │
        ▼
跳转 RecordDetailScreen (recordId)
        │
        ▼
apiGet('/api/records/{recordId}')
        │
        ▼
records.py (GET /api/records/{id})
  → 查询 records 表
  → 如果有 session_id → 查询 ask_messages 表（全部消息）
  → 返回 RecordDetail（含 messages[]）
```

### 6.3 记录类型说明

| record_type | 来源 | 说明 |
|-------------|------|------|
| `ask` | 问股流程 | 用户在问股页提问后自动生成 |
| `report` | 分析任务流程 | 用户在自选页点击"分析"后自动生成 |

---

## 7. 行情数据流

```
get_stock_quote(code)
  │
  ├── 检查缓存 _quote_cache（60秒 TTL）
  │   ├── 命中 → 直接返回缓存
  │   └── 未命中 → 继续
  │
  ├── 主数据源：efinance
  │   ├── ef.stock.get_realtime_quotes() → DataFrame
  │   ├── 按股票代码筛选行
  │   └── 成功 → 缓存 → 返回 StockQuote
  │
  └── 主源失败 → 备用数据源：新浪
      ├── 请求 https://hq.sinajs.cn/list=sh600519
      ├── 解析逗号分隔文本
      └── 成功 → 缓存 → 返回 StockQuote

get_stock_history(code, days=30)
  │
  ├── 主数据源：efinance
  │   ├── ef.stock.get_quote_history(code) → DataFrame
  │   └── 解析为 StockDailyPrice[]，截取最近 days 条
  │
  └── 主源失败 → 备用数据源：新浪 K 线 API
      └── 解析 JSON 数组
```

---

## 8. 前端数据流总览

```
                    ┌─────────────────────────┐
                    │    AsyncStorage          │
                    │  ├─ backendUrl           │
                    │  ├─ authToken            │
                    │  └─ stockTaskIds         │
                    └─────────┬───────────────┘
                              │
┌──────────┐    ┌────────────▼────────────┐    ┌──────────────┐
│ Screens  │◄──►│   Zustand Stores        │◄──►│  api/client  │◄──► 后端 API
│ (页面)   │    │  ├─ watchlistStore       │    │  (统一客户端) │
│          │    │  ├─ recordsStore         │    └──────────────┘
│ 组件     │    │  └─ askStore             │
│ (UI)     │    └─────────────────────────┘
└──────────┘              │
                          ▼
                    ┌─────────────────────────┐
                    │   AuthContext            │
                    │  (登录/注册/登出/Token)   │
                    └─────────────────────────┘
```

### 数据流向说明

1. **页面 → Store → API → 后端**：页面调用 Store 的 action，Store 调用 api/client 发送请求
2. **后端 → API → Store → 页面**：后端返回数据，Store 更新状态，页面通过订阅自动重渲染
3. **Store 间联动**：askStore.handleAsk() 成功后自动调用 watchlistStore.loadStocks() 和 recordsStore.fetchRecords()
4. **AuthContext 全局**：登录/登出时通过 resetAllStores() 清空所有 Store

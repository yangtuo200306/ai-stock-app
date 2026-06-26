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

## 2. 自选股流程

### 2.1 加载自选列表

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

### 2.2 添加自选股

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

### 2.3 删除自选股

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

## 3. 分析任务流程

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

## 4. 认证流程

### 4.1 注册/登录

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

### 4.3 Token 失效处理

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

## 5. 记录流程

### 5.1 记录列表

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

### 5.2 记录详情

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

### 5.3 记录类型说明

| record_type | 来源 | 说明 |
|-------------|------|------|
| `ask` | 问股流程 | 用户在问股页提问后自动生成 |
| `report` | 分析任务流程 | 用户在自选页点击"分析"后自动生成 |

---

## 6. 行情数据流

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

## 7. 前端数据流总览

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

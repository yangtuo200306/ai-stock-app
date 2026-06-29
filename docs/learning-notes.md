# 进阶学习记录

> 本文档记录 v1.8+ 进阶学习阶段的关键知识点和工程实践。
> v1.0~v1.7 的学习笔记已归档至 `docs/archive/learning-notes-v1.0-v1.7.md`。

---

## 相关文档

- [v1.8 计划](v1.8-plan.md)
- [总体发展方案](overall-roadmap.md)
- [项目协作规则](../.trae/rules/project_rules.md)
- [代码问题与隐患记录](code-review-notes.md)

---

## v1.8 学习要点

### 1. Pydantic 模型 vs dict：契约优先的设计

**核心概念：** 先定义数据结构长什么样，再让代码遵守这个契约。

| | dict | Pydantic BaseModel |
|---|---|---|
| 字段校验 | 无，写啥都行 | 自动校验类型 |
| IDE 提示 | 无，靠记忆 | 自动补全 |
| OpenAPI 文档 | `type: object` | 列出全部字段 |
| 嵌套序列化 | 手动处理 | 自动 `model_dump()` |

**关键理解：** FastAPI 的 `response_model` 会在返回时自动把 dict 转换成 Pydantic 对象（鸭子类型——字段匹配就行）。所以即使 `build_analysis_report` 返回的是 dict，只要字段名和 `Indicators` 模型一致，FastAPI 会自动转换。

### 2. 数据链路透传：改字段时要检查每个环节

**踩坑教训：** 第 3 步新增 `turnover_rate` 和 `amplitude` 时，改了 3 个地方：

```
market_data.py → 从 efinance 提取 ✅
technical_indicators.py → 加入 indicators dict ✅
report_builder.py → ❌ 自己拼了 indicators dict，漏了
```

但 `build_analysis_report` 自己重新构建了一个 `indicators` dict，只提取了它认识的字段，新字段被丢掉了。API 返回始终为 None。

**正确做法：** 改数据链路时，画一条线检查每个环节：

```
quote → technical_indicators → report_builder → API 返回
        ①                    ②               ③
```

每个环节都要确认新字段有没有透传。项目里的 `docs/guide/data-flow.md` 有完整的链路图，改之前应该先看。

### 3. 数据驱动渲染：组件不关心数据来源

**核心概念：** 组件只检查数据有没有，有就显示，没有就隐藏。

```tsx
{stock.score != null ? <ScoreTag /> : null}
{stock.trend ? <TrendTag /> : null}
{stock.action ? <ActionTag /> : null}
```

**为什么用 `!= null` 而不是 `!== undefined`？** 因为 `null == null` 和 `undefined == null` 都是 `true`，一次判断覆盖两种空值。

**为什么所有新增字段都是可选类型（`?`）？** 旧数据没有这些字段，行情失败时也可能为 null。组件已经做好了处理空值的准备。

### 4. 条件渲染的两种模式

**模式 A：`&&` 短路**
```tsx
{stock.score != null && <ScoreTag />}
```
左边为 `true` 时渲染右边。**注意：** 左边不能是 `0` 或 `""`，因为 `0 && <View>` 会渲染 `0`。

**模式 B：三元运算符**
```tsx
{volume_ratio != null ? (
  <MetricRow value={`比值 ${ratio}`} />
) : volume_signal != null ? (
  <MetricRow value={signal} />
) : null}
```
三路分支，适合有/无/部分有 的场景。

### 5. Hex 颜色 + Alpha 通道

```tsx
backgroundColor: getScoreColor(75) + '20'
```

`#ff4d4f20` = 红色 + 12.6% 透明度（20/255）。React Native 支持 8 位 Hex（`#RRGGBBAA`），不需要用 `rgba()`。

**应用场景：** 给评分标签做"浅色背景 + 同色文字"效果——背景用颜色+透明度，文字用纯色。

### 6. 组件复用 vs 独立实现

**问题：** 三个页面（AskScreen / RecordDetailScreen / ReportDetailScreen）都展示指标数据，要不要抽公用组件？

**决策：** 不抽。三个页面的数据来源不同（`latestResult.indicators` / `record.metadata.indicators` / `report.indicators`），上下文也不同（聊天流 / 独立详情页 / 完整报告）。抽一个组件需要大量 props 控制差异，反而更难维护。

**原则：** 不要为了复用而复用。只有"数据来源相同、展示方式相同、操作行为相同"时才值得抽组件。

### 7. 后端调试：验证运行时行为

**教训：** 第 3 步花了很长时间排查为什么 API 返回 `turnover_rate: None`。直接调用 `_get_stock_quote_from_efinance` 返回 `0.4`，但通过 API 调用返回 `None`。

**排查方法：**
1. 直接调用底层函数（排除数据源问题）
2. 检查链路每个环节（发现 `report_builder.py` 漏了）
3. 用 `inspect.getsource()` 检查进程实际加载的代码
4. 清 `__pycache__` 确保没有字节码缓存干扰

**经验：** 不要只做语法检查（`py_compile` / `tsc`），必须验证运行时行为。项目规则第 13.2 条已经写了这条。

### 8. 指标设计：精而不是多

**产品定位决定指标选择：** AI 股票分析助手，不是交易工具。核心目标：
- 精而不是多 — 每个指标都有明确意义
- 给依据 — 让用户知道为什么得出这个结论
- 小白友好 — 不用懂技术分析也能看明白

**分类策略：** 两段递进
- 行情概览（评分/趋势/建议/涨跌幅/换手率/振幅/成交量）— 小白友好
- 技术指标（MA/RSI/乖离率）— 需要一点基础

**去掉的指标：** RSI(12) — 和 RSI(6) 重复，对小白是干扰。乖离率保留但放技术指标最下面。

---

## v1.9.2 学习要点

### 9. SSE 流式响应（Server-Sent Events）

**核心概念：** 服务器主动推送数据给客户端，数据分多次到达，用户不用等全部生成完。

**和 WebSocket 的区别：**
- WebSocket：双向通信，客户端和服务器都能随时发消息
- SSE：**单向**，只能服务器推给客户端，客户端用普通 HTTP 请求发起

**后端实现：** `requests.post(stream=True)` + `iter_lines()` 逐行读取 SSE 流，`yield` 逐 chunk 产出文本。FastAPI 用 `StreamingResponse` 包装生成器。

**前端实现：** `fetch` + `ReadableStream.getReader()` 逐 chunk 读取，`TextDecoder` 解码，逐段追加到消息末尾。

### 10. 计划阶段的常见遗漏（重要教训）

**问题：** 制定 v1.9.2 计划时，只关注了"怎么把 AI 回答流式推出去"，漏掉了流式端点作为完整 API 需要做的所有事：

| 步骤 | 非流式端点 | 流式端点计划 | 流式端点实际 |
|------|-----------|------------|------------|
| 解析股票代码 | ✅ | ✅ | ✅ |
| 爬行情 + 算指标 | ✅ | ✅ | ✅ |
| 创建/更新会话 | ✅ | ❌ 漏了 | ✅ 执行时补 |
| 写用户消息 | ✅ | ❌ 漏了 | ✅ 执行时补 |
| 写 AI 消息 | ✅ | ❌ 漏了 | ✅ 执行时补 |
| 写记录 | ✅ | ❌ 漏了 | ✅ 执行时补 |
| LLM 错误降级 | ✅ | ❌ 漏了 | ✅ 执行时补 |
| 返回结果 | ✅ | ✅ | ✅ |

**原因：** 计划伪代码写了"和现有逻辑完全一样"就跳过了，没有逐行对比新旧端点的完整流程。

**教训：** 新增功能时，计划阶段必须做影响面分析，不能写"和现有一样"就跳过。至少检查数据链路、数据库、前后端类型、错误处理、配置五个维度。

**预防措施：** 见项目规则第 7 条。

---

## v1.9.3 学习要点

### 11. Web Scraping（网页抓取）vs API 调用

**核心区别：** API 调用返回结构化 JSON，直接能用。网页抓取拿到的是 HTML，需要用解析器（BeautifulSoup）从中提取信息。

```python
# API 调用：直接拿 JSON
resp = requests.post(url, json=payload, headers=headers)
data = resp.json()  # 直接用

# 网页抓取：拿 HTML → 解析 → 提取
resp = requests.get(url)
soup = BeautifulSoup(resp.text, "html.parser")
title = soup.select_one("h2 a").get_text()  # 从 DOM 里捞
```

**工程含义：** 网页抓取比 API 调用脆弱得多。网站改版、改 CSS 类名、加反爬措施，都可能导致解析失败。所以需要双源切换 + 静默降级 + 缓存。

### 12. SPA 单页应用 vs 服务端渲染（反爬原理）

**问题：** 新浪和东方财富的搜索页是 SPA（单页应用），返回的 HTML 是空壳：

```html
<div id="app"></div>  <!-- 数据不在这里 -->
<script src="/assets/index.js"></script>  <!-- JS 动态渲染 -->
```

`requests.get()` 只下载 HTML，**不会执行 JavaScript**。BeautifulSoup 只能拿到空壳，拿不到新闻数据。

**解决方案：**
- **找服务端渲染的源**（搜狗新闻）— 服务器在返回 HTML 前已经把数据填进去了
- **找结构化 API**（akshare 东方财富）— 直接调底层 JSON 接口，不走网页
- **用无头浏览器**（Selenium/Playwright）— 会执行 JS，但更慢更重

### 13. 降级策略设计：核心路径 vs 增强路径

**核心原则：** 不同重要性的路径，降级策略不同。

| 路径 | 重要性 | 失败时行为 |
|------|--------|-----------|
| 行情获取 | **核心** — 没有行情无法分析 | 切备源，都失败则**抛异常，阻塞流程** |
| 新闻获取 | **增强** — 没有新闻也能分析 | 切备源，都失败则**返回空列表，继续流程** |

**实现模式：三级降级**

```python
items = _fetch_from_akshare(stock_code)   # L1: 主源
if not items:
    items = _fetch_from_sogou(...)         # L2: 备源
# L3: 都失败 → items 为空列表，调用方正常处理
```

### 14. 模块化设计：内部随便换，外部零感知

`news_fetcher.py` 的 `fetch_news()` 函数输入输出不变，内部实现从搜狗爬虫换成 akshare API，调用方（`ask.py`、`analysis.py`）一行代码不用改。

**这就是模块化的收益：** 接口稳定，实现自由替换。

### 15. 缓存 TTL 设计原则

缓存 TTL 应该按**数据更新周期**来设，而不是统一拍脑袋：

| 数据类型 | 更新频率 | 合理 TTL |
|---------|---------|----------|
| 实时行情（当前价、涨跌幅） | 盘中每秒都在变 | 10-60 秒 |
| 日 K 线（历史日线） | 每天收盘更新一次 | 1 天（86400s） |
| 新闻 | 不定期 | 30 分钟 |

### 16. 相关性过滤：简单方案往往够用

新闻抓取后需要过滤"是否和这只股票相关"。最终实现没有用 NLP 或 LLM，而是**简单的关键词匹配**：

```python
def _is_relevant(title, stock_code, stock_name):
    short_name = stock_name.replace("贵州", "").replace("股份", "")
    keywords = [stock_code, stock_name, short_name]
    return any(kw in title for kw in keywords)
```

**为什么够用？** 搜索时已经用了 `"600519 贵州茅台"` 作为关键词，财经新闻网站的搜索本身就会按相关性排序。后置过滤只是去掉标题里完全不提这只股票的"杂音"。

**工程原则：** 先做简单的，验证不够再升级。不要一开始就上复杂方案。

---

## v1.9.4 学习要点

### 17. Function Calling：LLM 不只是聊天，还能"调用工具"

**核心概念：** 给 LLM 一套"工具说明书"（OpenAI 格式的 function schema），LLM 决定要不要调、调什么、传什么参数。LLM 只负责"决策"，执行由后端代码完成。

```
你发消息 + tools 定义 → LLM 返回 tool_calls → 后端执行工具 → 结果回填 → LLM 生成最终回答
```

**和传统 Prompt 的区别：**
- 传统：所有数据预先取好塞进 Prompt，LLM 只负责"写回答"
- FC：LLM 自己决定需要什么数据，按需调用

### 18. ReAct 循环（Reasoning + Acting）

Agent 的核心执行模式：LLM 在"推理"和"行动"之间交替。

```
思考 → 调工具 → 看结果 → 再思考 → 再调工具 → ... → 生成最终答案
```

**保护机制：** `max_steps=5` 防止死循环，单步超时 30s，整体超时 120s。

### 19. SSE 事件协议设计

Agent 循环是多步的，不能等全部完成再返回。需要用 SSE 逐条推送事件：

```
data: {"type":"thinking","message":"AI 正在分析..."}
data: {"type":"tool_start","tool":"get_stock_quote","display_name":"获取实时行情"}
data: {"type":"tool_done","tool":"get_stock_quote","success":true,"duration":0.5}
data: {"type":"text","content":"根据最新数据..."}
data: {"type":"done","success":true,"session_id":"xxx","full_answer":"..."}
```

**关键教训：** 字符串匹配 JSON 不靠谱。`json.dumps` 输出 `"type": "text"`（冒号后有空格），但手写检查条件 `'"type":"text"'`（无空格）永远匹配不上。必须用 `json.loads()` 正确解析。

### 20. Tool Registry 模式

工具注册表模式：集中管理所有工具的定义和 handler。

```python
class ToolRegistry:
    _tools: dict[str, ToolDefinition]

    def register(self, tool): ...      # 注册工具
    def get_openai_tools(self): ...    # 转 OpenAI 格式
    def execute(self, name, **kwargs): # 执行工具
```

**好处：** 加新能力 = 注册一个新 tool，零管线改动。后续加大盘行情、板块排行、基本面数据都只需要一行注册。

### 21. 三层降级链

Agent 模式有完整的降级保护：

```
Agent 失败（HTTP 非 200）→ 传统流式
Agent 成功但内部 LLM 失败（done: success: false）→ 传统流式
传统流式失败 → 非流式 LLM
非流式 LLM 失败 → 规则回答（模板拼接）
```

**竞态问题：** `done` 事件回调里直接调降级函数，会和 `onDone` 回调形成竞态（一个设 `isLoading=true`，另一个设 `isLoading=false`）。修复方案：用 `shouldFallback` 标记延迟到 `onDone` 再执行。

### 22. Agent 模式的数据通道差异

| | 标准模式 | Agent 模式 |
|--|---------|-----------|
| 数据获取 | 预先全部取好 | LLM 按需调工具 |
| 数据到前端 | 通过 `result_data` 结构化通道 | 工具结果只进 LLM 上下文 |
| 新闻展示 | NewsCard 组件（结构化数据） | LLM 输出 Markdown 链接 |
| 结果卡片 | ✅ | ❌（纯对话） |

**新闻链接的修复：** 不用额外通道，让 LLM 输出 `[标题](url)` Markdown 格式，前端 Markdown 渲染器自动处理点击。零额外代码。

### 23. `--reload` 的正确用法

`uvicorn --reload` 默认监控整个项目目录，包括 `logs/`。代码有 bug 时：

```
改代码 → WatchFiles 检测到 → 重启
  → 报错写入 logs/app.log
  → WatchFiles 检测到日志变化 → 又重启
  → 死循环
```

**修复：** 加 `--reload-dir app` 只监控源码目录：

```powershell
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --reload-dir app
```

### 24. 对话记忆长度

`_get_ask_messages(session_id, user_id, limit=6)` 控制传给 LLM 的历史消息数量。

| limit | 对应轮数 | 适用场景 |
|-------|---------|---------|
| 4 | 2 轮 | 太短，聊两句就失忆 |
| 6 | 3 轮 | 股票分析场景够用 |
| 10 | 5 轮 | 比较充裕 |

**工具结果不持久化：** 工具调用结果只存在于当前 Agent 循环中（内存），不会存到数据库。下一轮对话需要重新调工具获取。这对股票分析是合理的——数据时效性强，重新获取是正确的行为。

---

## v1.9.5 学习要点

### 25. 原则式 Prompt vs 模板式 Prompt

| | 模板式 | 原则式 |
|--|--------|--------|
| 适用场景 | 确定性输出（标准模式） | 非确定性编排（Agent 模式） |
| 控制粒度 | 告诉 LLM"怎么做" | 告诉 LLM"不能做什么" |
| 灵活性 | 低，结构固定 | 高，自主决定 |
| 示例 | "请按【结论】【关键数据】结构回答" | "所有结论必须基于真实数据，不编造" |

**关键理解：** Agent 模式的本质是 LLM 自主决定调哪些工具、按什么顺序、输出什么结构。模板式 prompt 限制了这种灵活性。原则式 prompt 的核心思想是：告诉 LLM 边界（不能编造、必须引用来源），让 LLM 在边界内自由发挥。

### 26. API 层校验 vs LLM 自主处理

传统 API 设计是"防御性"的——在入口处校验参数，不符合就拒绝。但在 Agent 模式下，LLM 本身就是一个"智能参数解析器"。把校验前置到 API 层，反而剥夺了 LLM 的灵活性。

**设计原则：** Agent 模式下，LLM 是第一道防线，API 层只做路由和会话管理。标准模式保留校验，因为标准模式需要预取行情数据，必须提前知道股票代码。

### 27. 多轮对话的 Context 注入策略

注入一个 `system` 角色的上下文块，包含上一轮的关键信息：

```python
user_messages.append({
    "role": "system",
    "content": f"当前对话围绕 {stock_name}（{stock_code}）。上一轮用户问题：{last_question}"
})
```

**为什么用 system 角色？** system 角色的消息在 LLM 的注意力机制中优先级更高，不会被历史对话"淹没"。这个 context 块就像给 LLM 的一个"会议纪要摘要"。

**为什么不注入 last_answer？** LLM 已经能看到历史消息里的完整对话，不需要重复。注入的是历史消息里不直接包含的信息——比如 session 的 stock_code 和 stock_name。

### 28. 思考过程持久化的存储策略

**为什么用 JSON 文本列而不是单独建表？**

| 方案 | 优点 | 缺点 |
|------|------|------|
| 单独建表 | 规范化，可按类型查询 | 查询复杂度高 |
| JSON 文本列 | 写入简单，读取一次解析 | 不能按字段查询 |

思考过程的特点是"写入一次，读取展示"，不需要按字段查询，所以 JSON 列是最优选择。

**迁移策略：** `ensure_column` + `ALTER TABLE ADD COLUMN` 是零风险的——新列可空，旧数据该字段为 NULL，前端解析时 catch 异常跳过。

### 29. 降级路径的兼容性陷阱

Agent 模式降级到标准模式时，如果用户没提供 stock_code，标准模式仍然会报 400。因为降级走的是标准模式的代码路径，它依赖预解析的 stock_code。

**修复：** 在降级前判断是否有 stock_code，有则降级，无则直接显示错误提示。

```typescript
if (shouldFallback) {
    if (stockCode) {
        // 有股票代码时降级到传统流式
        get().handleAskStream(stockCode);
    } else {
        // 无股票代码时标准模式也无法处理，直接报错
        set({ error: 'Agent 分析失败，请重试或提供股票代码' });
    }
}
```

---

## v1.9 系列跨版本经验

### 30. SSE 事件流的三次迭代

```
v1.9.2: 标准流式 → 单类型 text 事件，逐 chunk
v1.9.4: Agent 流式 → 多类型事件（thinking/tool_start/tool_done/text/done）
v1.9.5: 思考持久化 → 事件流结束后序列化存库，恢复时反序列化
```

**经验：** SSE 基础设施一次搭建，后续只扩展事件类型和存储策略，不需要动传输层。前期的协议设计（`type` + `data` JSON）为后续扩展留了空间。

### 31. 降级策略的层层叠加

```
v1.9.2: 流式失败 → 非流式兜底（1 层）
v1.9.4: Agent 失败 → 流式 → 非流式（3 层）
v1.9.5: 发现降级到流式时无 stock_code 仍会报 400
```

**经验：** 降级路径本身也需要测试。每加一层降级，就要检查所有降级入口的**前置条件**是否满足。v1.9.5 的 bug 就是降级前没检查 stock_code 是否存在。

### 32. 增量式架构叠加策略

整个 v1.9 系列没有重构一行现有代码，全是叠加：

| 版本 | 叠加了什么 | 动现有代码？ |
|------|-----------|------------|
| v1.9.1 | 改 system prompt 字符串 | 否 |
| v1.9.2 | 新增 SSE 端点 | 否 |
| v1.9.3 | 新增 news_fetcher 模块 | 否 |
| v1.9.4 | 新增 tool_registry + agent_loop | 否 |
| v1.9.5 | 改 Agent 端点的 prompt + 逻辑 | 否（只改 Agent 专属路径） |

**经验：** "加新东西不动旧东西"的策略在 v1.9 被验证是有效的。代价是代码量增加（新增 5 个文件），但风险极低——每个版本都可以独立测试，旧功能不受影响。

### 33. 竞态条件：回调地狱

```typescript
// 问题：done 事件回调里直接调降级
eventSource.onmessage = (event) => {
    if (type === 'done' && !success) {
        handleAskStream(stockCode);  // 和 onDone 回调形成竞态
    }
};
```

**修复：** 用 `shouldFallback` 标记延迟到 `onDone` 再执行，避免两个回调同时操作 store。

**经验：** SSE 的回调 + React store 的 setState 是异步的，两个回调同时调 store 方法会导致竞态。标记 + 延迟执行是简单的解决方案。

### 34. JSON 字符串匹配不可靠

```python
# 错误：手写 JSON 字符串匹配
if '"type":"text"' in chunk:  # 永远匹配不上

# 正确：用 json.loads 解析
data = json.loads(chunk)
if data['type'] == 'text':
```

**经验：** `json.dumps` 输出 `"type": "text"`（冒号后有空格），手写条件 `'"type":"text"'`（无空格）永远匹配不上。任何 JSON 操作都必须用解析器，不要手写字符串匹配。

### 35. 数据链路透传检查

新增 `turnover_rate` 和 `amplitude` 字段时，`market_data.py` 提取了、`technical_indicators.py` 返回了，但 `report_builder.py` 自己拼了 `indicators` dict 漏了这两个字段。

**经验：** 数据链路每增加一个字段，要检查链路上的每个环节是否都透传了。`docs/guide/data-flow.md` 的链路图就是干这个用的。

---

## v2.0.1 学习要点

### 36. 工具描述中的触发条件

工具描述不仅要说明"这个工具返回什么"，还要说明"什么时候调它"：

```python
# 好
description="获取行业板块涨跌排行。当用户询问哪些板块涨得好、板块轮动情况时调用。"

# 不好
description="获取行业板块涨跌排行。"
```

LLM 判断调哪个工具时，描述是唯一依据。包含触发条件的描述能让 LLM 更准确地选择工具。

### 37. 无参数工具降低 LLM 调用门槛

`get_market_indices` 没有参数，LLM 直接调就行。对比 `get_stock_quote` 需要传 `stock_code`，LLM 必须先知道股票代码才能调。

**原则：** 工具的参数越少，LLM 调用成功率越高。对于"大盘行情"这种确定性的数据，不需要参数是最好的设计。

### 38. Drawer 导航嵌入 Tab 导航

React Navigation 的 Drawer 和 Tab 可以嵌套使用：

```
Tab Navigator
  ├─ 自选 tab → Stack Navigator
  ├─ 问股 tab → Drawer Navigator  ← 新增
  │              ├─ 主内容区: AskScreen
  │              └─ 抽屉: SessionDrawer
  ├─ 记录 tab → Stack Navigator
  └─ 我的 tab → Stack Navigator
```

**关键点：** `drawerType: 'front'` 让抽屉覆盖在内容上面，不影响 Tab 布局。`drawerStyle: { width: 280 }` 适配手机屏幕。

### 39. 数据源选择：akshare 的一库多用

akshare 不只是新闻源，它同时提供指数行情、板块排行、基本面数据。一个库解决多个数据需求，不需要额外依赖。

**模式：** 每个数据源封装成独立的 service 文件（`market_overview.py`、`news_fetcher.py`），内部管理缓存和错误处理，对外暴露统一的函数接口。

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

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

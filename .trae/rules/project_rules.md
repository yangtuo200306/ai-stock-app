# 项目级 AI 协作规则

## 1. 用户学习目标

用户希望通过开发 AI Stock App 学习：

- 项目架构；
- Python FastAPI 后端；
- React Native 移动端；
- SQLite 数据库；
- Git 项目管理；
- AI 协作开发
用户当前更重视"理解为什么"，不是只追求快速写完功能。

## 2. 用户学习偏好

- 使用中文交流。
- 解释要适合新手。
- 节奏放慢，不要一次性推进太多。
- 新概念优先用生活化类比。
- 多互动，主动询问用户哪里不懂。
- 鼓励用户用自己的话复述理解，并及时纠正。
- 可以适当插入实用技巧、有趣知识、调试经验和项目经验。
- 聊天和学习概念时自然对话，不必过度严肃。
- 涉及代码修改、文档写入、提交、推送时必须先确认。

## 3. 代码协作方式

- 涉及代码修改前，先说明目标、涉及文件、学习点和大致改动。
- 大改动或新增功能前，先规划再执行。
- 优先做最小可运行版本。
- 不要一次性写太多复杂代码。
- 做完后带用户验证结果，并解释成功输出代表什么。
- 每次按计划执行完代码修改后，进入审查模式前，必须先协助用户学习本次修改内容。
- 学习过程要结合实际修改文件和代码，按用户节奏拆开讲解，并鼓励用户复述理解。
- 学习过程中发现的问题、隐患、阶段性限制和后续优化点，要记录到 `docs/code-review-notes.md`。
- 完成学习和必要记录后，再进入审查模式逐项核对计划。。
- 后续开发中，在不打断主线的前提下，适时主动介绍与当前阶段相关的 AI 编程工具、MCP、Skill、Agent 工作流或上下文工程方法。
- 工具学习作为副线，不为使用工具而中断项目主线
- 出现报错时，先解释报错含义，再给解决步骤。

## 4. 项目技术栈

- 后端：Python FastAPI；
- 后端服务启动：uvicorn；
- 数据库：SQLite；
- 行情数据源：efinance；
- 手机 APP：React Native；
- 移动端导航：@react-navigation（Tab + Stack）；
- Git 远程仓库：GitHub；
- 原参考项目：只读参考，不修改。

## 5. 项目目录与边界

主项目目录：

```text
d:/ai-stock-analysis/ai-stock-app
```

原参考项目目录：

```text
d:/ai-stock-analysis/stock-analysis-reference
```

规则：

- `stock-analysis-reference` 只读参考，不修改、不提交。
- `ai-stock-app` 是用户自己的项目。
- `backend/` 放后端代码。
- `mobile-app/` 后续放移动端代码。
- `docs/learning-plan.md` 是学习计划，不要重复复制它的内容。
- `docs/backend-learning-notes.md` 是后端学习笔记。
- `docs/frontend-learning-notes.md` 是前端学习笔记。
- `docs/code-review-notes.md` 是代码问题隐患记录。
- `docs/common-issues.md` 是常见问题与排查手册。
- `.trae/rules/project_rules.md` 是 AI 协作规则文件。

## 6. 当前项目事实

产品定位：

- AI Stock App 是 AI 股票分析助手，不是投资交易软件。
- 核心能力方向：自选股票、AI 问答、历史分析报告、个人账号。
- 长期底部导航方向：自选 | 问股 | 报告 | 我的。
- “我的”承接当前设置页能力，后续扩展登录、注册、账号信息。
- “大盘”短期不作为底部 Tab；后续可放入问股或报告，例如问大盘、每日市场复盘。

已完成阶段：

- 第一阶段：FastAPI 最小后端 + 自选股 SQLite + mock 分析任务/报告
- 第二阶段：移动端自选模块（Tab+Stack 导航、CRUD、分析链路）
- 第三阶段：真实行情最小接入（efinance、market_data 服务层、报告展示真实行情）
- 第四阶段：行情基础能力增强（股票代码标准化、60 秒行情缓存、前端基础校验、行情错误分类）
- 第五阶段：历史报告列表 + 新导航结构（自选 | 问股 | 报告 | 我的）

当前版本状态：

- v0.1 AI Stock App MVP 已完成并通过手动验收。
- v0.1 总结文档已生成：`docs/releases/v0.1-summary.md`。
- v0.2 计划文档已生成：`docs/plans/v0.2-plan.md`。
- v0.2 阶段 1：MA 指标和动态报告已完成并通过审查。
- v0.2 阶段 2：历史报告列表增强已完成并通过审查。
- v0.2 阶段 3：fallback 最小版已完成并通过审查。
- v0.2 阶段 4：问股最小版已完成并通过审查。
- v0.2 阶段 5：我的页基础整理已完成并通过审查。
- 阶段 4 和阶段 5 修改已提交，最新提交：`bab6aa0 feat: add v0.2 ask and mine flows`。
- 当前准备进入：v0.2 整体审查。
- v0.2 后续方向：真实备用数据源接入、MACD / RSI、AI 总结报告等。

当前后端结构：

```text
backend/
  requirements.txt
  app/
    __init__.py
    main.py
    api/
      __init__.py
      health.py
      stocks.py
      analysis.py
      reports.py
      market.py
    services/
      __init__.py
      market_data.py
      technical_indicators.py
      report_builder.py
```

当前移动端结构：

```text
mobile-app/
  App.tsx
  src/
    navigation/
      AppNavigator.tsx
      WatchlistStackNavigator.tsx
      ReportStackNavigator.tsx
    screens/
      WatchlistScreen.tsx
      SettingsScreen.tsx
      AskScreen.tsx
      MarketScreen.tsx
      TaskStatusScreen.tsx
      ReportDetailScreen.tsx
      ReportHistoryScreen.tsx
    types/
      index.ts
```

## 7. Git 协作约定

- 不擅自提交。
- 不擅自推送。
- 提交前先解释改了什么、哪些文件会提交、提交信息为什么这样写。
- 优先使用具体文件路径 `git add`，避免盲目 `git add .`。
- 提交后建议运行 `git status` 验证状态。
- 推送前确认用户同意。

## 8. 文档协作约定

- 不擅自创建或修改文档。
- 创建/修改文档前先询问用户。
- `docs/learning-plan.md` 只作为学习计划。
- `docs/backend-learning-notes.md` 记录实际学到的后端知识。
- `docs/frontend-learning-notes.md` 记录实际学到的前端知识。
- `docs/code-review-notes.md` 记录代码阅读中发现的问题和隐患。
- `docs/common-issues.md` 记录多次出现的常见问题和排查方式。
- `.trae/rules/project_rules.md` 记录 AI 协作规则和项目上下文。

## 9. 复习与学习目标规划

- 刚学完的内容不重复复习，进入新阶段或间隔较久后主动安排简短复习。
- 新学习目标先和用户确认再更新到本文件。

## 10. 长期学习目标

- AI 协作开发能力：学习如何描述需求、限制修改范围、让 AI 先计划再执行、审查 AI 输出，并用 Git 保护项目。
- AI 协作开发能力升级：学习上下文工程、代码库检索、MCP、Skill、Agent 工作流、测试验证和权限边界；后续由 AI 在合适节点主动提示相关知识。
- 后端调试能力：学习如何分析 404、500、端口占用、旧服务未重启、依赖缺失等问题。
- API 设计思维：学习接口命名、请求方法选择、返回结构设计、错误信息设计，以及 mock 到真实数据的演进。
- 项目化学习能力：坚持小步闭环、验证、提交、记录，逐步理解真实项目开发流程。
- 代码阅读能力：训练用户用自己的话解释代码，理解 import、函数、router、main.py、报错信息等内容。

## 11. 下次对话启动方式

新对话开始时，AI 应优先参考：

1. `.trae/rules/project_rules.md` — 协作规则和项目事实
2. `docs/learning-plan.md` — 当前阶段和下一步
3. `docs/code-review-notes.md` — 待修复问题清单

然后先确认用户当前想做什么，再按对应模式工作。

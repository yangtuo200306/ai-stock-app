# 项目级 AI 协作规则

## 1. 用户学习目标

用户已完成 v0.1 ~ v0.9 的基础学习阶段，已掌握：

- Python FastAPI 后端开发（路由、鉴权、数据库、服务层）
- React Native 移动端开发（导航、状态管理、组件抽离、自定义 Hook）
- SQLite 数据库设计与迁移
- Git 版本管理与迭代规划
- AI 协作开发（计划 → 执行 → 审查）

当前进入 **v1.0+ 进阶学习阶段**，重点方向：

- 工程化与部署（生产环境构建、配置管理、日志、部署流程）
- 状态管理升级（Zustand / TanStack Query）
- 性能优化（缓存、分页、列表优化）
- 测试（单元测试、组件测试）
- AI 能力进阶（流式响应、Prompt 调优）
用户仍重视"理解为什么"，但可以接受更深入的工程化讨论，不再需要从零开始的解释。

## 2. 用户学习偏好

- 使用中文交流。
- 解释要清晰直接，不再需要从零开始的"新手解释"。
- 新概念优先联系已掌握的知识，用工程类比说明。
- 多互动，主动询问用户哪里不懂。
- 鼓励用户用自己的话复述理解，并及时纠正。
- 可以适当插入实用技巧、工程经验和进阶知识。
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
- 涉及新增 API 文件后，必须检查 `backend/app/main.py` 是否注册 router。
- 涉及受保护业务接口的前端页面，默认使用统一 API client，避免遗漏 `Authorization` token。
- 涉及数据库索引或唯一约束迁移时，必须检查具体字段列表，不能只判断约束是否存在。
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
- `mobile-app/` 放移动端代码。
- `docs/README.md` 是项目总览。
- `docs/code-review-notes.md` 是代码问题隐患记录。
- `docs/common-issues.md` 是常见问题与排查手册。
- `docs/archive/` 是历史文档归档。
- `.trae/rules/project_rules.md` 是 AI 协作规则文件。

## 6. 当前项目事实

产品定位：

- AI Stock App 是面向个人投资者的 AI 股票分析助手，不是投资交易软件，也不是完整投研工作台。
- 核心能力方向：自选股票、AI 问股、分析记录、个人账号。
- 长期底部导航方向：自选 | 问股 | 记录 | 我的。
- “记录”用于承接问股记录、自选分析记录、AI 对话记录和后续生成的报告记录；报告是记录中的一种更正式的详情形态。
- “我的”承接账号、设置和应用信息，后续扩展注册、登录、退出登录、AI 服务状态和免责声明。
- 页面大优化前，优先完成用户边界、记录体系、自选问股联动、最小用户系统、AI 助手能力增强和功能定型。

已完成阶段：

- 第一阶段：FastAPI 最小后端 + 自选股 SQLite + mock 分析任务/报告
- 第二阶段：移动端自选模块（Tab+Stack 导航、CRUD、分析链路）
- 第三阶段：真实行情最小接入（efinance、market_data 服务层、报告展示真实行情）
- 第四阶段：行情基础能力增强（股票代码标准化、60 秒行情缓存、前端基础校验、行情错误分类）
- 第五阶段：历史报告列表 + 新导航结构（自选 | 问股 | 报告 | 我的）
- v0.4：用户边界 + 问股闭环（默认 user_id、records 表、问股/自选写入记录、报告 Tab 改为记录）
- v0.5：最小用户系统（注册、登录、退出登录、token 鉴权、用户数据隔离、统一 API client）
- v0.6：AI 助手能力增强（多轮追问、股票简称识别、技术指标增强、记录详情）
- v0.7：功能定型（新建会话、继续追问、自选摘要、报告类型、API 错误结构初步统一）
- v0.8：页面体验与公共 UI 基础（公共组件、主题常量、统一状态展示、未登录引导）
- v0.9：状态管理与稳定性（刷新信号层、结构化 ApiError、统一 401 处理、任务轮询、登录联动刷新）

当前版本状态：

- v0.1 ~ v0.9 已完成，共 9 个版本迭代。
- 所有版本计划文档和总结文档均已生成。
- v0.9 已提交并 push 到远程。
- 当前产品已具备自用最小稳定版能力。
- 下一阶段目标：v1.0 部署准备与自用测试版（工程化进阶）。

当前后端结构：

```text
backend/
  requirements.txt
  app/
    __init__.py
    main.py
    database.py
    api/
      __init__.py
      health.py
      auth.py
      stocks.py
      analysis.py
      ask.py
      records.py
      reports.py
      market.py
    services/
      __init__.py
      market_data.py
      technical_indicators.py
      report_builder.py
      llm_client.py
      ask_service.py
      stock_resolver.py
```

当前移动端结构：

```text
mobile-app/
  App.tsx
  src/
    api/
      client.ts
    contexts/
      AuthContext.tsx
      DataRefreshContext.tsx
    hooks/
      useApiErrorHandler.ts
    navigation/
      AppNavigator.tsx
      WatchlistStackNavigator.tsx
      RecordStackNavigator.tsx
      MineStackNavigator.tsx
    screens/
      WatchlistScreen.tsx
      AskScreen.tsx
      TaskStatusScreen.tsx
      ReportDetailScreen.tsx
      RecordListScreen.tsx
      RecordDetailScreen.tsx
      MineScreen.tsx
      LoginScreen.tsx
    components/
      AppButton.tsx
      AppCard.tsx
      StateView.tsx
      LoginRequiredView.tsx
      MessageBubble.tsx
      MetricRow.tsx
    theme/
      colors.ts
      spacing.ts
      typography.ts
    utils/
      stockDisplay.ts
      recordDisplay.ts
      taskStatusDisplay.ts
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
- `docs/README.md` 项目总览，包含快速启动、技术栈、版本历史。
- `docs/code-review-notes.md` 记录代码阅读中发现的问题和隐患。
- `docs/common-issues.md` 记录多次出现的常见问题和排查方式。
- `docs/archive/` 历史文档归档，包含 v0.1~v0.9 的计划、总结和学习笔记。
- `.trae/rules/project_rules.md` 记录 AI 协作规则和项目上下文。

## 9. 复习与学习目标规划

- 刚学完的内容不重复复习，进入新阶段或间隔较久后主动安排简短复习。
- 新学习目标先和用户确认再更新到本文件。

## 10. 长期学习目标

### 已完成的基础能力

- AI 协作开发能力：学习如何描述需求、限制修改范围、让 AI 先计划再执行、审查 AI 输出，并用 Git 保护项目。
- 后端调试能力：学习如何分析 404、500、端口占用、旧服务未重启、依赖缺失等问题。
- API 设计思维：学习接口命名、请求方法选择、返回结构设计、错误信息设计，以及 mock 到真实数据的演进。
- 项目化学习能力：坚持小步闭环、验证、提交、记录，逐步理解真实项目开发流程。
- 代码阅读能力：训练用户用自己的话解释代码，理解 import、函数、router、main.py、报错信息等内容。

### v1.0+ 进阶学习目标

- **工程化与部署**：生产环境构建、环境变量管理、日志系统、部署流程、数据库备份策略。
- **状态管理升级**：Zustand / TanStack Query 的设计思想、Store 拆分、缓存策略、乐观更新。
- **性能优化**：列表虚拟化、缓存策略、页面渲染优化、网络请求优化。
- **测试**：后端接口测试、前端组件测试、端到端测试。
- **AI 能力进阶**：流式响应、Prompt 工程、多轮对话上下文管理、多模型切换。
- **AI 协作开发能力升级**：上下文工程、代码库检索、MCP、Skill、Agent 工作流、测试验证和权限边界。

## 11. 下次对话启动方式

新对话开始时，AI 应优先参考：

1. `.trae/rules/project_rules.md` — 协作规则和项目事实
2. `docs/code-review-notes.md` — 待修复问题清单
3. `docs/README.md` — 项目总览

然后先确认用户当前想做什么，再按对应模式工作。

# 项目级 AI 协作规则

## 1. 用户学习目标

用户希望通过开发 AI Stock App 学习：

- 项目架构；
- Python FastAPI 后端；
- React Native 移动端；
- SQLite 数据库；
- Git 项目管理；
- AI 协作开发。

用户当前更重视“理解为什么”，不是只追求快速写完功能。

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
- 出现报错时，先解释报错含义，再给解决步骤。

## 4. 项目技术栈

- 后端：Python FastAPI；
- 后端服务启动：uvicorn；
- 数据库计划：SQLite；
- 手机 APP：React Native；
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
- `.trae/rules/project_rules.md` 是 AI 协作规则文件。

## 6. 当前项目事实

已完成：

- FastAPI 最小后端；
- `GET /api/health`；
- 本地验证成功；
- Git 提交并推送成功；
- 后端学习笔记文件已创建。

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
```

当前接口：

```text
GET /api/health
```

返回：

```json
{
  "status": "ok",
  "message": "AI Stock App backend is running"
}
```

已推送提交：

```text
3676dca feat: add FastAPI health endpoint
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
- `.trae/rules/project_rules.md` 记录 AI 协作规则和项目上下文。

## 9. 下次对话启动方式

新对话开始时，AI 应优先参考：

```text
.trae/rules/project_rules.md
docs/backend-learning-notes.md
docs/learning-plan.md
```

然后继续按“慢速、互动、教学型”的方式协助用户。

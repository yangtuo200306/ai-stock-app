# AI Stock App

面向个人投资者的 AI 股票分析助手。

## 快速启动

### 后端

```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 前端

```bash
cd mobile-app
npm install
npm run web -- --clear
```

## 核心功能

- **自选股**：添加/删除股票、查看最近分析摘要
- **AI 问股**：输入股票代码或名称，AI 回答分析结果（含行情、技术指标、风险提示）
- **多轮追问**：同一只股票可连续追问
- **记录系统**：问股记录、分析报告统一管理
- **账号系统**：注册、登录、token 鉴权、用户数据隔离

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 | Python FastAPI + SQLite |
| 前端 | React Native + Expo + TypeScript |
| 行情源 | efinance（主源）+ 新浪（fallback） |
| AI | 火山方舟 DeepSeek |
| 导航 | React Navigation 6（Tab + Stack） |
| 状态 | Zustand（store）+ AuthContext |

## 项目结构

```
ai-stock-app/
├── backend/           # Python FastAPI 后端
│   ├── app/
│   │   ├── api/       # 接口层
│   │   ├── services/  # 服务层
│   │   ├── config/    # 配置管理（settings.py）
│   │   ├── errors.py  # 错误码枚举
│   │   ├── error_handler.py  # 全局异常处理器
│   │   └── logging_config.py # 日志系统
│   └── requirements.txt
├── mobile-app/        # React Native 移动端
│   └── src/
│       ├── api/       # 统一 API 调用
│       ├── contexts/  # 全局状态（AuthContext）
│       ├── stores/    # Zustand 状态管理
│       ├── hooks/     # 自定义 Hook
│       ├── navigation/# 导航
│       ├── screens/   # 页面
│       ├── components/# 公共组件
│       ├── theme/     # 主题
│       ├── utils/     # 工具函数
│       └── types/     # 类型定义
└── docs/
    ├── README.md            # 本文件
    ├── code-review-notes.md # 问题与隐患记录
    ├── common-issues.md     # 常见问题排查
    └── archive/             # 历史文档归档
```

## 版本历史

| 版本 | 重点 |
|-----|------|
| v0.1 | FastAPI 最小后端 + 自选股 SQLite + mock 分析 |
| v0.2 | 移动端自选模块、Tab+Stack 导航 |
| v0.3 | 真实行情接入（efinance）、新浪 fallback、AI 问股 |
| v0.4 | 用户边界、问股闭环、records 记录系统 |
| v0.5 | 注册/登录、token 鉴权、用户数据隔离 |
| v0.6 | 多轮追问、股票简称识别、技术指标增强 |
| v0.7 | 新建会话、继续追问、自选摘要、报告类型 |
| v0.8 | 公共 UI 组件、主题系统、统一状态展示 |
| v0.9 | 刷新信号层、结构化 ApiError、统一 401 处理、任务轮询 |
| v1.0 | 阶段一架构升级：前端 Zustand 状态管理 + 后端配置/日志/错误码/数据库迁移 |
| v1.1 | 阶段二：问股页精修（布局重构、交互增强、视觉升级） |
| v1.2 | 阶段二：自选页精修（搜索过滤、Pull-to-Refresh、删除确认、卡片升级） |
| v1.3 | 阶段二：记录页精修（搜索过滤、RecordCard、详情页视觉升级） |
| v1.4 | 阶段二：我的页精修（头像区、可折叠开发者设置、版本常量、登录页视觉升级） |
| v1.5 | 阶段二：公共组件收口（AppButton compact 变体、StateView 紧凑按钮、RecordCard 颜色统一） |

## 文档索引

- [代码问题与隐患记录](code-review-notes.md) — 已发现的 145 个问题及状态汇总
- [常见问题与排查手册](common-issues.md) — 开发中反复遇到的问题及解决方式
- [历史文档归档](archive/) — v0.1~v1.5 的计划、总结和学习笔记
  - 版本总结：v0.1~v0.9、[v1.0](archive/releases/v1.0-summary.md)、[v1.1](archive/releases/v1.1-summary.md)、[v1.2](archive/releases/v1.2-summary.md)、[v1.3](archive/releases/v1.3-summary.md)、[v1.4](archive/releases/v1.4-summary.md)、[v1.5](archive/releases/v1.5-summary.md)

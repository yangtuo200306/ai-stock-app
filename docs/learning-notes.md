# 进阶学习记录

> 本文档记录 v1.0+ 进阶学习阶段的关键知识点和工程实践。
> 与 v0.1~v0.9 的基础学习笔记（`docs/archive/`）分开管理。

---

## 2026-06-25：总体方案制定 + 生产级开发认知

### 1. 生产级开发 vs 学习阶段开发

| 方面 | 学习阶段 | 生产级 |
|------|---------|--------|
| 配置管理 | `os.environ.get()` 散落各处 | 集中 Settings 类，启动时校验必填项 |
| 日志系统 | `except: pass` 吞异常 | 分级日志（INFO/WARNING/ERROR），文件轮转 |
| 错误码 | 统一返回 400 + 文本 | 结构化 `error_code`，前端可区分错误类型 |
| 数据库 | 启动时 `init_db()` 跑 SQL | 版本化迁移（Alembic），可回滚 |
| 状态管理 | 各自 useState + 信号模式 | Zustand Store，组件按需订阅 |
| 部署 | 手动敲 uvicorn | 进程管理（systemd），CI/CD 自动部署 |
| 测试 | 手动测核心链路 | 单元测试 + 集成测试 + E2E 测试 |
| 环境 | 只有本地 | dev / staging / production 三环境 |

### 2. 总体方案：三个阶段

```
阶段一：全局架构升级    让代码变结实
阶段二：页面精修        让产品变好用
阶段三：工程化与部署    让服务能上线
```

- 阶段一拆为 1A（前端）和 1B（后端），分开做
- 阶段二逐个页面精修，不并行
- 阶段三放最后，功能和 UI 稳定后再部署

### 3. 工程化的几个层次（从简单到复杂）

1. **配置管理** — 散落的环境变量集中管理
2. **日志系统** — 能查问题、能分级、能控制输出
3. **错误码体系** — 前端能根据 error_code 做不同处理
4. **依赖锁定** — 不会"昨天还能跑，今天装就坏了"
5. **数据库迁移** — 改表结构有记录、可回滚
6. **测试** — 改代码不怕改坏
7. **CI/CD** — 提交代码自动检查、自动部署
8. **监控告警** — 服务挂了你知道

### 4. 职业定位

- 目标岗位：AI 应用开发工程师
- 核心能力：用 AI 编程工具构建产品，理解 AI 应用架构
- 前端/后端知识：辅助理解，不是主攻方向
- 学习方式：每做一步，同步理解背后的工程原理

### 5. 参考项目可借鉴的模式

参考项目（`stock-analysis-reference`）是 Web 桌面端，不能照搬到手机 App，但以下模式跨平台通用：

- **Zustand 状态管理** — Store 拆分、组件按需订阅
- **错误分类体系** — 16 种错误分类，前端统一展示
- **API 层模式** — axios 拦截器 + 401 自动处理
- **类型按领域拆分** — 按模块组织类型文件

---

## 2026-06-25（续）：v1.0 1A 执行 — Zustand 状态管理实战

### 1. Zustand 核心概念

```ts
import { create } from 'zustand';

const useStore = create<State & Actions>((set, get) => ({
  // set: 更新状态，自动合并
  // get: 读取当前状态
}));
```

- **`set()`** — 类似 React 的 setState，自动浅合并
- **`get()`** — 在 action 内部读取当前 state
- **`getState()`** — 在 store 外部读取 state 或调用 action

### 2. 状态管理分层原则

| 场景 | 工具 | 例子 |
|------|------|------|
| 输入框、弹窗等页面局部 UI 状态 | `useState` | 添加自选的输入框 |
| 低频全局状态（认证） | `AuthContext` | token、userId |
| 多页面共享的业务数据 | **Zustand Store** | 自选列表、记录列表、问股消息 |

**不混用：** 高频局部状态放 Zustand 会导致无关页面重渲染；认证状态用 Context 启动恢复更方便。

### 3. Store 间联动模式

```ts
// StoreA 内部调用 StoreB 的 action
import { useStoreB } from './storeB';

// 在 StoreA 的 action 中：
useStoreB.getState().someAction();
```

**对比之前的 DataRefreshContext 版本号模式：**
- 之前：操作 → notify → 版本号 +1 → useEffect 检测 → 重新 fetch（绕一圈）
- 现在：操作 → 直接调用目标 store 的 action（直连）

### 4. resetAllStores 模式

登出或 401 时一键清空所有 store：

```ts
export function resetAllStores() {
  useWatchlistStore.getState().reset();
  useRecordsStore.getState().reset();
  useAskStore.getState().reset();
}
```

### 5. 本次改造数据流变化

| 之前 | 现在 |
|------|------|
| 数据在页面 useState 里 | 数据在 store 里 |
| 页面间同步靠版本号 | 页面间同步靠共享 store |
| 操作完要手动 notify | 操作完 store 自己刷新或通知其他 store |
| 登出只能触发刷新 | 登出直接 reset 所有 store |

---

## 相关文档

- [总体发展方案](overall-roadmap.md)
- [项目协作规则](../.trae/rules/project_rules.md)
- [代码问题与隐患记录](code-review-notes.md)

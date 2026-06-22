# 前端 / 移动端学习笔记

## 2026-06-22：进入 React Native 移动端阶段

### 当前项目阶段

- 后端第一版 mock 主流程已完成。
- 移动端还没有开始。
- 下一阶段准备从 0 搭建 React Native 手机 APP。

### 移动端阶段要做什么

移动端阶段的目标，是用 React Native 做一个手机 APP，让用户可以通过手机界面使用后端能力。

可以理解为：

```text
后端 = 后厨
接口 = 点餐窗口
手机 APP = 用户手里的点餐界面
```

之前我们已经做好了后端的“后厨”和“点餐窗口”。

接下来要做的是手机 APP 这个“点餐界面”。

第一阶段先做：

- 设置后端地址；
- 测试连接；
- 首页读取并显示自选股。

后续再继续做：

- 添加股票；
- 删除股票；
- 点击分析；
- 查看分析任务；
- 查看报告详情；
- 查看历史报告。

### 为什么先做设置页

手机 APP 需要知道后端服务在哪里。

后端地址可以理解为：

```text
手机 APP 去找后端“后厨”的门牌号
```

如果门牌号错了，后面所有页面都拿不到数据。

例如后端可能运行在：

```text
http://127.0.0.1:8000
```

但要注意：

```text
127.0.0.1 在电脑上 = 电脑自己
127.0.0.1 在手机或模拟器上 = 手机或模拟器自己
```

所以手机 APP 访问电脑后端时，通常不能直接照搬电脑浏览器里的 `127.0.0.1`。

设置页的作用就是：

```text
输入后端地址
↓
保存后端地址
↓
用 GET /api/health 测试连接
↓
确认 APP 能找到后端
```

### 为什么先做首页自选股列表

首页自选股列表是最简单的业务联调。

它的流程是：

```text
APP 请求 GET /api/stocks
↓
后端从 SQLite 查询自选股
↓
后端返回 JSON
↓
APP 把股票代码和名称显示出来
```

它比分析任务和报告详情简单，因为暂时不涉及：

- 任务状态变化；
- 进度轮询；
- 报告详情排版；
- 复杂页面跳转。

但它能验证最关键的事情：

- APP 能不能请求后端；
- 后端返回的数据能不能显示到页面；
- 加载失败时 APP 能不能提示用户；
- 没有数据时 APP 能不能显示空状态。

### 新手核心概念

#### React Native

React Native 可以理解为：

```text
用 JavaScript / TypeScript 写手机 APP 的工具
```

它不是普通网页，也不是 Python 后端。

它负责做手机上的界面。

#### 页面

页面就是用户看到的一屏内容。

例如：

- 设置页；
- 首页；
- 分析任务页；
- 报告详情页；
- 历史报告页。

可以理解为：

```text
一个页面 = APP 里的一间房间
```

#### 组件

组件是页面里的小积木。

例如：

- 输入框；
- 按钮；
- 标题；
- 股票列表项；
- 错误提示。

可以理解为：

```text
页面 = 很多组件拼起来的一屏内容
```

#### 状态 state

状态就是页面当前记住的数据。

例如：

- 输入框里的后端地址；
- 当前是否正在连接；
- 当前连接是否成功；
- 自选股列表；
- 错误提示。

可以理解为：

```text
state = 页面的小记事本
```

页面显示什么，很多时候取决于 state 里现在记着什么。

#### 接口请求

接口请求就是 APP 向后端要数据，或者把数据交给后端。

例如：

```text
GET /api/stocks = APP 向后端要自选股列表
```

流程是：

```text
手机 APP
↓
发送请求
↓
FastAPI 后端
↓
查询 SQLite
↓
返回 JSON
↓
手机 APP 显示数据
```

#### 本地保存

本地保存就是把一些设置存在手机 APP 自己这里。

例如：

```text
后端地址
```

如果不保存，每次打开 APP 都要重新输入。

所以设置页保存后端地址后，首页就可以读取这个地址去请求后端。

### 第一阶段目标

第一阶段先完成一个很小的移动端闭环：

```text
打开 APP
↓
进入设置页
↓
输入后端地址
↓
测试连接成功
↓
进入首页
↓
读取并显示自选股列表
```

这一步完成后，就说明：

```text
React Native 手机 APP 已经能和 FastAPI 后端通信
```

### 当前完成情况

截至 2026-06-22，移动端第一阶段已经完成。

已完成内容：

1. 创建 Expo + React Native + TypeScript 项目骨架。
2. 使用 Expo Web 启动前端预览。
3. 实现设置页：
   - 输入后端地址；
   - 保存后端地址；
   - 使用 AsyncStorage 持久化保存；
   - 刷新页面后自动读取保存地址；
   - 调用 `GET /api/health` 测试连接。
4. 后端增加 CORS 配置，让 Web 前端可以请求 FastAPI 后端。
5. 实现首页自选股列表：
   - 从 AsyncStorage 读取保存的后端地址；
   - 调用 `GET /api/stocks`；
   - 使用 FlatList 显示股票代码和名称；
   - 支持加载中、失败、空列表和正常列表状态；
   - 支持刷新列表。
6. 引入 React Navigation：
   - 使用底部 Tab 导航；
   - 首页和设置页拆分成独立 Screen；
   - `App.tsx` 简化为 APP 入口。

当前移动端结构：

```text
mobile-app/
  App.tsx
  src/
    navigation/
      AppNavigator.tsx
    screens/
      HomeScreen.tsx
      SettingsScreen.tsx
```

### 本阶段学到的核心概念

#### Expo

Expo 可以理解为 React Native 的开发工具箱。

它帮我们更容易创建、启动和预览手机 APP 项目。

当前使用 Web 预览：

```text
npm run web -- --clear
```

#### App.tsx

`App.tsx` 是 APP 入口。

改造后它只负责：

```text
渲染 AppNavigator
渲染 StatusBar
```

#### React Navigation

React Navigation 是手机 APP 的导航系统。

当前使用底部 Tab：

```text
首页 | 设置
```

对应：

```text
HomeScreen
SettingsScreen
```

#### Screen

Screen 是一个页面。

当前有两个页面：

```text
HomeScreen = 首页自选股列表
SettingsScreen = 设置后端地址
```

#### useState

`useState` 用来保存页面会变化的数据。

例如：

```text
backendUrl
savedBackendUrl
message
stocks
isLoading
loadError
```

#### useEffect

`useEffect` 用来在页面加载等特定时机自动执行代码。

例如：

```text
页面打开时读取 AsyncStorage
页面打开时加载自选股列表
```

#### useCallback

`useCallback` 用来固定函数，避免函数在重新渲染时反复被创建。

在首页中用于固定 `loadStocks`，让 `useEffect` 不会反复触发。

#### AsyncStorage

AsyncStorage 是 React Native 的本地存储。

本项目用它保存：

```text
backendUrl
```

也就是用户配置的后端地址。

#### fetch

`fetch` 用来请求后端接口。

当前已使用：

```text
GET /api/health
GET /api/stocks
```

#### FlatList

FlatList 是 React Native 的列表组件。

当前用于显示自选股：

```text
股票代码 + 股票名称
```

#### CORS

Web 前端请求 FastAPI 后端时，需要后端允许跨域。

本项目已在 FastAPI 入口统一配置 CORS，允许 Expo Web 前端访问后端。

### 本阶段收获

这一阶段完成后，说明：

```text
React Native 前端已经能通过配置地址访问 FastAPI 后端
APP 已经有了真实手机 APP 的基础导航结构
首页可以读取后端自选股数据
设置页可以保存并测试后端地址
```

### 下一步

移动端下一阶段建议继续做：

1. 添加自选股；
2. 删除自选股；
3. 点击自选股创建分析任务；
4. 查询任务状态；
5. 进入报告详情。

## 2026-06-22：移动端第二阶段，自选模块完善

### 本阶段完成内容

第二阶段围绕“自选模块”完成了从列表到分析报告的最小前端链路。

已完成：

1. `HomeScreen` 重命名为 `WatchlistScreen`。
2. 底部 Tab 调整为：

```text
自选 | 问股 | 大盘 | 设置
```

3. 自选模块内部新增 Stack 导航：

```text
WatchlistScreen
  ↓
TaskStatusScreen
  ↓
ReportDetailScreen
```

4. 自选页支持：
   - 读取自选股列表；
   - 添加自选股；
   - 删除自选股；
   - 点击股票创建分析任务；
   - 显示股票最近一次任务状态。
5. 新增问股、大盘占位页，为长期导航结构预留位置。
6. 新增统一类型定义文件 `src/types/index.ts`。

### 本阶段主流程

```text
进入自选页
  ↓
GET /api/stocks 读取自选股
  ↓
添加或删除自选股
  ↓
点击股票
  ↓
POST /api/analysis 创建分析任务
  ↓
进入 TaskStatusScreen
  ↓
GET /api/analysis/{task_id} 查询任务状态
  ↓
点击查看报告
  ↓
GET /api/reports/{report_id} 查看报告详情
```

### 新学到的前端概念

#### Tab 导航

Tab 导航是 APP 底部一级模块切换。

当前结构：

```text
自选 | 问股 | 大盘 | 设置
```

#### Stack 导航

Stack 导航用于模块内部页面前进和返回。

本阶段自选模块内部使用：

```text
Watchlist -> TaskStatus -> ReportDetail
```

可以理解为：

```text
Tab = APP 的几个大房间
Stack = 某个房间里面继续往里走的小房间
```

#### 类型化导航参数

`WatchlistStackParamList` 规定页面跳转时必须传什么参数。

例如：

```text
TaskStatus 必须传 taskId 和 stockCode
ReportDetail 必须传 reportId
```

这样可以减少页面跳转时漏传参数导致的错误。

#### AsyncStorage 的新增用途

第一阶段 AsyncStorage 用来保存：

```text
backendUrl
```

第二阶段新增保存：

```text
stockTaskIds
```

作用是记录每只股票最近一次分析任务 ID，方便回到自选页后继续显示任务状态。

### 本阶段验收结果

已手动验证通过：

```text
添加自选股通过
删除自选股通过
点击股票创建分析任务通过
任务状态页通过
报告详情页通过
Tab + Stack 导航结构通过
```

### 当前限制

报告内容仍然来自后端 mock 数据。

也就是说：

```text
自选股增删查是真实接口和 SQLite
分析任务记录是真实写入 SQLite
报告记录是真实写入 SQLite
但报告内容本身仍是模拟生成
```

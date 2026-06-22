# 后端学习笔记

## 2026-06-22：FastAPI 最小后端

### 今天完成了什么

- 创建了后端目录 `backend/`。
- 搭建了 FastAPI 最小项目结构。
- 实现了健康检查接口 `GET /api/health`。
- 本地启动后端服务并验证接口返回正常。
- 学习并完成了一次 Git 流程：`status -> add -> commit -> push`。

### 当前后端结构

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

### 核心概念

#### FastAPI

FastAPI 是 Python 后端框架，用来创建后端应用和接口。

可以理解为：

```text
FastAPI = 创建后端应用的工具
```

#### uvicorn

uvicorn 是运行 FastAPI 应用的服务器。

可以理解为：

```text
FastAPI = 后端程序
uvicorn = 把后端程序启动起来的发动机
```

#### APIRouter

`APIRouter` 用来管理一组相关接口。

可以理解为：

```text
FastAPI = 整个后端应用
APIRouter = 一组接口的收纳盒
```

#### __init__.py

`__init__.py` 是 Python 约定好的特殊文件名。

作用是标记一个文件夹可以被当作 Python 包导入。

例如：

```text
app/__init__.py 表示 app 是 Python 包
app/api/__init__.py 表示 api 是 Python 子包
```

#### requirements.txt

`requirements.txt` 是 Python 项目的依赖清单。

当前内容：

```text
fastapi
uvicorn
```

表示这个后端项目需要安装 FastAPI 和 uvicorn。

### /api/health 接口流程

浏览器访问：

```text
http://127.0.0.1:8000/api/health
```

流程是：

```text
浏览器发送 GET /api/health 请求
↓
uvicorn 接到请求
↓
FastAPI app 处理请求
↓
main.py 中已经注册 health_router
↓
health.py 中 @router.get("/health") 匹配成功
↓
执行 health_check()
↓
返回 JSON 数据
```

返回结果：

```json
{
  "status": "ok",
  "message": "AI Stock App backend is running"
}
```

### 常用命令

#### 安装依赖

```text
python -m pip install -r requirements.txt
```

#### 启动后端服务

```text
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

#### 访问健康检查接口

```text
http://127.0.0.1:8000/api/health
```

#### 查看 FastAPI 自动接口文档

```text
http://127.0.0.1:8000/docs
```

#### 查看 Git 状态

```text
git status
```

#### 查看简短 Git 状态

```text
git status --short
```

### Git 学习记录

今天完成的 Git 流程：

```text
git status
↓
git add 指定文件
↓
git commit -m "feat: add FastAPI health endpoint"
↓
git push
↓
git status
```

学到的状态：

```text
Untracked = Git 看见了新文件，但还没有跟踪
Staged = 文件已经加入暂存区，准备提交
Committed = 文件已经进入本地提交历史
Pushed = 本地提交已经同步到 GitHub
```

### 容易混淆的点

- `FastAPI` 创建的是后端应用对象，不是真正的服务器。
- `uvicorn` 才是把后端服务运行起来的服务器。
- `APIRouter` 不是整个应用，只是一组接口的收纳盒。
- `__init__.py` 不是关键字，而是 Python 约定好的特殊文件名。
- `127.0.0.1` 表示本机地址。
- `8000` 是后端服务监听的端口。
- `feat: add FastAPI health endpoint` 不是单独运行的命令，而是 `git commit -m` 后面的提交信息。

## 2026-06-22：自选股内存版小闭环

### 今天完成了什么

- 新增并完善了自选股接口文件 `backend/app/api/stocks.py`。
- 在 `backend/app/main.py` 中注册了 `stocks_router`。
- 实现了 `GET /api/stocks`，用于查看自选股列表。
- 实现了 `POST /api/stocks`，用于添加自选股。
- 实现了 `DELETE /api/stocks/{code}`，用于删除指定股票。
- 使用内存列表 `stocks = []` 临时保存自选股。
- 本地验证添加、查看、删除流程都能正常运行。
- 完成 Git 提交并推送到 GitHub。

### 当前接口

```text
GET     /api/stocks
POST    /api/stocks
DELETE  /api/stocks/{code}
```

### 当前数据保存方式

```text
stocks = []
```

它是一个 Python 列表，用于临时保存自选股。

特点：

```text
服务运行时存在
服务停止后消失
适合学习和临时测试
后面需要 SQLite 才能长期保存
```

### GET /api/stocks

作用：

```text
查看当前自选股列表。
```

初始返回：

```json
{
  "items": []
}
```

添加股票后返回示例：

```json
{
  "items": [
    {
      "code": "600519",
      "name": "贵州茅台"
    }
  ]
}
```

### POST /api/stocks

作用：

```text
添加一只自选股。
```

请求体 body：

```json
{
  "code": "600519",
  "name": "贵州茅台"
}
```

返回：

```json
{
  "message": "stock added",
  "item": {
    "code": "600519",
    "name": "贵州茅台"
  }
}
```

学到：

```text
body = 客户端发给后端的数据
return = 后端返回给客户端的数据
```

### StockCreate 请求模型

```text
StockCreate 用来规定 POST 请求体的数据结构。
```

当前字段：

```text
code: str
name: str
```

可以理解为：

```text
添加股票时，前端必须提交 code 和 name。
```

### DELETE /api/stocks/{code}

作用：

```text
根据股票代码删除自选股。
```

示例：

```text
DELETE /api/stocks/600519
```

其中 `{code}` 是路径参数。

删除成功返回：

```json
{
  "message": "stock deleted",
  "code": "600519"
}
```

股票不存在返回：

```json
{
  "message": "stock not found",
  "code": "000001"
}
```

### 核心概念

#### CRUD 雏形

当前自选股模块已经具备：

```text
Create  POST /api/stocks
Read    GET /api/stocks
Delete  DELETE /api/stocks/{code}
```

暂时还没有做：

```text
Update
```

#### 路径参数

```text
/api/stocks/{code}
```

`{code}` 表示从 URL 中接收一个可变参数。

例如：

```text
/api/stocks/600519 -> code = "600519"
```

#### 内存数据和数据库

当前 `stocks` 列表是内存数据。

```text
内存 = 服务运行时临时保存
数据库 = 服务重启后仍然保存
```

所以下一阶段适合学习 SQLite。

### 本次遇到的问题

验证时遇到过：

```text
8000 端口被旧服务占用
```

表现是：

```text
旧接口能访问，新接口可能 404
```

解决方式：

```text
先停止旧服务，再重新启动新版服务。
```

### Git 学习记录

本阶段相关提交：

```text
0d9a665 feat: add stocks list endpoint
bfb92d0 feat: add in-memory stock management
f972ca4 docs: update learning notes and collaboration rules
```

学到：

```text
功能代码和文档/规则可以分开提交，让 Git 历史更清楚。
```

### 下一步建议

下一步建议学习 SQLite 数据库，把自选股从内存保存升级为持久化保存。

可以学习：

- SQLite 是什么；
- 数据库文件是什么；
- 表和字段是什么；
- 如何创建 stocks 表；
- POST 如何保存到数据库；
- GET 如何从数据库读取；
- DELETE 如何从数据库删除；
- 为什么数据库能在服务重启后保留数据。

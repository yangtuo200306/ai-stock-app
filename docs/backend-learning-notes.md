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

## 2026-06-22：GET /api/stocks 自选股列表接口

### 今天完成了什么

- 新增了自选股接口文件 `backend/app/api/stocks.py`。
- 在 `backend/app/main.py` 中注册了 `stocks_router`。
- 实现了 `GET /api/stocks`。
- 本地验证 `GET /api/health` 和 `GET /api/stocks` 都能正常返回。
- 完成 Git 提交并推送到 GitHub。

### 当前新增接口

```text
GET /api/stocks
```

当前返回：

```json
{
  "items": []
}
```

### 核心概念

#### 自选股接口

`GET /api/stocks` 是给手机 APP 自选股页面使用的。

页面以后可以通过这个接口向后端询问：

```text
当前有哪些自选股？
```

#### 空列表

当前返回：

```json
{
  "items": []
}
```

表示：

```text
请求成功，但现在还没有自选股数据。
```

空列表不是错误。

#### mock / 占位接口

现在还没有数据库，也没有真实股票数据，所以先返回空列表。

这属于 mock / 占位接口：

```text
先把接口通道建好，后面再接真实数据。
```

#### 多 router 注册

`stocks.py` 中定义自选股相关接口。

`main.py` 中通过下面方式注册：

```text
app.include_router(stocks_router)
```

可以理解为：

```text
stocks.py 定义接口
main.py 把接口挂到 FastAPI 主应用上
```

### 本次遇到的问题

验证时遇到过：

```text
8000 端口被旧服务占用
```

表现是：

```text
旧的 /api/health 可以访问
新的 /api/stocks 返回 404
```

原因是浏览器访问到的还是旧服务，不是刚修改后的新版服务。

解决方式：

```text
先停止旧服务，再重新启动新版服务。
```

### Git 学习记录

本次提交：

```text
0d9a665 feat: add stocks list endpoint
```

学到：

```text
新增接口时，定义接口文件和注册入口文件通常要一起提交。
```

本次涉及文件：

```text
backend/app/api/stocks.py
backend/app/main.py
```

### 下一步建议

下一步可以继续做自选股相关功能：

```text
POST /api/stocks
```

第一版可以先学习如何接收前端传来的股票代码和名称，暂时仍不接数据库。

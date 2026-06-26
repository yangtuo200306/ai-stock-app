# AI Stock App — 部署指南

> 本文档指导你将后端部署到阿里云 ECS（Ubuntu 20.04）。

---

## 目录

1. [服务器准备](#1-服务器准备)
2. [后端部署](#2-后端部署)
3. [日常管理](#3-日常管理)
4. [数据库备份](#4-数据库备份)
5. [常见问题](#5-常见问题)

---

## 1. 服务器准备

### 1.1 连接服务器

```bash
ssh root@你的服务器公网IP
```

### 1.2 安装 Python 3.11

Ubuntu 20.04 默认 Python 是 3.8，需要安装 3.11：

```bash
# 更新包列表
apt update

# 安装 Python 3.11
apt install -y python3.11 python3.11-venv python3-pip

# 验证
python3.11 --version
# 输出: Python 3.11.x
```

### 1.3 pip 换源（可选，加速国内下载）

```bash
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
```

### 1.4 创建项目目录

```bash
mkdir -p /opt/ai-stock-app/{backend,data,logs}
```

---

## 2. 后端部署

### 2.1 上传代码

方式一：从 GitHub 克隆（推荐）

```bash
cd /opt/ai-stock-app
git clone <你的仓库地址> .
```

方式二：本地打包上传

```bash
# 本地打包
cd ai-stock-app
tar -czvf ai-stock-app.tar.gz backend/ deploy/ .gitignore

# 上传到服务器
scp ai-stock-app.tar.gz root@你的服务器IP:/opt/ai-stock-app/

# 服务器上解压
cd /opt/ai-stock-app
tar -xzvf ai-stock-app.tar.gz
```

### 2.2 创建虚拟环境并安装依赖

```bash
cd /opt/ai-stock-app/backend

# 创建虚拟环境
python3.11 -m venv /opt/ai-stock-app/venv

# 激活虚拟环境并安装依赖
source /opt/ai-stock-app/venv/bin/activate
pip install -r requirements.txt

# 验证安装
python -c "import fastapi; print(fastapi.__version__)"
# 输出: 0.135.1
```

### 2.3 配置环境变量

```bash
cd /opt/ai-stock-app/backend

# 从生产模板创建 .env
cp .env.production .env

# 编辑 .env，填入真实值
vim .env
```

**必须修改的配置项：**

| 配置项 | 说明 | 示例值 |
|--------|------|--------|
| `LLM_API_KEY` | 火山方舟 API Key | `sk-xxxxx` |
| `LLM_MODEL` | 火山方舟 endpoint ID | `ep-2024xxxxx` |
| `DATABASE_PATH` | 数据库绝对路径 | `/opt/ai-stock-app/data/ai_stock.db` |
| `CORS_ORIGINS` | 手机 App 访问地址 | `http://你的公网IP:8081` |

### 2.4 注册 systemd 服务

```bash
# 复制服务文件
cp /opt/ai-stock-app/deploy/ai-stock-app.service /etc/systemd/system/

# 重载 systemd 配置
systemctl daemon-reload

# 启动服务
systemctl start ai-stock-app.service

# 设置开机自启
systemctl enable ai-stock-app.service

# 检查状态
systemctl status ai-stock-app.service
# 应显示: active (running)
```

### 2.5 验证部署

```bash
# 健康检查
curl http://localhost:8000/api/health
# 应返回: {"status":"ok","message":"AI Stock App backend is running"}
```

### 2.6 安全组配置

在阿里云 ECS 控制台 → 安全组 → 添加入方向规则：

| 协议 | 端口 | 来源 | 说明 |
|------|------|------|------|
| TCP | 8000 | 0.0.0.0/0 | 后端 API（后续可改为手机 IP） |

---

## 3. 日常管理

### 3.1 服务启停

```bash
# 查看状态
systemctl status ai-stock-app.service

# 启动
systemctl start ai-stock-app.service

# 停止
systemctl stop ai-stock-app.service

# 重启
systemctl restart ai-stock-app.service
```

或使用部署脚本：

```bash
/opt/ai-stock-app/deploy/start.sh
/opt/ai-stock-app/deploy/stop.sh
/opt/ai-stock-app/deploy/restart.sh
```

### 3.2 查看日志

```bash
# systemd 日志（进程级）
journalctl -u ai-stock-app.service -f

# 项目日志（业务级）
tail -f /opt/ai-stock-app/logs/app.log
tail -f /opt/ai-stock-app/logs/app_debug.log
```

### 3.3 更新代码

```bash
cd /opt/ai-stock-app

# 拉取最新代码
git pull

# 更新依赖（如果有变化）
source /opt/ai-stock-app/venv/bin/activate
pip install -r requirements.txt

# 重启服务
systemctl restart ai-stock-app.service
```

---

## 4. 数据库备份

SQLite 数据库文件在 `/opt/ai-stock-app/data/ai_stock.db`。

### 4.1 手动备份

```bash
# 停止服务（避免备份时写入）
systemctl stop ai-stock-app.service

# 备份数据库
cp /opt/ai-stock-app/data/ai_stock.db /opt/ai-stock-app/data/ai_stock.db.bak.$(date +%Y%m%d)

# 重启服务
systemctl start ai-stock-app.service
```

### 4.2 定时备份（crontab）

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每天凌晨 3 点备份，保留最近 7 天）
0 3 * * * cp /opt/ai-stock-app/data/ai_stock.db /opt/ai-stock-app/data/ai_stock.db.bak.$(date +\%Y\%m\%d) && find /opt/ai-stock-app/data -name "*.bak.*" -mtime +7 -delete
```

### 4.3 恢复备份

```bash
systemctl stop ai-stock-app.service
cp /opt/ai-stock-app/data/ai_stock.db.bak.20260626 /opt/ai-stock-app/data/ai_stock.db
systemctl start ai-stock-app.service
```

---

## 5. 常见问题

### 5.1 服务启动失败

```bash
# 查看详细错误
journalctl -u ai-stock-app.service -n 50 --no-pager
```

常见原因：
- **端口被占用**：`lsof -i :8000` 查看，`kill` 旧进程
- **依赖缺失**：`source /opt/ai-stock-app/venv/bin/activate && pip list`
- **.env 配置错误**：检查 `DATABASE_PATH` 目录是否存在

### 5.2 数据库权限问题

```bash
# 确保数据库目录可写
ls -la /opt/ai-stock-app/data/
chmod 755 /opt/ai-stock-app/data
```

### 5.3 手机 App 无法连接

排查步骤：
1. 服务器上执行 `curl http://localhost:8000/api/health` — 检查服务是否运行
2. 服务器上执行 `curl http://公网IP:8000/api/health` — 检查监听地址
3. 检查阿里云安全组是否放行 8000 端口
4. 检查手机和服务器是否在同一网络（或服务器有公网 IP）

### 5.4 日志文件过大

```bash
# 查看日志大小
du -sh /opt/ai-stock-app/logs/

# 手动清理
rm /opt/ai-stock-app/logs/app.log.*.gz
rm /opt/ai-stock-app/logs/app_debug.log.*.gz
```

日志系统已配置自动轮转（app.log 10MB 保留 5 份，app_debug.log 50MB 保留 3 份），一般不需要手动清理。

#!/bin/bash
# AI Stock App — 启动后端服务
set -e

APP_DIR="/opt/ai-stock-app"
VENV_DIR="$APP_DIR/venv"
BACKEND_DIR="$APP_DIR/backend"

echo "启动 AI Stock App 后端服务..."

# 检查虚拟环境
if [ ! -d "$VENV_DIR" ]; then
    echo "错误: 虚拟环境不存在，请先执行部署步骤创建虚拟环境"
    echo "  python3 -m venv $VENV_DIR"
    exit 1
fi

# 检查 .env 文件
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "警告: .env 文件不存在，使用环境变量或默认配置"
fi

# 激活虚拟环境并启动
source "$VENV_DIR/bin/activate"
cd "$BACKEND_DIR"

echo "启动 uvicorn (0.0.0.0:8000)..."
exec "$VENV_DIR/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000

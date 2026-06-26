#!/bin/bash
# AI Stock App — 停止后端服务
set -e

echo "停止 AI Stock App 后端服务..."

# 通过 systemd 停止
if systemctl is-active --quiet ai-stock-app.service 2>/dev/null; then
    echo "通过 systemd 停止服务..."
    sudo systemctl stop ai-stock-app.service
    echo "服务已停止"
    exit 0
fi

# 回退：直接查找并 kill uvicorn 进程
PID=$(pgrep -f "uvicorn app.main:app" 2>/dev/null || true)
if [ -n "$PID" ]; then
    echo "通过 kill 停止进程 (PID: $PID)..."
    kill "$PID" 2>/dev/null || true
    sleep 2
    # 确认停止
    if kill -0 "$PID" 2>/dev/null; then
        echo "强制终止进程..."
        kill -9 "$PID" 2>/dev/null || true
    fi
    echo "服务已停止"
else
    echo "服务未运行"
fi

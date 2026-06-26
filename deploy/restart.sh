#!/bin/bash
# AI Stock App — 重启后端服务
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "重启 AI Stock App 后端服务..."

# 通过 systemd 重启
if systemctl is-active --quiet ai-stock-app.service 2>/dev/null; then
    echo "通过 systemd 重启..."
    sudo systemctl restart ai-stock-app.service
    echo "服务已重启"
    exit 0
fi

# 回退：直接调用 start/stop
"$SCRIPT_DIR/stop.sh"
sleep 2
"$SCRIPT_DIR/start.sh"

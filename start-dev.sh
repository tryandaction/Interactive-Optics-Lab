#!/bin/bash

# 交互式光学实验室 - 开发环境启动脚本

echo "🚀 启动交互式光学实验室开发环境..."

# 检查Node.js版本
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未安装Node.js，请先安装Node.js 16.0.0或更高版本"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ 错误：Node.js版本过低，当前版本：$(node -v)，需要16.0.0或更高版本"
    exit 1
fi

echo "✅ Node.js版本检查通过：$(node -v)"

# 检查MongoDB连接（可选）
if command -v mongosh &> /dev/null; then
    echo "✅ 检测到MongoDB客户端"
elif command -v mongo &> /dev/null; then
    echo "✅ 检测到MongoDB客户端（旧版本）"
else
    echo "⚠️  警告：未检测到MongoDB客户端，云端功能可能无法使用"
fi

# 安装前端依赖
echo "📦 安装前端依赖..."
cd frontend
npm install
cd ..

# 安装后端依赖
echo "📦 安装后端依赖..."
cd backend
npm install
cd ..

# 检查concurrently工具
if ! command -v concurrently &> /dev/null; then
    echo "📦 安装concurrently工具用于同时启动前后端..."
    npm install -g concurrently
fi

echo "🎯 启动开发服务器..."
echo "   前端：http://localhost:8080"
echo "   后端：http://localhost:3000"
echo "   健康检查：http://localhost:3000/api/health"
echo ""
echo "按 Ctrl+C 停止所有服务器"

# 同时启动前后端
concurrently \
    "cd backend && npm run dev" \
    "python -m http.server 8080" \
    --names "backend,frontend" \
    --prefix name \
    --kill-others \
    --success first
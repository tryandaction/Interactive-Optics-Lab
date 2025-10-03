# 交互式光学实验室 - 开发环境启动脚本 (Windows PowerShell)

Write-Host "🚀 启动交互式光学实验室开发环境..." -ForegroundColor Green

# 检查Node.js版本
try {
    $nodeVersion = node -v
    $versionNumber = [int]($nodeVersion.TrimStart('v').Split('.')[0])
    if ($versionNumber -lt 16) {
        Write-Host "❌ 错误：Node.js版本过低，当前版本：$nodeVersion，需要16.0.0或更高版本" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Node.js版本检查通过：$nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误：未安装Node.js，请先安装Node.js 16.0.0或更高版本" -ForegroundColor Red
    exit 1
}

# 检查MongoDB连接（可选）
try {
    $mongoshVersion = mongosh --version 2>$null
    if ($mongoshVersion) {
        Write-Host "✅ 检测到MongoDB客户端：$mongoshVersion" -ForegroundColor Green
    } else {
        Write-Host "⚠️  警告：未检测到MongoDB客户端，云端功能可能无法使用" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  警告：未检测到MongoDB客户端，云端功能可能无法使用" -ForegroundColor Yellow
}

# 安装前端依赖
Write-Host "📦 安装前端依赖..." -ForegroundColor Blue
Set-Location frontend
npm install
Set-Location ..

# 安装后端依赖
Write-Host "📦 安装后端依赖..." -ForegroundColor Blue
Set-Location backend
npm install
Set-Location ..

# 检查concurrently工具
try {
    $concurrentlyVersion = npx concurrently --version 2>$null
    if (-not $concurrentlyVersion) {
        Write-Host "📦 安装concurrently工具用于同时启动前后端..." -ForegroundColor Blue
        npm install -g concurrently
    }
} catch {
    Write-Host "📦 安装concurrently工具用于同时启动前后端..." -ForegroundColor Blue
    npm install -g concurrently
}

Write-Host "🎯 启动开发服务器..." -ForegroundColor Green
Write-Host "   前端：http://localhost:8080" -ForegroundColor Cyan
Write-Host "   后端：http://localhost:3000" -ForegroundColor Cyan
Write-Host "   健康检查：http://localhost:3000/api/health" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "按 Ctrl+C 停止所有服务器" -ForegroundColor Yellow

# 同时启动前后端
try {
    npx concurrently `
        "Set-Location backend; npm run dev" `
        "python -m http.server 8080" `
        --names "backend,frontend" `
        --prefix name `
        --kill-others `
        --success first
} catch {
    Write-Host "❌ 启动失败，请检查错误信息" -ForegroundColor Red
    exit 1
}
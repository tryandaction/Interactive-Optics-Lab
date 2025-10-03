@echo off
echo ========================================
echo    光学实验室 - 服务器启动脚本
echo ========================================
echo.

echo [1/3] 检查MongoDB状态...
net start | findstr MongoDB >nul 2>&1
if %errorlevel% neq 0 (
    echo 警告: MongoDB服务未运行，正在尝试启动...
    net start MongoDB >nul 2>&1
    if %errorlevel% neq 0 (
        echo 错误: 无法启动MongoDB服务！
        echo 请手动启动MongoDB: net start MongoDB
        pause
        exit /b 1
    )
)
echo ✓ MongoDB服务正在运行

echo.
echo [2/3] 启动后端API服务器...
cd backend
start "OpticsLab Backend" cmd /k "npm run dev"
cd ..
timeout /t 3 /nobreak >nul

echo.
echo [3/3] 启动前端服务器...
cd frontend
start "OpticsLab Frontend" cmd /k "python -m http.server 8080"
cd ..

echo.
echo ========================================
echo         启动完成！
echo ========================================
echo.
echo 前端应用: http://localhost:8080
echo 后端API:   http://localhost:3000
echo.
echo 按任意键关闭此窗口...
pause >nul
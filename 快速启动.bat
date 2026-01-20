@echo off
chcp 65001 >nul
echo ========================================
echo   光学实验室 - 本地服务器启动
echo ========================================
echo.
echo 正在启动服务器...
echo.

REM 启动服务器（在新窗口中）
start "光学实验室服务器" cmd /k "python -m http.server 8000"

REM 等待2秒让服务器启动
timeout /t 2 /nobreak >nul

REM 打开浏览器
echo 正在打开浏览器...
start http://localhost:8000

echo.
echo ========================================
echo   服务器已启动！
echo   访问地址: http://localhost:8000
echo ========================================
echo.
echo 提示：
echo - 如果看到旧的错误，请按 Ctrl+Shift+R 强制刷新
echo - 关闭服务器窗口即可停止服务器
echo.
pause

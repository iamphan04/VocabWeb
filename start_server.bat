@echo off
chcp 65001 >nul
title VocabMaster - Server Kho Từ Vựng Online
echo ========================================================
echo   📚 VocabMaster - Đang Khởi Động Server...
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Tìm thấy Node.js. Đang chạy server Node...
    node server.js
    goto end
)

where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Tìm thấy Python. Đang chạy server Python SQLite...
    python server.py
    goto end
)

if exist "C:\msys64\ucrt64\bin\python.exe" (
    echo [OK] Tìm thấy Python MSYS2. Đang chạy server...
    "C:\msys64\ucrt64\bin\python.exe" server.py
    goto end
)

echo [LỖI] Không tìm thấy Node.js hoặc Python trên máy!
echo Vui lòng cài đặt Node.js hoặc Python để chạy server.
pause

:end

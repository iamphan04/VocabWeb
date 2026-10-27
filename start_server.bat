@echo off
chcp 65001 >nul
title VocabMaster - Server Kho Từ Vựng & Đa Thiết Bị
echo ========================================================
echo   📚 VocabMaster - Đang Khởi Động Server...
echo ========================================================
echo.

where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Tìm thấy Python. Đang chạy server Python SQLite (vocab.db)...
    python server.py
    goto end
)

if exist "C:\msys64\ucrt64\bin\python.exe" (
    echo [OK] Tìm thấy Python MSYS2. Đang chạy server Python SQLite...
    "C:\msys64\ucrt64\bin\python.exe" server.py
    goto end
)

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Tìm thấy Node.js. Đang chạy server Node (database.json)...
    node server.js
    goto end
)

echo [LỖI] Không tìm thấy Python hoặc Node.js trên máy!
echo Vui lòng cài đặt Python (https://www.python.org/) để chạy server.
pause

:end

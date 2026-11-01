@echo off
chcp 65001 >nul
cd /d "%~dp0server"
title May chu Chua Binh An
where node >nul 2>nul || (echo Chua cai Node.js. Tai ban LTS tai https://nodejs.org/ roi chay lai file nay. & pause & exit /b)
if not exist node_modules (echo Dang cai thu vien lan dau... & call npm install --no-audit --no-fund)
rem ===== CAU HINH =====
rem Toc do TAI LEN (upload) cua mang nha ban, do o https://www.speedtest.net  (Mbps)
set UPLOAD_MBPS=20
rem So nguoi toi da moi kenh (dien thoai yeu thi giam xuong 20)
set ROOM_CAP=30
set PORT=8080
rem ====================
start "" http://localhost:%PORT%/server
node server.js
pause

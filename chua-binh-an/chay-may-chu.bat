@echo off
chcp 65001 >nul
cd /d "%~dp0"
title May chu Chua Binh An
call "%~dp0cau-hinh-may-chu.bat"
where node >nul 2>nul || (echo [!] Chua cai Node.js. Hay chay CAI_DAT_MAY_CHU.bat truoc. & pause & exit /b)
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul && (echo May chu dang chay roi. Mo bang dieu khien... & start "" http://localhost:%PORT%/server & timeout /t 3 >nul & exit /b)
cd server
if not exist node_modules\ws (echo Dang cai thu vien... & call npm install --no-audit --no-fund)
start "" http://localhost:%PORT%/server
node server.js
pause

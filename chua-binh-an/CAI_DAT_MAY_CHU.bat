@echo off
chcp 65001 >nul
title Cai dat may chu Chua Binh An
cd /d "%~dp0"
net session >nul 2>&1 || (echo. & echo [!] Hay NHAP CHUOT PHAI vao file nay va chon "Run as administrator". & echo. & pause & exit /b)
call cau-hinh-may-chu.bat
echo ==========================================================
echo   CAI DAT MAY CHU CHUA BINH AN
echo   Thu muc: %~dp0
echo ==========================================================

echo [1/5] Kiem tra Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo     Chua co Node.js - dang cai tu dong bang winget...
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  echo.
  echo     Da cai Node.js. HAY DONG CUA SO NAY va chay lai CAI_DAT_MAY_CHU.bat lan nua.
  echo     Neu winget bao loi: tai Node.js LTS tai https://nodejs.org/ va cai bang tay.
  pause & exit /b
)
for /f %%v in ('node -v') do echo     Node.js %%v - OK

echo [2/5] Thu vien may chu...
if not exist server\node_modules\ws (pushd server & call npm install --no-audit --no-fund & popd)
echo     OK

echo [3/5] Mo tuong lua cho cong %PORT% (de may khac trong nha vao duoc)...
netsh advfirewall firewall delete rule name="Chua Binh An" >nul 2>nul
netsh advfirewall firewall add rule name="Chua Binh An" dir=in action=allow protocol=TCP localport=%PORT% profile=private,domain >nul
echo     OK

echo [4/5] Khong cho may ngu khi cam dien (may chu phai chay suot)...
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
echo     OK

echo [5/5] Tu chay may chu moi khi bat may (ke ca chua dang nhap)...
schtasks /delete /tn "ChuaBinhAn" /f >nul 2>nul
schtasks /create /tn "ChuaBinhAn" /tr "\"%~dp0server\chay-ngam.bat\"" /sc onstart /ru SYSTEM /rl highest /f >nul
schtasks /run /tn "ChuaBinhAn" >nul
echo     OK - may chu da chay ngam.

timeout /t 4 >nul
start "" http://localhost:%PORT%/server
start "" http://localhost:%PORT%/game.html
echo.
echo ==========================================================
echo   XONG! Choi tren may nay: http://localhost:%PORT%/game.html
echo   Tinh trang may chu:      http://localhost:%PORT%/server
echo   Buoc tiep theo: chay KET_NOI_TEN_MIEN.bat de mo ra dichua.id.vn
echo ==========================================================
pause

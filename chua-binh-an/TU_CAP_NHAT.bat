@echo off
chcp 65001 >nul
title Tu cap nhat Chua Binh An tu GitHub
setlocal EnableExtensions EnableDelayedExpansion
rem =====================================================================
rem  TU DONG TAI BAN MOI NHAT tu GitHub va cap nhat may chu.
rem  Chi can nhap CHUOT PHAI file nay -> Run as administrator.
rem  - Tai ban moi nhat (khong can tai khoan), nen ma, chay thu o cong 8081
rem  - Dong y thi dua len chinh thuc (tu sao luu ban cu)
rem  - Giu nguyen: cau-hinh-may-chu.bat, tunnel-token.txt, js\cau-hinh-rieng.js
rem =====================================================================
net session >nul 2>&1 || (echo. & echo [!] Hay nhap CHUOT PHAI file nay va chon "Run as administrator". & echo. & pause & exit /b)
where node >nul 2>nul || (echo [!] Chua cai Node.js: https://nodejs.org/ & pause & exit /b)
where tar  >nul 2>nul || (echo [!] May nay chua co lenh tar (can Windows 10 tro len). & pause & exit /b)

set "LIVE=%~dp0"
set "LIVE=%LIVE:~0,-1%"
for %%I in ("%LIVE%\..") do set "PARENT=%%~fI"
set "WORK=%TEMP%\cba-update"
set "URL=https://codeload.github.com/batman0608/kaka-coin-website/tar.gz/refs/heads/claude/chua-binh-an-game"

echo.
echo [1/6] Tai ban moi nhat tu GitHub...
if exist "%WORK%" rmdir /s /q "%WORK%"
mkdir "%WORK%"
curl -L --fail -o "%WORK%\src.tgz" "%URL%" || (echo [!] Tai that bai - kiem tra mang. & pause & exit /b)

echo [2/6] Giai nen...
tar -xzf "%WORK%\src.tgz" -C "%WORK%" || (echo [!] Giai nen loi. & pause & exit /b)
set "SRC="
for /d %%D in ("%WORK%\kaka-coin-website-*") do set "SRC=%%D\chua-binh-an"
if not defined SRC (echo [!] Khong thay thu muc game trong ban tai ve. & pause & exit /b)

echo [3/6] Giu lai cau hinh rieng cua ban...
for %%F in (cau-hinh-may-chu.bat tunnel-token.txt) do if exist "%LIVE%\%%F" copy /y "%LIVE%\%%F" "%SRC%\%%F" >nul
if exist "%LIVE%\js\cau-hinh-rieng.js" copy /y "%LIVE%\js\cau-hinh-rieng.js" "%SRC%\js\cau-hinh-rieng.js" >nul
rem dung lai thu vien ws co san (khoi tai lai)
if exist "%LIVE%\server\node_modules" robocopy "%LIVE%\server\node_modules" "%SRC%\server\node_modules" /E /NFL /NDL /NJH /NJS /NP >nul
if not exist "%SRC%\server\node_modules\ws" (pushd "%SRC%\server" & call npm install --no-audit --no-fund & popd)

echo [4/6] Nen ^& lam roi ma JavaScript...
set "STAGE=%PARENT%\ChuaBinhAn-ban-moi"
if exist "%STAGE%" rmdir /s /q "%STAGE%"
where terser >nul 2>nul || call npm install -g terser --no-audit --no-fund >nul 2>nul
where terser >nul 2>nul
if errorlevel 1 (
  echo     Khong co terser - dung ban khong nen.
  robocopy "%SRC%" "%STAGE%" /E /NFL /NDL /NJH /NJS /NP >nul
) else (
  node "%SRC%\tools\nen_ma.mjs" "%STAGE%" || (echo [!] Nen ma loi - dung ban khong nen. & robocopy "%SRC%" "%STAGE%" /E /NFL /NDL /NJH /NJS /NP >nul)
  robocopy "%SRC%\server\node_modules" "%STAGE%\server\node_modules" /E /NFL /NDL /NJH /NJS /NP >nul
)

echo [5/6] Chay thu ban moi o cong 8081...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":8081 .*LISTENING"') do taskkill /f /pid %%p >nul 2>nul
start "BAN THU (cong 8081)" /min cmd /c "cd /d "%STAGE%\server" && set PORT=8081&& set MAX_PLAYERS=30&& node server.js"
timeout /t 3 >nul
start "" http://localhost:8081/game.html
echo.
echo   Kiem tra ban moi tai: http://localhost:8081/game.html
echo.
choice /c YN /m "Dua len CHINH THUC (Y) hay huy (N)"
set "OK=%errorlevel%"
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":8081 .*LISTENING"') do taskkill /f /pid %%p >nul 2>nul
if "%OK%"=="2" (echo Da huy, ban chinh thuc giu nguyen. & rmdir /s /q "%STAGE%" >nul 2>nul & rmdir /s /q "%WORK%" >nul 2>nul & pause & exit /b)

echo [6/6] Sao luu ban cu va dua ban moi len...
for /f %%d in ('powershell -NoProfile -Command "Get-Date -f yyyyMMdd-HHmm"') do set "STAMP=%%d"
robocopy "%LIVE%" "%PARENT%\ChuaBinhAn-sao-luu\%STAMP%" /E /NFL /NDL /NJH /NJS /NP /XD node_modules >nul
call "%LIVE%\dung-may-chu.bat" >nul 2>nul
robocopy "%STAGE%" "%LIVE%" /MIR /NFL /NDL /NJH /NJS /NP /XD node_modules /XF cau-hinh-may-chu.bat tunnel-token.txt cau-hinh-rieng.js nhat-ky.txt >nul
rmdir /s /q "%STAGE%" >nul 2>nul
rmdir /s /q "%WORK%" >nul 2>nul
schtasks /run /tn "ChuaBinhAn" >nul 2>nul || start "" "%LIVE%\chay-may-chu.bat"
timeout /t 4 >nul
start "" http://localhost:8080/game.html
echo.
echo ==================================================================
echo   XONG! Ban moi dang chay chinh thuc (https://dichua.id.vn).
echo   Loi gi: chay QUAY_LAI_BAN_CU.bat de tro ve ban truoc.
echo ==================================================================
pause

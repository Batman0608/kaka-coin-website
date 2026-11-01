@echo off
chcp 65001 >nul
title Cap nhat Chua Binh An
setlocal EnableDelayedExpansion
rem ===================================================================
rem  CAP NHAT AN TOAN: KEO-THA file zip ban moi vao file nay.
rem  1) Giai nen ban moi ra thu muc thu (ChuaBinhAn-ban-thu)
rem  2) Chay ban thu o cong 8081 de ban kiem tra: http://localhost:8081/game.html
rem  3) Ban dong y thi: sao luu ban dang chay, dua ban moi len chinh thuc
rem  Cau hinh rieng cua ban (cau-hinh-may-chu.bat, tunnel-token.txt,
rem  js\cau-hinh-rieng.js, nhat ky) duoc GIU NGUYEN.
rem ===================================================================
net session >nul 2>&1 || (echo. & echo [!] Nhap CHUOT PHAI vao file nay, chon "Run as administrator". & echo     Hoac: mo file nay bang quyen admin roi keo-tha file zip vao cua so. & pause & exit /b)
set "LIVE=%~dp0"
set "LIVE=%LIVE:~0,-1%"
for %%I in ("%LIVE%\..") do set "PARENT=%%~fI"
set "STAGE=%PARENT%\ChuaBinhAn-ban-thu"
set "ZIP=%~1"
if not defined ZIP (
  echo Keo-tha file zip ban moi vao cua so nay roi bam Enter
  echo [hoac dan duong dan file zip]:
  set /p ZIP=Zip: 
)
set "ZIP=%ZIP:"=%"
if not exist "%ZIP%" (echo [!] Khong thay file: %ZIP% & pause & exit /b)

echo.
echo [1/4] Giai nen ban moi vao: %STAGE%
if exist "%STAGE%" rmdir /s /q "%STAGE%"
set "TMPX=%TEMP%\cba-capnhat"
if exist "%TMPX%" rmdir /s /q "%TMPX%"
powershell -NoProfile -Command "Expand-Archive -Force -LiteralPath '%ZIP%' -DestinationPath '%TMPX%'" || (echo [!] Giai nen loi & pause & exit /b)
if exist "%TMPX%\ChuaBinhAn" (move "%TMPX%\ChuaBinhAn" "%STAGE%" >nul) else (move "%TMPX%" "%STAGE%" >nul)
rem giu cau hinh rieng cua ban trong ban thu
for %%F in (cau-hinh-may-chu.bat tunnel-token.txt) do if exist "%LIVE%\%%F" copy /y "%LIVE%\%%F" "%STAGE%\%%F" >nul
if exist "%LIVE%\js\cau-hinh-rieng.js" copy /y "%LIVE%\js\cau-hinh-rieng.js" "%STAGE%\js\cau-hinh-rieng.js" >nul

echo [2/4] Chay BAN THU o cong 8081 (ban chinh thuc van chay binh thuong o 8080)...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":8081 .*LISTENING"') do taskkill /f /pid %%p >nul 2>nul
start "BAN THU Chua Binh An (cong 8081)" /min cmd /c "cd /d "%STAGE%\server" && set PORT=8081&& set MAX_PLAYERS=30&& node server.js"
timeout /t 3 >nul
start "" http://localhost:8081/game.html
echo.
echo ==================================================================
echo   HAY KIEM TRA BAN THU:  http://localhost:8081/game.html
echo   - Choi thu cac chuc nang moi, mo them tab thu de xem nhieu nguoi
echo   - Luu y: ban thu dung chung Firebase that (tai khoan, nap tien)
echo ==================================================================
echo.
choice /c YN /m "Ban thu chay on? Y = dua len CHINH THUC, N = huy ban thu"
set "OK=%errorlevel%"
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":8081 .*LISTENING"') do taskkill /f /pid %%p >nul 2>nul
if "%OK%"=="2" (echo Da huy. Ban chinh thuc giu nguyen. & rmdir /s /q "%STAGE%" & pause & exit /b)

echo [3/4] Sao luu ban dang chay...
for /f %%d in ('powershell -NoProfile -Command "Get-Date -f yyyyMMdd-HHmm"') do set "STAMP=%%d"
set "BAK=%PARENT%\ChuaBinhAn-sao-luu\%STAMP%"
robocopy "%LIVE%" "%BAK%" /E /NFL /NDL /NJH /NJS /NP /XD node_modules >nul
echo     Da sao luu vao: %BAK%

echo [4/4] Dua ban moi len chinh thuc...
call "%LIVE%\dung-may-chu.bat" >nul
robocopy "%STAGE%" "%LIVE%" /MIR /NFL /NDL /NJH /NJS /NP /XF cau-hinh-may-chu.bat tunnel-token.txt cau-hinh-rieng.js nhat-ky.txt CAP_NHAT.bat >nul
copy /y "%STAGE%\CAP_NHAT.bat" "%LIVE%\CAP_NHAT.moi.bat" >nul
if not exist "%LIVE%\js\cau-hinh-rieng.js" if exist "%STAGE%\js\cau-hinh-rieng.js" copy /y "%STAGE%\js\cau-hinh-rieng.js" "%LIVE%\js\" >nul
rmdir /s /q "%STAGE%"
schtasks /run /tn "ChuaBinhAn" >nul 2>nul || start "" "%LIVE%\chay-may-chu.bat"
timeout /t 4 >nul
start "" http://localhost:8080/game.html
echo.
echo ==================================================================
echo   XONG! Ban moi dang chay chinh thuc (https://dichua.id.vn).
echo   Neu co loi: chay QUAY_LAI_BAN_CU.bat de tro ve ban truoc.
echo ==================================================================
rem thay chinh file cap nhat bang ban moi: lam o dong cuoi, sau khi thoat
pause & (if exist "%LIVE%\CAP_NHAT.moi.bat" start "" /min cmd /c "ping -n 3 127.0.0.1 >nul & move /y "%LIVE%\CAP_NHAT.moi.bat" "%LIVE%\CAP_NHAT.bat" >nul") & exit /b

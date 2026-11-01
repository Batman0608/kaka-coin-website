@echo off
chcp 65001 >nul
title Quay lai ban cu - Chua Binh An
net session >nul 2>&1 || (echo [!] Nhap CHUOT PHAI, chon "Run as administrator". & pause & exit /b)
set "LIVE=%~dp0"
set "LIVE=%LIVE:~0,-1%"
for %%I in ("%LIVE%\..") do set "PARENT=%%~fI"
set "BAKS=%PARENT%\ChuaBinhAn-sao-luu"
if not exist "%BAKS%" (echo Chua co ban sao luu nao. & pause & exit /b)
set "LAST="
for /f "delims=" %%d in ('dir /b /ad /o-n "%BAKS%"') do if not defined LAST set "LAST=%%d"
echo Ban sao luu gan nhat: %LAST%
choice /c YN /m "Tro ve ban nay?"
if errorlevel 2 exit /b
call "%LIVE%\dung-may-chu.bat" >nul
robocopy "%BAKS%\%LAST%" "%LIVE%" /MIR /NFL /NDL /NJH /NJS /NP /XD node_modules /XF tunnel-token.txt nhat-ky.txt QUAY_LAI_BAN_CU.bat >nul
schtasks /run /tn "ChuaBinhAn" >nul 2>nul || start "" "%LIVE%\chay-may-chu.bat"
echo Da tro ve ban %LAST%.
timeout /t 3 >nul
start "" http://localhost:8080/game.html
pause

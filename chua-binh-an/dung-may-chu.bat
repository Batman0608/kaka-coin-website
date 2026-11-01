@echo off
chcp 65001 >nul
cd /d "%~dp0"
call cau-hinh-may-chu.bat
schtasks /end /tn "ChuaBinhAn" >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":%PORT% .*LISTENING"') do taskkill /f /pid %%p >nul 2>nul
taskkill /f /fi "WINDOWTITLE eq May chu Chua Binh An*" >nul 2>nul
echo Da dung may chu Chua Binh An.
timeout /t 3 >nul

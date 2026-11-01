@echo off
chcp 65001 >nul
title Ket noi ten mien dichua.id.vn
cd /d "%~dp0"
net session >nul 2>&1 || (echo. & echo [!] Hay NHAP CHUOT PHAI vao file nay va chon "Run as administrator". & echo. & pause & exit /b)
echo ==========================================================
echo   KET NOI TEN MIEN dichua.id.vn QUA CLOUDFLARE TUNNEL
echo   Lam truoc cac buoc 1-3 trong HUONG_DAN_TEN_MIEN.md:
echo   chuyen ten mien ve Cloudflare, tao Tunnel, lay TOKEN.
echo ==========================================================

set "CF="
where cloudflared >nul 2>nul && set "CF=cloudflared"
if not defined CF call :timcf
if defined CF goto :cocf
echo Dang cai cloudflared bang winget...
winget install -e --id Cloudflare.cloudflared --accept-source-agreements --accept-package-agreements
call :timcf
if defined CF goto :cocf
echo [!] Khong cai duoc tu dong. Tai file cloudflared-windows-amd64.msi tai:
echo     https://github.com/cloudflare/cloudflared/releases/latest
echo     cai xong roi chay lai file nay.
pause
exit /b

:cocf
echo cloudflared: %CF%
echo.
echo Dan TOKEN cua Tunnel - chuoi dai bat dau bang eyJ, lay o buoc 3 trong huong dan -
echo roi bam Enter. Nhap chuot phai vao cua so de dan.
set "TOKEN="
if exist "%~dp0tunnel-token.txt" set /p TOKEN=<"%~dp0tunnel-token.txt"
if defined TOKEN echo Da co san TOKEN trong tunnel-token.txt - tu dong ket noi.
if not defined TOKEN set /p TOKEN=TOKEN: 
if not defined TOKEN (echo Chua nhap token. & pause & exit /b)
"%CF%" service uninstall >nul 2>nul
"%CF%" service install %TOKEN%
if errorlevel 1 (echo [!] Cai dich vu that bai - kiem tra lai TOKEN. & pause & exit /b)
echo.
echo ==========================================================
echo   XONG! Doi 1-2 phut roi mo: https://dichua.id.vn
echo   Tunnel chay nhu dich vu Windows, tu chay lai khi bat may.
echo ==========================================================
timeout /t 20 >nul
start "" https://dichua.id.vn
pause
exit /b

:timcf
if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" set "CF=%ProgramFiles(x86)%\cloudflared\cloudflared.exe"
if exist "%ProgramFiles%\cloudflared\cloudflared.exe" set "CF=%ProgramFiles%\cloudflared\cloudflared.exe"
exit /b

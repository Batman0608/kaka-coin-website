@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Tao giong doc nam tu nhien (NamMinh - giong Bac) bang Azure Speech.
set /p KEY=Nhap AZURE KEY: 
set /p REGION=Nhap REGION (vd southeastasia): 
node tools\tao-giong-doc.mjs %KEY% %REGION%
pause

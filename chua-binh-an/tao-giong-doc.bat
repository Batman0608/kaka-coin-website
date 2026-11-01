@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Tao lai giong doc tu nhien (Microsoft Neural, mien phi) cho cac cau/truyen moi.
echo Can: Python 3.9+, Node.js, ffmpeg. Lan dau: pip install edge-tts
where python >nul 2>nul || (echo Chua cai Python: https://www.python.org/ & pause & exit /b)
where ffmpeg >nul 2>nul || (echo Chua co ffmpeg: winget install Gyan.FFmpeg & pause & exit /b)
python -m pip install -q edge-tts
python tools\tao_giong_doc.py
pause

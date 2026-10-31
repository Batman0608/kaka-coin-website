@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Dang khoi dong Chua Binh An tai http://127.0.0.1:4173/
start "" http://127.0.0.1:4173/
where python >nul 2>nul && (python -m http.server 4173 --bind 127.0.0.1 & goto :eof)
where py >nul 2>nul && (py -m http.server 4173 --bind 127.0.0.1 & goto :eof)
where npx >nul 2>nul && (npx --yes http-server -p 4173 -a 127.0.0.1 -c-1 & goto :eof)
echo Khong tim thay Python hoac Node.js. Hay cai Python tu https://www.python.org/ roi chay lai.
pause

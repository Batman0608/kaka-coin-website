@echo off
rem Chay may chu an (khong cua so), ghi nhat ky vao server\nhat-ky.txt. Duoc goi tu dong khi bat may.
cd /d "%~dp0.."
call cau-hinh-may-chu.bat
cd server
:lap
echo ==== %date% %time% khoi dong ==== >> nhat-ky.txt
node server.js >> nhat-ky.txt 2>&1
rem neu may chu bi tat bat ngo thi doi 5 giay roi chay lai
ping -n 6 127.0.0.1 >nul
goto lap

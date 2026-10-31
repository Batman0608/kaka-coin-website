@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem ==================================================================
rem  Liên kết thư mục nhạc/kinh có sẵn trên máy vào game (không cần chép)
rem  Sửa dòng NGUON nếu thư mục của bạn ở chỗ khác.
rem ==================================================================
set "NGUON=F:\I.Kinh,DanThien"

if not exist "%NGUON%" (
  echo Khong tim thay thu muc: %NGUON%
  echo Hay mo file nay bang Notepad va sua dong NGUON cho dung duong dan.
  pause
  exit /b 1
)
if exist "audio\ThuVienNhac" (
  echo Da co lien ket audio\ThuVienNhac roi. Xoa no truoc neu muon lien ket lai.
  pause
  exit /b 0
)
mklink /J "audio\ThuVienNhac" "%NGUON%"
if errorlevel 1 (
  echo Khong tao duoc lien ket. Ban co the chep thu cong cac file vao thu muc audio\ cua game.
) else (
  echo Xong! Game se tu nhan tat ca file nhac trong "%NGUON%" khi mo man hinh phat.
)
pause

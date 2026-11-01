@echo off
rem ================== CAU HINH MAY CHU CHUA BINH AN ==================
rem Sua cac so ben duoi bang Notepad roi luu lai. Chay lai may chu de ap dung.

rem Toc do TAI LEN (Upload) cua mang nha ban, do o https://www.speedtest.net (don vi Mbps)
rem May chu tu tinh so nguoi toi da = Upload x 0.7 / 0.04
set UPLOAD_MBPS=20

rem So nguoi toi da moi kenh (dien thoai yeu thi giam xuong 20)
set ROOM_CAP=30

rem Cong may chu (Cloudflare Tunnel tro vao http://localhost:8080)
set PORT=8080

rem Ma quan tri de xem tinh trang may chu tu xa: https://dichua.id.vn/server?key=MA_CUA_BAN
rem De trong = chi xem duoc tren chinh may chu (http://localhost:8080/server)
set ADMIN_KEY=

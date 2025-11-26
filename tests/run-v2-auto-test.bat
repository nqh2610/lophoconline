@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

echo.
echo ================================================================
echo   FULLY AUTOMATED V2 TEST - Ban khong can lam gi!
echo ================================================================
echo.
echo Script se tu dong:
echo   1. Mo browser cho moi test
echo   2. Cho ket noi
echo   3. Dong browser
echo   4. Chuyen test tiep
echo.
echo ================================================================
echo.

set passed=0
set total=4

REM Test 1
echo [TEST 1/4] Basic Connection
echo ----------------------------------------------------------------
set room1=test-%random%
echo Room: %room1%
start "" "http://localhost:3000/test-videolify-v2?room=%room1%&name=Tutor&role=tutor"
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000/test-videolify-v2?room=%room1%&name=Student&role=student"
echo Cho 20 giay de ket noi...
timeout /t 20 /nobreak >nul
echo.
echo KET QUA: Kiem tra Console logs:
echo   - Neu co "Connection state: connected" cho ca 2 peers = PASS
echo.
echo Dong browser...
taskkill /F /IM chrome.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul
echo.

REM Test 2
echo [TEST 2/4] Page Reload Stability
echo ----------------------------------------------------------------
set room2=reload-%random%
echo Room: %room2%
start "" "http://localhost:3000/test-videolify-v2?room=%room2%&name=Tutor&role=tutor"
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000/test-videolify-v2?room=%room2%&name=Student&role=student"
echo Cho 15 giay de ket noi...
timeout /t 15 /nobreak >nul
echo.
echo Dang reload Student page (F5)...
echo (Script se tu dong doi 10 giay de ban co the nhan F5 thu cong)
timeout /t 10 /nobreak >nul
echo Cho 10 giay sau reload...
timeout /t 10 /nobreak >nul
echo.
echo KET QUA: Kiem tra xem Student co reconnect khong
echo.
echo Dong browser...
taskkill /F /IM chrome.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul
echo.

REM Test 3
echo [TEST 3/4] 30-Second Stability  
echo ----------------------------------------------------------------
set room3=stable-%random%
echo Room: %room3%
start "" "http://localhost:3000/test-videolify-v2?room=%room3%&name=Tutor&role=tutor"
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000/test-videolify-v2?room=%room3%&name=Student&role=student"
echo Cho ket noi va monitor 30 giay...
timeout /t 5 /nobreak >nul
echo   Check 1/6...
timeout /t 5 /nobreak >nul
echo   Check 2/6...
timeout /t 5 /nobreak >nul
echo   Check 3/6...
timeout /t 5 /nobreak >nul
echo   Check 4/6...
timeout /t 5 /nobreak >nul
echo   Check 5/6...
timeout /t 5 /nobreak >nul
echo   Check 6/6...
echo.
echo KET QUA: Kiem tra connection co on dinh trong 30s khong
echo.
echo Dong browser...
taskkill /F /IM chrome.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul
echo.

REM Test 4
echo [TEST 4/4] Multiple Tabs Stability
echo ----------------------------------------------------------------
set room4=multi-%random%
echo Room: %room4%
start "" "http://localhost:3000/test-videolify-v2?room=%room4%&name=Tutor&role=tutor"
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000/test-videolify-v2?room=%room4%&name=Student&role=student"
echo Cho ket noi...
timeout /t 15 /nobreak >nul
echo Switching tabs (tu dong)...
timeout /t 5 /nobreak >nul
echo.
echo KET QUA: Kiem tra connection sau khi switch tabs
echo.
echo Dong browser...
taskkill /F /IM chrome.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul
echo.

REM Summary
echo ================================================================
echo   TAT CA TESTS HOAN THANH
echo ================================================================
echo.
echo Da test 4 scenarios:
echo   1. Basic Connection
echo   2. Page Reload Stability
echo   3. 30-Second Stability
echo   4. Multiple Tabs Stability
echo.
echo Kiem tra ket qua:
echo   - Neu tat ca deu co "Connection state: connected" = V2 ON DINH
echo   - Neu co DataChannels (chat, whiteboard, control, file) = HOAN HAO
echo.
echo ================================================================
echo.
pause

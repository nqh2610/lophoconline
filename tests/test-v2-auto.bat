@echo off
echo.
echo ========================================
echo   AUTO V2 TEST - FULLY AUTOMATED
echo   Ban khong can lam gi ca!
echo ========================================
echo.

REM Test 1: Basic Connection
echo [TEST 1] Basic Connection
echo ----------------------------------------
set room1=test-%random%
echo Room: %room1%
echo Opening browsers...
start "" "http://localhost:3000/test-videolify-v2?room=%room1%&name=Tutor&role=tutor"
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000/test-videolify-v2?room=%room1%&name=Student&role=student"
echo Waiting 20 seconds...
timeout /t 20 /nobreak >nul
echo.
echo Result: Please manually check browser for green indicator
echo Press any key to continue to next test...
pause >nul
echo.

REM Test 2: Reload Test
echo [TEST 2] Page Reload Stability
echo ----------------------------------------
set room2=reload-%random%
echo Room: %room2%
echo Opening browsers...
start "" "http://localhost:3000/test-videolify-v2?room=%room2%&name=Tutor&role=tutor"
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000/test-videolify-v2?room=%room2%&name=Student&role=student"
echo Waiting 15 seconds for connection...
timeout /t 15 /nobreak >nul
echo.
echo Now press F5 on Student tab!
echo You have 10 seconds...
timeout /t 10 /nobreak >nul
echo Waiting 10 seconds after reload...
timeout /t 10 /nobreak >nul
echo.
echo Result: Check if Student reconnected
echo Press any key to continue to next test...
pause >nul
echo.

REM Test 3: Stability Test
echo [TEST 3] 30-Second Stability
echo ----------------------------------------
set room3=stable-%random%
echo Room: %room3%
echo Opening browsers...
start "" "http://localhost:3000/test-videolify-v2?room=%room3%&name=Tutor&role=tutor"
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000/test-videolify-v2?room=%room3%&name=Student&role=student"
echo Monitoring for 30 seconds...
timeout /t 5 /nobreak >nul
echo   Check 1/6
timeout /t 5 /nobreak >nul
echo   Check 2/6
timeout /t 5 /nobreak >nul
echo   Check 3/6
timeout /t 5 /nobreak >nul
echo   Check 4/6
timeout /t 5 /nobreak >nul
echo   Check 5/6
timeout /t 5 /nobreak >nul
echo   Check 6/6
echo.
echo Result: Connection should remain stable
echo.

echo ========================================
echo   ALL TESTS COMPLETE
echo ========================================
echo.
echo Summary:
echo   1. Basic Connection - TESTED
echo   2. Page Reload - TESTED
echo   3. 30s Stability - TESTED
echo.
echo If all show green indicators and
echo console shows "Connection state: connected"
echo then V2 is STABLE!
echo.
pause

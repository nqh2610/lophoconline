@echo off
echo.
echo ========================================
echo   AUTO TEST: Device Switch Detection
echo ========================================
echo.

echo [1/2] Starting dev server...
start /B cmd /c "npm run dev"

echo Waiting 15 seconds for server to compile and start...
timeout /t 15 /nobreak > nul

echo.
echo [2/2] Running test...
node test-auto-simple.mjs

echo.
echo [Cleanup] Stopping server...
taskkill /F /IM node.exe > nul 2>&1

echo.
echo ========================================
echo   Test completed
echo ========================================
pause

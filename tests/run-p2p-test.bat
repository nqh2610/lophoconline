@echo off
echo ========================================
echo P2P Connectivity Auto Test Runner
echo ========================================
echo.

cd /d "%~dp0"

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Playwright is installed
if not exist "node_modules\playwright" (
    echo 📦 Installing Playwright...
    npm install playwright
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Playwright
        pause
        exit /b 1
    )
)

REM Install Playwright browsers if needed
npx playwright install chromium --yes
if %errorlevel% neq 0 (
    echo ❌ Failed to install Playwright browsers
    pause
    exit /b 1
)

echo ✅ Dependencies ready
echo.

REM Start the server in background
echo 🚀 Starting development server...
start /B cmd /C "npm run dev > server.log 2>&1"
timeout /t 5 /nobreak >nul

REM Check if server is running
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Server failed to start
    echo Check server.log for details
    pause
    exit /b 1
)

echo ✅ Server is running on http://localhost:3000
echo.

REM Run the P2P connectivity test
echo 🎯 Running P2P Connectivity Test...
node test-p2p-connectivity.mjs

REM Get the exit code
set TEST_EXIT_CODE=%errorlevel%

echo.
echo ========================================
if %TEST_EXIT_CODE% equ 0 (
    echo ✅ P2P Connectivity Test PASSED
) else (
    echo ❌ P2P Connectivity Test FAILED
)
echo ========================================

REM Stop the server
echo 🛑 Stopping server...
taskkill /f /im node.exe >nul 2>&1

pause
exit /b %TEST_EXIT_CODE%
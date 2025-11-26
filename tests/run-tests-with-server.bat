@echo off
echo Starting Next.js server...
start /B cmd /c "npm run dev > server.log 2>&1"

echo Waiting for server to start (15 seconds)...
timeout /t 15 /nobreak

echo Running tests...
node test-videolify-resilience.mjs

echo.
echo Tests completed. Press Ctrl+C in the server window to stop the server.
pause

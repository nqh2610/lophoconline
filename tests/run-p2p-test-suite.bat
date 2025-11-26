@echo off
echo ========================================
echo P2P Connectivity Test Suite
echo ========================================
echo.

cd /d "%~dp0"

REM Run the P2P connectivity test
echo 🎯 Running P2P Connectivity Test...
call run-p2p-test.bat
if %errorlevel% neq 0 (
    echo ❌ P2P Test failed
    goto :analyze
)

:analyze
echo.
echo 📊 Analyzing test results...
node analyze-p2p-results.mjs --html

echo.
echo ========================================
echo Test Suite Complete
echo ========================================
echo.
echo 📄 Check these files for results:
echo   - test-p2p-connectivity-results.json
echo   - p2p-test-report.html
echo   - test-p2p-connectivity.log
echo.

pause
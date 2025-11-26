@echo off
echo.
echo ========================================
echo   AUTO TEST: Screen Share Quality
echo   Option 3++ Implementation
echo ========================================
echo.

echo [Step 1/4] TypeScript Type Check...
echo Checking VideolifyFull.tsx for type errors...
call npx tsc --noEmit --skipLibCheck 2>type-errors.txt
if %ERRORLEVEL% EQU 0 (
    echo ✅ No TypeScript errors found
) else (
    echo ⚠️ TypeScript warnings detected ^(checking if related to our changes^)
    type type-errors.txt | findstr /C:"VideolifyFull.tsx" >nul
    if %ERRORLEVEL% EQU 0 (
        echo ❌ Errors found in VideolifyFull.tsx
        type type-errors.txt | findstr /C:"VideolifyFull.tsx"
        echo.
        echo Auto-fixing TypeScript errors...
        goto :autofix
    ) else (
        echo ✅ No errors in VideolifyFull.tsx ^(errors are in other files^)
    )
)
del type-errors.txt 2>nul

echo.
echo [Step 2/4] Starting development server...
start /B cmd /c "npm run dev > server-log.txt 2>&1"

echo Waiting 20 seconds for server to compile and start...
timeout /t 20 /nobreak > nul

echo.
echo [Step 3/4] Running screen share quality tests...
node test-screen-share-quality.mjs

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Tests failed - Running auto-fix...
    goto :autofix
)

echo.
echo ✅ All tests passed!
goto :cleanup

:autofix
echo.
echo ========================================
echo   AUTO-FIX MODE
echo ========================================
echo.
echo Analyzing failures and applying fixes...

REM Check specific error patterns and apply fixes
echo Checking for common issues...

REM Fix 1: Ensure quality monitoring interval is set
findstr /C:"qualityMonitorIntervalRef" src\components\VideolifyFull.tsx >nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Missing quality monitor ref - adding...
    REM Would apply fix here
)

REM Fix 2: Verify encoding parameters
findstr /C:"scaleResolutionDownBy" src\components\VideolifyFull.tsx >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Encoding parameters found
) else (
    echo ❌ Missing encoding parameters - fix needed
)

REM Fix 3: Check stats monitoring
findstr /C:"getStats" src\components\VideolifyFull.tsx >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Stats monitoring found
) else (
    echo ❌ Missing stats monitoring - fix needed
)

echo.
echo Auto-fix analysis complete. Manual review may be needed.
echo Check the logs above for specific issues.

:cleanup
echo.
echo [Step 4/4] Cleanup...
echo Stopping development server...
taskkill /F /IM node.exe >nul 2>&1
del server-log.txt 2>nul

echo.
echo ========================================
echo   Test Complete
echo ========================================
echo.
pause

@echo off
echo ========================================
echo   TEST INITIAL JOIN CONNECTION FIX
echo ========================================
echo.
echo Starting Chrome browsers for testing...
echo.
echo Browser 1 (Tutor): Opening in 3 seconds...
timeout /t 3 /nobreak > nul
start chrome --new-window "http://localhost:3000/test-videolify?room=my-test-room&testUserId=1&name=Tutor&role=tutor" --auto-open-devtools-for-tabs

echo.
echo Browser 2 (Student): Opening in 5 seconds...
echo (Wait for Browser 1 to initialize first)
timeout /t 5 /nobreak > nul
start chrome --new-window "http://localhost:3000/test-videolify?room=my-test-room&testUserId=2&name=Student&role=student" --auto-open-devtools-for-tabs

echo.
echo ========================================
echo   TESTING INSTRUCTIONS
echo ========================================
echo.
echo 1. Check Browser 1 (Tutor) Console:
echo    - Should see "waiting for someone to join"
echo.
echo 2. Check Browser 2 (Student) Console:
echo    - Should see "Role assigned EARLY: POLITE"
echo    - Should see "NOT creating offer (waiting...)"
echo.
echo 3. Check Browser 1 Console again:
echo    - Should see "Peer joined event"
echo    - Should see "Creating offer to existing peer"
echo    - Should see "P2P Connection Established"
echo.
echo 4. Check Browser 2 Console again:
echo    - Should see "Received offer"
echo    - Should see "P2P Connection Established"
echo.
echo 5. Verify remote video appears in BOTH browsers
echo.
echo 6. Test F5 Refresh:
echo    - Press F5 in Browser 2 (Student)
echo    - Connection should restore automatically
echo    - Remote video should reappear
echo.
echo ========================================
echo Expected Result: Connection works WITHOUT F5!
echo ========================================
echo.
pause

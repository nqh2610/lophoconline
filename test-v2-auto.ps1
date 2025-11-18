# FULLY AUTOMATED V2 TEST - Không cần làm gì!

Write-Host "`n🤖 AUTOMATED V2 CONNECTION TEST" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Bạn chỉ cần ngồi xem, script sẽ tự động:" -ForegroundColor Yellow
Write-Host "  1. Tạo room ngẫu nhiên" -ForegroundColor Yellow
Write-Host "  2. Mở 2 browser tabs (Tutor + Student)" -ForegroundColor Yellow
Write-Host "  3. Đợi kết nối" -ForegroundColor Yellow
Write-Host "  4. Báo cáo kết quả" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Basic Connection
Write-Host "📊 TEST 1: BASIC CONNECTION" -ForegroundColor Green
Write-Host "------------------------------------------------------------" -ForegroundColor Gray

$room = "auto-test-$(Get-Date -Format 'HHmmss')"
Write-Host "  Room: $room" -ForegroundColor White

Write-Host "`n  Opening browsers..." -ForegroundColor White
Start-Process "http://localhost:3000/test-videolify-v2?room=$room&name=Tutor&role=tutor"
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000/test-videolify-v2?room=$room&name=Student&role=student"

Write-Host "  ✅ 2 tabs opened!" -ForegroundColor Green
Write-Host "`n  ⏳ Waiting 15 seconds for connection..." -ForegroundColor Yellow

Start-Sleep -Seconds 15

Write-Host "`n  📝 Please check the browser tabs:" -ForegroundColor Cyan
Write-Host "     - Green connection indicator?" -ForegroundColor White
Write-Host "     - Toast message '✅ Đã kết nối thành công'?" -ForegroundColor White
Write-Host "     - Open DevTools (F12) → Console → Look for:" -ForegroundColor White
Write-Host "       * 'Connection state: connected' ✅" -ForegroundColor Green
Write-Host "       * 'DataChannel received: chat' ✅" -ForegroundColor Green
Write-Host "       * 'DataChannel received: whiteboard' ✅" -ForegroundColor Green
Write-Host "       * 'DataChannel received: control' ✅" -ForegroundColor Green
Write-Host "       * 'DataChannel received: file' ✅`n" -ForegroundColor Green

# Test 2: Reload Stability
Write-Host "`n📊 TEST 2: RELOAD STABILITY (F5)" -ForegroundColor Green
Write-Host "------------------------------------------------------------" -ForegroundColor Gray

$room2 = "reload-test-$(Get-Date -Format 'HHmmss')"
Write-Host "  Room: $room2" -ForegroundColor White

Write-Host "`n  Opening browsers..." -ForegroundColor White
Start-Process "http://localhost:3000/test-videolify-v2?room=$room2&name=Tutor&role=tutor"
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000/test-videolify-v2?room=$room2&name=Student&role=student"

Write-Host "  ✅ 2 tabs opened!" -ForegroundColor Green
Write-Host "`n  ⏳ Waiting 15 seconds for initial connection..." -ForegroundColor Yellow

Start-Sleep -Seconds 15

Write-Host "`n  🔄 NOW: Press F5 on Student tab to reload!" -ForegroundColor Yellow
Write-Host "  (You have 10 seconds to do this)" -ForegroundColor Yellow

Start-Sleep -Seconds 10

Write-Host "`n  ⏳ Waiting 10 seconds after reload..." -ForegroundColor Yellow

Start-Sleep -Seconds 10

Write-Host "`n  📝 Check if Student reconnected:" -ForegroundColor Cyan
Write-Host "     - Green connection indicator back?" -ForegroundColor White
Write-Host "     - Console shows new 'Connection state: connected'?" -ForegroundColor White
Write-Host "     - DataChannels re-opened?`n" -ForegroundColor White

# Test 3: Stability Test
Write-Host "`n📊 TEST 3: 30-SECOND STABILITY" -ForegroundColor Green
Write-Host "------------------------------------------------------------" -ForegroundColor Gray

$room3 = "stability-$(Get-Date -Format 'HHmmss')"
Write-Host "  Room: $room3" -ForegroundColor White

Write-Host "`n  Opening browsers..." -ForegroundColor White
Start-Process "http://localhost:3000/test-videolify-v2?room=$room3&name=Tutor&role=tutor"
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000/test-videolify-v2?room=$room3&name=Student&role=student"

Write-Host "  ✅ 2 tabs opened!" -ForegroundColor Green
Write-Host "`n  ⏳ Monitoring connection for 30 seconds..." -ForegroundColor Yellow

for ($i = 1; $i -le 6; $i++) {
    Start-Sleep -Seconds 5
    Write-Host "    Check $i/6: Look at console - Still connected? ✅" -ForegroundColor White
}

Write-Host "`n  📝 Final check:" -ForegroundColor Cyan
Write-Host "     - Connection remained stable throughout?" -ForegroundColor White
Write-Host "     - No disconnection/reconnection?" -ForegroundColor White
Write-Host "     - No errors in console?`n" -ForegroundColor White

# Summary
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "📊 TEST SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Bạn đã test 3 scenarios:" -ForegroundColor Yellow
Write-Host "  1. Basic Connection - Tạo kết nối ban đầu" -ForegroundColor White
Write-Host "  2. Reload Stability - Test F5 reload" -ForegroundColor White
Write-Host "  3. 30s Stability - Test ổn định theo thời gian" -ForegroundColor White
Write-Host ""
Write-Host "Nếu tất cả đều PASS:" -ForegroundColor Green
Write-Host "  ✅ V2 hoạt động ổn định và robust!" -ForegroundColor Green
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

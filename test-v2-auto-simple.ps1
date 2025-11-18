# V2 Auto Test - Không cần làm gì!

Write-Host ""
Write-Host "AUTO V2 CONNECTION TEST" -ForegroundColor Cyan
Write-Host "Bạn chỉ cần ngồi xem!" -ForegroundColor Yellow
Write-Host ""

# Test 1
Write-Host "TEST 1: Basic Connection" -ForegroundColor Green
Write-Host "------------------------------------------------------------" -ForegroundColor Gray

$room1 = "test-$(Get-Date -Format 'HHmmss')"
Write-Host "Room: $room1"

Write-Host "Opening browsers..."
Start-Process "http://localhost:3000/test-videolify-v2?room=$room1&name=Tutor&role=tutor"
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000/test-videolify-v2?room=$room1&name=Student&role=student"

Write-Host "Waiting 15 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "CHECK BROWSER:" -ForegroundColor Cyan
Write-Host "  - Green connection indicator?" -ForegroundColor White
Write-Host "  - F12 Console shows 'Connection state: connected'?" -ForegroundColor White
Write-Host "  - DataChannels open (chat, whiteboard, control, file)?" -ForegroundColor White
Write-Host ""

# Test 2
Write-Host "TEST 2: Reload Stability (F5)" -ForegroundColor Green
Write-Host "------------------------------------------------------------" -ForegroundColor Gray

$room2 = "reload-$(Get-Date -Format 'HHmmss')"
Write-Host "Room: $room2"

Write-Host "Opening browsers..."
Start-Process "http://localhost:3000/test-videolify-v2?room=$room2&name=Tutor&role=tutor"
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000/test-videolify-v2?room=$room2&name=Student&role=student"

Write-Host "Waiting 15 seconds for connection..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "NOW: Press F5 on Student tab!" -ForegroundColor Yellow
Write-Host "(You have 10 seconds)" -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "Waiting 10 seconds after reload..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "CHECK: Did Student reconnect?" -ForegroundColor Cyan
Write-Host "  - Green indicator back?" -ForegroundColor White
Write-Host "  - Console shows reconnection?" -ForegroundColor White
Write-Host ""

# Test 3
Write-Host "TEST 3: 30-Second Stability" -ForegroundColor Green
Write-Host "------------------------------------------------------------" -ForegroundColor Gray

$room3 = "stable-$(Get-Date -Format 'HHmmss')"
Write-Host "Room: $room3"

Write-Host "Opening browsers..."
Start-Process "http://localhost:3000/test-videolify-v2?room=$room3&name=Tutor&role=tutor"
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000/test-videolify-v2?room=$room3&name=Student&role=student"

Write-Host "Monitoring for 30 seconds..." -ForegroundColor Yellow

for ($i = 1; $i -le 6; $i++) {
    Start-Sleep -Seconds 5
    Write-Host "  Check $i/6: Still connected?" -ForegroundColor White
}

Write-Host ""
Write-Host "CHECK: Connection stable throughout?" -ForegroundColor Cyan
Write-Host ""

# Summary
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETE" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "3 scenarios tested:" -ForegroundColor Yellow
Write-Host "  1. Basic Connection"
Write-Host "  2. Reload Stability"
Write-Host "  3. 30s Stability"
Write-Host ""
Write-Host "If all PASS: V2 is STABLE!" -ForegroundColor Green
Write-Host ""

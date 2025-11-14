# Automated test runner for Videolify resilience tests
Write-Host "🚀 Starting automated test process..." -ForegroundColor Cyan

# Kill any existing Node processes on port 3000
Write-Host "`n🔍 Checking for existing processes on port 3000..." -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "⚠️ Found existing process on port 3000, terminating..." -ForegroundColor Yellow
    $processId = $port3000.OwningProcess
    Stop-Process -Id $processId -Force
    Start-Sleep -Seconds 2
}

# Start Next.js server in background
Write-Host "`n📡 Starting Next.js server..." -ForegroundColor Cyan
$serverJob = Start-Job -ScriptBlock {
    Set-Location "E:\LopHocTrucTuyen"
    npm run dev
}

# Wait for server to be ready
Write-Host "⏳ Waiting for server to start (checking port 3000)..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$serverReady = $false

while ($attempt -lt $maxAttempts -and -not $serverReady) {
    Start-Sleep -Seconds 1
    $attempt++
    
    try {
        $connection = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
        if ($connection) {
            $serverReady = $true
            Write-Host "✅ Server is ready on port 3000!" -ForegroundColor Green
        } else {
            Write-Host "  Attempt $attempt/$maxAttempts..." -NoNewline
            Write-Host " (waiting)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  Attempt $attempt/$maxAttempts..." -NoNewline
        Write-Host " (waiting)" -ForegroundColor Gray
    }
}

if (-not $serverReady) {
    Write-Host "`n❌ Server failed to start after 30 seconds" -ForegroundColor Red
    Stop-Job -Job $serverJob
    Remove-Job -Job $serverJob
    exit 1
}

# Give server extra time to fully initialize
Write-Host "⏳ Waiting 5 more seconds for full initialization..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Run tests
Write-Host "`n🧪 Running Videolify resilience tests..." -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Gray

node test-videolify-resilience.mjs

$testExitCode = $LASTEXITCODE

# Cleanup
Write-Host "`n🧹 Cleaning up..." -ForegroundColor Yellow
Stop-Job -Job $serverJob
Remove-Job -Job $serverJob

# Kill the server process
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    $processId = $port3000.OwningProcess
    Stop-Process -Id $processId -Force
    Write-Host "✅ Server stopped" -ForegroundColor Green
}

# Final report
Write-Host "`n" + "=" * 80 -ForegroundColor Cyan
if ($testExitCode -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED!" -ForegroundColor Green
} else {
    Write-Host "⚠️ SOME TESTS FAILED - Check test-report.html for details" -ForegroundColor Yellow
}
Write-Host "=" * 80 -ForegroundColor Cyan

Write-Host "`n📄 Test report available at: test-report.html" -ForegroundColor Cyan

exit $testExitCode

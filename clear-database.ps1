# PowerShell script to clear the database
Write-Host "🧹 Clearing database..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/pvp/debug/clear-database" -Method POST -ContentType "application/json"
    
    Write-Host "✅ Success: $($response.message)" -ForegroundColor Green
    Write-Host "🕒 Timestamp: $($response.timestamp)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Make sure the server is running on http://localhost:3000" -ForegroundColor Yellow
}

Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
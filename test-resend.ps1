# Test Resend API Connection
# This script tests if your Resend API key is valid and working

$apiKey = "re_J3twgvYc_8YnpY2bWBswovYouPqBWcr4P"
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

Write-Host "🔍 Testing Resend API Connection..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Check API Key by listing domains
Write-Host "Test 1: Checking API key validity..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://api.resend.com/domains" -Method GET -Headers $headers
    Write-Host "✅ API Key is valid!" -ForegroundColor Green
    Write-Host "📋 Your domains:" -ForegroundColor Cyan
    $response.data | ForEach-Object {
        Write-Host "  - $($_.name) (Status: $($_.status))" -ForegroundColor White
    }
} catch {
    Write-Host "❌ API Key test failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Send a test email
Write-Host "Test 2: Sending test email..." -ForegroundColor Yellow
$testEmail = @{
    from = "team@zimcrowd.com"
    to = @("test@example.com")
    subject = "Resend API Test"
    html = "<h1>Test Email</h1><p>This is a test email from ZimCrowd to verify Resend integration.</p>"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.resend.com/emails" -Method POST -Headers $headers -Body $testEmail
    Write-Host "✅ Test email sent successfully!" -ForegroundColor Green
    Write-Host "📧 Email ID: $($response.id)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Test email failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Details: $($errorDetails.message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🏁 Test completed!" -ForegroundColor Cyan

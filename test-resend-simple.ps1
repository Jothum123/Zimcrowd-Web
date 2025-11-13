# Test Resend API Connection
$apiKey = "re_J3twgvYc_8YnpY2bWBswovYouPqBWcr4P"
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

Write-Host "Testing Resend API Connection..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Check API Key
Write-Host "Test 1: Checking API key validity..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://api.resend.com/domains" -Method GET -Headers $headers
    Write-Host "[SUCCESS] API Key is valid!" -ForegroundColor Green
    Write-Host "Your domains:" -ForegroundColor Cyan
    foreach ($domain in $response.data) {
        Write-Host "  - $($domain.name) (Status: $($domain.status))" -ForegroundColor White
    }
}
catch {
    Write-Host "[FAILED] API Key test failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Send test email
Write-Host "Test 2: Sending test email..." -ForegroundColor Yellow
$testEmailBody = @{
    from = "team@zimcrowd.com"
    to = @("test@example.com")
    subject = "Resend API Test"
    html = "<h1>Test Email</h1><p>This is a test email from ZimCrowd.</p>"
} | ConvertTo-Json

try {
    $emailResponse = Invoke-RestMethod -Uri "https://api.resend.com/emails" -Method POST -Headers $headers -Body $testEmailBody
    Write-Host "[SUCCESS] Test email sent!" -ForegroundColor Green
    Write-Host "Email ID: $($emailResponse.id)" -ForegroundColor Cyan
}
catch {
    Write-Host "[FAILED] Test email failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        try {
            $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "Details: $($errorDetails.message)" -ForegroundColor Red
        }
        catch {
            Write-Host "Raw error: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Test completed!" -ForegroundColor Cyan

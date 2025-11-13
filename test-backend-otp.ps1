# Test Backend Email OTP Endpoint
param(
    [Parameter(Mandatory=$false)]
    [string]$Email = "test@example.com"
)

$backendUrl = "https://zimcrowd-backend.vercel.app/api/email-auth"

Write-Host "Testing Backend Email OTP Endpoints..." -ForegroundColor Cyan
Write-Host "Backend: $backendUrl" -ForegroundColor White
Write-Host "Email: $Email" -ForegroundColor White
Write-Host ""

# Test 1: Register Email (Send OTP)
Write-Host "Test 1: Sending signup OTP..." -ForegroundColor Yellow

$signupData = @{
    firstName = "Test"
    lastName = "User"
    email = $Email
    password = "Test123!"
    country = "Zimbabwe"
    city = "Harare"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "$backendUrl/register-email" -Method POST -Headers $headers -Body $signupData
    Write-Host "[SUCCESS] Signup OTP sent!" -ForegroundColor Green
    Write-Host "Message: $($response.message)" -ForegroundColor Cyan
    Write-Host "Temp Token: $($response.tempToken.Substring(0, 50))..." -ForegroundColor Gray
    Write-Host ""
    
    # Save temp token for verification test
    $global:tempToken = $response.tempToken
}
catch {
    Write-Host "[FAILED] Signup OTP failed!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        try {
            $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "Error: $($errorDetails.message)" -ForegroundColor Red
        }
        catch {
            Write-Host "Raw error: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""

# Test 2: Forgot Password (Send Reset OTP)
Write-Host "Test 2: Sending password reset OTP..." -ForegroundColor Yellow

$resetData = @{
    email = $Email
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$backendUrl/forgot-password-email" -Method POST -Headers $headers -Body $resetData
    Write-Host "[SUCCESS] Password reset OTP sent!" -ForegroundColor Green
    Write-Host "Message: $($response.message)" -ForegroundColor Cyan
}
catch {
    Write-Host "[FAILED] Password reset OTP failed!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        try {
            $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "Error: $($errorDetails.message)" -ForegroundColor Red
        }
        catch {
            Write-Host "Raw error: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Test completed!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Check your email inbox at: $Email" -ForegroundColor White
Write-Host "2. You should receive 2 emails (signup OTP and password reset OTP)" -ForegroundColor White
Write-Host "3. Use the OTP codes to verify the emails work correctly" -ForegroundColor White

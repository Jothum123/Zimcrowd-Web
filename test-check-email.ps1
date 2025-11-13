# Check if email exists in database
param(
    [Parameter(Mandatory=$true)]
    [string]$Email
)

Write-Host "Checking if email exists in database..." -ForegroundColor Cyan
Write-Host "Email: $Email" -ForegroundColor White
Write-Host ""

# Note: This requires direct database access or a backend endpoint
# For now, we'll test by attempting a login

$backendUrl = "https://zimcrowd-backend.vercel.app/api/email-auth"
$headers = @{
    "Content-Type" = "application/json"
}

# Try to request password reset - if email doesn't exist, it will still return success
# (for security reasons, to not reveal if email is registered)

Write-Host "Testing password reset request..." -ForegroundColor Yellow

$resetRequest = @{
    email = $Email
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$backendUrl/forgot-password-email" -Method POST -Headers $headers -Body $resetRequest
    Write-Host "[INFO] Password reset endpoint response:" -ForegroundColor Cyan
    Write-Host "  Message: $($response.message)" -ForegroundColor White
    Write-Host ""
    Write-Host "Note: For security, the endpoint doesn't reveal if email exists." -ForegroundColor Yellow
    Write-Host "Check your email inbox to confirm if OTP was sent." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "If you receive an OTP, the email is registered." -ForegroundColor White
    Write-Host "If you don't receive an OTP, the email is NOT registered." -ForegroundColor White
}
catch {
    Write-Host "[ERROR] Request failed!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
}

Write-Host ""
Write-Host "To register this email, visit:" -ForegroundColor Cyan
Write-Host "https://www.zimcrowd.com/signup.html" -ForegroundColor White

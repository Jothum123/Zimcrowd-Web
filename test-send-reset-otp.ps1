# Send Password Reset OTP
param(
    [Parameter(Mandatory=$true)]
    [string]$Email
)

$backendUrl = "https://zimcrowd-backend.vercel.app/api/email-auth"

Write-Host "Sending Password Reset OTP..." -ForegroundColor Cyan
Write-Host "Email: $Email" -ForegroundColor White
Write-Host ""

$headers = @{
    "Content-Type" = "application/json"
}

$resetRequest = @{
    email = $Email
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$backendUrl/forgot-password-email" -Method POST -Headers $headers -Body $resetRequest
    Write-Host "[SUCCESS] Password reset OTP sent!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    Write-Host "  Message: $($response.message)" -ForegroundColor White
    Write-Host "  Email: $($response.email)" -ForegroundColor White
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  CHECK YOUR EMAIL INBOX!" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Subject: 'ZimCrowd Password Reset'" -ForegroundColor White
    Write-Host "From: team@zimcrowd.com" -ForegroundColor White
    Write-Host "Contains: 6-digit OTP code" -ForegroundColor White
    Write-Host "Valid for: 10 minutes" -ForegroundColor White
    Write-Host ""
    Write-Host "Next step: Run the full flow test with the OTP" -ForegroundColor Cyan
    Write-Host "Command: powershell -ExecutionPolicy Bypass -File test-password-reset-flow.ps1 -Email '$Email'" -ForegroundColor Gray
}
catch {
    Write-Host "[FAILED] Failed to send reset OTP!" -ForegroundColor Red
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

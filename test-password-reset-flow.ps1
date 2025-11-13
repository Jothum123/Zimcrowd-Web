# Complete Password Reset Flow Test
param(
    [Parameter(Mandatory=$true)]
    [string]$Email
)

$backendUrl = "https://zimcrowd-backend.vercel.app/api/email-auth"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PASSWORD RESET FLOW TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Email: $Email" -ForegroundColor White
Write-Host "Backend: $backendUrl" -ForegroundColor Gray
Write-Host ""

$headers = @{
    "Content-Type" = "application/json"
}

# Step 1: Request Password Reset OTP
Write-Host "STEP 1: Requesting password reset OTP..." -ForegroundColor Yellow
Write-Host "Endpoint: POST /forgot-password-email" -ForegroundColor Gray

$resetRequest = @{
    email = $Email
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$backendUrl/forgot-password-email" -Method POST -Headers $headers -Body $resetRequest
    Write-Host "[SUCCESS] Password reset OTP sent!" -ForegroundColor Green
    Write-Host "Message: $($response.message)" -ForegroundColor Cyan
    Write-Host "Masked Email: $($response.email)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "CHECK YOUR EMAIL INBOX NOW!" -ForegroundColor Yellow -BackgroundColor DarkRed
    Write-Host ""
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
    exit 1
}

# Step 2: Wait for user to get OTP
Write-Host "Waiting for OTP from email..." -ForegroundColor Yellow
$otp = Read-Host "Enter the 6-digit OTP you received"

if ($otp.Length -ne 6 -or $otp -notmatch '^\d{6}$') {
    Write-Host "[ERROR] Invalid OTP format. Must be 6 digits." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Verify OTP
Write-Host "STEP 2: Verifying OTP..." -ForegroundColor Yellow
Write-Host "Endpoint: POST /verify-email-otp" -ForegroundColor Gray

$verifyRequest = @{
    email = $Email
    otp = $otp
    type = "reset"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$backendUrl/verify-email-otp" -Method POST -Headers $headers -Body $verifyRequest
    Write-Host "[SUCCESS] OTP verified successfully!" -ForegroundColor Green
    Write-Host "Message: $($response.message)" -ForegroundColor Cyan
    Write-Host ""
}
catch {
    Write-Host "[FAILED] OTP verification failed!" -ForegroundColor Red
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
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "- OTP expired (valid for 10 minutes)" -ForegroundColor White
    Write-Host "- OTP already used" -ForegroundColor White
    Write-Host "- Incorrect OTP entered" -ForegroundColor White
    exit 1
}

# Step 4: Reset Password
Write-Host "STEP 3: Resetting password..." -ForegroundColor Yellow
Write-Host "Endpoint: POST /reset-password-email" -ForegroundColor Gray

$newPassword = Read-Host "Enter new password (min 8 chars, 1 uppercase, 1 lowercase, 1 number)" -AsSecureString
$newPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($newPassword))

# Validate password
if ($newPasswordPlain.Length -lt 8) {
    Write-Host "[ERROR] Password must be at least 8 characters long" -ForegroundColor Red
    exit 1
}
if ($newPasswordPlain -notmatch '[A-Z]') {
    Write-Host "[ERROR] Password must contain at least one uppercase letter" -ForegroundColor Red
    exit 1
}
if ($newPasswordPlain -notmatch '[a-z]') {
    Write-Host "[ERROR] Password must contain at least one lowercase letter" -ForegroundColor Red
    exit 1
}
if ($newPasswordPlain -notmatch '\d') {
    Write-Host "[ERROR] Password must contain at least one number" -ForegroundColor Red
    exit 1
}

$resetPassword = @{
    email = $Email
    otp = $otp
    newPassword = $newPasswordPlain
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$backendUrl/reset-password-email" -Method POST -Headers $headers -Body $resetPassword
    Write-Host "[SUCCESS] Password reset successfully!" -ForegroundColor Green
    Write-Host "Message: $($response.message)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  PASSWORD RESET COMPLETE!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now login with your new password." -ForegroundColor White
}
catch {
    Write-Host "[FAILED] Password reset failed!" -ForegroundColor Red
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
    exit 1
}

Write-Host ""
Write-Host "Test completed successfully!" -ForegroundColor Cyan

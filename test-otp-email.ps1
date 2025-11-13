# Test OTP Email Sending
param(
    [Parameter(Mandatory=$false)]
    [string]$ToEmail = "test@example.com"
)

$apiKey = "re_J3twgvYc_8YnpY2bWBswovYouPqBWcr4P"
$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

# Generate random 6-digit OTP
$otp = Get-Random -Minimum 100000 -Maximum 999999

Write-Host "Sending OTP Email Test..." -ForegroundColor Cyan
Write-Host "To: $ToEmail" -ForegroundColor White
Write-Host "OTP: $otp" -ForegroundColor Yellow
Write-Host ""

# Create OTP email HTML
$htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZimCrowd Verification</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f8f9fa;">
    <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #38e07b; margin: 0; font-size: 24px;">ZimCrowd</h1>
            <p style="color: #666; margin: 5px 0 0 0;">Email Verification</p>
        </div>

        <p style="color: #333; margin-bottom: 20px;">Welcome! Your verification code is:</p>

        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 36px; font-weight: bold; color: #38e07b; letter-spacing: 8px; background: #f0f9ff; padding: 15px 30px; border-radius: 8px; display: inline-block;">$otp</span>
        </div>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This code expires in 10 minutes. If you didn't request this, please ignore this email.
        </p>
    </div>
</body>
</html>
"@

$emailBody = @{
    from = "team@zimcrowd.com"
    to = @($ToEmail)
    subject = "Your ZimCrowd Verification Code"
    html = $htmlContent
    text = "ZimCrowd Verification Code: $otp`n`nThis code expires in 10 minutes."
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri "https://api.resend.com/emails" -Method POST -Headers $headers -Body $emailBody
    Write-Host "[SUCCESS] OTP email sent successfully!" -ForegroundColor Green
    Write-Host "Email ID: $($response.id)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Check your inbox at: $ToEmail" -ForegroundColor Yellow
}
catch {
    Write-Host "[FAILED] Failed to send OTP email!" -ForegroundColor Red
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

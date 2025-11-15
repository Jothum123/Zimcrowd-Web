# Railway Deployment Script for ZimCrowd API

Write-Host "🚂 ZimCrowd Railway Deployment" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check if Railway CLI is installed
Write-Host "Checking Railway CLI..." -ForegroundColor Yellow
$railwayInstalled = Get-Command railway -ErrorAction SilentlyContinue

if (-not $railwayInstalled) {
    Write-Host "❌ Railway CLI not found. Installing..." -ForegroundColor Red
    npm install -g @railway/cli
    Write-Host "✅ Railway CLI installed`n" -ForegroundColor Green
} else {
    Write-Host "✅ Railway CLI found`n" -ForegroundColor Green
}

# Login check
Write-Host "Checking Railway login status..." -ForegroundColor Yellow
railway whoami 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Not logged in. Opening login..." -ForegroundColor Yellow
    railway login
} else {
    Write-Host "✅ Already logged in`n" -ForegroundColor Green
}

# Deploy
Write-Host "`n🚀 Deploying to Railway..." -ForegroundColor Cyan
railway up

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment successful!" -ForegroundColor Green
    
    # Get domain
    Write-Host "`n📡 Getting your API URL..." -ForegroundColor Yellow
    railway domain
    
    Write-Host "`n🎉 Deployment Complete!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "1. Set environment variables: railway variables set KEY=VALUE"
    Write-Host "2. View logs: railway logs"
    Write-Host "3. Open dashboard: railway open"
    Write-Host "4. Test health: curl https://your-url.railway.app/api/health`n"
} else {
    Write-Host "`n❌ Deployment failed. Check logs: railway logs" -ForegroundColor Red
}

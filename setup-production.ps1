# ZimCrowd Production Setup Script
# Run this script to set up your production environment quickly

Write-Host "🚀 ZimCrowd Production Setup" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Green

# Check if .env file exists
if (!(Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please create a .env file with your Supabase credentials.`n" -ForegroundColor Yellow
    Write-Host "Required variables:" -ForegroundColor Yellow
    Write-Host "  - SUPABASE_URL" -ForegroundColor Yellow
    Write-Host "  - SUPABASE_ANON_KEY" -ForegroundColor Yellow
    Write-Host "  - SUPABASE_SERVICE_KEY" -ForegroundColor Yellow
    Write-Host "  - JWT_SECRET`n" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found .env file`n" -ForegroundColor Green

# Step 1: Install dependencies
Write-Host "📦 Step 1: Installing dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed`n" -ForegroundColor Green

# Step 2: Database setup instructions
Write-Host "🗄️  Step 2: Database Setup" -ForegroundColor Cyan
Write-Host "Please complete these steps in Supabase:" -ForegroundColor Yellow
Write-Host "  1. Go to https://supabase.com/dashboard" -ForegroundColor Yellow
Write-Host "  2. Select your project" -ForegroundColor Yellow
Write-Host "  3. Click 'SQL Editor'" -ForegroundColor Yellow
Write-Host "  4. Copy and paste the contents of 'database/schema.sql'" -ForegroundColor Yellow
Write-Host "  5. Click 'Run'`n" -ForegroundColor Yellow

$continue = Read-Host "Have you completed the database setup? (y/n)"
if ($continue -ne "y") {
    Write-Host "❌ Setup cancelled. Please complete database setup first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Database schema applied`n" -ForegroundColor Green

# Step 3: Seed database
Write-Host "🌱 Step 3: Seeding database with initial data..." -ForegroundColor Cyan
node database/seed-data.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to seed database" -ForegroundColor Red
    Write-Host "Please check your Supabase credentials in .env file" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Database seeded successfully`n" -ForegroundColor Green

# Step 4: Test backend locally
Write-Host "🧪 Step 4: Testing backend..." -ForegroundColor Cyan
Write-Host "Starting backend server on port 3000..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server when ready`n" -ForegroundColor Yellow

Start-Process -FilePath "node" -ArgumentList "backend-server.js" -NoNewWindow

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Test the backend at http://localhost:3000" -ForegroundColor Yellow
Write-Host "  2. Open dashboard-demo.html to test with real data" -ForegroundColor Yellow
Write-Host "  3. Deploy to Vercel: vercel --prod" -ForegroundColor Yellow
Write-Host "  4. Add environment variables to Vercel dashboard`n" -ForegroundColor Yellow

Write-Host "📖 For detailed instructions, see PRODUCTION-DEPLOYMENT-GUIDE.md`n" -ForegroundColor Cyan

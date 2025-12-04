@echo off
echo 🚀 Deploying ZimCrowd Admin Dashboard to Production...
echo.

echo ✅ Step 1: Starting production server...
start /B node backend-server.js

echo ✅ Step 2: Waiting for server to initialize...
timeout /t 5 /nobreak >nul

echo ✅ Step 3: Opening admin dashboard in browser...
start http://localhost:3001/admin-dashboard-complete.html

echo.
echo 🎉 Admin Dashboard deployed successfully!
echo 📍 URL: http://localhost:3001/admin-dashboard-complete.html
echo 🔑 Admin API Key: zimcrowd-admin-f0ed42f52b092b49ecf3eaa070aee9bc
echo.
echo 📋 Features Available:
echo    • Real-time dashboard overview
echo    • KYC review and approval
echo    • Account status management
echo    • User management with details
echo    • Manual transactions processing
echo    • Wallet monitoring
echo    • Role-based access control
echo    • Audit logs and analytics
echo.
echo 🌐 For production deployment, deploy to: https://admin.zimcrowd.com
echo.

pause

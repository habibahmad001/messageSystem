@echo off
REM WhatsApp Gateway - Fly.io Quick Deploy Script for Windows
REM This script automates the deployment to Fly.io

echo ========================================
echo WhatsApp Gateway - Fly.io Deployment
echo ========================================
echo.

REM Check if flyctl is installed
where flyctl >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ flyctl not found. Installing...
    powershell -Command "iwr https://fly.io/install.ps1 | iex"
    echo ✅ flyctl installed. Please restart your terminal and run this script again.
    pause
    exit /b 1
)

REM Check if user is logged in
echo 📝 Checking Fly.io authentication...
flyctl auth whoami >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 🔐 Please login to Fly.io:
    flyctl auth login
)

REM Navigate to project directory
echo 📁 Navigating to project directory...
cd /d "%~dp0"

REM Launch app
echo 🚀 Launching app on Fly.io...
flyctl launch

REM Deploy app
echo 🚀 Deploying app...
flyctl deploy

REM Get app info
echo ✅ Deployment complete!
echo 📊 App info:
flyctl info

echo.
echo 🎉 Check the Fly.io dashboard for your app URL!
echo 📖 Read FLY_DEPLOYMENT.md for detailed instructions
echo.
echo ⚠️  Don't forget to:
echo    1. Create a MySQL database: flyctl mysql create
echo    2. Set environment variables for database connection
echo    3. Set your KEY environment variable
echo.
pause
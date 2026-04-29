#!/bin/bash

# WhatsApp Gateway - Fly.io Quick Deploy Script
# This script automates the deployment to Fly.io

echo "🚀 WhatsApp Gateway - Fly.io Deployment"
echo "=========================================="

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl not found. Installing..."
    curl -L https://fly.io/install.sh | sh
    echo "✅ flyctl installed. Please restart your terminal and run this script again."
    exit 1
fi

# Check if user is logged in
echo "📝 Checking Fly.io authentication..."
if ! flyctl auth whoami &> /dev/null; then
    echo "🔐 Please login to Fly.io:"
    flyctl auth login
fi

# Navigate to project directory
echo "📁 Navigating to project directory..."
cd "$(dirname "$0")"

# Launch app
echo "🚀 Launching app on Fly.io..."
flyctl launch

# Get app name
APP_NAME=$(grep -E "^app = " fly.toml | sed 's/app = "//' | sed 's/"//')
echo "📝 App name: $APP_NAME"

# Create MySQL database
echo "🗄️  Creating MySQL database..."
flyctl mysql create

# Get database details
echo "🔗 Getting database connection details..."
DB_INFO=$(flyctl mysql status -a ${APP_NAME}-mysql)

# Extract connection details (you'll need to update these manually)
echo "⚠️  Please set these environment variables:"
echo "flyctl secrets set DB_HOST=mysql.fly.io DB_PORT=3306 DB_USER=root DB_PASSWORD=your_password DB_NAME=your_database KEY=your_secure_key -a $APP_NAME"

# Deploy app
echo "🚀 Deploying app..."
flyctl deploy

# Get app info
echo "✅ Deployment complete!"
echo "📊 App info:"
flyctl info -a $APP_NAME

echo ""
echo "🎉 Your WhatsApp Gateway is now live on Fly.io!"
echo "📖 Check FLY_DEPLOYMENT.md for detailed instructions"
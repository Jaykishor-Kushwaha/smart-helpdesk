#!/bin/bash

# Smart Helpdesk Deployment Script
# Usage: ./deploy.sh [platform]
# Platforms: railway, vercel, docker, aws

set -e

PLATFORM=${1:-railway}
PROJECT_NAME="smart-helpdesk"

echo "🚀 Deploying Smart Helpdesk to $PLATFORM..."

case $PLATFORM in
  "railway")
    echo "📡 Deploying to Railway..."
    
    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
      echo "❌ Railway CLI not found. Installing..."
      npm install -g @railway/cli
    fi
    
    # Login and deploy
    echo "🔐 Please login to Railway..."
    railway login
    
    # Initialize project if needed
    if [ ! -f "railway.toml" ]; then
      railway init
    fi
    
    # Deploy
    railway up
    echo "✅ Deployed to Railway!"
    ;;
    
  "vercel")
    echo "🔺 Deploying frontend to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
      echo "❌ Vercel CLI not found. Installing..."
      npm install -g vercel
    fi
    
    # Deploy frontend
    cd client
    vercel --prod
    cd ..
    echo "✅ Frontend deployed to Vercel!"
    echo "⚠️  Don't forget to deploy the backend separately!"
    ;;
    
  "docker")
    echo "🐳 Building and running with Docker..."
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
      echo "❌ .env.production not found. Please copy from .env.production.example"
      exit 1
    fi
    
    # Build and run
    docker-compose -f docker-compose.prod.yml --env-file .env.production up --build -d
    echo "✅ Deployed with Docker!"
    echo "🌐 Access at: http://localhost"
    ;;
    
  "aws")
    echo "☁️  Deploying to AWS..."
    echo "⚠️  AWS deployment requires additional setup. Please refer to the README."
    echo "📖 See: https://docs.aws.amazon.com/ecs/latest/developerguide/"
    ;;
    
  *)
    echo "❌ Unknown platform: $PLATFORM"
    echo "Available platforms: railway, vercel, docker, aws"
    exit 1
    ;;
esac

echo ""
echo "🎉 Deployment complete!"
echo "📚 Check the README for post-deployment steps."

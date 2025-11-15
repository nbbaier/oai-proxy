#!/bin/bash

# OpenAI Usage Tracker - Cloudflare Worker Setup Script
# This script helps automate the initial setup process

set -e

echo "🚀 OpenAI Usage Tracker - Cloudflare Worker Setup"
echo "=================================================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
else
    echo "✅ Wrangler CLI found"
fi

# Check if logged in to Cloudflare
echo ""
echo "📝 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "Please log in to Cloudflare:"
    wrangler login
else
    echo "✅ Already logged in to Cloudflare"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create D1 database
echo ""
echo "🗄️  Creating D1 database..."
echo "Running: wrangler d1 create oai-usage"
DB_OUTPUT=$(wrangler d1 create oai-usage 2>&1 || true)

if echo "$DB_OUTPUT" | grep -q "database_id"; then
    DATABASE_ID=$(echo "$DB_OUTPUT" | grep "database_id" | awk '{print $3}' | tr -d '"')
    echo "✅ Database created with ID: $DATABASE_ID"
    echo ""
    echo "⚠️  IMPORTANT: Update wrangler.toml with this database_id:"
    echo ""
    echo "[[d1_databases]]"
    echo "binding = \"DB\""
    echo "database_name = \"oai-usage\""
    echo "database_id = \"$DATABASE_ID\""
    echo ""

    # Offer to update wrangler.toml automatically
    read -p "Would you like to update wrangler.toml automatically? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sed -i.bak "s/database_id = \"your-database-id\"/database_id = \"$DATABASE_ID\"/" wrangler.toml
        echo "✅ Updated wrangler.toml"
        rm wrangler.toml.bak
    fi
elif echo "$DB_OUTPUT" | grep -q "already exists"; then
    echo "ℹ️  Database already exists, skipping creation"
else
    echo "⚠️  Could not create database. Output:"
    echo "$DB_OUTPUT"
fi

# Run migrations
echo ""
echo "🔧 Running database migrations..."
wrangler d1 execute oai-usage --file=./schema.sql

echo ""
echo "🔑 Setting up secrets..."
echo ""
echo "You'll need to set your OpenAI Admin API key."
echo "Get one from: https://platform.openai.com/settings/organization/admin-keys"
echo ""
read -p "Press Enter to set OPENAI_ADMIN_KEY..."
wrangler secret put OPENAI_ADMIN_KEY

echo ""
read -p "Do you want to set up webhook alerts? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Enter your webhook URL (Slack, Discord, etc.):"
    wrangler secret put ALERT_WEBHOOK_URL
fi

# Create .dev.vars for local development
echo ""
read -p "Do you want to set up local development environment? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ ! -f .dev.vars ]; then
        echo "Creating .dev.vars file..."
        cp .dev.vars.example .dev.vars
        echo "✅ Created .dev.vars - please edit it and add your OPENAI_ADMIN_KEY"
        echo ""
        echo "To set up local database for development:"
        echo "  npm run db:migrate:local"
    else
        echo "ℹ️  .dev.vars already exists, skipping"
    fi
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Test locally:"
echo "   npm run dev"
echo "   curl -X POST http://localhost:8787/api/poll"
echo ""
echo "2. Deploy to Cloudflare:"
echo "   npm run deploy"
echo ""
echo "3. View logs:"
echo "   npm run tail"
echo ""
echo "📖 See README.md for full documentation"

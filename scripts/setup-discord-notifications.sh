#!/bin/bash

# Setup Discord Signup Notifications for TenantFlow
echo "🔔 Setting up Discord signup notifications..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Set Discord webhook URL as environment variable
DISCORD_WEBHOOK_URL="https://discordapp.com/api/webhooks/1387522250206482653/KCHZcLvjPZFkeRlINcc2V7tBK8A7sDTdVaXPBppUJz7J_REDTdbusjykynKkcQ-mReCH"

echo "🚀 Deploying Discord notification function..."
supabase functions deploy discord-signup-notification

echo "🔧 Setting Discord webhook URL environment variable..."
supabase secrets set DISCORD_WEBHOOK_URL="$DISCORD_WEBHOOK_URL"

echo "📊 Applying database migration for Discord triggers..."
supabase db push

echo "🧪 Testing Discord notification..."
curl -X POST "https://$(supabase status --output json | jq -r '.APIs[] | select(.name=="API") | .url')/functions/v1/discord-signup-notification" \
  -H "Authorization: Bearer $(supabase status --output json | jq -r '.APIs[] | select(.name=="anon key") | .value')" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "created_at": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'",
    "user_agent": "Mozilla/5.0 Chrome Test",
    "ip_address": "127.0.0.1"
  }'

echo ""
echo "✅ Discord signup notifications setup complete!"
echo ""
echo "📋 What happens next:"
echo "   1. New user signups will automatically trigger Discord notifications"
echo "   2. Check your Discord channel for the test notification"
echo "   3. Notifications include user email, name, signup time, and device info"
echo ""
echo "🔧 To test manually, a test user can sign up at:"
echo "   https://tenantflow.app/auth/signup"
echo ""
echo "📱 Your Discord channel will receive rich notifications like:"
echo "   🎉 NEW SIGNUP - TenantFlow"
echo "   📧 Email: user@example.com"
echo "   👤 Name: John Smith"
echo "   ⏰ Time: Jan 15, 2025 3:45 PM CST"
echo "   📱 Device: Chrome on Desktop"
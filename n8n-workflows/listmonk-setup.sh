#!/bin/bash

# Listmonk Setup Script
# This script creates the necessary lists in Listmonk for all lead magnet workflows

LISTMONK_URL="http://192.168.0.177:9000"
LISTMONK_USER="admin"
LISTMONK_PASS="listmonk"  # Change this after first login!

echo "Setting up Listmonk lists for lead magnet campaigns..."

# Wait for Listmonk to be ready
echo "Waiting for Listmonk to be ready..."
until curl -s -f "$LISTMONK_URL" > /dev/null; do
    echo "Listmonk not ready yet..."
    sleep 5
done

echo "Listmonk is ready! Creating lists..."

# Function to create a list
create_list() {
    local name="$1"
    local description="$2"
    local tags="$3"
    
    curl -X POST "$LISTMONK_URL/api/lists" \
        -u "$LISTMONK_USER:$LISTMONK_PASS" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$name\",
            \"type\": \"public\",
            \"optin\": \"single\",
            \"tags\": $tags,
            \"description\": \"$description\"
        }"
    
    echo "Created list: $name"
}

# Create lists for each lead magnet category
create_list "Lead Magnets - Tenant Screening" \
    "Subscribers interested in tenant screening guides and checklists" \
    '["tenant-screening", "lead-magnet", "day-01"]'

create_list "Lead Magnets - Financial ROI" \
    "Subscribers interested in property investment ROI and financial analysis" \
    '["financial-roi", "lead-magnet", "day-02"]'

create_list "Lead Magnets - Maintenance Management" \
    "Subscribers interested in property maintenance tips and contractor management" \
    '["maintenance", "lead-magnet", "day-03"]'

create_list "Lead Magnets - Marketing & Vacancy" \
    "Subscribers interested in property marketing and vacancy reduction" \
    '["marketing", "lead-magnet", "day-04"]'

create_list "Lead Magnets - Property Investment" \
    "Subscribers interested in property investment strategies and analysis" \
    '["investment", "lead-magnet", "day-05"]'

create_list "Lead Magnets - Insurance & Risk" \
    "Subscribers interested in property insurance and risk management" \
    '["insurance", "lead-magnet", "day-06"]'

create_list "Lead Magnets - Technology & Automation" \
    "Subscribers interested in PropTech and property management automation" \
    '["technology", "lead-magnet", "day-07"]'

create_list "Lead Magnets - Seasonal Management" \
    "Subscribers interested in seasonal property management tips" \
    '["seasonal", "lead-magnet", "day-08"]'

create_list "Lead Magnets - Tenant Communication" \
    "Subscribers interested in tenant relations and communication strategies" \
    '["communication", "lead-magnet", "day-09"]'

create_list "Lead Magnets - Market Analysis" \
    "Subscribers interested in rental market analysis and pricing strategies" \
    '["market-analysis", "lead-magnet", "day-10"]'

create_list "Lead Magnets - Exit Strategies" \
    "Subscribers interested in property disposition and exit strategies" \
    '["exit-strategies", "lead-magnet", "day-11"]'

create_list "Lead Magnets - Legal Compliance" \
    "Subscribers interested in landlord legal compliance and regulations" \
    '["legal", "lead-magnet", "day-12"]'

create_list "Lead Magnets - Portfolio Scaling" \
    "Subscribers interested in scaling property portfolios and growth strategies" \
    '["portfolio", "lead-magnet", "day-13"]'

create_list "Lead Magnets - Emergency Management" \
    "Subscribers interested in property emergency response and crisis management" \
    '["emergency", "lead-magnet", "day-14"]'

# Create a master list for all lead magnets
create_list "All Lead Magnets" \
    "Master list for all lead magnet subscribers" \
    '["lead-magnet", "all"]'

echo "✅ All lists created successfully!"
echo ""
echo "⚠️  IMPORTANT: Please log into Listmonk and:"
echo "1. Change the default admin password"
echo "2. Configure SMTP settings with your Resend API"
echo "3. Set up email templates if desired"
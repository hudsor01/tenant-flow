#!/bin/bash

echo "Adding missing Lucide icon imports..."

# Add Lucide icons to files that need them
files=(
  "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/billing/payment-cancelled.tsx:HelpCircle"
  "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/billing/payment-success.tsx:Home,Users,FileText"
  "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/dashboard/dashboard-onboarding.tsx:Building2,Users,FileText"
  "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/dashboard/dashboard-quick-actions.tsx:Building2,Users,Wrench,FileText"
  "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx:Home,Building,Users,FileText,Wrench,BarChart3,Settings"
  "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/dashboard/dashboard-stats-cards.tsx:Building2,Users,FileText,Wrench"
  "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/dashboard/dashboard-widgets.tsx:CheckCircle2,AlertTriangle,DollarSign,Users"
  "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/forms/contact-form.tsx:Calendar,Phone,Mail,CheckCircle"
  "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/landing/cta-section.tsx:DollarSign,Shield,Bell,Home"
  "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/landing/optimized-features-section.tsx:Clock,TrendingUp,Users"
  "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/landing/stats-section.tsx:Clock,TrendingUp,Zap,Star"
  "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/layout/mobile-nav.tsx:Home,Building,Plus,BarChart3,User"
  "/Users/richard/Developer/tenant-flow/apps/frontend/src/components/layout/Navigation.tsx:FileText,Calculator,Wrench"
)

for entry in "${files[@]}"; do
  file="${entry%%:*}"
  icons="${entry##*:}"
  
  if [ -f "$file" ]; then
    # Check if lucide-react import already exists
    if grep -q "from 'lucide-react'" "$file"; then
      echo "  Updating lucide-react import in $file"
      # Extract existing icons
      existing=$(grep "from 'lucide-react'" "$file" | sed -n "s/.*import { \(.*\) } from 'lucide-react'.*/\1/p")
      # Combine with new icons
      combined="$existing, $icons"
      # Remove duplicates
      unique=$(echo "$combined" | tr ',' '\n' | sed 's/^ *//;s/ *$//' | sort -u | tr '\n' ',' | sed 's/,$//')
      # Update the import
      sed -i '' "s|import {.*} from 'lucide-react'|import { $unique } from 'lucide-react'|" "$file"
    else
      echo "  Adding lucide-react import to $file"
      # Add import after 'use client' if it exists, otherwise at the beginning
      if grep -q "^'use client'" "$file"; then
        sed -i '' "/^'use client'/a\\
import { $icons } from 'lucide-react'" "$file"
      else
        sed -i '' "1s|^|import { $icons } from 'lucide-react'\\
|" "$file"
      fi
    fi
  fi
done

echo "Done! Fixed Lucide icon imports."
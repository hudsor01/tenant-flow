#!/bin/bash

echo "📱 MOBILE RESPONSIVENESS AUDIT"
echo "================================"

echo ""
echo "🔍 1. NON-RESPONSIVE GRID LAYOUTS:"
echo "-----------------------------------"
rg -n "grid-cols-[0-9]" /Users/richard/Developer/tenant-flow/src --glob "*.tsx" | rg -v "md:|lg:|sm:" | head -5

echo ""
echo "🔍 2. HARDCODED WIDTHS THAT MIGHT BREAK MOBILE:"
echo "-----------------------------------------------"
rg -n "w-\[.*px\]|h-\[.*px\]" /Users/richard/Developer/tenant-flow/src --glob "*.tsx" | head -5

echo ""
echo "🔍 3. LARGE FIXED TEXT SIZES:"
echo "-----------------------------"
rg -n "text-\[.*px\]|text-[4-9]xl" /Users/richard/Developer/tenant-flow/src --glob "*.tsx" | head -5

echo ""
echo "🔍 4. COMPONENTS WITHOUT RESPONSIVE BREAKPOINTS:"
echo "------------------------------------------------"
rg -l "flex|grid" /Users/richard/Developer/tenant-flow/src --glob "*.tsx" | xargs rg -L "md:|lg:|sm:" | head -5

echo ""
echo "📊 MOBILE AUDIT SUMMARY:"
echo "========================"
TOTAL_COMPONENTS=$(fd -e tsx . /Users/richard/Developer/tenant-flow/src | wc -l | tr -d ' ')
RESPONSIVE_COMPONENTS=$(rg -l "md:|lg:|xl:|sm:" /Users/richard/Developer/tenant-flow/src --glob "*.tsx" | wc -l | tr -d ' ')
NON_RESPONSIVE_GRIDS=$(rg -l "grid-cols-[0-9]" /Users/richard/Developer/tenant-flow/src --glob "*.tsx" | xargs rg -L "md:|lg:|sm:" | wc -l | tr -d ' ')

echo "• Total Components: $TOTAL_COMPONENTS"
echo "• Responsive Components: $RESPONSIVE_COMPONENTS"
echo "• Mobile Coverage: $(( RESPONSIVE_COMPONENTS * 100 / TOTAL_COMPONENTS ))%"
echo "• Non-responsive grids: $NON_RESPONSIVE_GRIDS"

echo ""
echo "🎯 PRIORITY FIXES NEEDED:"
echo "========================"
echo "1. Make grids responsive: grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
echo "2. Replace fixed px values with responsive rem/em"
echo "3. Add mobile-first breakpoints to large components"
echo "4. Test on mobile viewport (375px wide)"

echo ""
echo "🛠️ MODERN TOOLS FOR MOBILE OPTIMIZATION:"
echo "==========================================="
echo "• Use 'fd -e tsx . src | xargs rg -l \"w-screen|h-screen\"' to find viewport issues"
echo "• Use 'bat filename.tsx | grep -n \"grid\\|flex\"' to review layouts with syntax highlighting"  
echo "• Use 'eza --tree src/components | grep -i mobile' to find mobile-specific components"
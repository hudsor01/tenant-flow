#!/bin/bash

# Fix icon component patterns in various files

# contact-form.tsx - line 173
sed -i '' 's/<Icon className="h-4 w-4" \/>/<i className={`${icon} inline-block h-4 w-4`} \/>/' /Users/richard/Developer/tenant-flow/apps/frontend/src/components/forms/contact-form.tsx

# cta-section.tsx - line 134
sed -i '' 's/<feature\.icon className="h-6 w-6" \/>/<i className={`${feature.icon} inline-block h-6 w-6`} \/>/' /Users/richard/Developer/tenant-flow/apps/frontend/src/components/landing/cta-section.tsx

# optimized-features-section.tsx - line 70
sed -i '' 's/<feature\.icon className="h-8 w-8" \/>/<i className={`${feature.icon} inline-block h-8 w-8`} \/>/' /Users/richard/Developer/tenant-flow/apps/frontend/src/components/landing/optimized-features-section.tsx

# stats-section.tsx - line 17
sed -i '' 's/<stat\.icon className="h-8 w-8" \/>/<i className={`${stat.icon} inline-block h-8 w-8`} \/>/' /Users/richard/Developer/tenant-flow/apps/frontend/src/components/landing/stats-section.tsx

# mobile-nav.tsx - line 116 
sed -i '' 's/<navItem\.icon className="h-4 w-4" \/>/<i className={`${navItem.icon} inline-block h-4 w-4`} \/>/' /Users/richard/Developer/tenant-flow/apps/frontend/src/components/layout/mobile-nav.tsx

# Navigation.tsx - line 279
sed -i '' 's/<item\.icon className={`w-5 h-5 ${.*}`} aria-hidden="true" \/>/<i className={`${item.icon} inline-block w-5 h-5 ${iconColor}`} aria-hidden="true" \/>/' /Users/richard/Developer/tenant-flow/apps/frontend/src/components/layout/Navigation.tsx

# Navigation.tsx - line 460
sed -i '' 's/<item\.icon className="h-4 w-4" \/>/<i className={`${item.icon} inline-block h-4 w-4`} \/>/' /Users/richard/Developer/tenant-flow/apps/frontend/src/components/layout/Navigation.tsx

echo "Icon references fixed!"
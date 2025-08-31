/**
 * TenantFlow Component Library
 * 
 * Centralized exports for all components in the TenantFlow design system.
 * Includes standard UI components, Magic UI premium components, and domain-specific components.
 */

// Standard UI Components (Radix + ShadCN based)
export * from './ui'

// Magic UI Premium Components (exported via ui/index.ts)
// Includes: RainbowButton, ShimmerButton, InteractiveHoverButton, AnimatedGradientText,
// BorderBeam, BlurFade, Ripple, Globe, NumberTicker, Marquee, AnimatedList, etc.

// TailAdmin Dashboard Components - Professional admin interface components
export * from './tailadmin'

// Domain-Specific Component Categories (only export existing ones)
// export * from './auth'
// export * from './billing' 
// export * from './dashboard'
// export * from './forms'
// export * from './landing'
// export * from './layout'
// export * from './properties'
// export * from './tenants'
// export * from './maintenance'
// export * from './navigation'

// Utility and Infrastructure Components (only export existing ones)
// export * from './analytics'
// export * from './error'
// export * from './security'
// export * from './seo'

// Theme and Layout
export { ThemeProvider } from './theme-provider'
export { ThemeToggle } from './theme-toggle'

/**
 * Component Categories for Documentation and Discovery
 */
export const ComponentCategories = {
  // Standard UI building blocks
  ui: [
    'Button', 'Input', 'Card', 'Dialog', 'Form', 'Table', 'Badge',
    'Alert', 'Checkbox', 'RadioGroup', 'Switch', 'Slider', 'Tabs'
  ],
  
  // Premium Magic UI components  
  magicUI: [
    'RainbowButton', 'ShimmerButton', 'InteractiveHoverButton',
    'AnimatedGradientText', 'BorderBeam', 'BlurFade', 'Ripple',
    'Globe', 'NumberTicker', 'Marquee', 'AnimatedList', 'Confetti'
  ],
  
  // Authentication and user management
  auth: [
    'AuthGuard', 'LoginForm', 'SignupForm', 'OAuthProviders',
    'PasswordInput', 'AuthError', 'AuthRedirect'
  ],
  
  // Billing and subscription management
  billing: [
    'CheckoutButton', 'PricingTable', 'SubscriptionCheckout',
    'CustomerPortalButton', 'PaymentMethods', 'BillingSettings'
  ],
  
  // Dashboard and analytics (includes TailAdmin components)
  dashboard: [
    'DashboardNavigation', 'DashboardHeader', 'DashboardMetrics',
    'DashboardStats', 'DashboardWidgets', 'ActivityFeed',
    'DashboardSidebar', 'TenantFlowDataTable', 'PropertiesDataTable'
  ],
  
  // TailAdmin Professional Dashboard Components
  tailAdmin: [
    'DashboardSidebar', 'DashboardHeader', 'TenantFlowDataTable', 
    'PropertiesDataTable', 'Table', 'TableHeader', 'TableBody', 
    'TableRow', 'TableCell', 'RevenueChart', 'PropertyRevenueChart',
    'DashboardForm', 'FormField', 'FormActions', 'PropertyForm',
    'DashboardModal', 'ConfirmationModal', 'PropertyDeleteModal'
  ],
  
  // Property management
  properties: [
    'PropertyCard', 'PropertyForm', 'PropertyDataTable',
    'PropertyDetails', 'PropertyStats', 'UnitsDataTable'
  ],
  
  // Tenant management
  tenants: [
    'TenantForm', 'TenantsDataTable', 'TenantsStats'
  ],
  
  // Maintenance requests
  maintenance: [
    'MaintenanceForm', 'MaintenanceDataTable', 'MaintenanceStats',
    'MaintenanceDetail', 'CategorySelector', 'PrioritySelector'
  ],
  
  // Landing page and marketing
  landing: [
    'HeroSection', 'FeaturesSection', 'PricingSection', 'CTASection',
    'TestimonialsSection', 'StatsSection', 'Navigation', 'Footer'
  ],
  
  // Layout and navigation
  layout: [
    'Sidebar', 'MobileNav', 'NavigationBreadcrumbs', 'TabNavigation',
    'Pagination'
  ],
  
  // Forms and data entry
  forms: [
    'ContactForm', 'FormContainer', 'FormFields', 'CollapsibleFormSection',
    'FormLoadingOverlay'
  ]
} as const

/**
 * Quick Import Aliases for Common Component Groups
 */
export const QuickImports = {
  // All Magic UI components
  magicUI: {
    buttons: ['RainbowButton', 'ShimmerButton', 'InteractiveHoverButton'],
    animations: ['AnimatedGradientText', 'BlurFade', 'NumberTicker'],
    effects: ['BorderBeam', 'Ripple', 'Confetti', 'Meteors'],
    interactive: ['Globe', 'Marquee', 'AnimatedList']
  },
  
  // Essential UI components
  essentials: ['Button', 'Input', 'Card', 'Dialog', 'Form', 'Table'],
  
  // Layout components
  layout: ['Sidebar', 'Navigation', 'Breadcrumbs', 'MobileNav'],
  
  // Data components
  data: ['DataTable', 'PropertyCard', 'TenantsDataTable', 'MaintenanceDataTable']
} as const

/**
 * Usage Examples for Common Patterns
 */
export const UsageExamples = {
  // Premium CTA with Magic UI
  premiumCTA: `
    import { RainbowButton, AnimatedGradientText, Ripple } from '@/components'
    
    <div className="relative">
      <Ripple />
      <AnimatedGradientText>Upgrade to Premium</AnimatedGradientText>
      <RainbowButton size="lg">Start Free Trial</RainbowButton>
    </div>
  `,
  
  // Standard form with validation
  standardForm: `
    import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Input, Button } from '@/components'
    
    <Form {...form}>
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input placeholder="Email" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button type="submit">Submit</Button>
    </Form>
  `,
  
  // Property management card
  propertyCard: `
    import { PropertyCard, BorderBeam, BlurFade } from '@/components'
    
    <BlurFade delay={0.1}>
      <div className="relative">
        <BorderBeam />
        <PropertyCard property={property} />
      </div>
    </BlurFade>
  `,
  
  // TailAdmin dashboard layout
  dashboardLayout: `
    import { DashboardSidebar, DashboardHeader, TenantFlowDataTable } from '@/components'
    
    <div className="flex h-screen bg-gray-50">
      <DashboardSidebar isExpanded={true} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader 
          title="Properties" 
          breadcrumbs={[
            { label: 'Dashboard' },
            { label: 'Properties' }
          ]} 
        />
        <main className="flex-1 overflow-y-auto p-6">
          <TenantFlowDataTable data={properties} columns={columns} />
        </main>
      </div>
    </div>
  `
} as const
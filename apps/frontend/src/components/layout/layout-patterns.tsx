/**
 * Layout Pattern Components
 * 
 * High-level layout patterns that provide consistent structure
 * across different pages and sections of the application.
 * 
 * These components compose primitives and common patterns
 * to create page-level layouts.
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Container, Section, Stack } from '@/components/ui/primitives'
import { CollectionHeader } from '@/components/common/ui-patterns'

// Define the CollectionHeaderProps interface locally
interface CollectionHeaderProps {
  title: string
  description?: string
  itemCount?: number
  actions?: React.ReactNode
  filters?: React.ReactNode
  className?: string
}

// ============================================================================
// PAGE LAYOUT PATTERN
// ============================================================================

interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode
  sidebar?: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
}

export function PageLayout({
  children,
  header,
  sidebar,
  footer,
  maxWidth = '7xl',
  padding = 'lg',
  className,
  ...props
}: PageLayoutProps) {
  return (
    <div className={cn("min-h-screen flex flex-col", className)} {...props}>
      {header && (
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {header}
        </header>
      )}
      
      <div className="flex flex-1">
        {sidebar && (
          <aside className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r bg-card">
            {sidebar}
          </aside>
        )}
        
        <main className="flex-1 overflow-x-hidden">
          <Container size={maxWidth} padding={padding}>
            {children}
          </Container>
        </main>
      </div>

      {footer && (
        <footer className="border-t bg-card">
          {footer}
        </footer>
      )}
    </div>
  )
}

// ============================================================================
// DASHBOARD LAYOUT PATTERN
// ============================================================================

interface DashboardLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  actions?: React.ReactNode
  metrics?: React.ReactNode
  quickActions?: React.ReactNode
  recentActivity?: React.ReactNode
  alerts?: React.ReactNode
}

export function DashboardLayout({
  title,
  description,
  actions,
  metrics,
  quickActions,
  recentActivity,
  alerts,
  children,
  className,
  ...props
}: DashboardLayoutProps) {
  return (
    <div className={cn("space-y-8", className)} {...props}>
      {/* Dashboard Header */}
      <Stack direction="horizontal" align="start" justify="between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-2">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </Stack>

      {/* Alerts Section */}
      {alerts && (
        <div className="space-y-4">
          {alerts}
        </div>
      )}

      {/* Metrics Section */}
      {metrics && (
        <Section spacing="none">
          {metrics}
        </Section>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {children}
        </div>
        
        <div className="space-y-6">
          {/* Quick Actions */}
          {quickActions && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              {quickActions}
            </div>
          )}
          
          {/* Recent Activity */}
          {recentActivity && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              {recentActivity}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// COLLECTION PAGE LAYOUT
// ============================================================================

interface CollectionPageLayoutProps extends CollectionHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CollectionPageLayout({
  children,
  className,
  ...headerProps
}: CollectionPageLayoutProps) {
  return (
    <div className={cn("space-y-8", className)}>
      <CollectionHeader {...headerProps} />
      <div>{children}</div>
    </div>
  )
}

// ============================================================================
// DETAIL PAGE LAYOUT
// ============================================================================

interface DetailPageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  breadcrumbs?: React.ReactNode
  actions?: React.ReactNode
  tabs?: React.ReactNode
  sidebar?: React.ReactNode
  backLink?: {
    href: string
    label: string
  }
}

export function DetailPageLayout({
  title,
  subtitle,
  breadcrumbs,
  actions,
  tabs,
  sidebar,
  backLink,
  children,
  className,
  ...props
}: DetailPageLayoutProps) {
  return (
    <div className={cn("space-y-8", className)} {...props}>
      {/* Navigation */}
      {breadcrumbs && (
        <nav>
          {breadcrumbs}
        </nav>
      )}

      {/* Header */}
      <div className="space-y-4">
        {backLink && (
          <div>
            <a 
              href={backLink.href}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-2"
            >
              ← {backLink.label}
            </a>
          </div>
        )}
        
        <Stack direction="horizontal" align="start" justify="between">
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            {subtitle && (
              <p className="text-muted-foreground mt-2">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </Stack>

        {tabs && (
          <div className="border-b">
            {tabs}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className={sidebar ? "grid grid-cols-1 lg:grid-cols-4 gap-8" : ""}>
        <div className={sidebar ? "lg:col-span-3" : ""}>
          {children}
        </div>
        
        {sidebar && (
          <div className="space-y-6">
            {sidebar}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// FORM LAYOUT PATTERN
// ============================================================================

interface FormLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  actions?: React.ReactNode
  sidebar?: React.ReactNode
}

export function FormLayout({
  title,
  description,
  maxWidth = 'lg',
  actions,
  sidebar,
  children,
  className,
  ...props
}: FormLayoutProps) {
  const maxWidthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl'
  }

  return (
    <div className={cn("space-y-8", className)} {...props}>
      {/* Form Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">{title}</h1>
        {description && (
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {description}
          </p>
        )}
      </div>

      {/* Form Content */}
      <div className={sidebar ? "grid grid-cols-1 lg:grid-cols-4 gap-8" : ""}>
        <div className={cn(
          "mx-auto w-full",
          maxWidthClasses[maxWidth],
          sidebar ? "lg:col-span-3" : ""
        )}>
          {children}
        </div>

        {sidebar && (
          <div className="space-y-6">
            {sidebar}
          </div>
        )}
      </div>

      {/* Form Actions */}
      {actions && (
        <div className={cn(
          "flex justify-center pt-8 border-t",
          maxWidthClasses[maxWidth],
          "mx-auto"
        )}>
          {actions}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MODAL LAYOUT PATTERN
// ============================================================================

interface ModalLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  actions?: React.ReactNode
}

export function ModalLayout({
  title,
  description,
  size = 'lg',
  actions,
  children,
  className,
  ...props
}: ModalLayoutProps) {
  // Mark size as unused - component currently doesn't implement size variants
  void size
  
  return (
    <div className={cn("space-y-6", className)} {...props}>
      {/* Modal Header */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {/* Modal Content */}
      <div className="space-y-4">
        {children}
      </div>

      {/* Modal Actions */}
      {actions && (
        <div className="flex justify-end gap-2 pt-4 border-t">
          {actions}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// HERO SECTION PATTERN
// ============================================================================

interface HeroSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  description?: string
  actions?: React.ReactNode
  badge?: React.ReactNode
  background?: 'default' | 'gradient' | 'image'
  backgroundImage?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function HeroSection({
  title,
  subtitle,
  description,
  actions,
  badge,
  background = 'default',
  backgroundImage,
  size = 'lg',
  className,
  ...props
}: HeroSectionProps) {
  const sizeClasses = {
    sm: 'py-16 md:py-20',
    md: 'py-20 md:py-24',
    lg: 'py-24 md:py-32',
    xl: 'py-32 md:py-40'
  }

  const backgroundClasses = {
    default: '',
    gradient: 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50',
    image: backgroundImage ? `bg-cover bg-center bg-no-repeat` : ''
  }

  return (
    <Section
      className={cn(
        "relative overflow-hidden",
        sizeClasses[size],
        backgroundClasses[background],
        className
      )}
      style={background === 'image' && backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
      {...props}
    >
      {/* Background Effects */}
      {background === 'gradient' && (
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
          <div className="absolute top-40 right-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
        </div>
      )}

      <Container className="relative">
        <div className="text-center space-y-8">
          {badge && (
            <div className="flex justify-center">
              {badge}
            </div>
          )}

          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 animate-fade-in-up">
              {title}
              {subtitle && (
                <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {subtitle}
                </span>
              )}
            </h1>
            
            {description && (
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
                {description}
              </p>
            )}
          </div>

          {actions && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-400">
              {actions}
            </div>
          )}
        </div>
      </Container>
    </Section>
  )
}

// ============================================================================
// FEATURE GRID PATTERN
// ============================================================================

interface FeatureGridProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  features: {
    icon?: React.ReactNode
    title: string
    description: string
    link?: {
      href: string
      label: string
    }
  }[]
  cols?: 1 | 2 | 3 | 4
}

export function FeatureGrid({
  title,
  description,
  features,
  cols = 3,
  className,
  ...props
}: FeatureGridProps) {
  return (
    <Section className={cn("", className)} {...props}>
      <Container>
        <div className="space-y-12">
          {(title || description) && (
            <div className="text-center space-y-4">
              {title && (
                <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
              )}
              {description && (
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  {description}
                </p>
              )}
            </div>
          )}

          <div className={cn(
            "grid gap-8",
            cols === 1 && "grid-cols-1",
            cols === 2 && "grid-cols-1 md:grid-cols-2",
            cols === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
            cols === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
          )}>
            {features.map((feature, index) => (
              <div
                key={index}
                className="group rounded-xl p-6 bg-card border transition-all duration-200 hover:shadow-md hover:border-primary/20"
              >
                <div className="space-y-4">
                  {feature.icon && (
                    <div className="text-primary group-hover:scale-110 transition-transform duration-200">
                      {feature.icon}
                    </div>
                  )}
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                  {feature.link && (
                    <a
                      href={feature.link.href}
                      className="inline-flex items-center text-sm text-primary hover:underline"
                    >
                      {feature.link.label} →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  )
}
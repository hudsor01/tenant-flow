import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/css.utils'

/* Property Management Layout System
 * 
 * Designed for:
 * - Property management dashboards
 * - Real estate portfolio interfaces
 * - Financial data visualization
 * - Multi-tenant management screens
 */

interface PropertyManagementLayoutProps {
  children: React.ReactNode
  className?: string
  variant?: 'dashboard' | 'listing' | 'detail' | 'financial'
  sidebar?: React.ReactNode
  header?: React.ReactNode
  toolbar?: React.ReactNode
  aside?: React.ReactNode
  footer?: React.ReactNode
  showGrid?: boolean
  animated?: boolean
}

const layoutVariants = {
  dashboard: {
    main: "grid-cols-1 lg:grid-cols-4 xl:grid-cols-5",
    sidebar: "lg:col-span-1",
    content: "lg:col-span-3 xl:col-span-4",
    spacing: "gap-6 lg:gap-8"
  },
  listing: {
    main: "grid-cols-1 lg:grid-cols-6",
    sidebar: "lg:col-span-1",
    content: "lg:col-span-5", 
    spacing: "gap-4 lg:gap-6"
  },
  detail: {
    main: "grid-cols-1 lg:grid-cols-3",
    sidebar: "",
    content: "lg:col-span-2",
    spacing: "gap-6"
  },
  financial: {
    main: "grid-cols-1 xl:grid-cols-4",
    sidebar: "xl:col-span-1",
    content: "xl:col-span-3",
    spacing: "gap-8"
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
} as const

export function PropertyManagementLayout({
  children,
  className,
  variant = 'dashboard',
  sidebar,
  header,
  toolbar,
  aside,
  footer,
  showGrid = false,
  animated = true
}: PropertyManagementLayoutProps) {
  const layout = layoutVariants[variant]

  const MainComponent = animated ? motion.main : 'main'
  const SectionComponent = animated ? motion.section : 'section'

  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-background via-gray-50/50 to-background",
      "relative overflow-hidden",
      className
    )}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>

      {/* Grid Overlay for Design System */}
      {showGrid && (
        <div className="fixed inset-0 pointer-events-none z-50 opacity-10">
          <div className="w-full h-full bg-[linear-gradient(to_right,#3b82f6_1px,transparent_1px),linear-gradient(to_bottom,#3b82f6_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        </div>
      )}

      <div className="relative z-10">
        {/* Header */}
        {header && (
          <header className="sticky top-0 z-40 border-b border-border/40 backdrop-blur-lg bg-background/80">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              {header}
            </div>
          </header>
        )}

        {/* Toolbar */}
        {toolbar && (
          <div className="sticky top-[72px] z-30 border-b border-border/20 bg-muted/40 backdrop-blur-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
              {toolbar}
            </div>
          </div>
        )}

        {/* Main Layout */}
        <MainComponent
          className={cn(
            "container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8",
            "grid", layout.main, layout.spacing,
            "min-h-[calc(100vh-theme(spacing.16))]"
          )}
          variants={animated ? containerVariants : undefined}
          initial={animated ? "hidden" : undefined}
          animate={animated ? "visible" : undefined}
        >
          {/* Sidebar */}
          {sidebar && (
            <SectionComponent
              className={cn(
                "space-y-6",
                layout.sidebar,
                "order-2 lg:order-1"
              )}
              variants={animated ? itemVariants : undefined}
            >
              <div className="sticky top-32 space-y-6">
                {sidebar}
              </div>
            </SectionComponent>
          )}

          {/* Main Content */}
          <SectionComponent
            className={cn(
              "space-y-6 lg:space-y-8",
              layout.content,
              "order-1 lg:order-2"
            )}
            variants={animated ? itemVariants : undefined}
          >
            {children}
          </SectionComponent>

          {/* Aside */}
          {aside && (
            <SectionComponent
              className={cn(
                "space-y-6",
                "order-3",
                "lg:col-span-1"
              )}
              variants={animated ? itemVariants : undefined}
            >
              <div className="sticky top-32 space-y-6">
                {aside}
              </div>
            </SectionComponent>
          )}
        </MainComponent>

        {/* Footer */}
        {footer && (
          <footer className="border-t border-border/40 bg-muted/20 backdrop-blur-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {footer}
            </div>
          </footer>
        )}
      </div>
    </div>
  )
}

/* Dashboard Grid Layout */
export function DashboardGrid({
  children,
  className,
  cols = "auto-fit",
  minWidth = "280px",
  gap = "6",
  animated = true
}: {
  children: React.ReactNode
  className?: string
  cols?: "auto-fit" | "auto-fill" | number
  minWidth?: string
  gap?: "4" | "6" | "8"
  animated?: boolean
}) {
  const gridCols = typeof cols === 'number' 
    ? `repeat(${cols}, minmax(0, 1fr))`
    : `repeat(${cols}, minmax(${minWidth}, 1fr))`

  const GridComponent = animated ? motion.div : 'div'

  return (
    <GridComponent
      className={cn(
        "grid",
        `gap-${gap}`,
        className
      )}
      style={{ gridTemplateColumns: gridCols }}
      variants={animated ? containerVariants : undefined}
      initial={animated ? "hidden" : undefined}
      animate={animated ? "visible" : undefined}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={animated ? itemVariants : undefined}
          custom={index}
        >
          {child}
        </motion.div>
      ))}
    </GridComponent>
  )
}

/* Property Card Grid */
export function PropertyGrid({
  children,
  className,
  animated = true
}: {
  children: React.ReactNode
  className?: string
  animated?: boolean
}) {
  return (
    <DashboardGrid
      className={cn(
        "grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
        className
      )}
      animated={animated}
    >
      {children}
    </DashboardGrid>
  )
}

/* Financial Metrics Layout */
export function FinancialMetricsLayout({
  children,
  className,
  animated = true
}: {
  children: React.ReactNode
  className?: string
  animated?: boolean
}) {
  return (
    <DashboardGrid
      className={cn(
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
      gap="6"
      animated={animated}
    >
      {children}
    </DashboardGrid>
  )
}

/* Split View Layout */
export function SplitViewLayout({
  left,
  right,
  className,
  leftClassName,
  rightClassName,
  ratio = "1:2",
  animated = true
}: {
  left: React.ReactNode
  right: React.ReactNode
  className?: string
  leftClassName?: string
  rightClassName?: string
  ratio?: "1:1" | "1:2" | "1:3" | "2:3"
  animated?: boolean
}) {
  const ratios = {
    "1:1": "lg:grid-cols-2",
    "1:2": "lg:grid-cols-3",
    "1:3": "lg:grid-cols-4", 
    "2:3": "lg:grid-cols-5"
  }

  const leftSpans = {
    "1:1": "lg:col-span-1",
    "1:2": "lg:col-span-1",
    "1:3": "lg:col-span-1",
    "2:3": "lg:col-span-2"
  }

  const rightSpans = {
    "1:1": "lg:col-span-1",
    "1:2": "lg:col-span-2", 
    "1:3": "lg:col-span-3",
    "2:3": "lg:col-span-3"
  }

  const ContainerComponent = animated ? motion.div : 'div'

  return (
    <ContainerComponent
      className={cn(
        "grid grid-cols-1 gap-6 lg:gap-8",
        ratios[ratio],
        className
      )}
      variants={animated ? containerVariants : undefined}
      initial={animated ? "hidden" : undefined}
      animate={animated ? "visible" : undefined}
    >
      <motion.div
        className={cn(
          leftSpans[ratio],
          "space-y-6",
          leftClassName
        )}
        variants={animated ? itemVariants : undefined}
      >
        {left}
      </motion.div>
      
      <motion.div
        className={cn(
          rightSpans[ratio],
          "space-y-6",
          rightClassName
        )}
        variants={animated ? itemVariants : undefined}
      >
        {right}
      </motion.div>
    </ContainerComponent>
  )
}

/* Section Container */
export function Section({
  children,
  className,
  title,
  description,
  action,
  spacing = "lg",
  animated = true
}: {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  action?: React.ReactNode
  spacing?: "sm" | "md" | "lg" | "xl"
  animated?: boolean
}) {
  const spacingClasses = {
    sm: "space-y-4",
    md: "space-y-6",
    lg: "space-y-8", 
    xl: "space-y-12"
  }

  const SectionComponent = animated ? motion.section : 'section'

  return (
    <SectionComponent
      className={cn(
        spacingClasses[spacing],
        className
      )}
      variants={animated ? itemVariants : undefined}
    >
      {(title || description || action) && (
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {title && (
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {action && (
            <div className="flex-shrink-0">
              {action}
            </div>
          )}
        </div>
      )}
      <div>
        {children}
      </div>
    </SectionComponent>
  )
}

export { PropertyManagementLayout as default }
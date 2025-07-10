import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.List>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.List
		ref={ref}
		className={cn(
			'bg-muted text-muted-foreground inline-flex h-9 items-center justify-center rounded-lg p-1',
			className
		)}
		{...props}
	/>
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Trigger
		ref={ref}
		className={cn(
			'ring-offset-background focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow',
			className
		)}
		{...props}
	/>
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
	<TabsPrimitive.Content
		ref={ref}
		className={cn(
			'ring-offset-background focus-visible:ring-ring mt-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden',
			className
		)}
		{...props}
	/>
))
TabsContent.displayName = TabsPrimitive.Content.displayName

// Enhanced Tabs Variants for Premium UI
const TabsListEnhanced = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.List>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
		variant?: 'default' | 'premium' | 'pills' | 'underline'
	}
>(({ className, variant = 'default', ...props }, ref) => {
	const variants = {
		default:
			'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
		premium:
			'inline-flex h-14 items-center justify-center rounded-xl bg-card/80 p-1.5 text-muted-foreground shadow-sm border border-border/30 backdrop-blur-sm',
		pills: 'inline-flex h-12 items-center justify-center rounded-full bg-muted/70 p-1 text-muted-foreground shadow-inner',
		underline:
			'inline-flex h-12 items-center justify-center bg-transparent border-b border-border text-muted-foreground'
	}

	return (
		<TabsPrimitive.List
			ref={ref}
			className={cn(variants[variant], className)}
			{...props}
		/>
	)
})
TabsListEnhanced.displayName = 'TabsListEnhanced'

const TabsTriggerEnhanced = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
		variant?: 'default' | 'premium' | 'pills' | 'underline'
		icon?: React.ReactNode
	}
>(({ className, variant = 'default', icon, children, ...props }, ref) => {
	const variants = {
		default:
			'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow',
		premium:
			'relative inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold ring-offset-background transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-muted-foreground hover:bg-card hover:text-foreground hover:shadow-sm data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:shadow-black/5 data-[state=active]:border data-[state=active]:border-border',
		pills: 'inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
		underline:
			'inline-flex items-center justify-center whitespace-nowrap px-4 py-3 text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:text-foreground relative data-[state=active]:text-foreground data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary data-[state=active]:after:rounded-full'
	}

	const content = (
		<>
			{icon && <span className="mr-2">{icon}</span>}
			{children}
		</>
	)

	return (
		<TabsPrimitive.Trigger
			ref={ref}
			className={cn(variants[variant], className)}
			{...props}
		>
			{variant === 'premium' ? (
				<motion.div
					className="flex items-center"
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					transition={{ duration: 0.15 }}
				>
					{content}
				</motion.div>
			) : (
				content
			)}
		</TabsPrimitive.Trigger>
	)
})
TabsTriggerEnhanced.displayName = 'TabsTriggerEnhanced'

// Icon-enhanced tab trigger for the Financial Dashboard style
const TabsTriggerWithIcon = React.forwardRef<
	React.ElementRef<typeof TabsPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
		icon: React.ReactNode
		label: string
	}
>(({ className, icon, label, ...props }, ref) => (
	<TabsPrimitive.Trigger
		ref={ref}
		className={cn(
			'group ring-offset-background focus-visible:ring-ring relative flex h-14 flex-col items-center justify-center gap-1.5 px-6 py-3 text-sm font-medium transition-all duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
			// Default state - muted text
			'text-muted-foreground',
			// Hover states - clearer contrast
			'hover:bg-card hover:text-foreground hover:shadow-sm',
			// Active states with enhanced visual indicators
			'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-primary/20 data-[state=active]:border-primary/30 data-[state=active]:rounded-lg data-[state=active]:border data-[state=active]:shadow-lg',
			// Smooth transitions for all states
			'rounded-md hover:rounded-lg',
			className
		)}
		{...props}
	>
		<motion.div
			className="flex flex-col items-center gap-1.5"
			whileHover={{ scale: 1.05 }}
			whileTap={{ scale: 0.95 }}
			transition={{ duration: 0.15 }}
		>
			<span className="group-data-[state=active]:text-primary-foreground text-lg transition-colors duration-200">
				{icon}
			</span>
			<span className="group-data-[state=active]:text-primary-foreground font-semibold tracking-wide transition-colors duration-200">
				{label}
			</span>
		</motion.div>

		{/* Active indicator - subtle highlight */}
		<motion.div
			className="bg-muted/20 absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200 group-data-[state=active]:opacity-100"
			layoutId="activeTab"
		/>
	</TabsPrimitive.Trigger>
))
TabsTriggerWithIcon.displayName = 'TabsTriggerWithIcon'

export {
	Tabs,
	TabsList,
	TabsTrigger,
	TabsContent,
	TabsListEnhanced,
	TabsTriggerEnhanced,
	TabsTriggerWithIcon
}

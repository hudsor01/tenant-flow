import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { PanelLeftClose, PanelLeftOpen, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SidebarToggleProps {
	isCollapsed?: boolean
	onToggle?: (collapsed: boolean) => void
	variant?: 'default' | 'floating' | 'minimal'
	className?: string
}

export const SidebarToggle: React.FC<SidebarToggleProps> = ({
	isCollapsed = false,
	onToggle,
	variant = 'default',
	className
}) => {
	const [collapsed, setCollapsed] = useState(isCollapsed)

	const handleToggle = () => {
		const newState = !collapsed
		setCollapsed(newState)
		onToggle?.(newState)
	}

	const variants = {
		default:
			'h-10 w-10 rounded-lg border border-border shadow-sm hover:shadow-md transition-all duration-200',
		floating:
			'h-12 w-12 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg hover:shadow-xl transition-all duration-200',
		minimal:
			'h-8 w-8 rounded-md hover:bg-muted transition-colors duration-200'
	}

	const iconVariants = {
		rotate: {
			rotate: collapsed ? 180 : 0,
			transition: { duration: 0.3, ease: 'easeInOut' }
		}
	}

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={handleToggle}
			className={cn(variants[variant], className)}
			aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
		>
			<motion.div
				variants={iconVariants}
				animate="rotate"
				className="flex items-center justify-center"
			>
				{variant === 'minimal' ? (
					<Menu className="h-4 w-4" />
				) : collapsed ? (
					<PanelLeftOpen className="h-5 w-5" />
				) : (
					<PanelLeftClose className="h-5 w-5" />
				)}
			</motion.div>
		</Button>
	)
}

// Floating variant for overlaying on content
export const FloatingSidebarToggle: React.FC<
	Omit<SidebarToggleProps, 'variant'>
> = props => (
	<div className="fixed top-4 left-4 z-50">
		<SidebarToggle {...props} variant="floating" />
	</div>
)

// Header integrated toggle
export const HeaderSidebarToggle: React.FC<
	Omit<SidebarToggleProps, 'variant'>
> = props => <SidebarToggle {...props} variant="default" />

export default SidebarToggle

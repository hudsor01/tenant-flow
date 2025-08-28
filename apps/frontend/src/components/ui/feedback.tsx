/**
 * Base Feedback Components
 * Native implementation using UnoCSS shortcuts - no abstractions
 */

import React from 'react'
import { cn } from '@/lib/utils'

const feedbackClasses = {
	base: "flex items-center gap-2 rounded-lg border p-3 text-sm",
	variants: {
		success: "status-success dark:border-green-800 dark:bg-green-900/20 dark:text-green-300",
		error: "status-error dark:border-red-800 dark:bg-red-900/20 dark:text-red-300", 
		loading: "status-info dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
		info: "status-neutral dark:border-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
	}
}

export interface FeedbackProps extends React.HTMLAttributes<HTMLDivElement> {
variant?: "success" | "error" | "loading" | "info"
icon?: React.ReactNode
children?: React.ReactNode
}

const Feedback = React.forwardRef<HTMLDivElement, FeedbackProps>(
	({ className, variant = "info", icon, children, ...props }, ref) => {
		const defaultIcons = {
			success: <i className="icon-md i-lucide-checkcircle"  />,
			error: <i className="icon-md i-lucide-alert-circle"  />,
			loading: <i className="icon-md i-lucide-loader-2 animate-spin"  />,
			info: <i className="icon-md i-lucide-info"  />
		}

		const displayIcon = icon ?? defaultIcons[variant]
		const variantClasses = feedbackClasses.variants[variant]

		return (
			<div
				ref={ref}
				className={cn(feedbackClasses.base, variantClasses, className)}
				{...props}
			>
				{displayIcon}
				<div className="flex-1">{children}</div>
			</div>
		)
	}
)
Feedback.displayName = "Feedback"

// Convenience components
const SuccessFeedback = React.forwardRef<
	HTMLDivElement,
	Omit<FeedbackProps, 'variant'>
>(({ children, ...props }, ref) => (
	<Feedback ref={ref} variant="success" {...props}>
		{children}
	</Feedback>
))
SuccessFeedback.displayName = "SuccessFeedback"

const ErrorFeedback = React.forwardRef<
	HTMLDivElement,
	Omit<FeedbackProps, 'variant'>
>(({ children, ...props }, ref) => (
	<Feedback ref={ref} variant="error" {...props}>
		{children}
	</Feedback>
))
ErrorFeedback.displayName = "ErrorFeedback"

const LoadingFeedback = React.forwardRef<
	HTMLDivElement,
	Omit<FeedbackProps, 'variant'>
>(({ children, ...props }, ref) => (
	<Feedback ref={ref} variant="loading" {...props}>
		{children}
	</Feedback>
))
LoadingFeedback.displayName = "LoadingFeedback"

const InfoFeedback = React.forwardRef<
	HTMLDivElement,
	Omit<FeedbackProps, 'variant'>
>(({ children, ...props }, ref) => (
	<Feedback ref={ref} variant="info" {...props}>
		{children}
	</Feedback>
))
InfoFeedback.displayName = "InfoFeedback"

// Semantic alias for optimistic updates (uses loading variant)
const OptimisticFeedback = React.forwardRef<
	HTMLDivElement,
	Omit<FeedbackProps, 'variant'> & {
		isEditing?: boolean
		entityName?: string
	}
>(({ isEditing = false, entityName = "item", children, ...props }, ref) => (
	<Feedback ref={ref} variant="loading" {...props}>
		{children || `${isEditing ? 'Updating' : 'Creating'} ${entityName}...`}
	</Feedback>
))
OptimisticFeedback.displayName = "OptimisticFeedback"

export { 
	Feedback, 
	SuccessFeedback, 
	ErrorFeedback, 
	LoadingFeedback, 
	InfoFeedback,
	OptimisticFeedback
}

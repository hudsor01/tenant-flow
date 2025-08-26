'use client'

/**
 * Common UI patterns and layouts
 * Reusable components following design system principles
 */

import { cn } from '@/lib/utils'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
<<<<<<< HEAD
// Separator imported but not yet used in current patterns
=======
import { Separator } from '@/components/ui/separator'
>>>>>>> origin/main

// ============================================================================
// Layout Patterns
// ============================================================================

export interface SectionProps {
	title?: string
	description?: string
	children: React.ReactNode
	className?: string
	headerAction?: React.ReactNode
}

export function Section({
	title,
	description,
	children,
	className,
	headerAction
}: SectionProps) {
	return (
		<div className={cn('space-y-4', className)}>
			{(title || description || headerAction) && (
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						{title && (
							<h3 className="text-lg font-semibold">{title}</h3>
						)}
						{description && (
							<p className="text-muted-foreground text-sm">
								{description}
							</p>
						)}
					</div>
					{headerAction && <div>{headerAction}</div>}
				</div>
			)}
			{children}
		</div>
	)
}

export interface PageHeaderProps {
	title: string
	description?: string
	children?: React.ReactNode
	className?: string
}

export function PageHeader({
	title,
	description,
	children,
	className
}: PageHeaderProps) {
	return (
		<div
			className={cn('flex items-center justify-between pb-4', className)}
		>
			<div className="space-y-1">
				<h1 className="text-2xl font-bold tracking-tight">{title}</h1>
				{description && (
					<p className="text-muted-foreground">{description}</p>
				)}
			</div>
			{children && (
				<div className="flex items-center gap-2">{children}</div>
			)}
		</div>
	)
}

// ============================================================================
// Card Patterns
// ============================================================================

export interface InfoCardProps {
	title: string
	description?: string
	value?: string | number
	change?: {
		value: number
		type: 'positive' | 'negative' | 'neutral'
	}
	badge?: string
	children?: React.ReactNode
	className?: string
}

export function InfoCard({
	title,
	description,
	value,
	change,
	badge,
	children,
	className
}: InfoCardProps) {
	return (
		<Card className={className}>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
				{badge && <Badge variant="secondary">{badge}</Badge>}
			</CardHeader>
			<CardContent>
				{value !== undefined && (
					<div className="text-2xl font-bold">{value}</div>
				)}
				{description && (
					<CardDescription className="text-muted-foreground text-xs">
						{description}
					</CardDescription>
				)}
				{change && (
					<p
						className={cn(
							'text-xs',
							change.type === 'positive' && 'text-green-600',
							change.type === 'negative' && 'text-red-600',
							change.type === 'neutral' && 'text-muted-foreground'
						)}
					>
						{change.type === 'positive' && '+'}
						{change.value}%
					</p>
				)}
				{children}
			</CardContent>
		</Card>
	)
}

// ============================================================================
// List Patterns
// ============================================================================

export interface ListItemProps {
	title: string
	description?: string
	meta?: string
	badge?: string
	actions?: React.ReactNode
	onClick?: () => void
	className?: string
}

export function ListItem({
	title,
	description,
	meta,
	badge,
	actions,
	onClick,
	className
}: ListItemProps) {
	const Component = onClick ? 'button' : 'div'

	return (
		<Component
			onClick={onClick}
			className={cn(
				'flex items-center justify-between rounded-lg border p-4',
				onClick && 'hover:bg-muted/50 cursor-pointer',
				className
			)}
		>
			<div className="flex-1 space-y-1">
				<div className="flex items-center gap-2">
					<h4 className="text-sm font-medium">{title}</h4>
					{badge && (
						<Badge variant="outline" className="text-xs">
							{badge}
						</Badge>
					)}
				</div>
				{description && (
					<p className="text-muted-foreground text-sm">
						{description}
					</p>
				)}
				{meta && (
					<p className="text-muted-foreground text-xs">{meta}</p>
				)}
			</div>
			{actions && (
				<div className="flex items-center gap-2">{actions}</div>
			)}
		</Component>
	)
}

// ============================================================================
// Status Patterns
// ============================================================================

export interface StatusIndicatorProps {
	status: 'active' | 'inactive' | 'pending' | 'error' | 'warning'
	label?: string
	size?: 'sm' | 'md' | 'lg'
}

export function StatusIndicator({
	status,
	label,
	size = 'md'
}: StatusIndicatorProps) {
	const statusConfig = {
		active: { color: 'bg-green-500', label: label || 'Active' },
		inactive: { color: 'bg-gray-400', label: label || 'Inactive' },
		pending: { color: 'bg-yellow-500', label: label || 'Pending' },
		error: { color: 'bg-red-500', label: label || 'Error' },
		warning: { color: 'bg-orange-500', label: label || 'Warning' }
	}

	const sizeConfig = {
		sm: 'h-2 w-2',
		md: 'h-3 w-3',
		lg: 'h-4 w-4'
	}

	const config = statusConfig[status]

	return (
		<div className="flex items-center gap-2">
			<div
				className={cn('rounded-full', config.color, sizeConfig[size])}
			/>
			<span className="text-sm">{config.label}</span>
		</div>
	)
}

// ============================================================================
// Empty State Pattern
// ============================================================================

export interface EmptyStateProps {
	title: string
	description?: string
	action?: {
		label: string
		onClick: () => void
	}
	icon?: React.ReactNode
	className?: string
}

export function EmptyState({
	title,
	description,
	action,
	icon,
	className
}: EmptyStateProps) {
	return (
		<div
			className={cn(
				'flex flex-col items-center justify-center py-12 text-center',
				className
			)}
		>
			{icon && <div className="text-muted-foreground mb-4">{icon}</div>}
			<h3 className="text-lg font-semibold">{title}</h3>
			{description && (
				<p className="text-muted-foreground mt-2 max-w-sm text-sm">
					{description}
				</p>
			)}
			{action && (
				<Button onClick={action.onClick} className="mt-4">
					{action.label}
				</Button>
			)}
		</div>
	)
}

// ============================================================================
// Loading Pattern
// ============================================================================

export interface LoadingStateProps {
	title?: string
	description?: string
	className?: string
}

export function LoadingState({
	title = 'Loading...',
	description,
	className
}: LoadingStateProps) {
	return (
		<div
			className={cn(
				'flex flex-col items-center justify-center py-12 text-center',
				className
			)}
		>
			<div className="border-primary mb-4 h-8 w-8 animate-spin rounded-full border-b-2" />
			<h3 className="text-lg font-semibold">{title}</h3>
			{description && (
				<p className="text-muted-foreground mt-2 text-sm">
					{description}
				</p>
			)}
		</div>
	)
}

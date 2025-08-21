'use client'

import * as React from 'react'
import { useCallback, useMemo } from 'react'
import { motion, type Variants } from '@/lib/framer-motion'
import {
	TrendingUp,
	TrendingDown,
	Check,
	Loader2,
	Star,
	MoreVertical,
	Eye,
	Edit3,
	Trash2,
	Building2,
	MapPin,
	DollarSign,
	Home,
	UserCheck,
	UserX
} from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import Image from 'next/image'
import { formatCurrency } from '@repo/shared'
import { createAsyncHandler } from '@/utils/async-handlers'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { PropertyWithDetails, ProductTierConfig } from '@repo/shared'
import { calculateYearlySavings } from '@repo/shared'
import { useDeleteProperty } from '@/hooks/api/use-properties'
import { gridLayouts, flexLayouts } from '@/utils/layout-classes'

// Consolidated Card Variants
const cardVariants = cva(
	'bg-card text-card-foreground flex flex-col rounded-xl border shadow-sm transition-all duration-300',
	{
		variants: {
			behavior: {
				default: 'gap-6 py-6',
				stats: 'card-modern @container/card hover:shadow-md',
				pricing: 'relative h-full hover:shadow-lg',
				property:
					'group/card from-card via-card to-card/95 hover:shadow-primary/10 hover:border-primary/20 overflow-hidden border-0 bg-gradient-to-br shadow-lg backdrop-blur-sm hover:shadow-2xl'
			},
			variant: {
				default: 'border-border/50',
				revenue:
					'bg-gradient-to-br from-emerald-50/80 to-green-50/60 dark:from-emerald-950/80 dark:to-green-950/60 border-emerald-200/50 dark:border-emerald-800/50',
				tenants:
					'bg-gradient-to-br from-blue-50/80 to-indigo-50/60 dark:from-blue-950/80 dark:to-indigo-950/60 border-blue-200/50 dark:border-blue-800/50',
				properties:
					'bg-gradient-to-br from-amber-50/80 to-orange-50/60 dark:from-amber-950/80 dark:to-orange-950/60 border-amber-200/50 dark:border-amber-800/50',
				maintenance:
					'bg-gradient-to-br from-red-50/80 to-rose-50/60 dark:from-red-950/80 dark:to-rose-950/60 border-red-200/50 dark:border-red-800/50',
				occupancy:
					'bg-gradient-to-br from-purple-50/80 to-violet-50/60 dark:from-purple-950/80 dark:to-violet-950/60 border-purple-200/50 dark:border-purple-800/50',
				popular: 'border-primary border-2 shadow-md',
				current: 'ring-2 ring-green-500 ring-offset-2'
			}
		},
		defaultVariants: {
			behavior: 'default',
			variant: 'default'
		}
	}
)

// Icon background variants for stats cards
const getIconBgStyles = (variant: string) => {
	const styles = {
		default: 'bg-primary/10 text-primary',
		revenue: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
		tenants: 'bg-primary/10 text-primary dark:text-blue-400',
		properties: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
		maintenance: 'bg-red-500/10 text-red-600 dark:text-red-400',
		occupancy: 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
	}
	return styles[variant as keyof typeof styles] || styles.default
}

// Motion variants for different card behaviors
const getMotionVariants = (behavior: string): Variants => {
	const motionVariants = {
		default: {
			hidden: { opacity: 0, y: 20 },
			visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
		},
		stats: {
			hidden: { opacity: 0, scale: 0.95 },
			visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } }
		},
		pricing: {
			hidden: { opacity: 0, y: 20 },
			visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
		},
		property: {
			hidden: { opacity: 0, y: 20 },
			visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
			hover: { y: -4, transition: { duration: 0.2 } }
		}
	}
	return (
		motionVariants[behavior as keyof typeof motionVariants] ||
		motionVariants.default
	)
}

// Helper function to format pricing
function formatPricingPrice(price: number): string {
	return `$${price}`
}

// Consolidated Card Interface
export interface CardProps
	extends Omit<React.ComponentProps<'div'>, 'property'>,
		VariantProps<typeof cardVariants> {
	// Behavior-specific props
	behavior?: 'default' | 'stats' | 'pricing' | 'property'

	// Stats card props
	title?: string
	value?: string | number
	description?: string
	trend?: {
		value: number
		label?: string
		period?: string
		isPositive?: boolean
	}
	icon?: React.ReactNode
	loading?: boolean
	chart?: React.ReactNode

	// Pricing card props
	tier?: ProductTierConfig
	billingInterval?: 'monthly' | 'annual'
	isCurrentPlan?: boolean
	onSubscribe?: () => void

	// Property card props
	property?: PropertyWithDetails
	onEdit?: (property: PropertyWithDetails) => void
	onView?: (property: PropertyWithDetails) => void
}

function Card({
	className,
	behavior = 'default',
	variant = 'default',
	title,
	value,
	description,
	trend,
	icon,
	loading = false,
	chart,
	tier,
	billingInterval,
	isCurrentPlan = false,
	onSubscribe,
	property,
	onEdit,
	onView,
	children,
	...props
}: CardProps) {
	// Stats card rendering
	if (behavior === 'stats' && title && value !== undefined) {
		return (
			<StatsCardContent
				title={title}
				value={value}
				description={description}
				trend={trend}
				icon={icon}
				loading={loading}
				variant={variant || 'default'}
				className={className}
				chart={chart}
			/>
		)
	}

	// Pricing card rendering
	if (behavior === 'pricing' && tier) {
		return (
			<PricingCardContent
				tier={tier}
				billingInterval={billingInterval}
				isCurrentPlan={isCurrentPlan}
				onSubscribe={onSubscribe}
				className={className}
				loading={loading}
			/>
		)
	}

	// Property card rendering
	if (behavior === 'property' && property) {
		return (
			<PropertyCardContent
				property={property}
				onEdit={onEdit}
				onView={onView}
				className={className}
			/>
		)
	}

	// Default card
	const motionVariants = getMotionVariants(behavior)

	return (
		<motion.div
			variants={motionVariants}
			initial="hidden"
			animate="visible"
		>
			<div
				data-slot="card"
				className={cn(cardVariants({ behavior, variant }), className)}
				{...props}
			>
				{children}
			</div>
		</motion.div>
	)
}

// Stats Card Implementation
function StatsCardContent({
	title,
	value,
	description,
	trend,
	icon,
	loading = false,
	variant = 'default',
	className,
	chart
}: {
	title: string
	value: string | number
	description?: string
	trend?: CardProps['trend']
	icon?: React.ReactNode
	loading?: boolean
	variant: VariantProps<typeof cardVariants>['variant']
	className?: string
	chart?: React.ReactNode
}) {
	const iconBgStyles = getIconBgStyles(variant || 'default')

	if (loading) {
		return (
			<Card className={cn('card-modern @container/card', className)}>
				<CardHeader className="relative pb-2">
					<div className="flex items-center justify-between">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-8 w-8 rounded-lg" />
					</div>
				</CardHeader>
				<CardContent>
					<Skeleton className="mb-2 h-10 w-24 @[250px]/card:h-12 @[250px]/card:w-32" />
					<Skeleton className="h-4 w-full" />
				</CardContent>
			</Card>
		)
	}

	const trendColor =
		trend?.isPositive !== false
			? trend?.value && trend.value > 0
				? 'text-emerald-600 dark:text-emerald-400'
				: trend?.value && trend.value < 0
					? 'text-red-600 dark:text-red-400'
					: 'text-muted-foreground'
			: trend?.value && trend.value > 0
				? 'text-red-600 dark:text-red-400'
				: 'text-emerald-600 dark:text-emerald-400'

	const trendIcon =
		trend?.value && trend.value > 0 ? (
			trend.isPositive !== false ? (
				<TrendingUp className="h-3 w-3" />
			) : (
				<TrendingDown className="h-3 w-3" />
			)
		) : trend?.value && trend.value < 0 ? (
			trend.isPositive !== false ? (
				<TrendingDown className="h-3 w-3" />
			) : (
				<TrendingUp className="h-3 w-3" />
			)
		) : null

	return (
		<Card
			className={cn(
				'card-modern @container/card transition-all duration-300 hover:shadow-md',
				className
			)}
			variant={variant}
		>
			<CardHeader className="relative pb-2">
				{trend && (
					<Badge
						variant="secondary"
						className={cn(
							'absolute top-4 right-4 hidden items-center gap-1 text-xs font-medium @[200px]/card:flex',
							trendColor
						)}
					>
						{trendIcon}
						<span>
							{trend.value > 0 ? '+' : ''}
							{Math.abs(trend.value)}%
						</span>
					</Badge>
				)}

				<CardDescription className="text-muted-foreground text-sm font-medium">
					{title}
				</CardDescription>

				<CardTitle className="font-display text-foreground text-2xl font-semibold tracking-tight tabular-nums @[250px]/card:text-3xl">
					{value}
				</CardTitle>
			</CardHeader>

			<CardContent className="pt-0">
				{icon && (
					<div
						className={cn(
							'mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg',
							iconBgStyles
						)}
					>
						{icon}
					</div>
				)}
				{chart && <div className="h-[80px]">{chart}</div>}
			</CardContent>

			{(description || trend) && (
				<CardFooter className="pt-0">
					<div className="flex flex-col items-start gap-2 text-xs @[250px]/card:flex-row @[250px]/card:items-center @[250px]/card:justify-between">
						{description && (
							<span className="text-muted-foreground font-medium">
								{description}
							</span>
						)}
						{trend && (
							<div
								className={cn(
									'flex items-center gap-1 font-medium @[250px]/card:hidden',
									trendColor
								)}
							>
								{trendIcon}
								<span>
									{trend.value > 0 ? '+' : ''}
									{Math.abs(trend.value)}%
								</span>
								{trend.period && (
									<span className="text-muted-foreground ml-1">
										{trend.period}
									</span>
								)}
							</div>
						)}
					</div>
				</CardFooter>
			)}
		</Card>
	)
}

// Pricing Card Implementation
function PricingCardContent({
	tier,
	billingInterval,
	isCurrentPlan = false,
	loading = false,
	onSubscribe,
	className
}: {
	tier: ProductTierConfig
	billingInterval?: 'monthly' | 'annual'
	isCurrentPlan?: boolean
	loading?: boolean
	onSubscribe?: () => void
	className?: string
}) {
	const price =
		billingInterval === 'annual' ? tier.price.annual : tier.price.monthly
	const originalMonthlyPrice = tier.price.monthly
	const yearlyMonthlyEquivalent = Math.round(tier.price.annual / 12)
	const savings =
		billingInterval === 'annual' && tier.price.monthly > 0
			? calculateYearlySavings(
					tier.price.monthly * 100,
					tier.price.annual * 100
				)
			: 0

	const isFreePlan = tier.id === 'FREETRIAL'
	const isEnterprise = tier.id === 'TENANTFLOW_MAX'

	let cardVariant: VariantProps<typeof cardVariants>['variant'] = 'default'
	if (tier.id === 'GROWTH') cardVariant = 'popular'
	if (isCurrentPlan) cardVariant = 'current'

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className={cn(className)}
		>
			<Card
				behavior="pricing"
				variant={cardVariant}
				className={cn(
					tier.id === 'GROWTH'
						? 'border-primary border-2 shadow-md'
						: 'border border-gray-200 hover:border-gray-300',
					isCurrentPlan && 'ring-2 ring-green-500 ring-offset-2'
				)}
			>
				{/* Recommended Badge */}
				{tier.id === 'GROWTH' && (
					<div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
						<Badge className="bg-primary px-3 py-1 text-xs font-semibold text-white">
							<Star className="mr-1 h-3 w-3" />
							Most Popular
						</Badge>
					</div>
				)}

				{/* Current Plan Badge */}
				{isCurrentPlan && (
					<div className="absolute -top-3 right-4">
						<Badge className="bg-green-600 px-3 py-1 text-xs font-semibold text-white">
							Current Plan
						</Badge>
					</div>
				)}

				<CardHeader className="pb-4 text-center">
					<h3
						className={cn(
							'text-2xl font-bold',
							tier.id === 'GROWTH'
								? 'text-primary'
								: 'text-gray-900'
						)}
					>
						{tier.name}
					</h3>
					<p className="mt-2 text-sm text-gray-600">
						{tier.description}
					</p>
				</CardHeader>

				<CardContent className="px-6 pb-6">
					{/* Pricing */}
					<div className="mb-6 text-center">
						{isFreePlan ? (
							<div>
								<span className="text-4xl font-bold text-gray-900">
									Free
								</span>
								<p className="mt-1 text-sm text-gray-600">
									14-day trial
								</p>
							</div>
						) : isEnterprise ? (
							<div>
								<span className="from-primary bg-gradient-to-r to-indigo-600 bg-clip-text text-4xl font-bold text-transparent">
									Custom
								</span>
								<p className="mt-1 text-sm text-gray-600">
									Contact for pricing
								</p>
							</div>
						) : (
							<div>
								<div className="flex items-baseline justify-center">
									<span className="text-4xl font-bold text-gray-900">
										{formatPricingPrice(
											billingInterval === 'annual'
												? yearlyMonthlyEquivalent
												: price
										)}
									</span>
									<span className="ml-1 text-gray-600">
										/
										{billingInterval === 'annual'
											? 'month'
											: 'month'}
									</span>
								</div>

								{billingInterval === 'annual' &&
									savings > 0 && (
										<div className="mt-2">
											<p className="text-sm text-gray-500">
												<span className="line-through">
													{formatPricingPrice(
														originalMonthlyPrice
													)}
													/month
												</span>
												<span className="ml-2 font-medium text-green-600">
													Save {savings}%
												</span>
											</p>
											<p className="mt-1 text-xs text-gray-500">
												Billed{' '}
												{formatPricingPrice(price)}{' '}
												annually
											</p>
										</div>
									)}
							</div>
						)}
					</div>

					{/* Limits Display (for non-tenantflow_max plans) */}
					{!isEnterprise && (
						<div className="mb-6 rounded-lg bg-gray-50 p-4">
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div className="text-center">
									<div className="font-semibold text-gray-900">
										{tier.limits.properties === 0
											? '∞'
											: tier.limits.properties}
									</div>
									<div className="text-gray-600">
										Properties
									</div>
								</div>
								<div className="text-center">
									<div className="font-semibold text-gray-900">
										{tier.limits.units === 0
											? '∞'
											: tier.limits.units}
									</div>
									<div className="text-gray-600">Units</div>
								</div>
							</div>
						</div>
					)}

					{/* Features */}
					<div className="space-y-3">
						{tier.features.map((feature: string, index: number) => (
							<div key={index} className="flex items-start">
								<Check className="mt-0.5 mr-3 h-4 w-4 flex-shrink-0 text-green-500" />
								<span className="text-sm text-gray-700">
									{feature}
								</span>
							</div>
						))}
					</div>
				</CardContent>

				<CardFooter className="px-6 pt-0">
					<Button
						onClick={onSubscribe}
						disabled={loading || isCurrentPlan}
						className={cn(
							'w-full transition-all duration-200',
							tier.id === 'GROWTH'
								? 'bg-primary text-white hover:bg-blue-700'
								: isFreePlan
									? 'bg-green-600 text-white hover:bg-green-700'
									: isEnterprise
										? 'bg-gray-900 text-white hover:bg-gray-800'
										: 'bg-gray-900 text-white hover:bg-gray-800',
							isCurrentPlan &&
								'cursor-not-allowed bg-gray-100 text-gray-500'
						)}
					>
						{loading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Processing...
							</>
						) : isCurrentPlan ? (
							'Current Plan'
						) : isFreePlan ? (
							'Start Free Trial'
						) : (
							'Get Started'
						)}
					</Button>
				</CardFooter>
			</Card>
		</motion.div>
	)
}

// Property Card Implementation
function PropertyCardContent({
	property,
	onEdit,
	onView,
	className
}: {
	property: PropertyWithDetails
	onEdit?: (property: PropertyWithDetails) => void
	onView?: (property: PropertyWithDetails) => void
	className?: string
}) {
	const deletePropertyMutation = useDeleteProperty()

	// Memoize the delete mutation object to prevent useCallback dependencies from changing
	const deleteMutation = useMemo(
		() => ({
			mutateAsync: deletePropertyMutation.mutateAsync,
			isPending: deletePropertyMutation.isPending
		}),
		[deletePropertyMutation.mutateAsync, deletePropertyMutation.isPending]
	)

	const handleDelete = useCallback(async () => {
		if (
			window.confirm(
				'Are you sure you want to delete this property? This action cannot be undone.'
			)
		) {
			await deleteMutation.mutateAsync(property.id)
		}
	}, [deleteMutation, property.id])

	const handleView = useCallback(() => {
		onView?.(property)
	}, [onView, property])

	const handleEdit = useCallback(() => {
		onEdit?.(property)
	}, [onEdit, property])

	// Calculate property statistics
	const totalUnits = property.units?.length || 0
	const occupiedUnits =
		property.units?.filter(unit => unit.status === 'OCCUPIED').length || 0
	const vacantUnits = totalUnits - occupiedUnits
	const occupancyRate =
		totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0

	// Calculate total MONTHLY rent (simplified - uses unit rent instead of lease data)
	const totalRent =
		property.units?.reduce((sum: number, unit) => {
			if (unit.status === 'OCCUPIED') {
				return sum + (unit.rent || 0)
			}
			return sum
		}, 0) || 0

	const cardVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: { duration: 0.3 }
		},
		hover: {
			y: -4,
			transition: { duration: 0.2 }
		}
	}

	const statVariants = {
		hidden: { opacity: 0, scale: 0.8 },
		visible: {
			opacity: 1,
			scale: 1,
			transition: { duration: 0.3, delay: 0.1 }
		}
	}

	return (
		<motion.div
			variants={cardVariants}
			initial="hidden"
			animate="visible"
			whileHover="hover"
			className="group"
		>
			<Card
				behavior="property"
				className={cn(
					'group/card from-card via-card to-card/95 hover:shadow-primary/10 hover:border-primary/20 overflow-hidden border-0 bg-gradient-to-br shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-2xl',
					className
				)}
			>
				{/* Property Image */}
				<div className="from-primary via-primary to-accent relative h-52 overflow-hidden bg-gradient-to-br">
					{property.imageUrl ? (
						<Image
							src={property.imageUrl}
							alt={property.name}
							fill
							className="object-cover transition-transform duration-300 group-hover:scale-105"
						/>
					) : (
						<div className={`${flexLayouts.center} h-full w-full`}>
							<Building2 className="h-16 w-16 text-white/70" />
						</div>
					)}

					{/* Actions Dropdown */}
					<div className="absolute top-3 right-3">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
								>
									<MoreVertical className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-48">
								<DropdownMenuLabel>Actions</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={handleView}>
									<Eye className="mr-2 h-4 w-4" />
									View Details
								</DropdownMenuItem>
								<DropdownMenuItem onClick={handleEdit}>
									<Edit3 className="mr-2 h-4 w-4" />
									Edit Property
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={createAsyncHandler(
										handleDelete,
										'Failed to delete property'
									)}
									className="text-red-600 hover:bg-red-50 hover:text-red-700"
								>
									<Trash2 className="mr-2 h-4 w-4" />
									Delete Property
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					{/* Occupancy Badge */}
					<div className="absolute bottom-3 left-3">
						<div
							className={`rounded-full px-2 py-1 text-xs font-medium ${
								occupancyRate >= 90
									? 'bg-green-500 text-white'
									: occupancyRate >= 70
										? 'bg-yellow-500 text-white'
										: 'bg-red-500 text-white'
							}`}
						>
							{occupancyRate}% Occupied
						</div>
					</div>
				</div>

				{/* Property Info */}
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<CardTitle className="text-foreground group-hover:text-primary mb-1 transition-colors">
								{property.name}
							</CardTitle>
							<CardDescription
								className={flexLayouts.centerVertical}
							>
								<MapPin className="mr-1 h-4 w-4" />
								{property.address}, {property.city},{' '}
								{property.state} {property.zipCode}
							</CardDescription>
						</div>
					</div>
				</CardHeader>

				<CardContent className="pt-0">
					{/* Description */}
					{property.description && (
						<p className="text-body text-muted-foreground mb-4 line-clamp-2">
							{property.description}
						</p>
					)}

					{/* Statistics Grid */}
					<motion.div
						variants={statVariants}
						className={`mb-4 ${gridLayouts.responsiveCols} ${gridLayouts.gap3}`}
					>
						{/* Total Units */}
						<div
							className={`${flexLayouts.centerVertical} rounded-lg bg-blue-50 p-3`}
						>
							<div
								className={`mr-3 ${flexLayouts.center} h-8 w-8 rounded-lg bg-blue-100`}
							>
								<Home className="text-primary h-4 w-4" />
							</div>
							<div>
								<p className="text-caption text-muted-foreground">
									Total Units
								</p>
								<p className="stat-value text-lg">
									{totalUnits}
								</p>
							</div>
						</div>

						{/* Occupied Units */}
						<div
							className={`${flexLayouts.centerVertical} rounded-lg bg-green-50 p-3`}
						>
							<div
								className={`mr-3 ${flexLayouts.center} h-8 w-8 rounded-lg bg-green-100`}
							>
								<UserCheck className="h-4 w-4 text-green-600" />
							</div>
							<div>
								<p className="text-caption text-muted-foreground">
									Occupied
								</p>
								<p className="stat-value text-lg">
									{occupiedUnits}
								</p>
							</div>
						</div>

						{/* Vacant Units */}
						<div
							className={`${flexLayouts.centerVertical} rounded-lg bg-orange-50 p-3`}
						>
							<div
								className={`mr-3 ${flexLayouts.center} h-8 w-8 rounded-lg bg-orange-100`}
							>
								<UserX className="h-4 w-4 text-orange-600" />
							</div>
							<div>
								<p className="text-caption text-muted-foreground">
									Vacant
								</p>
								<p className="stat-value text-lg">
									{vacantUnits}
								</p>
							</div>
						</div>

						{/* Monthly Revenue */}
						<div
							className={`${flexLayouts.centerVertical} rounded-lg bg-purple-50 p-3`}
						>
							<div
								className={`mr-3 ${flexLayouts.center} h-8 w-8 rounded-lg bg-purple-100`}
							>
								<DollarSign className="h-4 w-4 text-purple-600" />
							</div>
							<div>
								<p className="text-caption text-muted-foreground">
									Monthly
								</p>
								<p className="stat-value text-lg">
									{formatCurrency(totalRent)}
								</p>
							</div>
						</div>
					</motion.div>

					{/* Action Buttons */}
					<div className={flexLayouts.rowGap2}>
						<Button
							variant="outline"
							size="sm"
							className="flex-1 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
							onClick={() => onView?.(property)}
						>
							<Eye className="mr-2 h-4 w-4" />
							View Details
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="flex-1 transition-colors hover:border-green-200 hover:bg-green-50 hover:text-green-700"
							onClick={() => onEdit?.(property)}
						>
							<Edit3 className="mr-2 h-4 w-4" />
							Edit
						</Button>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	)
}

// Base card components for backwards compatibility and composition
function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-header"
			className={cn(
				'@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
				className
			)}
			{...props}
		/>
	)
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-title"
			className={cn('leading-none font-semibold', className)}
			{...props}
		/>
	)
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-description"
			className={cn('text-muted-foreground text-sm', className)}
			{...props}
		/>
	)
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-action"
			className={cn(
				'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
				className
			)}
			{...props}
		/>
	)
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-content"
			className={cn('px-6', className)}
			{...props}
		/>
	)
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-footer"
			className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
			{...props}
		/>
	)
}

// Helper component for stats grids
interface StatsGridProps {
	children: React.ReactNode
	className?: string
	columns?: 2 | 3 | 4
}

export function StatsGrid({
	children,
	className,
	columns = 4
}: StatsGridProps) {
	const gridCols = {
		2: 'grid-cols-1 md:grid-cols-2',
		3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
		4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
	}

	return (
		<div className={cn('grid gap-4', gridCols[columns], className)}>
			{children}
		</div>
	)
}

// Backwards compatibility aliases (deprecated - use behavior props instead)
export function StatsCard(props: Omit<CardProps, 'behavior'>) {
	return <Card {...props} behavior="stats" />
}

export function PricingCard(props: Omit<CardProps, 'behavior'>) {
	return <Card {...props} behavior="pricing" />
}

export function PropertyCard(props: Omit<CardProps, 'behavior'>) {
	return <Card {...props} behavior="property" />
}

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent
}

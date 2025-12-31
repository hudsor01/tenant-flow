/**
 * PaymentOptionCard component
 * Displays payment method options with expandable pros/cons
 * Requirements: 4.1, 4.2, 4.3
 */

'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react'
import { Button } from '#components/ui/button'
import { Badge } from '#components/ui/badge'
import { cn } from '#lib/utils'

interface PaymentOptionCardProps {
	title: string
	description: string
	pros: string[]
	cons: string[]
	recommended?: boolean
	tourId?: string
	children?: React.ReactNode
}

export function PaymentOptionCard({
	title,
	description,
	pros,
	cons,
	recommended = false,
	tourId,
	children
}: PaymentOptionCardProps) {
	const [isExpanded, setIsExpanded] = useState(false)

	return (
		<div
			className={cn(
				'rounded-lg border bg-card p-6 space-y-4 transition-all',
				recommended && 'border-primary/50 bg-primary/5'
			)}
			data-tour={tourId}
		>
			{/* Header */}
			<div className="space-y-2">
				<div className="flex items-start justify-between gap-4">
					<h3 className="typography-large">{title}</h3>
					{recommended && (
						<Badge variant="default" className="shrink-0" role="status">
							Recommended
						</Badge>
					)}
				</div>
				<p className="text-muted-foreground">{description}</p>
			</div>

			{/* Action buttons (children) */}
			{children && <div className="pt-2">{children}</div>}

			{/* Expandable Details */}
			{(pros.length > 0 || cons.length > 0) && (
				<div className="space-y-3">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setIsExpanded(!isExpanded)}
						className="w-full justify-between"
						aria-label={isExpanded ? 'Hide details' : 'Show details'}
					>
						<span className="typography-small">
							{isExpanded ? 'Hide Details' : 'Show Details'}
						</span>
						{isExpanded ? (
							<ChevronUp className="size-4" />
						) : (
							<ChevronDown className="size-4" />
						)}
					</Button>

					{isExpanded && (
						<div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
							{/* Pros */}
							{pros.length > 0 && (
								<div className="space-y-2">
									<h4 className="text-sm font-semibold text-success flex items-center gap-2">
										<Check className="size-4" />
										Pros
									</h4>
									<ul className="space-y-1.5 ml-6">
										{pros.map((pro, index) => (
											<li key={index} className="text-sm text-muted-foreground">
												{pro}
											</li>
										))}
									</ul>
								</div>
							)}

							{/* Cons */}
							{cons.length > 0 && (
								<div className="space-y-2">
									<h4 className="text-sm font-semibold text-destructive flex items-center gap-2">
										<X className="size-4" />
										Cons
									</h4>
									<ul className="space-y-1.5 ml-6">
										{cons.map((con, index) => (
											<li key={index} className="text-sm text-muted-foreground">
												{con}
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	)
}

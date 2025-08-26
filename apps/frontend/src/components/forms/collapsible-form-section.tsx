'use client'

/**
 * Collapsible Form Section Client Component
 * Implements proper collapsible behavior with state management
 */

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface CollapsibleFormSectionProps {
	title?: string
	description?: string
	defaultExpanded?: boolean
	className?: string
	children: React.ReactNode
}

export function CollapsibleFormSection({
	title,
	description,
	defaultExpanded = true,
	className,
	children
}: CollapsibleFormSectionProps) {
	const [isExpanded, setIsExpanded] = useState(defaultExpanded)

	const toggleExpanded = () => {
		setIsExpanded(!isExpanded)
	}

	return (
		<Card className={cn('w-full', className)}>
			{title && (
<<<<<<< HEAD
				<CardHeader
=======
				<CardHeader 
>>>>>>> origin/main
					className="cursor-pointer select-none"
					onClick={toggleExpanded}
				>
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<h3 className="text-base font-semibold leading-none tracking-tight">
								{title}
							</h3>
							{description && (
<<<<<<< HEAD
								<p className="text-muted-foreground text-sm">
=======
								<p className="text-sm text-muted-foreground">
>>>>>>> origin/main
									{description}
								</p>
							)}
						</div>
						<div className="flex items-center">
							{isExpanded ? (
								<ChevronDown className="h-4 w-4 transition-transform" />
							) : (
								<ChevronRight className="h-4 w-4 transition-transform" />
							)}
						</div>
					</div>
				</CardHeader>
			)}
			{isExpanded && (
<<<<<<< HEAD
				<CardContent className="pt-0">{children}</CardContent>
			)}
		</Card>
	)
}
=======
				<CardContent className="pt-0">
					{children}
				</CardContent>
			)}
		</Card>
	)
}
>>>>>>> origin/main

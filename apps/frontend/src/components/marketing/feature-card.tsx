import { cn } from '@/lib/design-system'
import { TYPOGRAPHY_SCALE } from '@repo/shared'
import * as React from 'react'

export interface FeatureCardProps
	extends Omit<React.ComponentProps<'div'>, 'title'> {
	icon?: React.ComponentType<{ className?: string }>
	title: React.ReactNode
	description?: React.ReactNode
	accent?: 'primary' | 'accent' | 'muted' | 'subtle'
}

export function FeatureCard({
	className,
	icon: Icon,
	title,
	description,
	accent = 'primary',
	...props
}: FeatureCardProps) {
	const accentMap = {
		primary: 'from-primary to-primary/80',
		accent: 'from-primary/80 to-accent',
		muted: 'from-accent to-primary',
		subtle: 'from-primary/60 to-accent/60'
	}

	return (
		<div
			className={cn('card-elevated rounded-2xl p-6', className)}
			{...props}
		>
			<div className="flex items-start gap-4">
				{Icon && (
					<div
						className={cn(
							'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white',
							`bg-gradient-to-r ${accentMap[accent]}`
						)}
					>
						<Icon className="w-6 h-6" />
					</div>
				)}
				<div>
					<h3
						className="mb-1 text-foreground"
						style={TYPOGRAPHY_SCALE['heading-md']}
					>
						{title}
					</h3>
					{description && (
						<p
							className="text-muted-foreground"
							style={TYPOGRAPHY_SCALE['body-sm']}
						>
							{description}
						</p>
					)}
				</div>
			</div>
		</div>
	)
}

FeatureCard.displayName = 'FeatureCard'

export default FeatureCard

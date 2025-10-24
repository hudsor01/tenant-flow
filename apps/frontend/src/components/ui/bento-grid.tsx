import { ArrowRightIcon } from '@radix-ui/react-icons'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BentoGridProps extends ComponentPropsWithoutRef<'div'> {
	children: ReactNode
	className?: string
}

interface BentoCardProps extends ComponentPropsWithoutRef<'div'> {
	name: string
	className?: string
	background: ReactNode
	Icon: React.ElementType
	description: string
	href: string
	cta: string
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
	return (
		<div
			className={cn(
				'grid w-full auto-rows-[22rem] gap-4',
				className
			)}
			{...props}
		>
			{children}
		</div>
	)
}

const BentoCard = ({
	name,
	className = '',
	background,
	Icon,
	description,
	href,
	cta,
	...props
}: BentoCardProps) => (
	<div
		key={name}
		className={cn(
			// Layout
			'group relative flex flex-col justify-between overflow-hidden',
			// Border radius and styling
			'rounded-xl',
			// Background
			'bg-card',
			// Shadow and border
			'shadow-sm border',
			// Hover effects
			'hover:shadow-lg transition-all duration-300',
			className
		)}
		{...props}
	>
		<div className="absolute inset-0 z-0">{background}</div>
		<div className="relative z-10 p-6">
			<div className="flex transform-gpu flex-col gap-2 transition-all duration-300 lg:group-hover:-translate-y-2">
				<Icon className="size-12 origin-left transform-gpu text-foreground transition-all duration-300 group-hover:scale-90" />
				<h3 className="text-xl font-semibold text-foreground">
					{name}
				</h3>
				<p className="max-w-lg text-muted-foreground">
					{description}
				</p>
			</div>

			<div className="lg:hidden flex w-full flex-row items-center pt-4">
				<Button
					variant="link"
					asChild
					size="sm"
					className="p-0"
				>
					<a href={href}>
						{cta}
						<ArrowRightIcon className="ms-2 size-4" />
					</a>
				</Button>
			</div>
		</div>

		<div className="hidden lg:flex absolute bottom-0 w-full translate-y-10 transform-gpu flex-row items-center opacity-0 p-6 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
			<Button
				variant="link"
				asChild
				size="sm"
				className="p-0"
			>
				<a href={href}>
					{cta}
					<ArrowRightIcon className="ms-2 size-4" />
				</a>
			</Button>
		</div>

		<div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-accent/5" />
	</div>
)

export { BentoCard, BentoGrid }

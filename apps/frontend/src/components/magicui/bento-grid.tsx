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
	className: string
	background: ReactNode
	Icon: React.ElementType
	description: string
	href: string
	cta: string
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
	return (
		<div
			data-tokens="applied"
			className={cn(
				// Grid layout
				'grid w-full auto-rows-[22rem] grid-cols-3',
				// Gap using design tokens
				'gap-[var(--spacing-4)]',
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
	className,
	background,
	Icon,
	description,
	href,
	cta,
	...props
}: BentoCardProps) => (
	<div
		key={name}
		data-tokens="applied"
		className={cn(
			// Layout
			'group relative col-span-3 flex flex-col justify-between overflow-hidden',
			// Border radius using design tokens
			'rounded-[var(--radius-xxlarge)]',
			// Background using design tokens
			'bg-[var(--color-fill-primary)]',
			// Shadow using Apple shadow system
			'[box-shadow:var(--shadow-small)]',
			// Border using Apple separator color
			'[border:1px_solid_var(--color-separator)]',
			// Dark mode styles using design tokens
			'transform-gpu dark:bg-[var(--color-fill-primary)]',
			'dark:[border:1px_solid_var(--color-separator)]',
			'dark:[box-shadow:var(--shadow-medium)]',
			className
		)}
		{...props}
	>
		<div>{background}</div>
		<div className="p-[var(--spacing-4)]">
			<div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 transition-all duration-[var(--duration-standard)] ease-[var(--ease-smooth)] lg:group-hover:-translate-y-10">
				<Icon className="h-12 w-12 origin-left transform-gpu text-[var(--color-label-primary)] transition-all duration-[var(--duration-standard)] ease-[var(--ease-smooth)] group-hover:scale-75" />
				<h3 className="text-[var(--font-title-2)] font-[var(--font-weight-semibold)] text-[var(--color-label-primary)] dark:text-[var(--color-label-primary)]">
					{name}
				</h3>
				<p className="max-w-lg text-[var(--color-label-secondary)]">
					{description}
				</p>
			</div>

			<div
				data-tokens="applied"
				className={cn(
					'lg:hidden pointer-events-none flex w-full translate-y-0 transform-gpu flex-row items-center',
					// Transitions using design tokens
					'transition-all duration-[var(--duration-standard)] ease-[var(--ease-smooth)]',
					'group-hover:translate-y-0 group-hover:opacity-100'
				)}
			>
				<Button
					variant="link"
					asChild
					size="sm"
					className="pointer-events-auto p-0"
				>
					<a href={href}>
						{cta}
						<ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180" />
					</a>
				</Button>
			</div>
		</div>

		<div
			data-tokens="applied"
			className={cn(
				// Layout and positioning
				'hidden lg:flex pointer-events-none absolute bottom-0 w-full translate-y-10 transform-gpu flex-row items-center opacity-0',
				// Padding using design tokens
				'p-[var(--spacing-4)]',
				// Transitions using design tokens
				'transition-all duration-[var(--duration-standard)] ease-[var(--ease-smooth)]',
				'group-hover:translate-y-0 group-hover:opacity-100'
			)}
		>
			<Button
				variant="link"
				asChild
				size="sm"
				className="pointer-events-auto p-0"
			>
				<a href={href}>
					{cta}
					<ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180" />
				</a>
			</Button>
		</div>

		<div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-[var(--duration-standard)] group-hover:bg-[color-mix(in oklab,var(--color-label-primary) 8%, transparent)] group-hover:dark:bg-[color-mix(in oklab,var(--color-label-primary) 12%, transparent)]" />
	</div>
)

export { BentoCard, BentoGrid }

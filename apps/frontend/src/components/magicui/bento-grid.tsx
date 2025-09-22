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
				'tw-:grid tw-:w-full tw-:auto-rows-[22rem] tw-:grid-cols-3',
				// Gap using Apple design tokens
				'tw-:gap-[var(--spacing-4)]',
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
			'tw-:group tw-:relative tw-:col-span-3 tw-:flex tw-:flex-col tw-:justify-between tw-:overflow-hidden',
			// Border radius using Apple design tokens
			'tw-:rounded-[var(--radius-xxlarge)]',
			// Background using Apple design tokens
			'tw-:bg-[var(--color-fill-primary)]',
			// Shadow using Apple shadow system
			'tw-:[box-shadow:var(--shadow-small)]',
			// Border using Apple separator color
			'tw-:[border:1px_solid_var(--color-separator)]',
			// Dark mode styles using Apple design tokens
			'tw-:transform-gpu tw-:dark:bg-[var(--color-fill-primary)]',
			'tw-:dark:[border:1px_solid_var(--color-separator)]',
			'tw-:dark:[box-shadow:var(--shadow-medium)]',
			className
		)}
		{...props}
	>
		<div>{background}</div>
		<div className="tw-:p-[var(--spacing-4)]">
			<div className="tw-:pointer-events-none tw-:z-10 tw-:flex tw-:transform-gpu tw-:flex-col tw-:gap-1 tw-:transition-all tw-:duration-[var(--duration-standard)] tw-:ease-[var(--ease-smooth)] tw-:lg:group-hover:-translate-y-10">
				<Icon className="tw-:h-12 tw-:w-12 tw-:origin-left tw-:transform-gpu tw-:text-[var(--color-label-primary)] tw-:transition-all tw-:duration-[var(--duration-standard)] tw-:ease-[var(--ease-smooth)] tw-:group-hover:scale-75" />
				<h3 className="tw-:text-[var(--font-title-2)] tw-:font-[var(--font-weight-semibold)] tw-:text-[var(--color-label-primary)] tw-:dark:text-[var(--color-label-primary)]">
					{name}
				</h3>
				<p className="tw-:max-w-lg tw-:text-[var(--color-label-secondary)]">{description}</p>
			</div>

			<div
				data-tokens="applied"
				className={cn(
					'tw-:lg:hidden tw-:pointer-events-none tw-:flex tw-:w-full tw-:translate-y-0 tw-:transform-gpu tw-:flex-row tw-:items-center',
					// Transitions using Apple design tokens
					'tw-:transition-all tw-:duration-[var(--duration-standard)] tw-:ease-[var(--ease-smooth)]',
					'tw-:group-hover:translate-y-0 tw-:group-hover:opacity-100'
				)}
			>
				<Button
					variant="link"
					asChild
					size="sm"
					className="tw-:pointer-events-auto tw-:p-0"
				>
					<a href={href}>
						{cta}
						<ArrowRightIcon className="tw-:ms-2 tw-:h-4 tw-:w-4 tw-:rtl:rotate-180" />
					</a>
				</Button>
			</div>
		</div>

		<div
			data-tokens="applied"
			className={cn(
				// Layout and positioning
				'tw-:hidden tw-:lg:flex tw-:pointer-events-none tw-:absolute tw-:bottom-0 tw-:w-full tw-:translate-y-10 tw-:transform-gpu tw-:flex-row tw-:items-center tw-:opacity-0',
				// Padding using Apple design tokens
				'tw-:p-[var(--spacing-4)]',
				// Transitions using Apple design tokens
				'tw-:transition-all tw-:duration-[var(--duration-standard)] tw-:ease-[var(--ease-smooth)]',
				'tw-:group-hover:translate-y-0 tw-:group-hover:opacity-100'
			)}
		>
			<Button
				variant="link"
				asChild
				size="sm"
				className="tw-:pointer-events-auto tw-:p-0"
			>
				<a href={href}>
					{cta}
					<ArrowRightIcon className="tw-:ms-2 tw-:h-4 tw-:w-4 tw-:rtl:rotate-180" />
				</a>
			</Button>
		</div>

		<div className="tw-:pointer-events-none tw-:absolute tw-:inset-0 tw-:transform-gpu tw-:transition-all tw-:duration-[var(--duration-standard)] tw-:group-hover:bg-[color-mix(in oklab,var(--color-label-primary) 8%, transparent)] tw-:group-hover:dark:bg-[color-mix(in oklab,var(--color-label-primary) 12%, transparent)]" />
	</div>
)

export { BentoCard, BentoGrid }

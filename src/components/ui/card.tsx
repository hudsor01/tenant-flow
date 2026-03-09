import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '#lib/utils'

const cardVariants = cva(
	'bg-card text-card-foreground flex flex-col rounded-md border',
	{
		variants: {
			variant: {
				default: 'gap-6 py-6 shadow-sm',
				elevated: 'gap-6 py-6 shadow-md',
				interactive:
					'gap-6 py-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer',
				pricing:
					'h-full overflow-hidden border-border/60 bg-card/80 shadow-sm backdrop-blur transition-all ease-out hover:-translate-y-1 hover:shadow-md',
				pricingPopular:
					'h-full overflow-hidden border-border/60 bg-card/80 shadow-sm backdrop-blur transition-all ease-out hover:-translate-y-1 hover:shadow-md ring-2 ring-primary/70',
				stat: 'group relative p-6 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	}
)

function Card({
	className,
	variant,
	...props
}: ComponentProps<'div'> & VariantProps<typeof cardVariants>) {
	return <div className={cn(cardVariants({ variant }), className)} {...props} />
}

function CardHeader({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			className={cn(
				'@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-.card-action:grid-cols-[1fr_auto] [.border-b]:pb-6',
				className
			)}
			{...props}
		/>
	)
}

function CardTitle({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div className={cn('leading-none font-semibold', className)} {...props} />
	)
}

function CardDescription({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			className={cn('text-muted-foreground text-sm', className)}
			{...props}
		/>
	)
}

function CardAction({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			className={cn(
				'card-action col-start-2 row-span-2 row-start-1 self-start justify-self-end',
				className
			)}
			{...props}
		/>
	)
}

function CardContent({ className, ...props }: ComponentProps<'div'>) {
	return <div className={cn('px-6', className)} {...props} />
}

function CardFooter({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
			{...props}
		/>
	)
}

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
	cardVariants
}

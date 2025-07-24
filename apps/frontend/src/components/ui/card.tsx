import * as React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'

import { cn } from '@/lib/utils/css.utils'
// Simple card hover animation
const cardHover = {
	rest: { scale: 1, y: 0 },
	hover: { scale: 1.02, y: -4 }
}

interface CardProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'whileHover' | 'variants'> {
	animated?: boolean
	hoverEffect?: boolean
}

function Card({ className, animated = true, hoverEffect = true, ...props }: CardProps) {
	if (!animated) {
		// Only pass HTML div props to the plain div to avoid type errors
		const { children, style, ...rest } = props as React.HTMLAttributes<HTMLDivElement>;
		return (
			<div
				data-slot="card"
				className={cn(
					'card-modern bg-card text-card-foreground rounded-2xl border border-border/50 py-6 shadow-sm hover:shadow-md hover:border-border/80 hover:translate-y-[-2px] transition-all duration-200',
					className
				)}
				style={style}
				{...rest}
			>
				{children}
			</div>
		)
	}

	return (
		<motion.div
			data-slot="card"
			initial="rest"
			whileHover={hoverEffect ? "hover" : "rest"}
			variants={cardHover}
			className={cn(
				'card-modern bg-card text-card-foreground rounded-2xl border border-border/50 py-6 shadow-sm hover:shadow-md hover:border-border/80 transition-all duration-200',
				className
			)}
			{...props}
		/>
	)
}

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
			className={cn('card-title', className)}
			{...props}
		/>
	)
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-description"
			className={cn('card-description', className)}
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

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent
}

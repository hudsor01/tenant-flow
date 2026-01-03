import type { ComponentProps } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '#lib/utils'

const badgeVariants = cva(
	'inline-flex items-center justify-center border font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
	{
		variants: {
			variant: {
				// Base variants (shadcn defaults)
				default:
					'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
				secondary:
					'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
				destructive:
					'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
				outline:
					'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
				// Semantic status variants
				success:
					'border-success/20 bg-success/10 text-success [a&]:hover:bg-success/15',
				warning:
					'border-warning/20 bg-warning/10 text-warning [a&]:hover:bg-warning/15',
				info: 'border-info/20 bg-info/10 text-info [a&]:hover:bg-info/15',
				// Trust indicator variant
				trustIndicator:
					'rounded-full border-primary/20 bg-primary/5 text-primary backdrop-blur-sm'
			},
			size: {
				default: 'rounded-md px-2 py-0.5 text-xs [&>svg]:size-3 gap-1',
				sm: 'rounded-md px-1.5 py-0.5 text-[10px] [&>svg]:size-2.5 gap-0.5',
				lg: 'rounded-md px-3 py-1 text-sm [&>svg]:size-4 gap-1.5',
				// Trust indicator size
				trust: 'rounded-full px-4 py-2 text-sm gap-2 [&>svg]:size-4'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
)

function Badge({
	className,
	variant,
	size,
	asChild = false,
	...props
}: ComponentProps<'span'> &
	VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
	const Comp = asChild ? Slot : 'span'

	return (
		<Comp
			className={cn(badgeVariants({ variant, size }), className)}
			{...props}
		/>
	)
}

export { Badge, badgeVariants }

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '#lib/utils'

const buttonVariants = cva(
	'inline-flex inline-flex-center items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary/90',
				destructive:
					'bg-destructive text-destructive-foreground hover:bg-destructive/90',
				outline:
					'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
				secondary:
					'bg-secondary text-secondary-foreground hover:bg-secondary/80',
				ghost: 'hover:bg-accent hover:text-accent-foreground',
				link: 'text-primary underline-offset-4 hover:underline',
				premium:
					'bg-primary text-primary-foreground shadow-lg hover:shadow-xl font-bold',
				masculine:
					'bg-primary text-primary-foreground border-2 border-primary/20 hover:border-primary/30 shadow-lg hover:shadow-xl font-bold rounded-none'
			},
			size: {
				default: 'h-10 px-4 py-2 min-h-[2.75rem]', // Touch-friendly default
				sm: 'h-9 rounded-md px-3 min-h-[2.75rem]', // Touch-friendly small
				lg: 'h-11 rounded-md px-8 min-h-[2.75rem]', // Touch-friendly large
				xl: 'h-12 rounded-md px-10 min-h-[2.75rem]', // Touch-friendly extra large
				icon: 'h-10 w-10 min-h-[2.75rem] min-w-[2.75rem]', // Touch-friendly icon
				'icon-sm': 'h-8 w-8 min-h-[2.75rem] min-w-[2.75rem]', // Touch-friendly small icon
				'mobile-full': 'h-12 w-full rounded-md px-6 text-base font-semibold min-h-[2.75rem]', // Mobile-optimized full width
				'touch-friendly': 'h-12 px-6 py-3 text-base min-h-[2.75rem] min-w-[2.75rem]' // Enhanced touch targets
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
)

function Button({
	className,
	variant,
	size,
	asChild = false,
	...props
}: React.ComponentProps<'button'> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean
	}) {
	const Comp = asChild ? Slot : 'button'

	return (
		<Comp
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	)
}

export { Button, buttonVariants }

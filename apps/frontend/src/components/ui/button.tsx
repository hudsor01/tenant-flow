import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '#lib/utils'

const buttonVariants = cva(
	'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md typography-small ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			variant: {
				// Base variants (shadcn defaults)
				default: 'bg-primary text-primary-foreground hover:bg-primary/90',
				destructive:
					'bg-destructive text-destructive-foreground hover:bg-destructive/90',
				outline:
					'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
				secondary:
					'bg-secondary text-secondary-foreground hover:bg-secondary/80',
				ghost: 'hover:bg-accent hover:text-accent-foreground',
				link: 'text-primary underline-offset-4 hover:underline',
				// Premium variants
				premium:
					'bg-primary text-primary-foreground shadow-lg hover:shadow-xl font-bold',
				masculine:
					'bg-primary text-primary-foreground border-2 border-primary/20 hover:border-primary/30 shadow-lg hover:shadow-xl font-bold rounded-none',
				// Navbar variants
				navbar:
					'hidden sm:flex bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl rounded-lg',
				navbarGhost:
					'hidden sm:flex text-foreground hover:bg-accent/50 hover:text-foreground rounded-lg',
				// Lightbox variants
				lightboxNav:
					'absolute top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors'
			},
			size: {
				default: 'h-10 px-4 py-2 min-h-11',
				sm: 'h-9 rounded-md px-3 min-h-11',
				lg: 'h-11 rounded-md px-8 min-h-11',
				xl: 'h-12 rounded-md px-10 min-h-11',
				icon: 'h-10 w-10 min-h-11 min-w-11',
				'icon-sm': 'h-8 w-8 min-h-11 min-w-11',
				'icon-lg': 'h-12 w-12 min-h-11 min-w-11',
				'mobile-full':
					'h-12 w-full rounded-md px-6 text-base font-semibold min-h-11',
				'touch-friendly': 'h-12 px-6 py-3 text-base min-h-11 min-w-11',
				// Navbar sizes
				navbar: 'px-6 py-2.5'
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
}: ComponentProps<'button'> &
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

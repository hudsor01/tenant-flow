import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive relative isolate",
	{
		variants: {
			variant: {
				// Primary: Steel blue with gradient styling from modern-theme.css
				default:
					'bg-gradient-primary text-primary-foreground hover:shadow-md active:shadow-sm shadow-sm hover:translate-y-[-1px] active:translate-y-0 transition-all duration-200 border border-primary/10',

				// Secondary: Slate gray with gradient - sophisticated and neutral
				secondary:
					'bg-gradient-secondary text-secondary-foreground hover:shadow-md active:shadow-sm shadow-sm hover:translate-y-[-1px] active:translate-y-0 transition-all duration-200 border border-secondary/10',

				// Outline: Clean borders with professional hover state
				outline:
					'border border-border bg-transparent text-foreground hover:bg-gradient-subtle hover:border-primary/50 hover:shadow-sm transition-all duration-200 hover:translate-y-[-1px] active:translate-y-0',

				// Ghost: Minimal with smooth hover transitions
				ghost: 'text-foreground hover:bg-gradient-subtle hover:text-foreground shadow-none transition-all duration-200 hover:backdrop-blur-sm',

				// Link: Text-only with underline styling
				link: 'text-primary hover:text-primary/80 underline-offset-4 hover:underline font-medium shadow-none transition-colors duration-200',

				// Destructive: Professional red for danger actions
				destructive:
					'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80 hover:shadow-md active:shadow-sm shadow-sm transition-all duration-200 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 hover:translate-y-[-1px] active:translate-y-0',

				// Accent: Deep teal with gradient for special actions
				accent: 'bg-gradient-accent text-accent-foreground hover:shadow-md active:shadow-sm shadow-sm hover:translate-y-[-1px] active:translate-y-0 transition-all duration-200 border border-accent/10',

				// Premium: Enhanced CTA with professional glow effect using cta-glow from modern-theme.css
				premium:
					'bg-gradient-steel-soft text-primary-foreground hover:shadow-lg hover:shadow-primary/20 hover:translate-y-[-2px] active:translate-y-0 shadow-md relative overflow-hidden transition-all duration-300 border border-primary/20 hover:border-accent/30 cta-magnetic',

				// CTA: Ultra-premium main call-to-action with glow and animations
				cta: 'bg-gradient-accent-primary text-primary-foreground hover:shadow-xl hover:shadow-accent/20 hover:translate-y-[-3px] active:translate-y-0 shadow-lg border border-accent/30 hover:border-accent/50 transition-all duration-300 overflow-hidden cta-glow cta-magnetic',

				// Steel: Modern steel blue professional theme
				steel: 'bg-gradient-steel-deep text-white hover:shadow-lg hover:translate-y-[-2px] active:translate-y-0 shadow-md transition-all duration-300 border border-slate-700/50'
			},
			size: {
				sm: 'h-8 px-3 text-xs rounded-md',
				default: 'h-10 px-4 text-sm rounded-lg',
				lg: 'h-11 px-6 text-base rounded-lg',
				xl: 'h-12 px-8 text-lg rounded-xl',
				cta: 'h-12 px-8 text-base rounded-xl font-semibold tracking-tight',
				icon: 'size-10 p-0 rounded-lg'
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
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	)
}

export { Button, buttonVariants }

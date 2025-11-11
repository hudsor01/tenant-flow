import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '#lib/utils'

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 relative overflow-hidden",
	{
		variants: {
			variant: {
				default:
					'bg-linear-to-br from-slate-800 to-slate-900 text-white shadow-premium hover:shadow-premium-lg hover:from-slate-700 hover:to-slate-800 border border-slate-700/50 hover:border-slate-600/50 active:scale-[0.98] before:absolute before:inset-0 before:bg-linear-to-r before:from-white/0 before:via-white/10 before:to-white/0 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300',
				destructive:
					'bg-linear-to-br from-red-600 to-red-700 text-white shadow-premium hover:shadow-premium-lg hover:from-red-500 hover:to-red-600 border border-red-500/50 hover:border-red-400/50 active:scale-[0.98] before:absolute before:inset-0 before:bg-linear-to-r before:from-white/0 before:via-white/20 before:to-white/0 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300',
				outline:
					'border-2 border-slate-300 bg-white shadow-premium-sm hover:bg-slate-50 hover:border-slate-400 hover:shadow-premium text-slate-700 hover:text-slate-900 active:scale-[0.98] dark:bg-slate-950 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:border-slate-600 dark:hover:text-white',
				secondary:
					'bg-linear-to-br from-slate-100 to-slate-200 text-slate-900 shadow-premium-sm hover:shadow-premium hover:from-slate-200 hover:to-slate-300 border border-slate-200 hover:border-slate-300 active:scale-[0.98] dark:from-slate-800 dark:to-slate-900 dark:text-slate-100 dark:hover:from-slate-700 dark:hover:to-slate-800 dark:border-slate-700 dark:hover:border-slate-600',
				ghost:
					'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition-all duration-200 active:scale-[0.98]',
				link: 'text-slate-600 underline-offset-4 hover:underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium',
				premium:
					'bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-premium-xl hover:shadow-premium-2xl hover:from-slate-800 hover:via-slate-700 hover:to-slate-800 border border-slate-700/30 hover:border-slate-600/50 active:scale-[0.98] before:absolute before:inset-0 before:bg-linear-to-r before:from-transparent before:via-white/5 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 font-bold tracking-wide',
				masculine:
					'bg-linear-to-br from-slate-800 to-slate-900 text-white shadow-premium-lg hover:shadow-premium-xl hover:from-slate-700 hover:to-slate-800 border-2 border-slate-600 hover:border-slate-500 active:scale-[0.98] font-bold tracking-wide rounded-none before:absolute before:inset-0 before:bg-linear-to-r before:from-transparent before:via-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300'
			},
			size: {
				default: 'h-12 px-6 py-3 has-[>svg]:px-5', // 48px - premium touch target
				sm: 'h-10 px-4 py-2 has-[>svg]:px-3 rounded-md gap-1.5', // 40px - smaller but still premium
				lg: 'h-14 px-8 py-4 has-[>svg]:px-6', // 56px - large premium touch target
				xl: 'h-16 px-10 py-5 has-[>svg]:px-8', // 64px - extra large premium
				icon: 'size-12', // 48px - premium touch-friendly
				'icon-sm': 'size-10', // 40px - smaller icon
				'icon-lg': 'size-14', // 56px - large icon
				'icon-xl': 'size-16' // 64px - extra large icon
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

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '#lib/utils'

const inputVariants = cva(
	'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
	{
		variants: {
			variant: {
				default: '',
				invalid: 'border-destructive focus-visible:ring-destructive'
			},
			inputSize: {
				default: 'h-11',
				sm: 'h-9 px-2 py-1 text-xs',
				lg: 'h-12 px-4 py-2',
				xl: 'h-14 px-4 py-3 text-base'
			}
		},
		defaultVariants: {
			variant: 'default',
			inputSize: 'default'
		}
	}
)

function Input({
	className,
	type,
	variant,
	inputSize,
	...props
}: React.ComponentProps<'input'> & VariantProps<typeof inputVariants>) {
	return (
		<input
			type={type}
			className={cn(inputVariants({ variant, inputSize }), className)}
			{...props}
		/>
	)
}

export { Input, inputVariants }

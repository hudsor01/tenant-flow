import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import type { VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils/css.utils'
import { buttonVariants } from './button-variants'

const Button = React.forwardRef<
	HTMLButtonElement,
	React.ComponentProps<'button'> &
		VariantProps<typeof buttonVariants> & {
			asChild?: boolean
		}
>(({ className, variant, size, asChild = false, ...props }, ref) => {
	const Comp = asChild ? Slot : 'button'

	return (
		<Comp
			ref={ref}
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	)
})

Button.displayName = 'Button'

export { Button }

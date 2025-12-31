import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '#lib/utils'

const skeletonVariants = cva('animate-pulse bg-muted', {
	variants: {
		variant: {
			default: 'rounded-md',
			circle: 'rounded-full',
			text: 'rounded h-4',
			card: 'rounded-xl'
		},
		size: {
			default: '',
			sm: 'h-4',
			md: 'h-8',
			lg: 'h-12',
			xl: 'h-16',
			avatar: 'size-10 rounded-full',
			'avatar-sm': 'size-8 rounded-full',
			'avatar-lg': 'size-14 rounded-full',
			icon: 'size-6 rounded-md',
			button: 'h-10 w-24 rounded-md',
			input: 'h-10 w-full rounded-md'
		}
	},
	defaultVariants: {
		variant: 'default',
		size: 'default'
	}
})

function Skeleton({
	className,
	variant,
	size,
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof skeletonVariants>) {
	return (
		<div
			className={cn(skeletonVariants({ variant, size }), className)}
			{...props}
		/>
	)
}

export { Skeleton, skeletonVariants }

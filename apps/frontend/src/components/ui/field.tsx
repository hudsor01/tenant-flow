'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { useMemo } from 'react'

import { Label } from '#components/ui/label'
import { Separator } from '#components/ui/separator'
import { cn } from '#lib/utils'

function FieldSet({ className, ...props }: React.ComponentProps<'fieldset'>) {
	return (
		<fieldset
			className={cn(
				'flex flex-col gap-(--spacing-6)',
				'has-[>.radio-group]:gap-3',
				className
			)}
			{...props}
		/>
	)
}

function FieldLegend({
	className,
	variant = 'legend',
	...props
}: React.ComponentProps<'legend'> & { variant?: 'legend' | 'label' }) {
	return (
		<legend
			data-variant={variant}
			className={cn(
				'mb-3 font-medium',
				'data-[variant=legend]:text-base',
				'data-[variant=label]:text-sm',
				className
			)}
			{...props}
		/>
	)
}

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn(
				'group/field-group @container/field-group flex w-full flex-col gap-7 [&>.group\\/field-group]:gap-(--spacing-4)',
				className
			)}
			{...props}
		/>
	)
}

const fieldVariants = cva(
	'group/field flex w-full gap-3 data-[invalid=true]:text-destructive',
	{
		variants: {
			orientation: {
				vertical: ['flex-col [&>*]:w-full [&>.sr-only]:w-auto'],
				horizontal: [
					'flex-row items-center',
					'[&>.group\\/field-label]:flex-auto',
					'has-[>.group\\/field-content]:items-start has-[>.group\\/field-content]:[&>.size-4]:mt-px'
				],
				responsive: [
					'flex-col [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:flex-row @md/field-group:items-center @md/field-group:[&>*]:w-auto',
					'@md/field-group:[&>.group\\/field-label]:flex-auto',
					'@md/field-group:has-[>.group\\/field-content]:items-start @md/field-group:has-[>.group\\/field-content]:[&>.size-4]:mt-px'
				]
			}
		},
		defaultVariants: {
			orientation: 'vertical'
		}
	}
)

function Field({
	className,
	orientation = 'vertical',
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof fieldVariants>) {
	return (
		<div
			data-orientation={orientation}
			className={cn(fieldVariants({ orientation }), className)}
			{...props}
		/>
	)
}

function FieldContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn(
				'group/field-content flex flex-1 flex-col gap-1.5 leading-snug',
				className
			)}
			{...props}
		/>
	)
}

function FieldLabel({
	className,
	...props
}: React.ComponentProps<typeof Label>) {
	return (
		<Label
			className={cn(
				'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50',
				'has-[>.group\\/field]:w-full has-[>.group\\/field]:flex-col has-[>.group\\/field]:rounded-md has-[>.group\\/field]:border [&>.group\\/field]:p-4',
				'has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary dark:has-data-[state=checked]:bg-primary/10',
				className
			)}
			{...props}
		/>
	)
}

function FieldTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn(
				'flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50',
				className
			)}
			{...props}
		/>
	)
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
	return (
		<p
			className={cn(
				'text-muted-foreground text-sm leading-normal font-normal group-has-[[data-orientation=horizontal]]/field:text-balance',
				'last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5',
				'[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
				className
			)}
			{...props}
		/>
	)
}

function FieldSeparator({
	children,
	className,
	...props
}: React.ComponentProps<'div'> & {
	children?: React.ReactNode
}) {
	return (
		<div
			data-content={!!children}
			className={cn(
				'relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2',
				className
			)}
			{...props}
		>
			<Separator className="absolute inset-0 top-1/2" />
			{children && (
				<span
					className="bg-background text-muted-foreground relative mx-auto block w-fit px-2"
				>
					{children}
				</span>
			)}
		</div>
	)
}

function FieldError({
	className,
	children,
	errors,
	...props
}: React.ComponentProps<'div'> & {
	errors?: Array<{ message?: string } | string | null | undefined>
}) {
	const content = useMemo(() => {
		if (children) {
			return children
		}

		if (!errors) {
			return null
		}

		const messages = errors
			.map(error => {
				if (!error) {
					return null
				}
				if (typeof error === 'string') {
					return error
				}
				if (typeof error === 'object' && 'message' in error) {
					const message = error?.message
					return typeof message === 'string' ? message : null
				}
				return null
			})
			.filter(Boolean) as string[]

		if (messages.length === 0) {
			return null
		}

		if (messages.length === 1) {
			return messages[0]
		}

		return (
			<ul className="ml-4 flex list-disc flex-col gap-1">
				{messages.map((message, index) => (
					<li key={index}>{message}</li>
				))}
			</ul>
		)
	}, [children, errors])

	if (!content) {
		return null
	}

	return (
		<div
			role="alert"
			aria-live="polite"
			className={cn('text-destructive text-sm font-normal', className)}
			{...props}
		>
			{content}
		</div>
	)
}

export {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSeparator,
	FieldSet,
	FieldTitle
}

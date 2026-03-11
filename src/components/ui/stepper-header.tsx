'use client'

import type { ComponentProps, ReactNode } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { Check } from 'lucide-react'
import { cn } from '#lib/utils'
import {
	CONTENT_NAME,
	DESCRIPTION_NAME,
	INDICATOR_NAME,
	SEPARATOR_NAME,
	TITLE_NAME,
	useStepperContext,
	useStepperItemContext,
	useStore,
	type DivProps,
	type DataState
} from './stepper-context'
import { getId, getDataState } from './stepper-utils'

interface StepperIndicatorProps extends Omit<DivProps, 'children'> {
	children?: ReactNode | ((dataState: DataState) => ReactNode)
}

function StepperIndicator(props: StepperIndicatorProps) {
	const { className, children, asChild, ref, ...indicatorProps } = props
	const context = useStepperContext(INDICATOR_NAME)
	const itemContext = useStepperItemContext(INDICATOR_NAME)
	const value = useStore(state => state.value)
	const itemValue = itemContext.value
	const stepState = useStore(state => state.steps.get(itemValue))
	const steps = useStore(state => state.steps)

	const stepPosition = Array.from(steps.keys()).indexOf(itemValue) + 1

	const dataState = getDataState(value, itemValue, stepState, steps)

	const IndicatorPrimitive = asChild ? Slot : 'div'

	return (
		<IndicatorPrimitive
			data-state={dataState}
			data-slot="stepper-indicator"
			dir={context.dir}
			{...indicatorProps}
			ref={ref}
			className={cn(
				'flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-muted bg-background font-medium text-muted-foreground text-sm transition-colors data-[state=active]:border-primary data-[state=completed]:border-primary data-[state=active]:bg-primary data-[state=completed]:bg-primary data-[state=active]:text-primary-foreground data-[state=completed]:text-primary-foreground',
				className
			)}
		>
			{typeof children === 'function' ? (
				children(dataState)
			) : children ? (
				children
			) : dataState === 'completed' ? (
				<Check className="size-4" />
			) : (
				stepPosition
			)}
		</IndicatorPrimitive>
	)
}

interface StepperSeparatorProps extends DivProps {
	forceMount?: boolean
}

function StepperSeparator(props: StepperSeparatorProps) {
	const {
		className,
		asChild,
		forceMount = false,
		ref,
		...separatorProps
	} = props

	const context = useStepperContext(SEPARATOR_NAME)
	const itemContext = useStepperItemContext(SEPARATOR_NAME)
	const value = useStore(state => state.value)
	const orientation = context.orientation

	const steps = useStore(state => state.steps)
	const stepIndex = Array.from(steps.keys()).indexOf(itemContext.value)

	const isLastStep = stepIndex === steps.size - 1

	if (isLastStep && !forceMount) {
		return null
	}

	const dataState = getDataState(
		value,
		itemContext.value,
		itemContext.stepState,
		steps,
		'separator'
	)

	const SeparatorPrimitive = asChild ? Slot : 'div'

	return (
		<SeparatorPrimitive
			role="separator"
			aria-hidden="true"
			aria-orientation={orientation}
			data-orientation={orientation}
			data-state={dataState}
			data-slot="stepper-separator"
			dir={context.dir}
			{...separatorProps}
			ref={ref}
			className={cn(
				'bg-border transition-colors data-[state=active]:bg-primary data-[state=completed]:bg-primary',
				orientation === 'horizontal' ? 'h-px flex-1' : 'h-10 w-px',
				className
			)}
		/>
	)
}

interface StepperTitleProps extends ComponentProps<'span'> {
	asChild?: boolean
}

function StepperTitle(props: StepperTitleProps) {
	const { className, asChild, ref, ...titleProps } = props

	const context = useStepperContext(TITLE_NAME)
	const itemContext = useStepperItemContext(TITLE_NAME)

	const titleId = getId(context.id, 'title', itemContext.value)

	const TitlePrimitive = asChild ? Slot : 'span'

	return (
		<TitlePrimitive
			id={titleId}
			data-slot="title"
			dir={context.dir}
			{...titleProps}
			ref={ref}
			className={cn('font-medium text-sm', className)}
		/>
	)
}

interface StepperDescriptionProps extends ComponentProps<'span'> {
	asChild?: boolean
}

function StepperDescription(props: StepperDescriptionProps) {
	const { className, asChild, ref, ...descriptionProps } = props
	const context = useStepperContext(DESCRIPTION_NAME)
	const itemContext = useStepperItemContext(DESCRIPTION_NAME)

	const descriptionId = getId(context.id, 'description', itemContext.value)

	const DescriptionPrimitive = asChild ? Slot : 'span'

	return (
		<DescriptionPrimitive
			id={descriptionId}
			data-slot="description"
			dir={context.dir}
			{...descriptionProps}
			ref={ref}
			className={cn('text-muted-foreground text-xs', className)}
		/>
	)
}

interface StepperContentProps extends DivProps {
	value: string
	forceMount?: boolean
}

function StepperContent(props: StepperContentProps) {
	const {
		value: valueProp,
		asChild,
		forceMount = false,
		ref,
		className,
		...contentProps
	} = props

	const context = useStepperContext(CONTENT_NAME)
	const value = useStore(state => state.value)

	const contentId = getId(context.id, 'content', valueProp)
	const triggerId = getId(context.id, 'trigger', valueProp)

	if (valueProp !== value && !forceMount) return null

	const ContentPrimitive = asChild ? Slot : 'div'

	return (
		<ContentPrimitive
			id={contentId}
			role="tabpanel"
			aria-labelledby={triggerId}
			data-slot="stepper-content"
			dir={context.dir}
			{...contentProps}
			ref={ref}
			className={cn('flex-1 outline-none', className)}
		/>
	)
}

export {
	StepperIndicator,
	StepperSeparator,
	StepperTitle,
	StepperDescription,
	StepperContent
}

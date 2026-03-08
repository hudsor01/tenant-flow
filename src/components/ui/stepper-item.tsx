'use client'

import { useMemo } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '#lib/utils'
import {
	ITEM_NAME,
	StepperItemContext,
	useIsomorphicLayoutEffect,
	useStepperContext,
	useStore,
	useStoreContext,
	type DivProps
} from './stepper-context'
import { getDataState } from './stepper-utils'
import { StepperTrigger } from './stepper-trigger'

interface StepperItemProps extends DivProps {
	value: string
	completed?: boolean
	disabled?: boolean
}

function StepperItem(props: StepperItemProps) {
	const {
		value: itemValue,
		completed = false,
		disabled = false,
		asChild,
		className,
		children,
		ref,
		...itemProps
	} = props

	const context = useStepperContext(ITEM_NAME)
	const store = useStoreContext(ITEM_NAME)
	const orientation = context.orientation
	const value = useStore(state => state.value)

	useIsomorphicLayoutEffect(() => {
		store.addStep(itemValue, completed, disabled)
		return () => {
			store.removeStep(itemValue)
		}
	}, [itemValue, completed, disabled])

	useIsomorphicLayoutEffect(() => {
		store.setStep(itemValue, completed, disabled)
	}, [itemValue, completed, disabled])

	const stepState = useStore(state => state.steps.get(itemValue))
	const steps = useStore(state => state.steps)
	const dataState = getDataState(value, itemValue, stepState, steps)

	const itemContextValue = useMemo(
		() => ({ value: itemValue, stepState }),
		[itemValue, stepState]
	)

	const ItemPrimitive = asChild ? Slot : 'div'

	return (
		<StepperItemContext.Provider value={itemContextValue}>
			<ItemPrimitive
				data-disabled={stepState?.disabled ? '' : undefined}
				data-orientation={orientation}
				data-state={dataState}
				data-slot="stepper-item"
				dir={context.dir}
				{...itemProps}
				ref={ref}
				className={cn(
					'relative flex not-last:flex-1 items-center',
					orientation === 'horizontal' ? 'flex-row' : 'flex-col',
					className
				)}
			>
				{children}
			</ItemPrimitive>
		</StepperItemContext.Provider>
	)
}

export { StepperItem, StepperTrigger }

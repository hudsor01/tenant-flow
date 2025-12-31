'use client'

import { Slot } from '@radix-ui/react-slot'
import * as React from 'react'
import {
	NEXT_NAME,
	PREV_NAME,
	useStore,
	useStoreContext,
	type ButtonProps
} from './stepper-context'

function StepperPrev(props: ButtonProps) {
	const { asChild, disabled, ...prevProps } = props

	const store = useStoreContext(PREV_NAME)
	const value = useStore(state => state.value)
	const steps = useStore(state => state.steps)

	const stepKeys = Array.from(steps.keys())
	const currentIndex = value ? stepKeys.indexOf(value) : -1
	const isDisabled = disabled || currentIndex <= 0

	const handlePrevClick = prevProps.onClick
	const onClick = React.useCallback(
		async (event: React.MouseEvent<HTMLButtonElement>) => {
			handlePrevClick?.(event)
			if (event.defaultPrevented || isDisabled) return

			const prevIndex = Math.max(currentIndex - 1, 0)
			const prevStepValue = stepKeys[prevIndex]

			if (prevStepValue) {
				store.setState('value', prevStepValue)
			}
		},
		// Intentionally depend on specific callback, not entire prevProps object
		[handlePrevClick, isDisabled, currentIndex, stepKeys, store]
	)

	const PrevPrimitive = asChild ? Slot : 'button'

	return (
		<PrevPrimitive
			type="button"
			data-slot="stepper-prev"
			disabled={isDisabled}
			{...prevProps}
			onClick={onClick}
		/>
	)
}

function StepperNext(props: ButtonProps) {
	const { asChild, disabled, ...nextProps } = props

	const store = useStoreContext(NEXT_NAME)
	const value = useStore(state => state.value)
	const steps = useStore(state => state.steps)

	const stepKeys = Array.from(steps.keys())
	const currentIndex = value ? stepKeys.indexOf(value) : -1
	const isDisabled = disabled || currentIndex >= stepKeys.length - 1

	const handleNextClick = nextProps.onClick
	const onClick = React.useCallback(
		async (event: React.MouseEvent<HTMLButtonElement>) => {
			handleNextClick?.(event)
			if (event.defaultPrevented || isDisabled) return

			const nextIndex = Math.min(currentIndex + 1, stepKeys.length - 1)
			const nextStepValue = stepKeys[nextIndex]

			if (nextStepValue) {
				await store.setStateWithValidation(nextStepValue, 'next')
			}
		},
		// Intentionally depend on specific callback, not entire nextProps object
		[handleNextClick, isDisabled, currentIndex, stepKeys, store]
	)

	const NextPrimitive = asChild ? Slot : 'button'

	return (
		<NextPrimitive
			type="button"
			data-slot="stepper-next"
			disabled={isDisabled}
			{...nextProps}
			onClick={onClick}
		/>
	)
}

export { StepperPrev, StepperNext }

'use client'

import { useEffect, useRef } from 'react'
import type {
	FocusEvent,
	KeyboardEvent as ReactKeyboardEvent,
	MouseEvent
} from 'react'
import { Slot } from '@radix-ui/react-slot'
import { useComposedRefs } from '#lib/compose-refs'
import { cn } from '#lib/utils'
import {
	ARROW_KEYS,
	TRIGGER_NAME,
	useFocusContext,
	useIsomorphicLayoutEffect,
	useStepperContext,
	useStepperItemContext,
	useStore,
	useStoreContext,
	type ButtonProps,
	type NavigationDirection,
	type TriggerElement
} from './stepper-context'
import { getDataState, getFocusIntent, getId, focusFirst, wrapArray } from './stepper-utils'

function StepperTrigger(props: ButtonProps) {
	const { asChild, disabled, className, ref, ...triggerProps } = props

	const context = useStepperContext(TRIGGER_NAME)
	const itemContext = useStepperItemContext(TRIGGER_NAME)
	const store = useStoreContext(TRIGGER_NAME)
	const focusContext = useFocusContext(TRIGGER_NAME)
	const value = useStore(state => state.value)
	const itemValue = itemContext.value
	const stepState = useStore(state => state.steps.get(itemValue))
	const activationMode = context.activationMode
	const orientation = context.orientation
	const loop = context.loop

	const steps = useStore(state => state.steps)
	const stepIndex = Array.from(steps.keys()).indexOf(itemValue)
	const stepPosition = stepIndex + 1
	const stepCount = steps.size

	const triggerId = getId(context.id, 'trigger', itemValue)
	const contentId = getId(context.id, 'content', itemValue)
	const titleId = getId(context.id, 'title', itemValue)
	const descriptionId = getId(context.id, 'description', itemValue)

	const isDisabled = context.disabled || stepState?.disabled || disabled
	const isActive = value === itemValue
	const isTabStop = focusContext.tabStopId === triggerId
	const dataState = getDataState(value, itemValue, stepState, steps)

	const triggerRef = useRef<TriggerElement>(null)
	const composedRef = useComposedRefs(ref, triggerRef)
	const isArrowKeyPressedRef = useRef(false)
	const isMouseClickRef = useRef(false)

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (ARROW_KEYS.includes(event.key)) isArrowKeyPressedRef.current = true
		}
		function onKeyUp() { isArrowKeyPressedRef.current = false }
		document.addEventListener('keydown', onKeyDown)
		document.addEventListener('keyup', onKeyUp)
		return () => {
			document.removeEventListener('keydown', onKeyDown)
			document.removeEventListener('keyup', onKeyUp)
		}
	}, [])

	useIsomorphicLayoutEffect(() => {
		focusContext.onItemRegister({
			id: triggerId, ref: triggerRef, value: itemValue,
			active: isTabStop, disabled: !!isDisabled
		})
		if (!isDisabled) focusContext.onFocusableItemAdd()
		return () => {
			focusContext.onItemUnregister(triggerId)
			if (!isDisabled) focusContext.onFocusableItemRemove()
		}
	}, [focusContext, triggerId, itemValue, isTabStop, isDisabled])

	const handleTriggerClick = triggerProps.onClick
	const onClick = async (event: MouseEvent<TriggerElement>) => {
		handleTriggerClick?.(event)
		if (event.defaultPrevented) return
		if (!isDisabled && !context.nonInteractive) {
			const currentStepIndex = Array.from(steps.keys()).indexOf(value ?? '')
			const targetStepIndex = Array.from(steps.keys()).indexOf(itemValue)
			const direction = targetStepIndex > currentStepIndex ? 'next' : 'prev'
			await store.setStateWithValidation(itemValue, direction)
		}
	}

	const handleTriggerFocus = triggerProps.onFocus
	const onFocus = async (event: FocusEvent<TriggerElement>) => {
		handleTriggerFocus?.(event)
		if (event.defaultPrevented) return
		focusContext.onItemFocus(triggerId)
		const isKeyboardFocus = !isMouseClickRef.current
		if (!isActive && !isDisabled && activationMode !== 'manual' && !context.nonInteractive && isKeyboardFocus) {
			const currentStepIndex = Array.from(steps.keys()).indexOf(value || '')
			const targetStepIndex = Array.from(steps.keys()).indexOf(itemValue)
			const direction = targetStepIndex > currentStepIndex ? 'next' : 'prev'
			await store.setStateWithValidation(itemValue, direction)
		}
		isMouseClickRef.current = false
	}

	const handleTriggerKeyDown = triggerProps.onKeyDown
	const onKeyDown = async (event: ReactKeyboardEvent<TriggerElement>) => {
		handleTriggerKeyDown?.(event)
		if (event.defaultPrevented) return
		if (event.key === 'Enter' && context.nonInteractive) {
			event.preventDefault()
			return
		}
		if ((event.key === 'Enter' || event.key === ' ') && activationMode === 'manual' && !context.nonInteractive) {
			event.preventDefault()
			if (!isDisabled && triggerRef.current) triggerRef.current.click()
			return
		}
		if (event.key === 'Tab' && event.shiftKey) {
			focusContext.onItemShiftTab()
			return
		}
		if (event.target !== event.currentTarget) return
		const focusIntentResult = getFocusIntent(event, context.dir, orientation)
		if (focusIntentResult !== undefined) {
			if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
			event.preventDefault()
			const items = focusContext.getItems().filter(item => !item.disabled)
			let candidateRefs = items.map(item => item.ref)
			if (focusIntentResult === 'last') {
				candidateRefs.reverse()
			} else if (focusIntentResult === 'prev' || focusIntentResult === 'next') {
				if (focusIntentResult === 'prev') candidateRefs.reverse()
				const currentIndex = candidateRefs.findIndex(r => r.current === event.currentTarget)
				candidateRefs = loop ? wrapArray(candidateRefs, currentIndex + 1) : candidateRefs.slice(currentIndex + 1)
			}
			if (store.hasValidation() && candidateRefs.length > 0) {
				const nextRef = candidateRefs[0]
				const nextElement = nextRef?.current
				const nextItem = items.find(item => item.ref.current === nextElement)
				if (nextItem && nextItem.value !== itemValue) {
					const currentStepIndex = Array.from(steps.keys()).indexOf(value || '')
					const targetStepIndex = Array.from(steps.keys()).indexOf(nextItem.value)
					const direction: NavigationDirection = targetStepIndex > currentStepIndex ? 'next' : 'prev'
					if (direction === 'next') {
						const isValid = await store.setStateWithValidation(nextItem.value, direction)
						if (!isValid) return
					} else {
						store.setState('value', nextItem.value)
					}
					queueMicrotask(() => nextElement?.focus())
					return
				}
			}
			queueMicrotask(() => focusFirst(candidateRefs))
		}
	}

	const handleTriggerMouseDown = triggerProps.onMouseDown
	const onMouseDown = (event: MouseEvent<TriggerElement>) => {
		handleTriggerMouseDown?.(event)
		if (event.defaultPrevented) return
		isMouseClickRef.current = true
		if (isDisabled) event.preventDefault()
		else focusContext.onItemFocus(triggerId)
	}

	const TriggerPrimitive = asChild ? Slot : 'button'

	return (
		<TriggerPrimitive
			id={triggerId}
			role="tab"
			type="button"
			aria-controls={contentId}
			aria-current={isActive ? 'step' : undefined}
			aria-describedby={`${titleId} ${descriptionId}`}
			aria-posinset={stepPosition}
			aria-selected={isActive}
			aria-setsize={stepCount}
			data-disabled={isDisabled ? '' : undefined}
			data-state={dataState}
			data-slot="stepper-trigger"
			disabled={isDisabled}
			tabIndex={isTabStop ? 0 : -1}
			{...triggerProps}
			ref={composedRef}
			className={cn(
				"inline-flex items-center justify-center gap-3 rounded-md text-left outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				'not-has-data-[slot=description]:rounded-full not-has-data-[slot=title]:rounded-full',
				className
			)}
			onClick={onClick}
			onFocus={onFocus}
			onKeyDown={onKeyDown}
			onMouseDown={onMouseDown}
		/>
	)
}

export { StepperTrigger }

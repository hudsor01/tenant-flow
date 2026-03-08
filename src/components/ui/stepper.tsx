'use client'

import { useId, useMemo } from 'react'
import { useDirection } from '@radix-ui/react-direction'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '#lib/utils'
import {
	StoreContext,
	StepperContext,
	useAsRef,
	useIsomorphicLayoutEffect,
	useLazyRef,
	useStore,
	type DivProps,
	type StepState,
	type StepperContextValue,
	type Store,
	type StoreState
} from './stepper-context'
import { StepperList } from './stepper-list'
import { StepperItem, StepperTrigger } from './stepper-item'
import {
	StepperContent,
	StepperDescription,
	StepperIndicator,
	StepperSeparator,
	StepperTitle
} from './stepper-header'
import { StepperNext, StepperPrev } from './stepper-navigation'

interface StepperRootProps extends DivProps {
	value?: string
	defaultValue?: string
	onValueChange?: (value: string) => void
	onValueComplete?: (value: string, completed: boolean) => void
	onValueAdd?: (value: string) => void
	onValueRemove?: (value: string) => void
	onValidate?: (
		value: string,
		direction: 'next' | 'prev'
	) => boolean | Promise<boolean>
	activationMode?: 'automatic' | 'manual'
	dir?: 'ltr' | 'rtl'
	orientation?: 'horizontal' | 'vertical'
	disabled?: boolean
	loop?: boolean
	nonInteractive?: boolean
}

function StepperRoot(props: StepperRootProps) {
	const {
		value,
		defaultValue,
		onValueChange,
		onValueComplete,
		onValueAdd,
		onValueRemove,
		onValidate,
		id: idProp,
		dir: dirProp,
		orientation = 'horizontal',
		activationMode = 'automatic',
		asChild,
		disabled = false,
		nonInteractive = false,
		loop = false,
		className,
		...rootProps
	} = props

	const listenersRef = useLazyRef(() => new Set<() => void>())
	const stateRef = useLazyRef<StoreState>(() => ({
		steps: new Map(),
		value: value ?? defaultValue ?? ''
	}))
	const propsRef = useAsRef({
		onValueChange, onValueComplete, onValueAdd, onValueRemove, onValidate
	})

	const store = useMemo<Store>(() => {
		return {
			subscribe: cb => {
				listenersRef.current.add(cb)
				return () => listenersRef.current.delete(cb)
			},
			getState: () => stateRef.current,
			setState: (key, storeValue) => {
				if (Object.is(stateRef.current[key], storeValue)) return
				if (key === 'value' && typeof storeValue === 'string') {
					stateRef.current.value = storeValue
					propsRef.current.onValueChange?.(storeValue)
				} else {
					stateRef.current[key] = storeValue
				}
				store.notify()
			},
			setStateWithValidation: async (storeValue, direction) => {
				if (!propsRef.current.onValidate) {
					store.setState('value', storeValue)
					return true
				}
				try {
					const isValid = await propsRef.current.onValidate(storeValue, direction)
					if (isValid) store.setState('value', storeValue)
					return isValid
				} catch {
					return false
				}
			},
			hasValidation: () => !!propsRef.current.onValidate,
			addStep: (stepValue, completed, stepDisabled) => {
				const newStep: StepState = { value: stepValue, completed, disabled: stepDisabled }
				stateRef.current.steps.set(stepValue, newStep)
				propsRef.current.onValueAdd?.(stepValue)
				store.notify()
			},
			removeStep: stepValue => {
				stateRef.current.steps.delete(stepValue)
				propsRef.current.onValueRemove?.(stepValue)
				store.notify()
			},
			setStep: (stepValue, completed, stepDisabled) => {
				const step = stateRef.current.steps.get(stepValue)
				if (step) {
					const updatedStep: StepState = { ...step, completed, disabled: stepDisabled }
					stateRef.current.steps.set(stepValue, updatedStep)
					if (completed !== step.completed) {
						propsRef.current.onValueComplete?.(stepValue, completed)
					}
					store.notify()
				}
			},
			notify: () => {
				for (const cb of listenersRef.current) cb()
			}
		}
	}, [listenersRef, stateRef, propsRef])

	useIsomorphicLayoutEffect(() => {
		if (value !== undefined) store.setState('value', value)
	}, [value, store])

	const dir = useDirection(dirProp)
	const id = useId()
	const rootId = idProp ?? id

	const contextValue = useMemo<StepperContextValue>(
		() => ({ id: rootId, dir, orientation, activationMode, disabled, nonInteractive, loop }),
		[rootId, dir, orientation, activationMode, disabled, nonInteractive, loop]
	)

	const RootPrimitive = asChild ? Slot : 'div'

	return (
		<StoreContext.Provider value={store}>
			<StepperContext.Provider value={contextValue}>
				<RootPrimitive
					id={rootId}
					data-disabled={disabled ? '' : undefined}
					data-orientation={orientation}
					data-slot="stepper"
					dir={dir}
					{...rootProps}
					className={cn(
						'flex gap-6',
						orientation === 'horizontal' ? 'w-full flex-col' : 'flex-row',
						className
					)}
				/>
			</StepperContext.Provider>
		</StoreContext.Provider>
	)
}

export {
	StepperRoot as Root,
	StepperList as List,
	StepperItem as Item,
	StepperTrigger as Trigger,
	StepperIndicator as Indicator,
	StepperSeparator as Separator,
	StepperTitle as Title,
	StepperDescription as Description,
	StepperContent as Content,
	StepperPrev as Prev,
	StepperNext as Next,
	StepperRoot as Stepper,
	StepperList,
	StepperItem,
	StepperTrigger,
	StepperIndicator,
	StepperSeparator,
	StepperTitle,
	StepperDescription,
	StepperContent,
	StepperPrev,
	StepperNext,
	useStore as useStepper,
	type StepperRootProps as StepperProps
}

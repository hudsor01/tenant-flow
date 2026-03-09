'use client'

import {
	createContext,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
	useSyncExternalStore
} from 'react'
import type { RefObject } from 'react'
import {
	ROOT_NAME,
	ITEM_NAME,
	type Store,
	type StoreState,
	type StepperContextValue,
	type StepperItemContextValue,
	type FocusContextValue
} from './stepper-types'

// Re-export all types and constants for consumers
export {
	ROOT_NAME,
	LIST_NAME,
	ITEM_NAME,
	TRIGGER_NAME,
	INDICATOR_NAME,
	SEPARATOR_NAME,
	TITLE_NAME,
	DESCRIPTION_NAME,
	CONTENT_NAME,
	PREV_NAME,
	NEXT_NAME,
	ENTRY_FOCUS,
	EVENT_OPTIONS,
	ARROW_KEYS,
	type DivProps,
	type ButtonProps,
	type ListElement,
	type TriggerElement,
	type Direction,
	type Orientation,
	type NavigationDirection,
	type ActivationMode,
	type DataState,
	type StepState,
	type StoreState,
	type Store,
	type ItemData,
	type StepperContextValue,
	type StepperItemContextValue,
	type FocusContextValue
} from './stepper-types'

export { getId, getDataState, getFocusIntent, focusFirst, wrapArray } from './stepper-utils'

// Isomorphic layout effect
export const useIsomorphicLayoutEffect =
	typeof window === 'undefined' ? useEffect : useLayoutEffect

// Ref utilities
export function useAsRef<T>(props: T) {
	const ref = useRef<T>(props)

	useIsomorphicLayoutEffect(() => {
		ref.current = props
	})

	return ref
}

export function useLazyRef<T>(fn: () => T) {
	const ref = useRef<T | null>(null)

	if (ref.current === null) {
		ref.current = fn()
	}

	return ref as RefObject<T>
}

// Context providers
export const StoreContext = createContext<Store | null>(null)

export function useStoreContext(consumerName: string) {
	const context = useContext(StoreContext)
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``)
	}
	return context
}

export function useStore<T>(selector: (state: StoreState) => T): T {
	const store = useStoreContext('useStore')

	const getSnapshot = () => selector(store.getState())

	return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot)
}

export const StepperContext = createContext<StepperContextValue | null>(null)

export function useStepperContext(consumerName: string) {
	const context = useContext(StepperContext)
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``)
	}
	return context
}

export const StepperItemContext = createContext<StepperItemContextValue | null>(
	null
)

export function useStepperItemContext(consumerName: string) {
	const context = useContext(StepperItemContext)
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ITEM_NAME}\``)
	}
	return context
}

export const FocusContext = createContext<FocusContextValue | null>(null)

export function useFocusContext(consumerName: string) {
	const context = useContext(FocusContext)
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`FocusProvider\``)
	}
	return context
}

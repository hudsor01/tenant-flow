"use client";

import type { RefObject } from "react";
import {
	createContext,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
	useSyncExternalStore,
} from "react";
import {
	type FocusContextValue,
	ITEM_NAME,
	ROOT_NAME,
	type StepperContextValue,
	type StepperItemContextValue,
	type Store,
	type StoreState,
} from "./stepper-types";

// Re-export all types and constants for consumers
export {
	type ActivationMode,
	ARROW_KEYS,
	type ButtonProps,
	CONTENT_NAME,
	type DataState,
	DESCRIPTION_NAME,
	type Direction,
	type DivProps,
	ENTRY_FOCUS,
	EVENT_OPTIONS,
	type FocusContextValue,
	INDICATOR_NAME,
	ITEM_NAME,
	type ItemData,
	LIST_NAME,
	type ListElement,
	type NavigationDirection,
	NEXT_NAME,
	type Orientation,
	PREV_NAME,
	ROOT_NAME,
	SEPARATOR_NAME,
	type StepperContextValue,
	type StepperItemContextValue,
	type StepState,
	type Store,
	type StoreState,
	TITLE_NAME,
	TRIGGER_NAME,
	type TriggerElement,
} from "./stepper-types";

export {
	focusFirst,
	getDataState,
	getFocusIntent,
	getId,
	wrapArray,
} from "./stepper-utils";

// Isomorphic layout effect
export const useIsomorphicLayoutEffect =
	typeof window === "undefined" ? useEffect : useLayoutEffect;

// Ref utilities
export function useAsRef<T>(props: T) {
	const ref = useRef<T>(props);

	useIsomorphicLayoutEffect(() => {
		ref.current = props;
	});

	return ref;
}

export function useLazyRef<T>(fn: () => T) {
	const ref = useRef<T | null>(null);

	if (ref.current === null) {
		ref.current = fn();
	}

	return ref as RefObject<T>;
}

// Context providers
export const StoreContext = createContext<Store | null>(null);

export function useStoreContext(consumerName: string) {
	const context = useContext(StoreContext);
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
	}
	return context;
}

export function useStore<T>(selector: (state: StoreState) => T): T {
	const store = useStoreContext("useStore");

	const getSnapshot = () => selector(store.getState());

	return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}

export const StepperContext = createContext<StepperContextValue | null>(null);

export function useStepperContext(consumerName: string) {
	const context = useContext(StepperContext);
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
	}
	return context;
}

export const StepperItemContext = createContext<StepperItemContextValue | null>(
	null,
);

export function useStepperItemContext(consumerName: string) {
	const context = useContext(StepperItemContext);
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ITEM_NAME}\``);
	}
	return context;
}

export const FocusContext = createContext<FocusContextValue | null>(null);

export function useFocusContext(consumerName: string) {
	const context = useContext(FocusContext);
	if (!context) {
		throw new Error(
			`\`${consumerName}\` must be used within \`FocusProvider\``,
		);
	}
	return context;
}

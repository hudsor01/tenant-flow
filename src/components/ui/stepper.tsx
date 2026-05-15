"use client";

import { Direction, Slot } from "radix-ui";
import { useId } from "react";
import { cn } from "#lib/utils";
import {
	type DivProps,
	StepperContext,
	type StepperContextValue,
	type StepState,
	type Store,
	StoreContext,
	type StoreState,
	useAsRef,
	useIsomorphicLayoutEffect,
	useLazyRef,
	useStore,
} from "./stepper-context";
import {
	StepperContent,
	StepperDescription,
	StepperIndicator,
	StepperSeparator,
	StepperTitle,
} from "./stepper-header";
import { StepperItem, StepperTrigger } from "./stepper-item";
import { StepperList } from "./stepper-list";
import { StepperNext, StepperPrev } from "./stepper-navigation";

interface StepperRootProps extends DivProps {
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	onValueComplete?: (value: string, completed: boolean) => void;
	onValueAdd?: (value: string) => void;
	onValueRemove?: (value: string) => void;
	onValidate?: (
		value: string,
		direction: "next" | "prev",
	) => boolean | Promise<boolean>;
	activationMode?: "automatic" | "manual";
	dir?: "ltr" | "rtl";
	orientation?: "horizontal" | "vertical";
	disabled?: boolean;
	loop?: boolean;
	nonInteractive?: boolean;
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
		orientation = "horizontal",
		activationMode = "automatic",
		asChild,
		disabled = false,
		nonInteractive = false,
		loop = false,
		className,
		...rootProps
	} = props;

	const listenersRef = useLazyRef(() => new Set<() => void>());
	const stateRef = useLazyRef<StoreState>(() => ({
		steps: new Map(),
		value: value ?? defaultValue ?? "",
	}));
	const propsRef = useAsRef({
		onValueChange,
		onValueComplete,
		onValueAdd,
		onValueRemove,
		onValidate,
	});

	const storeRef = useLazyRef<Store>(() => ({
		subscribe: (cb) => {
			listenersRef.current.add(cb);
			return () => listenersRef.current.delete(cb);
		},
		getState: () => stateRef.current,
		setState: (key, storeValue) => {
			if (Object.is(stateRef.current[key], storeValue)) return;
			if (key === "value" && typeof storeValue === "string") {
				stateRef.current.value = storeValue;
				propsRef.current.onValueChange?.(storeValue);
			} else {
				stateRef.current[key] = storeValue;
			}
			storeRef.current.notify();
		},
		setStateWithValidation: async (storeValue, direction) => {
			if (!propsRef.current.onValidate) {
				storeRef.current.setState("value", storeValue);
				return true;
			}
			try {
				const isValid = await propsRef.current.onValidate(
					storeValue,
					direction,
				);
				if (isValid) storeRef.current.setState("value", storeValue);
				return isValid;
			} catch {
				return false;
			}
		},
		hasValidation: () => !!propsRef.current.onValidate,
		addStep: (stepValue, completed, stepDisabled) => {
			const newStep: StepState = {
				value: stepValue,
				completed,
				disabled: stepDisabled,
			};
			stateRef.current.steps.set(stepValue, newStep);
			propsRef.current.onValueAdd?.(stepValue);
			storeRef.current.notify();
		},
		removeStep: (stepValue) => {
			stateRef.current.steps.delete(stepValue);
			propsRef.current.onValueRemove?.(stepValue);
			storeRef.current.notify();
		},
		setStep: (stepValue, completed, stepDisabled) => {
			const step = stateRef.current.steps.get(stepValue);
			if (step) {
				const updatedStep: StepState = {
					...step,
					completed,
					disabled: stepDisabled,
				};
				stateRef.current.steps.set(stepValue, updatedStep);
				if (completed !== step.completed) {
					propsRef.current.onValueComplete?.(stepValue, completed);
				}
				storeRef.current.notify();
			}
		},
		notify: () => {
			for (const cb of listenersRef.current) cb();
		},
	}));
	const store = storeRef.current;

	useIsomorphicLayoutEffect(() => {
		if (value !== undefined) store.setState("value", value);
	}, [value, store]);

	const dir = Direction.useDirection(dirProp);
	const id = useId();
	const rootId = idProp ?? id;

	const contextValue: StepperContextValue = {
		id: rootId,
		dir,
		orientation,
		activationMode,
		disabled,
		nonInteractive,
		loop,
	};

	const RootPrimitive = asChild ? Slot.Slot : "div";

	return (
		<StoreContext.Provider value={store}>
			<StepperContext.Provider value={contextValue}>
				<RootPrimitive
					id={rootId}
					data-disabled={disabled ? "" : undefined}
					data-orientation={orientation}
					data-slot="stepper"
					dir={dir}
					{...rootProps}
					className={cn(
						"flex gap-6",
						orientation === "horizontal" ? "w-full flex-col" : "flex-row",
						className,
					)}
				/>
			</StepperContext.Provider>
		</StoreContext.Provider>
	);
}

export {
	StepperContent as Content,
	StepperContent,
	StepperDescription as Description,
	StepperDescription,
	StepperIndicator as Indicator,
	StepperIndicator,
	StepperItem as Item,
	StepperItem,
	StepperList as List,
	StepperList,
	StepperNext as Next,
	StepperNext,
	StepperPrev as Prev,
	StepperPrev,
	StepperRoot as Root,
	StepperRoot as Stepper,
	type StepperRootProps as StepperProps,
	StepperSeparator as Separator,
	StepperSeparator,
	StepperTitle as Title,
	StepperTitle,
	StepperTrigger as Trigger,
	StepperTrigger,
	useStore as useStepper,
};

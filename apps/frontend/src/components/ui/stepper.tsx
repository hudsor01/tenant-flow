"use client";

import { useDirection } from "@radix-ui/react-direction";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { useComposedRefs } from "#lib/compose-refs";
import { cn } from "#lib/utils";
import {
  ENTRY_FOCUS,
  EVENT_OPTIONS,
  FocusContext,
  LIST_NAME,
  StoreContext,
  StepperContext,
  focusFirst,
  useAsRef,
  useIsomorphicLayoutEffect,
  useLazyRef,
  useStepperContext,
  useStore,
  type DivProps,
  type FocusContextValue,
  type ItemData,
  type ListElement,
  type StepState,
  type StepperContextValue,
  type Store,
  type StoreState,
} from "./stepper-context";
import {
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "./stepper-item";
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

  const store = React.useMemo<Store>(() => {
    return {
      subscribe: (cb) => {
        listenersRef.current.add(cb);
        return () => listenersRef.current.delete(cb);
      },
      getState: () => stateRef.current,
      setState: (key, value) => {
        if (Object.is(stateRef.current[key], value)) return;

        if (key === "value" && typeof value === "string") {
          stateRef.current.value = value;
          propsRef.current.onValueChange?.(value);
        } else {
          stateRef.current[key] = value;
        }

        store.notify();
      },
      setStateWithValidation: async (value, direction) => {
        if (!propsRef.current.onValidate) {
          store.setState("value", value);
          return true;
        }

        try {
          const isValid = await propsRef.current.onValidate(value, direction);
          if (isValid) {
            store.setState("value", value);
          }
          return isValid;
        } catch {
          return false;
        }
      },
      hasValidation: () => !!propsRef.current.onValidate,
      addStep: (value, completed, disabled) => {
        const newStep: StepState = { value, completed, disabled };
        stateRef.current.steps.set(value, newStep);
        propsRef.current.onValueAdd?.(value);
        store.notify();
      },
      removeStep: (value) => {
        stateRef.current.steps.delete(value);
        propsRef.current.onValueRemove?.(value);
        store.notify();
      },
      setStep: (value, completed, disabled) => {
        const step = stateRef.current.steps.get(value);
        if (step) {
          const updatedStep: StepState = { ...step, completed, disabled };
          stateRef.current.steps.set(value, updatedStep);

          if (completed !== step.completed) {
            propsRef.current.onValueComplete?.(value, completed);
          }

          store.notify();
        }
      },
      notify: () => {
        for (const cb of listenersRef.current) {
          cb();
        }
      },
    };
  }, [listenersRef, stateRef, propsRef]);

  useIsomorphicLayoutEffect(() => {
    if (value !== undefined) {
      store.setState("value", value);
    }
  }, [value, store]);

  const dir = useDirection(dirProp);

  const id = React.useId();

  const rootId = idProp ?? id;

  const contextValue = React.useMemo<StepperContextValue>(
    () => ({
      id: rootId,
      dir,
      orientation,
      activationMode,
      disabled,
      nonInteractive,
      loop,
    }),
    [rootId, dir, orientation, activationMode, disabled, nonInteractive, loop],
  );

  const RootPrimitive = asChild ? Slot : "div";

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

interface StepperListProps extends DivProps {
  asChild?: boolean;
}

function StepperList(props: StepperListProps) {
  const { className, children, asChild, ref, ...listProps } = props;

  const context = useStepperContext(LIST_NAME);
  const orientation = context.orientation;
  const currentValue = useStore((state) => state.value);

  const [tabStopId, setTabStopId] = React.useState<string | null>(null);
  const [isTabbingBackOut, setIsTabbingBackOut] = React.useState(false);
  const [focusableItemCount, setFocusableItemCount] = React.useState(0);
  const isClickFocusRef = React.useRef(false);
  const itemsRef = React.useRef<Map<string, ItemData>>(new Map());
  const listRef = React.useRef<ListElement>(null);
  const composedRef = useComposedRefs(ref, listRef);

  const onItemFocus = React.useCallback((tabStopId: string) => {
    setTabStopId(tabStopId);
  }, []);

  const onItemShiftTab = React.useCallback(() => {
    setIsTabbingBackOut(true);
  }, []);

  const onFocusableItemAdd = React.useCallback(() => {
    setFocusableItemCount((prevCount) => prevCount + 1);
  }, []);

  const onFocusableItemRemove = React.useCallback(() => {
    setFocusableItemCount((prevCount) => prevCount - 1);
  }, []);

  const onItemRegister = React.useCallback((item: ItemData) => {
    itemsRef.current.set(item.id, item);
  }, []);

  const onItemUnregister = React.useCallback((id: string) => {
    itemsRef.current.delete(id);
  }, []);

  const getItems = React.useCallback(() => {
    return Array.from(itemsRef.current.values())
      .filter((item) => item.ref.current)
      .sort((a, b) => {
        const elementA = a.ref.current;
        const elementB = b.ref.current;
        if (!elementA || !elementB) return 0;
        const position = elementA.compareDocumentPosition(elementB);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
          return -1;
        }
        if (position & Node.DOCUMENT_POSITION_PRECEDING) {
          return 1;
        }
        return 0;
      });
  }, []);

  const handleListBlur = listProps.onBlur;
  const onBlur = React.useCallback(
    (event: React.FocusEvent<ListElement>) => {
      handleListBlur?.(event);
      if (event.defaultPrevented) return;

      setIsTabbingBackOut(false);
    },
    [handleListBlur],
  );

  const handleListFocus = listProps.onFocus;
  const onFocus = React.useCallback(
    (event: React.FocusEvent<ListElement>) => {
      handleListFocus?.(event);
      if (event.defaultPrevented) return;

      const isKeyboardFocus = !isClickFocusRef.current;
      if (
        event.target === event.currentTarget &&
        isKeyboardFocus &&
        !isTabbingBackOut
      ) {
        const entryFocusEvent = new CustomEvent(ENTRY_FOCUS, EVENT_OPTIONS);
        event.currentTarget.dispatchEvent(entryFocusEvent);

        if (!entryFocusEvent.defaultPrevented) {
          const items = Array.from(itemsRef.current.values()).filter(
            (item) => !item.disabled,
          );
          const selectedItem = currentValue
            ? items.find((item) => item.value === currentValue)
            : undefined;
          const activeItem = items.find((item) => item.active);
          const currentItem = items.find((item) => item.id === tabStopId);

          const candidateItems = [
            selectedItem,
            activeItem,
            currentItem,
            ...items,
          ].filter(Boolean) as ItemData[];
          const candidateRefs = candidateItems.map((item) => item.ref);
          focusFirst(candidateRefs, false);
        }
      }
      isClickFocusRef.current = false;
    },
    [handleListFocus, isTabbingBackOut, currentValue, tabStopId],
  );

  const handleListMouseDown = listProps.onMouseDown;
  const onMouseDown = React.useCallback(
    (event: React.MouseEvent<ListElement>) => {
      handleListMouseDown?.(event);

      if (event.defaultPrevented) return;

      isClickFocusRef.current = true;
    },
    [handleListMouseDown],
  );

  const focusContextValue = React.useMemo<FocusContextValue>(
    () => ({
      tabStopId,
      onItemFocus,
      onItemShiftTab,
      onFocusableItemAdd,
      onFocusableItemRemove,
      onItemRegister,
      onItemUnregister,
      getItems,
    }),
    [
      tabStopId,
      onItemFocus,
      onItemShiftTab,
      onFocusableItemAdd,
      onFocusableItemRemove,
      onItemRegister,
      onItemUnregister,
      getItems,
    ],
  );

  const ListPrimitive = asChild ? Slot : "div";

  return (
    <FocusContext.Provider value={focusContextValue}>
      <ListPrimitive
        role="tablist"
        aria-orientation={orientation}
        data-orientation={orientation}
        data-slot="stepper-list"
        dir={context.dir}
        tabIndex={isTabbingBackOut || focusableItemCount === 0 ? -1 : 0}
        {...listProps}
        ref={composedRef}
        className={cn(
          "flex outline-none",
          orientation === "horizontal"
            ? "flex-row items-center"
            : "flex-col items-start",
          className,
        )}
        onBlur={onBlur}
        onFocus={onFocus}
        onMouseDown={onMouseDown}
      >
        {children}
      </ListPrimitive>
    </FocusContext.Provider>
  );
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
  //
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
  //
  useStore as useStepper,
  //
  type StepperRootProps as StepperProps,
};

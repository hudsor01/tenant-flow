"use client";

import { Slot } from "@radix-ui/react-slot";
import { Check } from "lucide-react";
import * as React from "react";
import { useComposedRefs } from "#lib/compose-refs";
import { cn } from "#lib/utils";
import {
  ARROW_KEYS,
  CONTENT_NAME,
  DESCRIPTION_NAME,
  INDICATOR_NAME,
  ITEM_NAME,
  SEPARATOR_NAME,
  TITLE_NAME,
  TRIGGER_NAME,
  getDataState,
  getFocusIntent,
  getId,
  focusFirst,
  StepperItemContext,
  useFocusContext,
  useIsomorphicLayoutEffect,
  useStepperContext,
  useStepperItemContext,
  useStore,
  useStoreContext,
  wrapArray,
  type ButtonProps,
  type DataState,
  type DivProps,
  type NavigationDirection,
  type TriggerElement,
} from "./stepper-context";

interface StepperItemProps extends DivProps {
  value: string;
  completed?: boolean;
  disabled?: boolean;
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
  } = props;

  const context = useStepperContext(ITEM_NAME);
  const store = useStoreContext(ITEM_NAME);
  const orientation = context.orientation;
  const value = useStore((state) => state.value);

  useIsomorphicLayoutEffect(() => {
    store.addStep(itemValue, completed, disabled);

    return () => {
      store.removeStep(itemValue);
    };
  }, [itemValue, completed, disabled]);

  useIsomorphicLayoutEffect(() => {
    store.setStep(itemValue, completed, disabled);
  }, [itemValue, completed, disabled]);

  const stepState = useStore((state) => state.steps.get(itemValue));
  const steps = useStore((state) => state.steps);
  const dataState = getDataState(value, itemValue, stepState, steps);

  const itemContextValue = React.useMemo(
    () => ({
      value: itemValue,
      stepState,
    }),
    [itemValue, stepState],
  );

  const ItemPrimitive = asChild ? Slot : "div";

  return (
    <StepperItemContext.Provider value={itemContextValue}>
      <ItemPrimitive
        data-disabled={stepState?.disabled ? "" : undefined}
        data-orientation={orientation}
        data-state={dataState}
        data-slot="stepper-item"
        dir={context.dir}
        {...itemProps}
        ref={ref}
        className={cn(
          "relative flex not-last:flex-1 items-center",
          orientation === "horizontal" ? "flex-row" : "flex-col",
          className,
        )}
      >
        {children}
      </ItemPrimitive>
    </StepperItemContext.Provider>
  );
}

function StepperTrigger(props: ButtonProps) {
  const { asChild, disabled, className, ref, ...triggerProps } = props;

  const context = useStepperContext(TRIGGER_NAME);
  const itemContext = useStepperItemContext(TRIGGER_NAME);
  const store = useStoreContext(TRIGGER_NAME);
  const focusContext = useFocusContext(TRIGGER_NAME);
  const value = useStore((state) => state.value);
  const itemValue = itemContext.value;
  const stepState = useStore((state) => state.steps.get(itemValue));
  const activationMode = context.activationMode;
  const orientation = context.orientation;
  const loop = context.loop;

  const steps = useStore((state) => state.steps);
  const stepIndex = Array.from(steps.keys()).indexOf(itemValue);

  const stepPosition = stepIndex + 1;
  const stepCount = steps.size;

  const triggerId = getId(context.id, "trigger", itemValue);
  const contentId = getId(context.id, "content", itemValue);
  const titleId = getId(context.id, "title", itemValue);
  const descriptionId = getId(context.id, "description", itemValue);

  const isDisabled = context.disabled || stepState?.disabled || disabled;
  const isActive = value === itemValue;
  const isTabStop = focusContext.tabStopId === triggerId;
  const dataState = getDataState(value, itemValue, stepState, steps);

  const triggerRef = React.useRef<TriggerElement>(null);
  const composedRef = useComposedRefs(ref, triggerRef);
  const isArrowKeyPressedRef = React.useRef(false);
  const isMouseClickRef = React.useRef(false);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (ARROW_KEYS.includes(event.key)) {
        isArrowKeyPressedRef.current = true;
      }
    }
    function onKeyUp() {
      isArrowKeyPressedRef.current = false;
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    focusContext.onItemRegister({
      id: triggerId,
      ref: triggerRef,
      value: itemValue,
      active: isTabStop,
      disabled: !!isDisabled,
    });

    if (!isDisabled) {
      focusContext.onFocusableItemAdd();
    }

    return () => {
      focusContext.onItemUnregister(triggerId);
      if (!isDisabled) {
        focusContext.onFocusableItemRemove();
      }
    };
  }, [focusContext, triggerId, itemValue, isTabStop, isDisabled]);

  const handleTriggerClick = triggerProps.onClick;
  const onClick = React.useCallback(
    async (event: React.MouseEvent<TriggerElement>) => {
      handleTriggerClick?.(event);
      if (event.defaultPrevented) return;

      if (!isDisabled && !context.nonInteractive) {
        const currentStepIndex = Array.from(steps.keys()).indexOf(value ?? "");
        const targetStepIndex = Array.from(steps.keys()).indexOf(itemValue);
        const direction = targetStepIndex > currentStepIndex ? "next" : "prev";

        await store.setStateWithValidation(itemValue, direction);
      }
    },
    // Intentionally depend on specific callback, not entire triggerProps object
    [
      isDisabled,
      context.nonInteractive,
      store,
      itemValue,
      value,
      steps,
      handleTriggerClick,
    ],
  );

  const handleTriggerFocus = triggerProps.onFocus;
  const onFocus = React.useCallback(
    async (event: React.FocusEvent<TriggerElement>) => {
      handleTriggerFocus?.(event);
      if (event.defaultPrevented) return;

      focusContext.onItemFocus(triggerId);

      const isKeyboardFocus = !isMouseClickRef.current;

      if (
        !isActive &&
        !isDisabled &&
        activationMode !== "manual" &&
        !context.nonInteractive &&
        isKeyboardFocus
      ) {
        const currentStepIndex = Array.from(steps.keys()).indexOf(value || "");
        const targetStepIndex = Array.from(steps.keys()).indexOf(itemValue);
        const direction = targetStepIndex > currentStepIndex ? "next" : "prev";

        await store.setStateWithValidation(itemValue, direction);
      }

      isMouseClickRef.current = false;
    },
    // Intentionally depend on specific callback, not entire triggerProps object
    [
      focusContext,
      triggerId,
      activationMode,
      isActive,
      isDisabled,
      context.nonInteractive,
      store,
      itemValue,
      value,
      steps,
      handleTriggerFocus,
    ],
  );

  const handleTriggerKeyDown = triggerProps.onKeyDown;
  const onKeyDown = React.useCallback(
    async (event: React.KeyboardEvent<TriggerElement>) => {
      handleTriggerKeyDown?.(event);
      if (event.defaultPrevented) return;

      if (event.key === "Enter" && context.nonInteractive) {
        event.preventDefault();
        return;
      }

      if (
        (event.key === "Enter" || event.key === " ") &&
        activationMode === "manual" &&
        !context.nonInteractive
      ) {
        event.preventDefault();
        if (!isDisabled && triggerRef.current) {
          triggerRef.current.click();
        }
        return;
      }

      if (event.key === "Tab" && event.shiftKey) {
        focusContext.onItemShiftTab();
        return;
      }

      if (event.target !== event.currentTarget) return;

      const focusIntent = getFocusIntent(event, context.dir, orientation);

      if (focusIntent !== undefined) {
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)
          return;
        event.preventDefault();

        const items = focusContext.getItems().filter((item) => !item.disabled);
        let candidateRefs = items.map((item) => item.ref);

        if (focusIntent === "last") {
          candidateRefs.reverse();
        } else if (focusIntent === "prev" || focusIntent === "next") {
          if (focusIntent === "prev") candidateRefs.reverse();
          const currentIndex = candidateRefs.findIndex(
            (ref) => ref.current === event.currentTarget,
          );
          candidateRefs = loop
            ? wrapArray(candidateRefs, currentIndex + 1)
            : candidateRefs.slice(currentIndex + 1);
        }

        if (store.hasValidation() && candidateRefs.length > 0) {
          const nextRef = candidateRefs[0];
          const nextElement = nextRef?.current;
          const nextItem = items.find(
            (item) => item.ref.current === nextElement,
          );

          if (nextItem && nextItem.value !== itemValue) {
            const currentStepIndex = Array.from(steps.keys()).indexOf(
              value || "",
            );
            const targetStepIndex = Array.from(steps.keys()).indexOf(
              nextItem.value,
            );
            const direction: NavigationDirection =
              targetStepIndex > currentStepIndex ? "next" : "prev";

            if (direction === "next") {
              const isValid = await store.setStateWithValidation(
                nextItem.value,
                direction,
              );
              if (!isValid) return;
            } else {
              store.setState("value", nextItem.value);
            }

            queueMicrotask(() => nextElement?.focus());
            return;
          }
        }

        queueMicrotask(() => focusFirst(candidateRefs));
      }
    },
    // Intentionally depend on specific callback, not entire triggerProps object
    [
      focusContext,
      context.nonInteractive,
      context.dir,
      activationMode,
      orientation,
      loop,
      isDisabled,
      handleTriggerKeyDown,
      store,
      itemValue,
      value,
      steps,
    ],
  );

  const handleTriggerMouseDown = triggerProps.onMouseDown;
  const onMouseDown = React.useCallback(
    (event: React.MouseEvent<TriggerElement>) => {
      handleTriggerMouseDown?.(event);
      if (event.defaultPrevented) return;

      isMouseClickRef.current = true;

      if (isDisabled) {
        event.preventDefault();
      } else {
        focusContext.onItemFocus(triggerId);
      }
    },
    // Intentionally depend on specific callback, not entire triggerProps object
    [focusContext, triggerId, isDisabled, handleTriggerMouseDown],
  );

  const TriggerPrimitive = asChild ? Slot : "button";

  return (
    <TriggerPrimitive
      id={triggerId}
      role="tab"
      type="button"
      aria-controls={contentId}
      aria-current={isActive ? "step" : undefined}
      aria-describedby={`${titleId} ${descriptionId}`}
      aria-posinset={stepPosition}
      aria-selected={isActive}
      aria-setsize={stepCount}
      data-disabled={isDisabled ? "" : undefined}
      data-state={dataState}
      data-slot="stepper-trigger"
      disabled={isDisabled}
      tabIndex={isTabStop ? 0 : -1}
      {...triggerProps}
      ref={composedRef}
      className={cn(
        "inline-flex items-center justify-center gap-3 rounded-md text-left outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        "not-has-data-[slot=description]:rounded-full not-has-data-[slot=title]:rounded-full",
        className,
      )}
      onClick={onClick}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      onMouseDown={onMouseDown}
    />
  );
}

interface StepperIndicatorProps extends Omit<DivProps, "children"> {
  children?: React.ReactNode | ((dataState: DataState) => React.ReactNode);
}

function StepperIndicator(props: StepperIndicatorProps) {
  const { className, children, asChild, ref, ...indicatorProps } = props;
  const context = useStepperContext(INDICATOR_NAME);
  const itemContext = useStepperItemContext(INDICATOR_NAME);
  const value = useStore((state) => state.value);
  const itemValue = itemContext.value;
  const stepState = useStore((state) => state.steps.get(itemValue));
  const steps = useStore((state) => state.steps);

  const stepPosition = Array.from(steps.keys()).indexOf(itemValue) + 1;

  const dataState = getDataState(value, itemValue, stepState, steps);

  const IndicatorPrimitive = asChild ? Slot : "div";

  return (
    <IndicatorPrimitive
      data-state={dataState}
      data-slot="stepper-indicator"
      dir={context.dir}
      {...indicatorProps}
      ref={ref}
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-muted bg-background font-medium text-muted-foreground text-sm transition-colors data-[state=active]:border-primary data-[state=completed]:border-primary data-[state=active]:bg-primary data-[state=completed]:bg-primary data-[state=active]:text-primary-foreground data-[state=completed]:text-primary-foreground",
        className,
      )}
    >
      {typeof children === "function" ? (
        children(dataState)
      ) : children ? (
        children
      ) : dataState === "completed" ? (
        <Check className="size-4" />
      ) : (
        stepPosition
      )}
    </IndicatorPrimitive>
  );
}

interface StepperSeparatorProps extends DivProps {
  forceMount?: boolean;
}

function StepperSeparator(props: StepperSeparatorProps) {
  const {
    className,
    asChild,
    forceMount = false,
    ref,
    ...separatorProps
  } = props;

  const context = useStepperContext(SEPARATOR_NAME);
  const itemContext = useStepperItemContext(SEPARATOR_NAME);
  const value = useStore((state) => state.value);
  const orientation = context.orientation;

  const steps = useStore((state) => state.steps);
  const stepIndex = Array.from(steps.keys()).indexOf(itemContext.value);

  const isLastStep = stepIndex === steps.size - 1;

  if (isLastStep && !forceMount) {
    return null;
  }

  const dataState = getDataState(
    value,
    itemContext.value,
    itemContext.stepState,
    steps,
    "separator",
  );

  const SeparatorPrimitive = asChild ? Slot : "div";

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
        "bg-border transition-colors data-[state=active]:bg-primary data-[state=completed]:bg-primary",
        orientation === "horizontal" ? "h-px flex-1" : "h-10 w-px",
        className,
      )}
    />
  );
}

interface StepperTitleProps extends React.ComponentProps<"span"> {
  asChild?: boolean;
}

function StepperTitle(props: StepperTitleProps) {
  const { className, asChild, ref, ...titleProps } = props;

  const context = useStepperContext(TITLE_NAME);
  const itemContext = useStepperItemContext(TITLE_NAME);

  const titleId = getId(context.id, "title", itemContext.value);

  const TitlePrimitive = asChild ? Slot : "span";

  return (
    <TitlePrimitive
      id={titleId}
      data-slot="title"
      dir={context.dir}
      {...titleProps}
      ref={ref}
      className={cn("font-medium text-sm", className)}
    />
  );
}

interface StepperDescriptionProps extends React.ComponentProps<"span"> {
  asChild?: boolean;
}

function StepperDescription(props: StepperDescriptionProps) {
  const { className, asChild, ref, ...descriptionProps } = props;
  const context = useStepperContext(DESCRIPTION_NAME);
  const itemContext = useStepperItemContext(DESCRIPTION_NAME);

  const descriptionId = getId(context.id, "description", itemContext.value);

  const DescriptionPrimitive = asChild ? Slot : "span";

  return (
    <DescriptionPrimitive
      id={descriptionId}
      data-slot="description"
      dir={context.dir}
      {...descriptionProps}
      ref={ref}
      className={cn("text-muted-foreground text-xs", className)}
    />
  );
}

interface StepperContentProps extends DivProps {
  value: string;
  forceMount?: boolean;
}

function StepperContent(props: StepperContentProps) {
  const {
    value: valueProp,
    asChild,
    forceMount = false,
    ref,
    className,
    ...contentProps
  } = props;

  const context = useStepperContext(CONTENT_NAME);
  const value = useStore((state) => state.value);

  const contentId = getId(context.id, "content", valueProp);
  const triggerId = getId(context.id, "trigger", valueProp);

  if (valueProp !== value && !forceMount) return null;

  const ContentPrimitive = asChild ? Slot : "div";

  return (
    <ContentPrimitive
      id={contentId}
      role="tabpanel"
      aria-labelledby={triggerId}
      data-slot="stepper-content"
      dir={context.dir}
      {...contentProps}
      ref={ref}
      className={cn("flex-1 outline-none", className)}
    />
  );
}

export {
  StepperItem,
  StepperTrigger,
  StepperIndicator,
  StepperSeparator,
  StepperTitle,
  StepperDescription,
  StepperContent,
};

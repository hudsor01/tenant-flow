import type { ComponentProps, KeyboardEvent, RefObject } from 'react'

// Component name constants used for context error messages
export const ROOT_NAME = 'Stepper'
export const LIST_NAME = 'StepperList'
export const ITEM_NAME = 'StepperItem'
export const TRIGGER_NAME = 'StepperTrigger'
export const INDICATOR_NAME = 'StepperIndicator'
export const SEPARATOR_NAME = 'StepperSeparator'
export const TITLE_NAME = 'StepperTitle'
export const DESCRIPTION_NAME = 'StepperDescription'
export const CONTENT_NAME = 'StepperContent'
export const PREV_NAME = 'StepperPrev'
export const NEXT_NAME = 'StepperNext'

// Event constants
export const ENTRY_FOCUS = 'stepperFocusGroup.onEntryFocus'
export const EVENT_OPTIONS = { bubbles: false, cancelable: true }
export const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

// Core types
export type Direction = 'ltr' | 'rtl'
export type Orientation = 'horizontal' | 'vertical'
export type NavigationDirection = 'next' | 'prev'
export type ActivationMode = 'automatic' | 'manual'
export type DataState = 'inactive' | 'active' | 'completed'

// Primitive prop types
export interface DivProps extends ComponentProps<'div'> {
	asChild?: boolean
}

export interface ButtonProps extends ComponentProps<'button'> {
	asChild?: boolean
}

// Element types
export type ListElement = HTMLDivElement
export type TriggerElement = HTMLButtonElement
export type FocusIntent = 'first' | 'last' | 'prev' | 'next'

// Store types
export interface StepState {
	value: string
	completed: boolean
	disabled: boolean
}

export interface StoreState {
	steps: Map<string, StepState>
	value: string
}

export interface Store {
	subscribe: (callback: () => void) => () => void
	getState: () => StoreState
	setState: <K extends keyof StoreState>(key: K, value: StoreState[K]) => void
	setStateWithValidation: (
		value: string,
		direction: NavigationDirection
	) => Promise<boolean>
	hasValidation: () => boolean
	notify: () => void
	addStep: (value: string, completed: boolean, disabled: boolean) => void
	removeStep: (value: string) => void
	setStep: (value: string, completed: boolean, disabled: boolean) => void
}

// Item data for focus management
export interface ItemData {
	id: string
	ref: RefObject<TriggerElement | null>
	value: string
	active: boolean
	disabled: boolean
}

// Context value types
export interface StepperContextValue {
	id: string
	dir: Direction
	orientation: Orientation
	activationMode: ActivationMode
	disabled: boolean
	nonInteractive: boolean
	loop: boolean
}

export interface StepperItemContextValue {
	value: string
	stepState: StepState | undefined
}

export interface FocusContextValue {
	tabStopId: string | null
	onItemFocus: (tabStopId: string) => void
	onItemShiftTab: () => void
	onFocusableItemAdd: () => void
	onFocusableItemRemove: () => void
	onItemRegister: (item: ItemData) => void
	onItemUnregister: (id: string) => void
	getItems: () => ItemData[]
}

// Key-to-focus-intent mapping
export const MAP_KEY_TO_FOCUS_INTENT: Record<string, FocusIntent> = {
	ArrowLeft: 'prev',
	ArrowUp: 'prev',
	ArrowRight: 'next',
	ArrowDown: 'next',
	PageUp: 'first',
	Home: 'first',
	PageDown: 'last',
	End: 'last'
}

// Utility function types
export type GetDataStateFn = (
	value: string | undefined,
	itemValue: string,
	stepState: StepState | undefined,
	steps: Map<string, StepState>,
	variant?: 'item' | 'separator'
) => DataState

export type GetFocusIntentFn = (
	event: KeyboardEvent<TriggerElement>,
	dir?: Direction,
	orientation?: Orientation
) => FocusIntent | undefined

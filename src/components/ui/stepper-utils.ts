import type { KeyboardEvent, RefObject } from 'react'
import {
	MAP_KEY_TO_FOCUS_INTENT,
	type DataState,
	type Direction,
	type FocusIntent,
	type Orientation,
	type StepState,
	type TriggerElement
} from './stepper-types'

export function getId(
	id: string,
	variant: 'trigger' | 'content' | 'title' | 'description',
	value: string
) {
	return `${id}-${variant}-${value}`
}

function getDirectionAwareKey(key: string, dir?: Direction) {
	if (dir !== 'rtl') return key
	return key === 'ArrowLeft'
		? 'ArrowRight'
		: key === 'ArrowRight'
			? 'ArrowLeft'
			: key
}

export function getFocusIntent(
	event: KeyboardEvent<TriggerElement>,
	dir?: Direction,
	orientation?: Orientation
): FocusIntent | undefined {
	const key = getDirectionAwareKey(event.key, dir)
	if (orientation === 'horizontal' && ['ArrowUp', 'ArrowDown'].includes(key))
		return undefined
	if (orientation === 'vertical' && ['ArrowLeft', 'ArrowRight'].includes(key))
		return undefined
	return MAP_KEY_TO_FOCUS_INTENT[key]
}

export function focusFirst(
	candidates: RefObject<TriggerElement | null>[],
	preventScroll = false
) {
	const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement
	for (const candidateRef of candidates) {
		const candidate = candidateRef.current
		if (!candidate) continue
		if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return
		candidate.focus({ preventScroll })
		if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) return
	}
}

export function wrapArray<T>(array: T[], startIndex: number) {
	return array.map<T>(
		(_, index) => array[(startIndex + index) % array.length] as T
	)
}

export function getDataState(
	value: string | undefined,
	itemValue: string,
	stepState: StepState | undefined,
	steps: Map<string, StepState>,
	variant: 'item' | 'separator' = 'item'
): DataState {
	const stepKeys = Array.from(steps.keys())
	const currentIndex = stepKeys.indexOf(itemValue)

	if (stepState?.completed) return 'completed'

	if (value === itemValue) {
		return variant === 'separator' ? 'inactive' : 'active'
	}

	if (value) {
		const activeIndex = stepKeys.indexOf(value)

		if (activeIndex > currentIndex) return 'completed'
	}

	return 'inactive'
}

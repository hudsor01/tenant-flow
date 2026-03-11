'use client'

import { useRef, useState } from 'react'
import type { FocusEvent, MouseEvent } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { useComposedRefs } from '#lib/compose-refs'
import { cn } from '#lib/utils'
import {
	ENTRY_FOCUS,
	EVENT_OPTIONS,
	FocusContext,
	LIST_NAME,
	useStepperContext,
	useStore,
	type DivProps,
	type FocusContextValue,
	type ItemData,
	type ListElement
} from './stepper-context'
import { focusFirst } from './stepper-utils'

interface StepperListProps extends DivProps {
	asChild?: boolean
}

function StepperList(props: StepperListProps) {
	const { className, children, asChild, ref, ...listProps } = props

	const context = useStepperContext(LIST_NAME)
	const orientation = context.orientation
	const currentValue = useStore(state => state.value)

	const [tabStopId, setTabStopId] = useState<string | null>(null)
	const [isTabbingBackOut, setIsTabbingBackOut] = useState(false)
	const [focusableItemCount, setFocusableItemCount] = useState(0)
	const isClickFocusRef = useRef(false)
	const itemsRef = useRef<Map<string, ItemData>>(new Map())
	const listRef = useRef<ListElement>(null)
	const composedRef = useComposedRefs(ref, listRef)

	const onItemFocus = (id: string) => { setTabStopId(id) }
	const onItemShiftTab = () => { setIsTabbingBackOut(true) }
	const onFocusableItemAdd = () => { setFocusableItemCount(c => c + 1) }
	const onFocusableItemRemove = () => { setFocusableItemCount(c => c - 1) }
	const onItemRegister = (item: ItemData) => { itemsRef.current.set(item.id, item) }
	const onItemUnregister = (id: string) => { itemsRef.current.delete(id) }

	const getItems = () => {
		return Array.from(itemsRef.current.values())
			.filter(item => item.ref.current)
			.sort((a, b) => {
				const elementA = a.ref.current
				const elementB = b.ref.current
				if (!elementA || !elementB) return 0
				const position = elementA.compareDocumentPosition(elementB)
				if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1
				if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1
				return 0
			})
	}

	const handleListBlur = listProps.onBlur
	const onBlur = (event: FocusEvent<ListElement>) => {
		handleListBlur?.(event)
		if (event.defaultPrevented) return
		setIsTabbingBackOut(false)
	}

	const handleListFocus = listProps.onFocus
	const onFocus = (event: FocusEvent<ListElement>) => {
		handleListFocus?.(event)
		if (event.defaultPrevented) return
		const isKeyboardFocus = !isClickFocusRef.current
		if (event.target === event.currentTarget && isKeyboardFocus && !isTabbingBackOut) {
			const entryFocusEvent = new CustomEvent(ENTRY_FOCUS, EVENT_OPTIONS)
			event.currentTarget.dispatchEvent(entryFocusEvent)
			if (!entryFocusEvent.defaultPrevented) {
				const items = Array.from(itemsRef.current.values()).filter(item => !item.disabled)
				const selectedItem = currentValue ? items.find(item => item.value === currentValue) : undefined
				const activeItem = items.find(item => item.active)
				const currentItem = items.find(item => item.id === tabStopId)
				const candidateItems = [selectedItem, activeItem, currentItem, ...items].filter(Boolean) as ItemData[]
				const candidateRefs = candidateItems.map(item => item.ref)
				focusFirst(candidateRefs, false)
			}
		}
		isClickFocusRef.current = false
	}

	const handleListMouseDown = listProps.onMouseDown
	const onMouseDown = (event: MouseEvent<ListElement>) => {
		handleListMouseDown?.(event)
		if (event.defaultPrevented) return
		isClickFocusRef.current = true
	}

	const focusContextValue: FocusContextValue = {
		tabStopId, onItemFocus, onItemShiftTab, onFocusableItemAdd,
		onFocusableItemRemove, onItemRegister, onItemUnregister, getItems
	}

	const ListPrimitive = asChild ? Slot : 'div'

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
					'flex outline-none',
					orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col items-start',
					className
				)}
				onBlur={onBlur}
				onFocus={onFocus}
				onMouseDown={onMouseDown}
			>
				{children}
			</ListPrimitive>
		</FocusContext.Provider>
	)
}

export { StepperList }

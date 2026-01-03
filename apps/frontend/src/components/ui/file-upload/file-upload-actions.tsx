'use client'

import { Slot } from '@radix-ui/react-slot'
import { useCallback } from 'react'
import type { MouseEvent } from 'react'
import { useAsRef } from '#hooks/use-as-ref'
import { useFileUploadContext } from './context'
import { useStore, useStoreContext } from './store'
import type { FileUploadTriggerProps, FileUploadClearProps } from './types'
import { TRIGGER_NAME, CLEAR_NAME } from './types'

export function FileUploadTrigger(props: FileUploadTriggerProps) {
	const { asChild, onClick: onClickProp, ...triggerProps } = props

	const context = useFileUploadContext(TRIGGER_NAME)

	const propsRef = useAsRef({
		onClick: onClickProp
	})

	const onClick = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			propsRef.current.onClick?.(event)

			if (event.defaultPrevented) return

			context.inputRef.current?.click()
		},
		[context.inputRef, propsRef]
	)

	const TriggerPrimitive = asChild ? Slot : 'button'

	return (
		<TriggerPrimitive
			type="button"
			aria-controls={context.inputId}
			data-disabled={context.disabled ? '' : undefined}
			data-slot="file-upload-trigger"
			{...triggerProps}
			disabled={context.disabled}
			onClick={onClick}
		/>
	)
}

export function FileUploadClear(props: FileUploadClearProps) {
	const {
		asChild,
		forceMount,
		disabled,
		onClick: onClickProp,
		...clearProps
	} = props

	const context = useFileUploadContext(CLEAR_NAME)
	const store = useStoreContext(CLEAR_NAME)
	const fileCount = useStore((state) => state.files.size)

	const isDisabled = disabled || context.disabled

	const onClick = useCallback(
		(event: MouseEvent<HTMLButtonElement>) => {
			onClickProp?.(event)

			if (event.defaultPrevented) return

			store.dispatch({ type: 'CLEAR' })
		},
		[store, onClickProp]
	)

	const shouldRender = forceMount || fileCount > 0

	if (!shouldRender) return null

	const ClearPrimitive = asChild ? Slot : 'button'

	return (
		<ClearPrimitive
			type="button"
			aria-controls={context.listId}
			data-slot="file-upload-clear"
			data-disabled={isDisabled ? '' : undefined}
			{...clearProps}
			disabled={isDisabled}
			onClick={onClick}
		/>
	)
}

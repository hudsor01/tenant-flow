'use client'

import { Slot } from '@radix-ui/react-slot'
import * as React from 'react'
import { cn } from '#lib/utils'
import { useFileUploadContext, FileUploadItemContext } from './context'
import { useStore } from './store'
import type {
	FileUploadListProps,
	FileUploadItemProps
} from './types'
import { LIST_NAME, ITEM_NAME } from './types'

export function FileUploadList(props: FileUploadListProps) {
	const {
		className,
		orientation = 'vertical',
		asChild,
		forceMount,
		...listProps
	} = props

	const context = useFileUploadContext(LIST_NAME)
	const fileCount = useStore((state) => state.files.size)
	const shouldRender = forceMount || fileCount > 0

	if (!shouldRender) return null

	const ListPrimitive = asChild ? Slot : 'div'

	return (
		<ListPrimitive
			role="list"
			id={context.listId}
			aria-orientation={orientation}
			data-orientation={orientation}
			data-slot="file-upload-list"
			data-state={shouldRender ? 'active' : 'inactive'}
			dir={context.dir}
			{...listProps}
			className={cn(
				'data-[state=inactive]:fade-out-0 data-[state=active]:fade-in-0 data-[state=inactive]:slide-out-to-top-2 data-[state=active]:slide-in-from-top-2 flex flex-col gap-2 data-[state=active]:animate-in data-[state=inactive]:animate-out',
				orientation === 'horizontal' && 'flex-row overflow-x-auto p-1.5',
				className
			)}
		/>
	)
}

export function FileUploadItem(props: FileUploadItemProps) {
	const { value, asChild, className, ...itemProps } = props

	const id = React.useId()
	const statusId = `${id}-status`
	const nameId = `${id}-name`
	const sizeId = `${id}-size`
	const messageId = `${id}-message`

	const context = useFileUploadContext(ITEM_NAME)
	const fileState = useStore((state) => state.files.get(value))
	const fileCount = useStore((state) => state.files.size)
	const fileIndex = useStore((state) => {
		const files = Array.from(state.files.keys())
		return files.indexOf(value) + 1
	})

	const itemContext = React.useMemo(
		() => ({
			id,
			fileState,
			nameId,
			sizeId,
			statusId,
			messageId
		}),
		[id, fileState, statusId, nameId, sizeId, messageId]
	)

	if (!fileState) return null

	const statusText = fileState.error
		? `Error: ${fileState.error}`
		: fileState.status === 'uploading'
			? `Uploading: ${fileState.progress}% complete`
			: fileState.status === 'success'
				? 'Upload complete'
				: 'Ready to upload'

	const ItemPrimitive = asChild ? Slot : 'div'

	return (
		<FileUploadItemContext.Provider value={itemContext}>
			<ItemPrimitive
				role="listitem"
				id={id}
				aria-setsize={fileCount}
				aria-posinset={fileIndex}
				aria-describedby={`${nameId} ${sizeId} ${statusId} ${
					fileState.error ? messageId : ''
				}`}
				aria-labelledby={nameId}
				data-slot="file-upload-item"
				dir={context.dir}
				{...itemProps}
				className={cn(
					'relative flex items-center gap-2.5 rounded-md border p-3',
					className
				)}
			>
				{props.children}
				<span id={statusId} className="sr-only">
					{statusText}
				</span>
			</ItemPrimitive>
		</FileUploadItemContext.Provider>
	)
}

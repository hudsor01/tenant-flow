'use client'

import { Slot } from '@radix-ui/react-slot'
import * as React from 'react'
import { cn } from '#lib/utils'
import { useFileUploadContext, useFileUploadItemContext } from './context'
import { useStoreContext } from './store'
import { formatBytes, getFileIcon } from './utils'
import type {
	FileUploadItemPreviewProps,
	FileUploadItemMetadataProps,
	FileUploadItemProgressProps,
	FileUploadItemDeleteProps
} from './types'
import {
	ITEM_PREVIEW_NAME,
	ITEM_METADATA_NAME,
	ITEM_PROGRESS_NAME,
	ITEM_DELETE_NAME
} from './types'

export function FileUploadItemPreview(props: FileUploadItemPreviewProps) {
	const { render, asChild, children, className, ...previewProps } = props

	const itemContext = useFileUploadItemContext(ITEM_PREVIEW_NAME)
	const context = useFileUploadContext(ITEM_PREVIEW_NAME)

	const getDefaultRender = React.useCallback(
		(file: File) => {
			if (itemContext.fileState?.file.type.startsWith('image/')) {
				let url = context.urlCache.get(file)
				if (!url) {
					url = URL.createObjectURL(file)
					context.urlCache.set(file, url)
				}

				return (
					// biome-ignore lint/performance/noImgElement: dynamic file URLs from user uploads don't work well with Next.js Image optimization
					<img src={url} alt={file.name} className="size-full object-cover" />
				)
			}

			return getFileIcon(file)
		},
		[itemContext.fileState?.file.type, context.urlCache]
	)

	const onPreviewRender = React.useCallback(
		(file: File) => {
			if (render) {
				return render(file, () => getDefaultRender(file))
			}

			return getDefaultRender(file)
		},
		[render, getDefaultRender]
	)

	if (!itemContext.fileState) return null

	const ItemPreviewPrimitive = asChild ? Slot : 'div'

	return (
		<ItemPreviewPrimitive
			aria-labelledby={itemContext.nameId}
			data-slot="file-upload-preview"
			{...previewProps}
			className={cn(
				'relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded border bg-accent/50 [&>svg]:size-10',
				className
			)}
		>
			{onPreviewRender(itemContext.fileState.file)}
			{children}
		</ItemPreviewPrimitive>
	)
}

export function FileUploadItemMetadata(props: FileUploadItemMetadataProps) {
	const {
		asChild,
		size = 'default',
		children,
		className,
		...metadataProps
	} = props

	const context = useFileUploadContext(ITEM_METADATA_NAME)
	const itemContext = useFileUploadItemContext(ITEM_METADATA_NAME)

	if (!itemContext.fileState) return null

	const ItemMetadataPrimitive = asChild ? Slot : 'div'

	return (
		<ItemMetadataPrimitive
			data-slot="file-upload-metadata"
			dir={context.dir}
			{...metadataProps}
			className={cn('flex min-w-0 flex-1 flex-col', className)}
		>
			{children ?? (
				<>
					<span
						id={itemContext.nameId}
						className={cn(
							'truncate font-medium text-sm',
							size === 'sm' && 'font-normal text-[13px] leading-snug'
						)}
					>
						{itemContext.fileState.file.name}
					</span>
					<span
						id={itemContext.sizeId}
						className={cn(
							'truncate text-muted-foreground text-xs',
							size === 'sm' && 'text-[11px] leading-snug'
						)}
					>
						{formatBytes(itemContext.fileState.file.size)}
					</span>
					{itemContext.fileState.error && (
						<span
							id={itemContext.messageId}
							className="text-destructive text-xs"
						>
							{itemContext.fileState.error}
						</span>
					)}
				</>
			)}
		</ItemMetadataPrimitive>
	)
}

export function FileUploadItemProgress(props: FileUploadItemProgressProps) {
	const {
		variant = 'linear',
		size = 40,
		asChild,
		forceMount,
		className,
		...progressProps
	} = props

	const itemContext = useFileUploadItemContext(ITEM_PROGRESS_NAME)

	if (!itemContext.fileState) return null

	const shouldRender = forceMount || itemContext.fileState.progress !== 100

	if (!shouldRender) return null

	const ItemProgressPrimitive = asChild ? Slot : 'div'

	switch (variant) {
		case 'circular': {
			const circumference = 2 * Math.PI * ((size - 4) / 2)
			const strokeDashoffset =
				circumference - (itemContext.fileState.progress / 100) * circumference

			return (
				<ItemProgressPrimitive
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={itemContext.fileState.progress}
					aria-valuetext={`${itemContext.fileState.progress}%`}
					aria-labelledby={itemContext.nameId}
					data-slot="file-upload-progress"
					{...progressProps}
					className={cn(
						'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
						className
					)}
				>
					<svg
						className="-rotate-90 transform"
						width={size}
						height={size}
						viewBox={`0 0 ${size} ${size}`}
						fill="none"
						stroke="currentColor"
					>
						<circle
							className="text-primary/20"
							strokeWidth="2"
							cx={size / 2}
							cy={size / 2}
							r={(size - 4) / 2}
						/>
						<circle
							className="text-primary transition-[stroke-dashoffset] duration-300 ease-linear"
							strokeWidth="2"
							strokeLinecap="round"
							strokeDasharray={circumference}
							strokeDashoffset={strokeDashoffset}
							cx={size / 2}
							cy={size / 2}
							r={(size - 4) / 2}
						/>
					</svg>
				</ItemProgressPrimitive>
			)
		}

		case 'fill': {
			const progressPercentage = itemContext.fileState.progress
			const topInset = 100 - progressPercentage

			return (
				<ItemProgressPrimitive
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={progressPercentage}
					aria-valuetext={`${progressPercentage}%`}
					aria-labelledby={itemContext.nameId}
					data-slot="file-upload-progress"
					{...progressProps}
					className={cn(
						'absolute inset-0 bg-primary/50 transition-[clip-path] duration-300 ease-linear',
						className
					)}
					style={{
						clipPath: `inset(${topInset}% 0% 0% 0%)`
					}}
				/>
			)
		}

		default:
			return (
				<ItemProgressPrimitive
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={itemContext.fileState.progress}
					aria-valuetext={`${itemContext.fileState.progress}%`}
					aria-labelledby={itemContext.nameId}
					data-slot="file-upload-progress"
					{...progressProps}
					className={cn(
						'relative h-1.5 w-full overflow-hidden rounded-full bg-primary/20',
						className
					)}
				>
					<div
						className="h-full w-full flex-1 bg-primary transition-transform duration-300 ease-linear"
						style={{
							transform: `translateX(-${100 - itemContext.fileState.progress}%)`
						}}
					/>
				</ItemProgressPrimitive>
			)
	}
}

export function FileUploadItemDelete(props: FileUploadItemDeleteProps) {
	const { asChild, onClick: onClickProp, ...deleteProps } = props

	const store = useStoreContext(ITEM_DELETE_NAME)
	const itemContext = useFileUploadItemContext(ITEM_DELETE_NAME)

	const onClick = React.useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			onClickProp?.(event)

			if (!itemContext.fileState || event.defaultPrevented) return

			store.dispatch({
				type: 'REMOVE_FILE',
				file: itemContext.fileState.file
			})
		},
		[store, itemContext.fileState, onClickProp]
	)

	if (!itemContext.fileState) return null

	const ItemDeletePrimitive = asChild ? Slot : 'button'

	return (
		<ItemDeletePrimitive
			type="button"
			aria-controls={itemContext.id}
			aria-describedby={itemContext.nameId}
			data-slot="file-upload-item-delete"
			{...deleteProps}
			onClick={onClick}
		/>
	)
}

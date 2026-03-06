'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

interface VirtualizedListProps<T> {
	items: T[]
	rowHeight: number
	overscan?: number
	renderItem: (item: T, index: number) => React.ReactNode
	className?: string
}

export function VirtualizedList<T>({
	items,
	rowHeight,
	overscan = 5,
	renderItem,
	className,
}: VirtualizedListProps<T>) {
	const parentRef = useRef<HTMLDivElement>(null)

	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => rowHeight,
		overscan,
	})

	if (items.length === 0) return null

	return (
		<div
			ref={parentRef}
			className={className ?? 'h-[calc(100vh-280px)] overflow-auto'}
		>
			<div
				className="w-full relative"
				style={{
					height: `${virtualizer.getTotalSize()}px`,
				}}
			>
				{virtualizer.getVirtualItems().map((virtualRow) => (
					<div
						key={virtualRow.key}
						className="absolute top-0 left-0 w-full"
						style={{
							height: `${virtualRow.size}px`,
							transform: `translateY(${virtualRow.start}px)`,
						}}
					>
						{renderItem(items[virtualRow.index]!, virtualRow.index)}
					</div>
				))}
			</div>
		</div>
	)
}

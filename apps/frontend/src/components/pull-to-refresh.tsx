'use client'

import type { ReactNode } from 'react'
import { useCallback, useRef, useState } from 'react'

interface PullToRefreshProps {
	onRefresh: () => Promise<void> | void
	children: ReactNode
}

const MAX_PULL_DISTANCE = 96
const REFRESH_THRESHOLD = 56

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
	const [pullDistance, setPullDistance] = useState(0)
	const [isRefreshing, setIsRefreshing] = useState(false)
	const startYRef = useRef(0)

	const reset = () => setPullDistance(0)

	const runRefresh = useCallback(async () => {
		if (isRefreshing) return
		setIsRefreshing(true)
		try {
			await onRefresh()
		} finally {
			setIsRefreshing(false)
			reset()
		}
	}, [isRefreshing, onRefresh])

	const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
		if (event.touches[0]) {
			startYRef.current = event.touches[0].clientY
		}
	}

	const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
		if (isRefreshing) return

		if (!event.touches[0]) return

		const currentY = event.touches[0].clientY
		const diff = currentY - startYRef.current

		if (diff > 0 && window.scrollY === 0) {
			event.preventDefault()
			const distance = Math.min(diff * 0.5, MAX_PULL_DISTANCE)
			setPullDistance(distance)
		}
	}

	const handleTouchEnd = () => {
		if (pullDistance >= REFRESH_THRESHOLD) {
			void runRefresh()
		} else {
			reset()
		}
	}

	return (
		<div
			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			onTouchEnd={handleTouchEnd}
			style={{
				transform: `translateY(${pullDistance}px)`,
				transition: isRefreshing ? 'none' : 'transform 0.2s ease-out'
			}}
		>
			{isRefreshing ? (
				<div className="flex justify-center py-3">
					<div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				</div>
			) : null}
			{children}
		</div>
	)
}

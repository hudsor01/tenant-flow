'use client'

import { useEffect, useRef } from 'react'

interface MobileGesturesConfig {
	onPullToRefresh?: () => void
}

export function useMobileGestures(config: MobileGesturesConfig = {}) {
	const { onPullToRefresh } = config
	const startYRef = useRef(0)

	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}

		const handleTouchStart = (event: TouchEvent) => {
			startYRef.current = event.touches[0]?.clientY ?? 0
		}

		const handleTouchEnd = (event: TouchEvent) => {
			const endY = event.changedTouches[0]?.clientY ?? 0
			const diff = endY - startYRef.current

			if (diff > 100 && window.scrollY === 0 && onPullToRefresh) {
				onPullToRefresh()
			}
		}

		document.addEventListener('touchstart', handleTouchStart)
		document.addEventListener('touchend', handleTouchEnd)

		return () => {
			document.removeEventListener('touchstart', handleTouchStart)
			document.removeEventListener('touchend', handleTouchEnd)
		}
	}, [onPullToRefresh])
}

/**
 * Performance Monitoring Hooks
 * Track component lifecycle and performance metrics
 */

'use client'

import { logger } from '@repo/shared/lib/frontend-logger'
import { useEffect, useRef, useState } from 'react'

/**
 * Hook to measure component mount/unmount time
 * Useful for identifying slow initialization
 *
 * Example:
 * usePerformanceMonitor('TenantList')
 */
export function usePerformanceMonitor(componentName: string) {
	const mountTimeRef = useRef<number>(0)

	useEffect(() => {
		// Record mount time
		mountTimeRef.current = performance.now()

		logger.debug(`${componentName} mounted`, {
			action: 'component_mount',
			metadata: { component: componentName }
		})

		// Cleanup - measure total lifecycle time
		return () => {
			const lifecycleTime = performance.now() - mountTimeRef.current
			logger.debug(`${componentName} unmounted`, {
				action: 'component_unmount',
				metadata: {
					component: componentName,
					lifecycleTime: `${lifecycleTime.toFixed(2)}ms`
				}
			})
		}
	}, [componentName])
}

/**
 * Hook to measure render count
 * Helps identify unnecessary re-renders
 *
 * Example:
 * const renderCount = useRenderCount('TenantList')
 */
export function useRenderCount(componentName: string) {
	const renderCount = useRef(0)
	const [count, setCount] = useState(0)

	useEffect(() => {
		renderCount.current += 1
		setCount(renderCount.current)

		if (renderCount.current > 10) {
			logger.warn(`${componentName} rendered ${renderCount.current} times`, {
				action: 'excessive_renders',
				metadata: { component: componentName, count: renderCount.current }
			})
		}
	})

	return count
}

/**
 * Hook to measure specific operation duration
 * Useful for tracking expensive operations
 *
 * Example:
 * const { start, end } = useMeasure('data-processing')
 * start()
 * // ... expensive operation
 * end()
 */
export function useMeasure(operationName: string) {
	const startTimeRef = useRef<number>(0)

	const start = () => {
		startTimeRef.current = performance.now()
		logger.debug(`${operationName} started`, {
			action: 'operation_start',
			metadata: { operation: operationName }
		})
	}

	const end = () => {
		const duration = performance.now() - startTimeRef.current
		logger.info(`${operationName} completed`, {
			action: 'operation_complete',
			metadata: {
				operation: operationName,
				duration: `${duration.toFixed(2)}ms`
			}
		})
		return duration
	}

	return { start, end }
}

/**
 * Hook to track first paint metrics
 * Captures performance timing data for the component
 *
 * Example:
 * useFirstPaint('TenantList')
 */
export function useFirstPaint(componentName: string) {
	const hasPaintedRef = useRef(false)

	useEffect(() => {
		if (hasPaintedRef.current) return
		hasPaintedRef.current = true

		// Use requestAnimationFrame to measure after paint
		requestAnimationFrame(() => {
			const paintTime = performance.now()
			logger.info(`${componentName} first paint`, {
				action: 'component_first_paint',
				metadata: {
					component: componentName,
					paintTime: `${paintTime.toFixed(2)}ms`
				}
			})
		})
	}, [componentName])
}

/**
 * Hook to monitor memory usage (Chrome only)
 * Helps identify memory leaks
 *
 * Example:
 * useMemoryMonitor('TenantList', 60000) // Check every 60s
 */
export function useMemoryMonitor(
	componentName: string,
	intervalMs = 60000
): { usedMemory: number | null } {
	const memoryRef = useRef<number | null>(null)
	const [usedMemory, setUsedMemory] = useState<number | null>(null)

	useEffect(() => {
		// Only available in Chrome with --enable-precise-memory-info
		if (
			typeof window === 'undefined' ||
			!('memory' in performance) ||
			process.env.NODE_ENV !== 'development'
		) {
			return
		}

		const checkMemory = () => {
			const memory = (
				performance as Performance & { memory?: { usedJSHeapSize: number } }
			).memory
			if (memory) {
				memoryRef.current = memory.usedJSHeapSize
				setUsedMemory(memory.usedJSHeapSize)
				const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2)

				logger.debug(`${componentName} memory usage`, {
					action: 'memory_check',
					metadata: {
						component: componentName,
						usedMemory: `${usedMB}MB`
					}
				})
			}
		}

		checkMemory()
		const interval = setInterval(checkMemory, intervalMs)

		return () => {
			clearInterval(interval)
		}
	}, [componentName, intervalMs])

	return { usedMemory }
}

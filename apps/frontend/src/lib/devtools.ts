/**
 * DevTools Configuration for TanStack Query and Router
 * 
 * Provides comprehensive development tools setup with debugging utilities,
 * performance monitoring, and enhanced development experience.
 */

import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import type { QueryClient } from '@tanstack/react-query'

/**
 * Development environment detection
 */
export const isDevelopment = import.meta.env.DEV
export const isProduction = import.meta.env.PROD

/**
 * DevTools configuration options
 */
export interface DevToolsConfig {
	// React Query DevTools
	queryDevtools?: {
		enabled?: boolean
		initialIsOpen?: boolean
		position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
		toggleButtonProps?: any
	}
	
	// Router DevTools
	routerDevtools?: {
		enabled?: boolean
		initialIsOpen?: boolean
		position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
	}
	
	// Performance monitoring
	performance?: {
		enabled?: boolean
		logSlowQueries?: boolean
		slowQueryThreshold?: number
		logRenders?: boolean
	}
	
	// Debug logging
	debug?: {
		enabled?: boolean
		logQueries?: boolean
		logMutations?: boolean
		logRouting?: boolean
	}
}

/**
 * Default DevTools configuration
 */
export const defaultDevToolsConfig: DevToolsConfig = {
	queryDevtools: {
		enabled: isDevelopment,
		initialIsOpen: false,
		position: 'bottom-right',
	},
	routerDevtools: {
		enabled: isDevelopment,
		initialIsOpen: false,
		position: 'bottom-left',
	},
	performance: {
		enabled: isDevelopment,
		logSlowQueries: true,
		slowQueryThreshold: 1000, // 1 second
		logRenders: false,
	},
	debug: {
		enabled: isDevelopment,
		logQueries: false,
		logMutations: false,
		logRouting: false,
	},
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
	private static queryTimes = new Map<string, number>()
	private static renderTimes = new Map<string, number>()

	static startQueryTimer(queryKey: string) {
		this.queryTimes.set(queryKey, performance.now())
	}

	static endQueryTimer(queryKey: string, threshold = 1000) {
		const startTime = this.queryTimes.get(queryKey)
		if (startTime) {
			const duration = performance.now() - startTime
			this.queryTimes.delete(queryKey)
			
			if (duration > threshold) {
				console.warn(`🐌 Slow query detected: ${queryKey} took ${duration.toFixed(2)}ms`)
			}
			
			return duration
		}
		return 0
	}

	static startRenderTimer(componentName: string) {
		this.renderTimes.set(componentName, performance.now())
	}

	static endRenderTimer(componentName: string, threshold = 16) {
		const startTime = this.renderTimes.get(componentName)
		if (startTime) {
			const duration = performance.now() - startTime
			this.renderTimes.delete(componentName)
			
			if (duration > threshold) {
				console.warn(`🐌 Slow render detected: ${componentName} took ${duration.toFixed(2)}ms`)
			}
			
			return duration
		}
		return 0
	}

	static getQueryStats() {
		return {
			activeQueries: this.queryTimes.size,
			averageQueryTime: 0, // Would need to track completed queries
		}
	}
}

/**
 * Debug logger with filtering
 */
export class DebugLogger {
	private static config: DevToolsConfig['debug'] = defaultDevToolsConfig.debug

	static configure(config: DevToolsConfig['debug']) {
		this.config = { ...this.config, ...config }
	}

	static logQuery(queryKey: unknown[], status: string, data?: any) {
		if (!this.config?.enabled || !this.config?.logQueries) return
		
		console.group(`🔍 Query: ${JSON.stringify(queryKey)}`)
		console.log(`Status: ${status}`)
		if (data) {
			console.log('Data:', data)
		}
		console.groupEnd()
	}

	static logMutation(mutationKey: string, status: string, variables?: any, data?: any) {
		if (!this.config?.enabled || !this.config?.logMutations) return
		
		console.group(`✏️ Mutation: ${mutationKey}`)
		console.log(`Status: ${status}`)
		if (variables) {
			console.log('Variables:', variables)
		}
		if (data) {
			console.log('Data:', data)
		}
		console.groupEnd()
	}

	static logRoute(from: string, to: string, params?: any) {
		if (!this.config?.enabled || !this.config?.logRouting) return
		
		console.group(`🗺️ Route Navigation: ${from} → ${to}`)
		if (params) {
			console.log('Params:', params)
		}
		console.groupEnd()
	}

	static logError(context: string, error: any, details?: any) {
		if (!this.config?.enabled) return
		
		console.group(`❌ Error in ${context}`)
		console.error(error)
		if (details) {
			console.log('Details:', details)
		}
		console.groupEnd()
	}
}

/**
 * Query Client instrumentation for development
 */
export function instrumentQueryClient(queryClient: QueryClient, config: DevToolsConfig = {}) {
	if (!isDevelopment) return

	const perfConfig = { ...defaultDevToolsConfig.performance, ...config.performance }
	const debugConfig = { ...defaultDevToolsConfig.debug, ...config.debug }

	DebugLogger.configure(debugConfig)

	// Add global query cache listeners for debugging
	queryClient.getQueryCache().subscribe((event) => {
		if (!perfConfig?.enabled) return

		const { query, type } = event
		const queryKey = JSON.stringify(query.queryKey)

		switch (type) {
			case 'observerAdded':
				if (perfConfig.logSlowQueries) {
					PerformanceMonitor.startQueryTimer(queryKey)
				}
				DebugLogger.logQuery(query.queryKey, 'started')
				break

			case 'observerRemoved':
				if (perfConfig.logSlowQueries) {
					PerformanceMonitor.endQueryTimer(queryKey, perfConfig.slowQueryThreshold)
				}
				break

			case 'updated':
				if (query.state.status === 'success') {
					DebugLogger.logQuery(query.queryKey, 'success', query.state.data)
				} else if (query.state.status === 'error') {
					DebugLogger.logQuery(query.queryKey, 'error', query.state.error)
				}
				break
		}
	})

	// Add global mutation cache listeners
	queryClient.getMutationCache().subscribe((event) => {
		if (!debugConfig?.enabled || !debugConfig?.logMutations) return

		const { mutation, type } = event
		const mutationKey = mutation.options.mutationKey?.[0] || 'unknown'

		switch (type) {
			case 'added':
				DebugLogger.logMutation(mutationKey, 'started', mutation.state.variables)
				break

			case 'updated':
				if (mutation.state.status === 'success') {
					DebugLogger.logMutation(mutationKey, 'success', mutation.state.variables, mutation.state.data)
				} else if (mutation.state.status === 'error') {
					DebugLogger.logMutation(mutationKey, 'error', mutation.state.variables, mutation.state.error)
				}
				break
		}
	})
}

/**
 * React DevTools integration
 */
export function setupReactDevTools() {
	if (!isDevelopment || typeof window === 'undefined') return

	// Add query client to window for debugging
	if (window && !window.__REACT_QUERY_CLIENT__) {
		Object.defineProperty(window, '__REACT_QUERY_CLIENT__', {
			get() {
				// Return the current query client instance
				return document.querySelector('[data-react-query-client]')?.__reactInternalInstance?.memoizedProps?.client
			},
			configurable: true,
		})
	}

	// Add performance helpers to window
	if (window && !window.__PERFORMANCE_MONITOR__) {
		window.__PERFORMANCE_MONITOR__ = PerformanceMonitor
	}

	// Add debug logger to window
	if (window && !window.__DEBUG_LOGGER__) {
		window.__DEBUG_LOGGER__ = DebugLogger
	}
}

/**
 * Component for rendering DevTools
 */
import React from 'react'

interface DevToolsProviderProps {
	children: React.ReactNode
	config?: DevToolsConfig
}

export function DevToolsProvider({ children, config = {} }: DevToolsProviderProps) {
	const finalConfig = {
		queryDevtools: { ...defaultDevToolsConfig.queryDevtools, ...config.queryDevtools },
		routerDevtools: { ...defaultDevToolsConfig.routerDevtools, ...config.routerDevtools },
	}

	React.useEffect(() => {
		setupReactDevTools()
	}, [])

	if (!isDevelopment) {
		return React.createElement(React.Fragment, null, children)
	}

	return React.createElement(
		React.Fragment,
		null,
		children,
		finalConfig.queryDevtools?.enabled && React.createElement(ReactQueryDevtools, {
			initialIsOpen: finalConfig.queryDevtools.initialIsOpen,
			position: finalConfig.queryDevtools.position,
			toggleButtonProps: finalConfig.queryDevtools.toggleButtonProps,
		}),
		finalConfig.routerDevtools?.enabled && React.createElement(TanStackRouterDevtools, {
			position: finalConfig.routerDevtools.position,
			initialIsOpen: finalConfig.routerDevtools.initialIsOpen,
		})
	)
}

/**
 * Hook for using DevTools in components
 */
export function useDevTools() {
	const logRender = React.useCallback((componentName: string) => {
		if (!isDevelopment) return

		const renderStart = performance.now()
		
		return () => {
			const renderTime = performance.now() - renderStart
			PerformanceMonitor.endRenderTimer(componentName, 16) // 60fps = 16ms budget
		}
	}, [])

	const logQuery = React.useCallback((queryKey: unknown[], status: string, data?: any) => {
		DebugLogger.logQuery(queryKey, status, data)
	}, [])

	const logMutation = React.useCallback((mutationKey: string, status: string, variables?: any, data?: any) => {
		DebugLogger.logMutation(mutationKey, status, variables, data)
	}, [])

	const logError = React.useCallback((context: string, error: any, details?: any) => {
		DebugLogger.logError(context, error, details)
	}, [])

	return {
		logRender,
		logQuery,
		logMutation,
		logError,
		isDevMode: isDevelopment,
	}
}

/**
 * Performance measurement hook
 */
export function usePerformance(componentName: string, enabled = isDevelopment) {
	const startTimeRef = React.useRef<number>()

	React.useEffect(() => {
		if (!enabled) return

		startTimeRef.current = performance.now()
		
		return () => {
			if (startTimeRef.current) {
				const duration = performance.now() - startTimeRef.current
				if (duration > 16) { // More than one frame
					console.log(`⏱️ ${componentName} lifecycle took ${duration.toFixed(2)}ms`)
				}
			}
		}
	})

	const measureRender = React.useCallback(() => {
		if (!enabled) return () => {}

		const start = performance.now()
		return () => {
			const duration = performance.now() - start
			if (duration > 5) { // Noticeable render time
				console.log(`🎨 ${componentName} render took ${duration.toFixed(2)}ms`)
			}
		}
	}, [componentName, enabled])

	return { measureRender }
}

/**
 * Global error boundary for DevTools
 */
export class DevToolsErrorBoundary extends React.Component<
	{ children: React.ReactNode },
	{ hasError: boolean; error?: Error }
> {
	constructor(props: { children: React.ReactNode }) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		if (isDevelopment) {
			console.group('🚨 DevTools Error Boundary')
			console.error('Error:', error)
			console.error('Error Info:', errorInfo)
			console.groupEnd()
		}
	}

	render() {
		if (this.state.hasError) {
			if (isDevelopment) {
				return React.createElement('div', {
					style: { 
						padding: 20, 
						background: '#fee', 
						border: '1px solid #f00',
						borderRadius: 4,
						margin: 10 
					}
				}, 
					React.createElement('h3', null, 'DevTools Error'),
					React.createElement('p', null, 'An error occurred in the development tools.'),
					React.createElement('details', null,
						React.createElement('summary', null, 'Error details'),
						React.createElement('pre', null, this.state.error?.stack)
					),
					React.createElement('button', {
						onClick: () => this.setState({ hasError: false, error: undefined })
					}, 'Reset')
				)
			}
			return null
		}

		return this.props.children
	}
}

/**
 * Window interface extension for TypeScript
 */
declare global {
	interface Window {
		__REACT_QUERY_CLIENT__?: any
		__PERFORMANCE_MONITOR__?: typeof PerformanceMonitor
		__DEBUG_LOGGER__?: typeof DebugLogger
	}
}
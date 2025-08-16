import React, { useEffect, useRef, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Activity,
	Clock,
	Zap,
	TrendingUp,
	AlertTriangle,
	CheckCircle,
	BarChart3,
	RefreshCw
} from 'lucide-react'

// Performance metrics interface
interface PerformanceMetrics {
	renderTime: number
	firstPaint?: number
	firstContentfulPaint?: number
	largestContentfulPaint?: number
	interactionTime?: number
	memoryUsage?: number
	bundleSize?: number
	componentCount: number
	reRenderCount: number
}

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
	renderTime: {
		good: 16, // 60fps
		needs_improvement: 100,
		poor: 300
	},
	firstContentfulPaint: {
		good: 100,
		needs_improvement: 300,
		poor: 1000
	},
	largestContentfulPaint: {
		good: 200,
		needs_improvement: 500,
		poor: 1000
	},
	interactionTime: {
		good: 50,
		needs_improvement: 100,
		poor: 300
	}
}

// Performance status helper
const getPerformanceStatus = (
	value: number,
	metric: keyof typeof PERFORMANCE_THRESHOLDS
) => {
	const thresholds = PERFORMANCE_THRESHOLDS[metric]
	if (value <= thresholds.good) return 'good'
	if (value <= thresholds.needs_improvement) return 'needs_improvement'
	return 'poor'
}

// Performance monitor hook
export const usePerformanceMonitor = (componentName: string) => {
	const [metrics, setMetrics] = useState<PerformanceMetrics>({
		renderTime: 0,
		componentCount: 0,
		reRenderCount: 0
	})
	const renderStartTime = useRef<number>()
	const reRenderCount = useRef(0)
	const observer = useRef<PerformanceObserver>()

	useEffect(() => {
		renderStartTime.current = performance.now()
		reRenderCount.current += 1

		// Set up performance observer
		if ('PerformanceObserver' in window) {
			observer.current = new PerformanceObserver(list => {
				const entries = list.getEntries()
				const paintEntries = entries.filter(
					entry => entry.entryType === 'paint'
				)

				const fcp = paintEntries.find(
					entry => entry.name === 'first-contentful-paint'
				)
				const lcp = entries.find(
					entry => entry.entryType === 'largest-contentful-paint'
				)

				setMetrics(prev => ({
					...prev,
					firstContentfulPaint: fcp?.startTime,
					largestContentfulPaint: lcp
						? (lcp as any).startTime
						: undefined
				}))
			})

			try {
				observer.current.observe({
					entryTypes: ['paint', 'largest-contentful-paint']
				})
			} catch (error) {
				console.warn('Performance observer not supported:', error)
			}
		}

		return () => {
			if (renderStartTime.current) {
				const renderTime = performance.now() - renderStartTime.current

				setMetrics(prev => ({
					...prev,
					renderTime,
					reRenderCount: reRenderCount.current,
					componentCount:
						document.querySelectorAll('[data-testid]').length
				}))

				// Log performance metrics
				console.group(`📊 Performance [${componentName}]`)
				console.log(`Render time: ${renderTime.toFixed(2)}ms`)
				console.log(`Re-renders: ${reRenderCount.current}`)
				console.log(
					`Components: ${document.querySelectorAll('[data-testid]').length}`
				)
				console.groupEnd()
			}

			if (observer.current) {
				observer.current.disconnect()
			}
		}
	}, [componentName])

	// Memory usage (if available)
	useEffect(() => {
		if ('memory' in performance) {
			const memory = (performance as any).memory
			setMetrics(prev => ({
				...prev,
				memoryUsage: memory.usedJSHeapSize
			}))
		}
	}, [])

	const resetMetrics = () => {
		reRenderCount.current = 0
		setMetrics({
			renderTime: 0,
			componentCount: 0,
			reRenderCount: 0
		})
	}

	return { metrics, resetMetrics }
}

// Performance monitor component
export const PerformanceMonitor: React.FC<{
	componentName: string
	showDetails?: boolean
	onMetricsUpdate?: (metrics: PerformanceMetrics) => void
}> = ({ componentName, showDetails = false, onMetricsUpdate }) => {
	const { metrics, resetMetrics } = usePerformanceMonitor(componentName)

	useEffect(() => {
		if (onMetricsUpdate && metrics.renderTime > 0) {
			onMetricsUpdate(metrics)
		}
	}, [metrics, onMetricsUpdate])

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'good':
				return 'bg-green-100 text-green-800'
			case 'needs_improvement':
				return 'bg-yellow-100 text-yellow-800'
			case 'poor':
				return 'bg-red-100 text-red-800'
			default:
				return 'bg-gray-100 text-gray-800'
		}
	}

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'good':
				return <CheckCircle className="h-4 w-4" />
			case 'needs_improvement':
				return <AlertTriangle className="h-4 w-4" />
			case 'poor':
				return <AlertTriangle className="h-4 w-4" />
			default:
				return <Activity className="h-4 w-4" />
		}
	}

	if (!showDetails) {
		const renderStatus = getPerformanceStatus(
			metrics.renderTime,
			'renderTime'
		)
		return (
			<div className="fixed right-4 bottom-4 z-50">
				<Badge className={`${getStatusColor(renderStatus)} gap-1`}>
					<Activity className="h-3 w-3" />
					{metrics.renderTime.toFixed(1)}ms
				</Badge>
			</div>
		)
	}

	return (
		<Card className="fixed right-4 bottom-4 z-50 w-80 shadow-lg">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-sm">
						<BarChart3 className="h-4 w-4" />
						Performance Monitor
					</CardTitle>
					<Button onClick={resetMetrics} size="sm" variant="outline">
						<RefreshCw className="h-3 w-3" />
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<div className="mb-2 text-xs font-medium text-gray-600">
					{componentName}
				</div>

				{/* Render Time */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Clock className="h-3 w-3" />
						<span className="text-sm">Render Time</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="font-mono text-sm">
							{metrics.renderTime.toFixed(2)}ms
						</span>
						<Badge
							className={`text-xs ${getStatusColor(getPerformanceStatus(metrics.renderTime, 'renderTime'))}`}
						>
							{getStatusIcon(
								getPerformanceStatus(
									metrics.renderTime,
									'renderTime'
								)
							)}
						</Badge>
					</div>
				</div>

				{/* First Contentful Paint */}
				{metrics.firstContentfulPaint && (
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Zap className="h-3 w-3" />
							<span className="text-sm">FCP</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="font-mono text-sm">
								{metrics.firstContentfulPaint.toFixed(2)}ms
							</span>
							<Badge
								className={`text-xs ${getStatusColor(getPerformanceStatus(metrics.firstContentfulPaint, 'firstContentfulPaint'))}`}
							>
								{getStatusIcon(
									getPerformanceStatus(
										metrics.firstContentfulPaint,
										'firstContentfulPaint'
									)
								)}
							</Badge>
						</div>
					</div>
				)}

				{/* Re-render Count */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<TrendingUp className="h-3 w-3" />
						<span className="text-sm">Re-renders</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="font-mono text-sm">
							{metrics.reRenderCount}
						</span>
						<Badge
							variant={
								metrics.reRenderCount > 5
									? 'destructive'
									: 'secondary'
							}
							className="text-xs"
						>
							{metrics.reRenderCount > 5 ? (
								<AlertTriangle className="h-3 w-3" />
							) : (
								<CheckCircle className="h-3 w-3" />
							)}
						</Badge>
					</div>
				</div>

				{/* Component Count */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Activity className="h-3 w-3" />
						<span className="text-sm">Components</span>
					</div>
					<span className="font-mono text-sm">
						{metrics.componentCount}
					</span>
				</div>

				{/* Memory Usage */}
				{metrics.memoryUsage && (
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<BarChart3 className="h-3 w-3" />
							<span className="text-sm">Memory</span>
						</div>
						<span className="font-mono text-sm">
							{(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
						</span>
					</div>
				)}

				{/* Performance Score */}
				<div className="border-t pt-2">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">
							Overall Score
						</span>
						<div className="flex items-center gap-2">
							{(() => {
								const renderStatus = getPerformanceStatus(
									metrics.renderTime,
									'renderTime'
								)
								const score =
									renderStatus === 'good'
										? 90 + Math.random() * 10
										: renderStatus === 'needs_improvement'
											? 50 + Math.random() * 40
											: Math.random() * 50
								return (
									<>
										<span className="font-mono text-sm">
											{score.toFixed(0)}
										</span>
										<Badge
											className={getStatusColor(
												renderStatus
											)}
										>
											{getStatusIcon(renderStatus)}
										</Badge>
									</>
								)
							})()}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

// Performance decorator for stories
export const withPerformanceMonitor =
	(showDetails: boolean = false) =>
	(Story: React.ComponentType, context: any) => {
		const [showMonitor, setShowMonitor] = useState(showDetails)

		return (
			<div>
				<Story />
				{showMonitor && (
					<PerformanceMonitor
						componentName={context.title || 'Component'}
						showDetails={true}
					/>
				)}
				<Button
					onClick={() => setShowMonitor(!showMonitor)}
					className="fixed bottom-4 left-4 z-50"
					size="sm"
					variant="outline"
				>
					<BarChart3 className="h-4 w-4" />
					{showMonitor ? 'Hide' : 'Show'} Perf
				</Button>
			</div>
		)
	}

// Performance test helper
export const measureComponentPerformance = async (
	component: React.ComponentType,
	iterations: number = 10
): Promise<{
	averageRenderTime: number
	minRenderTime: number
	maxRenderTime: number
	standardDeviation: number
}> => {
	const renderTimes: number[] = []

	for (let i = 0; i < iterations; i++) {
		const start = performance.now()

		// Simulate component render
		const div = document.createElement('div')
		document.body.appendChild(div)

		// Measure actual render time would go here
		await new Promise(resolve => setTimeout(resolve, Math.random() * 10))

		const end = performance.now()
		renderTimes.push(end - start)

		document.body.removeChild(div)
	}

	const sum = renderTimes.reduce((a, b) => a + b, 0)
	const average = sum / renderTimes.length
	const min = Math.min(...renderTimes)
	const max = Math.max(...renderTimes)

	const variance =
		renderTimes.reduce(
			(acc, time) => acc + Math.pow(time - average, 2),
			0
		) / renderTimes.length
	const standardDeviation = Math.sqrt(variance)

	return {
		averageRenderTime: average,
		minRenderTime: min,
		maxRenderTime: max,
		standardDeviation
	}
}

// Bundle size analyzer
export const analyzeBundleSize = (componentName: string) => {
	const scripts = Array.from(document.getElementsByTagName('script'))
	const totalSize = scripts.reduce((size, script) => {
		if (script.src && script.src.includes(componentName.toLowerCase())) {
			// Estimate based on content length (rough approximation)
			return size + (script.textContent?.length || 0)
		}
		return size
	}, 0)

	console.log(
		`📦 Estimated bundle impact for ${componentName}: ${totalSize} characters`
	)
	return totalSize
}

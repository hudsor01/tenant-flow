/**
 * Offline Indicator Component
 * Shows connection status and offline queue information to users
 */

'use client'

import { useEffect, useState } from 'react'
import {
	WifiOff,
	Wifi,
	CloudOff,
	Cloud,
	AlertCircle,
	CheckCircle2,
	Loader2
} from 'lucide-react'
import { Badge } from './badge'
import { Button } from './button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Progress } from './progress'
import { useOfflineSupport } from '@/lib/offline-support'
import { cn } from '@/lib/utils'

interface OfflineIndicatorProps {
	className?: string
	showDetails?: boolean
}

export function OfflineIndicator({
	className,
	showDetails = true
}: OfflineIndicatorProps) {
	const { isOnline, queueSize, processQueue, clearQueue } =
		useOfflineSupport()

	// Simplified state for missing properties
	const networkInfo = {
		type: 'unknown',
		speed: 'unknown',
		effectiveType: 'unknown',
		downlink: 0
	}
	const failedOperations = []
	const isProcessing = false
	const hasOfflineData = queueSize > 0
	const hasFailedOperations = false

	const [showIndicator, setShowIndicator] = useState(false)

	// Show indicator when offline or when there are pending operations
	useEffect(() => {
		setShowIndicator(!isOnline || hasOfflineData || hasFailedOperations)
	}, [isOnline, hasOfflineData, hasFailedOperations])

	// Don't render if not needed
	if (!showIndicator) {
		return null
	}

	const getStatusIcon = () => {
		if (isProcessing) {
			return <Loader2 className="h-4 w-4 animate-spin" />
		}

		if (!isOnline) {
			return <WifiOff className="h-4 w-4" />
		}

		if (hasFailedOperations) {
			return <AlertCircle className="h-4 w-4" />
		}

		if (hasOfflineData) {
			return <CloudOff className="h-4 w-4" />
		}

		return <Wifi className="h-4 w-4" />
	}

	const getStatusText = () => {
		if (isProcessing) {
			return 'Syncing...'
		}

		if (!isOnline) {
			return 'Offline'
		}

		if (hasFailedOperations) {
			return `${failedOperations.length} failed`
		}

		if (hasOfflineData) {
			return `${queueSize} pending`
		}

		return 'Online'
	}

	const getStatusVariant = ():
		| 'default'
		| 'secondary'
		| 'destructive'
		| 'outline' => {
		if (!isOnline) {
			return 'destructive'
		}
		if (hasFailedOperations) {
			return 'destructive'
		}
		if (hasOfflineData) {
			return 'secondary'
		}
		return 'default'
	}

	const getConnectionQuality = () => {
		if (!isOnline) {
			return 'Offline'
		}

		const { effectiveType } = networkInfo
		switch (effectiveType) {
			case '4g':
				return 'Excellent'
			case '3g':
				return 'Good'
			case '2g':
				return 'Slow'
			case 'slow-2g':
				return 'Very Slow'
			default:
				return 'Unknown'
		}
	}

	if (!showDetails) {
		return (
			<div className={cn('flex items-center gap-2', className)}>
				<Badge
					variant={getStatusVariant()}
					className="flex items-center gap-1"
				>
					{getStatusIcon()}
					<span className="text-xs">{getStatusText()}</span>
				</Badge>
			</div>
		)
	}

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className={cn(
						'flex h-8 items-center gap-2 px-2',
						!isOnline && 'text-destructive',
						hasFailedOperations && 'text-destructive',
						className
					)}
				>
					{getStatusIcon()}
					<span className="text-xs font-medium">
						{getStatusText()}
					</span>
				</Button>
			</PopoverTrigger>

			<PopoverContent className="w-80" align="end">
				<div className="space-y-4">
					{/* Connection Status */}
					<div>
						<div className="mb-2 flex items-center justify-between">
							<h4 className="text-sm font-semibold">
								Connection Status
							</h4>
							<div className="flex items-center gap-1">
								{isOnline ? (
									<Wifi className="h-4 w-4 text-green-500" />
								) : (
									<WifiOff className="h-4 w-4 text-red-500" />
								)}
								<span
									className={cn(
										'text-xs font-medium',
										isOnline
											? 'text-green-700'
											: 'text-red-700'
									)}
								>
									{isOnline ? 'Online' : 'Offline'}
								</span>
							</div>
						</div>

						{isOnline && (
							<div className="text-muted-foreground space-y-1 text-xs">
								<div className="flex justify-between">
									<span>Quality:</span>
									<span className="font-medium">
										{getConnectionQuality()}
									</span>
								</div>
								<div className="flex justify-between">
									<span>Type:</span>
									<span className="font-medium capitalize">
										{networkInfo.effectiveType || 'Unknown'}
									</span>
								</div>
								{networkInfo.downlink > 0 && (
									<div className="flex justify-between">
										<span>Speed:</span>
										<span className="font-medium">
											{networkInfo.downlink} Mbps
										</span>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Sync Status */}
					{(hasOfflineData ||
						hasFailedOperations ||
						isProcessing) && (
						<div className="border-t pt-4">
							<h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
								<Cloud className="h-4 w-4" />
								Sync Status
							</h4>

							{isProcessing && (
								<div className="mb-3 space-y-2">
									<div className="flex items-center gap-2">
										<Loader2 className="h-3 w-3 animate-spin" />
										<span className="text-muted-foreground text-xs">
											Syncing pending changes...
										</span>
									</div>
									<Progress
										value={undefined}
										className="h-1"
									/>
								</div>
							)}

							<div className="space-y-2">
								{queueSize > 0 && (
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground text-xs">
											Pending operations:
										</span>
										<Badge
											variant="secondary"
											className="text-xs"
										>
											{queueSize}
										</Badge>
									</div>
								)}

								{hasFailedOperations && (
									<div className="flex items-center justify-between">
										<span className="text-muted-foreground text-xs">
											Failed operations:
										</span>
										<Badge
											variant="destructive"
											className="text-xs"
										>
											{failedOperations.length}
										</Badge>
									</div>
								)}
							</div>
						</div>
					)}

					{/* Actions */}
					{(hasOfflineData || hasFailedOperations) && isOnline && (
						<div className="space-y-2 border-t pt-4">
							{hasOfflineData && (
								<Button
									onClick={processQueue}
									disabled={isProcessing}
									size="sm"
									className="w-full text-xs"
								>
									{isProcessing ? (
										<>
											<Loader2 className="mr-1 h-3 w-3 animate-spin" />
											Syncing...
										</>
									) : (
										<>
											<CheckCircle2 className="mr-1 h-3 w-3" />
											Sync Now
										</>
									)}
								</Button>
							)}

							{hasFailedOperations && (
								<div className="flex gap-2">
									<Button
										onClick={async () => processQueue()}
										disabled={isProcessing}
										variant="outline"
										size="sm"
										className="flex-1 text-xs"
									>
										<span>Retry</span>
									</Button>
									<Button
										onClick={() => clearQueue()}
										disabled={isProcessing}
										variant="outline"
										size="sm"
										className="flex-1 text-xs"
									>
										<span>Clear</span>
									</Button>
								</div>
							)}
						</div>
					)}

					{/* Success State */}
					{isOnline &&
						!hasOfflineData &&
						!hasFailedOperations &&
						!isProcessing && (
							<div className="border-t pt-4">
								<div className="flex items-center gap-2 text-green-600">
									<CheckCircle2 className="h-4 w-4" />
									<span className="text-xs font-medium">
										All data synced
									</span>
								</div>
							</div>
						)}
				</div>
			</PopoverContent>
		</Popover>
	)
}

/**
 * Simple offline banner that appears at the top of the page when offline
 */
export function OfflineBanner() {
	const { isOnline, queueSize } = useOfflineSupport()
	const [show, setShow] = useState(false)

	// Simplified for missing properties
	const hasOfflineData = queueSize > 0
	const isProcessing = false

	useEffect(() => {
		setShow(!isOnline || (hasOfflineData && isOnline && isProcessing))
	}, [isOnline, hasOfflineData, isProcessing])

	if (!show) {
		return null
	}

	return (
		<div
			className={cn(
				'w-full border-b border-yellow-200 bg-yellow-50 px-4 py-2',
				!isOnline && 'border-red-200 bg-red-50'
			)}
		>
			<div className="mx-auto flex max-w-7xl items-center justify-between">
				<div className="flex items-center gap-2">
					{!isOnline ? (
						<WifiOff className="h-4 w-4 text-red-600" />
					) : (
						<Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
					)}
					<span
						className={cn(
							'text-sm font-medium',
							!isOnline ? 'text-red-800' : 'text-yellow-800'
						)}
					>
						{!isOnline
							? 'You are offline. Changes will sync when connection is restored.'
							: 'Syncing offline changes...'}
					</span>
				</div>

				<OfflineIndicator showDetails={false} />
			</div>
		</div>
	)
}

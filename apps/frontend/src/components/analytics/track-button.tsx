'use client'

/**
 * Button wrapper with analytics tracking
 * Automatically tracks button clicks with context
 */

import { usePostHog } from 'posthog-js/react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { forwardRef } from 'react'

interface TrackButtonProps extends ButtonProps {
	trackingEvent?: string
	trackingProperties?: Record<string, string | number | boolean>
	// Legacy prop names for backwards compatibility
	trackEvent?: string
	trackProperties?: Record<string, string | number | boolean>
	category?: string
}

export const TrackButton = forwardRef<HTMLButtonElement, TrackButtonProps>(
	({ 
		trackingEvent, 
		trackingProperties = {}, 
		trackEvent, 
		trackProperties = {},
		category = 'ui', 
		onClick, 
		children, 
		...props 
	}, ref) => {
		const posthog = usePostHog()

		const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
			// Use new prop names first, fallback to legacy prop names
			const eventName = trackingEvent || trackEvent
			const eventProperties = { ...trackingProperties, ...trackProperties }
			
			// Track the click event
			if (posthog && eventName) {
				posthog.capture(eventName, {
					category,
					button_text: typeof children === 'string' ? children : 'button',
					...eventProperties,
					timestamp: new Date().toISOString()
				})
			}

			// Call the original onClick handler
			onClick?.(event)
		}

		return (
			<Button ref={ref} onClick={handleClick} {...props}>
				{children}
			</Button>
		)
	}
)

TrackButton.displayName = 'TrackButton'

export default TrackButton
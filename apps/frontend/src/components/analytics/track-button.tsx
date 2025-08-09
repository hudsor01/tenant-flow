'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { usePostHog } from '@/hooks/use-posthog'
import type { TenantFlowEvent, EventProperties } from '@/hooks/use-posthog'

interface TrackButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  trackEvent?: TenantFlowEvent
  trackProperties?: EventProperties
  trackOnHover?: boolean
}

export const TrackButton = forwardRef<HTMLButtonElement, TrackButtonProps>(
  ({ trackEvent, trackProperties, trackOnHover = false, onClick, onMouseEnter, ...props }, ref) => {
    const { trackEvent: track } = usePostHog()

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (trackEvent) {
        track(trackEvent, {
          ...trackProperties,
          button_text: props.children?.toString(),
          button_class: props.className,
        })
      }
      onClick?.(e)
    }

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (trackOnHover && trackEvent) {
        track(`${trackEvent}_hovered` as TenantFlowEvent, {
          ...trackProperties,
          button_text: props.children?.toString(),
        })
      }
      onMouseEnter?.(e)
    }

    return (
      <button
        ref={ref}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        data-track={trackEvent}
        {...props}
      />
    )
  }
)

TrackButton.displayName = 'TrackButton'
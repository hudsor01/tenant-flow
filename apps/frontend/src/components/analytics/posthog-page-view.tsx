'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { usePostHog } from 'posthog-js/react'

export function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthog = usePostHog()
  const prevPathRef = useRef<string>('')

  useEffect(() => {
    if (!posthog || !pathname) return

    // Build the full URL
    let url = window.origin + pathname
    if (searchParams?.toString()) {
      url = url + `?${searchParams.toString()}`
    }

    // Only track if the path has actually changed
    if (prevPathRef.current !== url) {
      prevPathRef.current = url

      // Capture pageview with additional metadata
      posthog.capture('$pageview', {
        $current_url: url,
        $pathname: pathname,
        $search: searchParams?.toString() || '',
        $referrer: document.referrer,
        $referring_domain: document.referrer ? new URL(document.referrer).hostname : '',
        $screen_height: window.screen.height,
        $screen_width: window.screen.width,
        $viewport_height: window.innerHeight,
        $viewport_width: window.innerWidth,
        timestamp: new Date().toISOString(),
      })

      // Track page performance metrics
      if (typeof window !== 'undefined' && window.performance) {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (perfData) {
          posthog.capture('$page_performance', {
            $current_url: url,
            load_time: perfData.loadEventEnd - perfData.loadEventStart,
            dom_interactive: perfData.domInteractive,
            dom_content_loaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          })
        }
      }
    }
  }, [pathname, searchParams, posthog])

  // This component doesn't render anything
  return null
}
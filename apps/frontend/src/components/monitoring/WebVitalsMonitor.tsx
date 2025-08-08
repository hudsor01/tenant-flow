import { useEffect } from 'react'

interface WebVitalsConfig {
  // Placeholder config interface
  enabled?: boolean
}

const defaultConfig: WebVitalsConfig = {
  enabled: true,
}

// Simplified placeholder WebVitalsMonitor component
export function WebVitalsMonitor({ config = defaultConfig }: { config?: WebVitalsConfig }) {
  useEffect(() => {
    if (!config.enabled) return

    // TODO: Implement proper web vitals monitoring
    console.log('WebVitals monitoring initialized')
  }, [config])

  return null
}

export default WebVitalsMonitor
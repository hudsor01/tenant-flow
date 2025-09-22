'use client'

import { useEffect, useState } from 'react'
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'

interface WebVitalsMetrics {
  CLS?: Metric
  FCP?: Metric
  INP?: Metric
  LCP?: Metric
  TTFB?: Metric
}

const METRICS_CONFIG = {
  CLS: { fn: onCLS, unit: '', formatValue: (v: number) => v.toFixed(3) },
  FCP: { fn: onFCP, unit: 'ms', formatValue: (v: number) => Math.round(v).toString() },
  INP: { fn: onINP, unit: 'ms', formatValue: (v: number) => Math.round(v).toString() },
  LCP: { fn: onLCP, unit: 'ms', formatValue: (v: number) => Math.round(v).toString() },
  TTFB: { fn: onTTFB, unit: 'ms', formatValue: (v: number) => Math.round(v).toString() }
} as const

const ratingColorMap: Record<Metric['rating'], string> = {
  good: 'text-[var(--color-system-green)]',
  'needs-improvement': 'text-[var(--color-system-yellow)]',
  poor: 'text-[var(--color-system-red)]'
}

function sendToAnalytics(metric: Metric): void {
  // Disabled analytics to prevent 404 spam during development
  if (process.env.NODE_ENV === 'development') {
    return
  }

  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    page: window.location.pathname,
    timestamp: new Date().toISOString(),
  })

  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/web-vitals', body)
  } else {
    fetch('/api/analytics/web-vitals', {
      body,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(console.error)
  }
}

export function WebVitals() {
  const [metrics, setMetrics] = useState<WebVitalsMetrics>({})

  useEffect(() => {
    const handleMetric = (metric: Metric) => {
      setMetrics(prev => ({
        ...prev,
        [metric.name]: metric
      }))
      sendToAnalytics(metric)
    }

    Object.values(METRICS_CONFIG).forEach(({ fn }) => fn(handleMetric))
  }, [])

  if (Object.keys(metrics).length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-1 rounded-2xl border border-[var(--color-fill-secondary)] bg-[var(--color-fill-primary)] px-3 py-2 text-xs text-[var(--color-label-primary)] shadow-lg backdrop-blur">
      <div className="mb-1 text-[10px] font-medium text-[var(--color-label-tertiary)]">Web Vitals</div>
      {Object.entries(METRICS_CONFIG).map(([name, config]) => {
        const metric = metrics[name as keyof WebVitalsMetrics]
        if (!metric) return null

        const ratingColor = ratingColorMap[metric.rating]

        return (
          <div key={name} className="flex justify-between items-center gap-2">
            <span className="text-[var(--color-label-secondary)]">{name}:</span>
            <span className={ratingColor}>
              {config.formatValue(metric.value)}{config.unit}
            </span>
          </div>
        )
      })}
    </div>
  )
}

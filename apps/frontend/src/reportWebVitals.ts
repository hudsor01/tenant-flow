import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'

type ReportHandler = (metric: Metric) => void

const reportWebVitals = (onPerfEntry?: ReportHandler) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    onCLS(onPerfEntry)
    onFCP(onPerfEntry)
    onINP(onPerfEntry)
    onLCP(onPerfEntry)
    onTTFB(onPerfEntry)
  }
}

export default reportWebVitals
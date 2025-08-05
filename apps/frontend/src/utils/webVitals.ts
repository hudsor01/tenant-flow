/**
 * Web Vitals Utility Functions
 * Separated from components to avoid react-refresh warnings
 */

interface WebVitalsData {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  id: string
  navigationType: string
}

// Utility function to get current Web Vitals data from localStorage (dev only)
export function getWebVitalsData(): WebVitalsData[] {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return []
  
  try {
    return JSON.parse(localStorage.getItem('webVitals') || '[]')
  } catch {
    return []
  }
}

// Utility function to clear Web Vitals data (dev only)
export function clearWebVitalsData(): void {
  if (typeof window === 'undefined' || !import.meta.env.DEV) return
  localStorage.removeItem('webVitals')
}
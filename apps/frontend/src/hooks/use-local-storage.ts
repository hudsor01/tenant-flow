'use client'

import { createLogger } from '@repo/shared'
import { useState } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const logger = createLogger({ component: 'useLocalStorage' })

  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      logger.error('Error reading localStorage key', {
        metadata: {
          key,
          error: error instanceof Error ? error.message : String(error)
        }
      })
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value

      // Save state
      setStoredValue(valueToStore)

      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      logger.error('Error setting localStorage key', {
        metadata: {
          key,
          error: error instanceof Error ? error.message : String(error)
        }
      })
    }
 }

  return [storedValue, setValue] as const
}

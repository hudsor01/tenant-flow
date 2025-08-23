/**
 * Offline Support Utilities
 * Basic offline detection and queue management
 */

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

/**
 * Check if browser is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

/**
 * Listen for online/offline events
 */
export function onOnlineStatusChange(callback: (isOnline: boolean) => void) {
  if (typeof window === 'undefined') return () => {}

  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

/**
 * Show offline notification
 */
export function showOfflineToast() {
  toast.error('You are offline. Some features may not work.')
}

/**
 * Show online notification
 */
export function showOnlineToast() {
  toast.success('You are back online!')
}

/**
 * Basic offline queue for mutations
 */
interface QueuedAction {
  id: string
  action: () => Promise<unknown>
  timestamp: number
}

class OfflineQueue {
  private queue: QueuedAction[] = []
  private processing = false

  add(id: string, action: () => Promise<unknown>) {
    this.queue.push({
      id,
      action,
      timestamp: Date.now()
    })
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0 || !isOnline()) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      const item = this.queue.shift()
      if (item) {
        try {
          await item.action()
        } catch (error) {
          console.error('Failed to process queued action:', error)
          // Could re-queue or handle error differently
        }
      }
    }

    this.processing = false
  }

  clear() {
    this.queue = []
  }

  get size() {
    return this.queue.length
  }
}

export const offlineQueue = new OfflineQueue()

/**
 * React hook for offline support
 */
export function useOfflineSupport() {
  const [online, setOnline] = useState(() => isOnline())
  const [queueSize, setQueueSize] = useState(() => offlineQueue.size)

  useEffect(() => {
    const cleanup = onOnlineStatusChange(setOnline)
    
    // Update queue size periodically
    const interval = setInterval(() => {
      setQueueSize(offlineQueue.size)
    }, 1000)

    return () => {
      cleanup()
      clearInterval(interval)
    }
  }, [])

  return {
    isOnline: online,
    queueSize,
    processQueue: () => offlineQueue.processQueue(),
    clearQueue: () => offlineQueue.clear()
  }
}
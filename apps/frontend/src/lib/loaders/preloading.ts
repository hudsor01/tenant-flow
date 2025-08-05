/**
 * Advanced Preloading Strategies for Route Loaders
 * 
 * Implements intelligent preloading mechanisms to improve perceived performance
 * by loading data before users actually need it.
 */

import React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import type { EnhancedRouterContext } from '../router-context'
import { queryKeys, cacheConfig } from '../query-keys'
import { api } from '../api/axios-client'

// Preloading strategy types
export type PreloadStrategy = 
  | 'hover' // Preload on link hover
  | 'intersection' // Preload when element comes into view
  | 'intent' // Preload based on user intent/behavior
  | 'schedule' // Preload on a schedule
  | 'immediate' // Preload immediately

// Preloading configuration
export interface PreloadConfig {
  strategy: PreloadStrategy
  priority: 'high' | 'medium' | 'low'
  delay?: number // Delay in ms before preloading
  conditions?: () => boolean // Conditions that must be met
  maxAge?: number // Maximum age of cached data to use
}

// Route preloading definitions
export const ROUTE_PRELOADS: Record<string, {
  data: string[]
  config: PreloadConfig
}> = {
  '/dashboard': {
    data: ['properties', 'recentTenants', 'maintenanceRequests'],
    config: {
      strategy: 'immediate',
      priority: 'high'
    }
  },
  '/properties': {
    data: ['propertiesList'],
    config: {
      strategy: 'hover',
      priority: 'high',
      delay: 100
    }
  },
  '/tenants': {
    data: ['tenantsList'],
    config: {
      strategy: 'hover',
      priority: 'medium',
      delay: 200
    }
  },
  '/maintenance': {
    data: ['maintenanceRequests'],
    config: {
      strategy: 'intersection',
      priority: 'medium'
    }
  }
}

/**
 * Advanced preloading manager
 */
export class PreloadManager {
  private readonly preloadQueue = new Map<string, Promise<void>>()
  private readonly hoverTimers = new Map<string, NodeJS.Timeout>()
  private intersectionObserver?: IntersectionObserver
  private intentDetector?: IntentDetector
  
  constructor(
    private readonly queryClient: QueryClient  ) {
    this.setupIntersectionObserver()
    this.setupIntentDetector()
  }
  
  /**
   * Preload data for a specific route
   */
  async preloadRoute(routePath: string, forceRefresh = false): Promise<void> {
    const preloadConfig = ROUTE_PRELOADS[routePath]
    if (!preloadConfig) return
    
    const cacheKey = `preload-${routePath}`
    
    // Check if already preloading
    if (this.preloadQueue.has(cacheKey) && !forceRefresh) {
      return this.preloadQueue.get(cacheKey) || Promise.resolve()
    }
    
    // Create preload promise
    const preloadPromise = this.executePreload(routePath, preloadConfig)
    this.preloadQueue.set(cacheKey, preloadPromise)
    
    try {
      await preloadPromise
    } finally {
      this.preloadQueue.delete(cacheKey)
    }
  }
  
  /**
   * Setup hover-based preloading for links
   */
  setupHoverPreload(element: HTMLElement, routePath: string): (() => void) | void {
    const config = ROUTE_PRELOADS[routePath]?.config
    if (!config || config.strategy !== 'hover') return
    
    const handleMouseEnter = () => {
      const timer = setTimeout(() => {
        void this.preloadRoute(routePath)
      }, config.delay || 0)
      
      this.hoverTimers.set(routePath, timer)
    }
    
    const handleMouseLeave = () => {
      const timer = this.hoverTimers.get(routePath)
      if (timer) {
        clearTimeout(timer)
        this.hoverTimers.delete(routePath)
      }
    }
    
    element.addEventListener('mouseenter', handleMouseEnter)
    element.addEventListener('mouseleave', handleMouseLeave)
    
    // Cleanup function
    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter)
      element.removeEventListener('mouseleave', handleMouseLeave)
      const timer = this.hoverTimers.get(routePath)
      if (timer) clearTimeout(timer)
    }
  }
  
  /**
   * Setup intersection observer for viewport-based preloading
   */
  private setupIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const routePath = entry.target.getAttribute('data-preload-route')
            if (routePath) {
              void this.preloadRoute(routePath)
            }
          }
        })
      },
      {
        rootMargin: '100px', // Start preloading 100px before element enters viewport
        threshold: 0.1
      }
    )
  }
  
  /**
   * Observe element for intersection-based preloading
   */
  observeForPreload(element: HTMLElement, routePath: string): void {
    element.setAttribute('data-preload-route', routePath)
    this.intersectionObserver?.observe(element)
  }
  
  /**
   * Setup intent detection for predictive preloading
   */
  private setupIntentDetector(): void {
    this.intentDetector = new IntentDetector()
    
    this.intentDetector.onIntent((prediction) => {
      if (prediction.confidence > 0.7) {
        void this.preloadRoute(prediction.routePath)
      }
    })
  }
  
  /**
   * Execute preloading based on configuration
   */
  private async executePreload(_routePath: string, config: { data: string[]; config: PreloadConfig }): Promise<void> {
    // Check conditions
    if (config.config.conditions && !config.config.conditions()) {
      return
    }
    
    // Check network conditions (don't preload on slow connections)
    if (this.isSlowConnection()) {
      console.warn('Skipping preload due to slow connection')
      return
    }
    
    // Check user preferences (respect data saver mode)
    if (this.respectDataSaver()) {
      console.warn('Skipping preload due to data saver preference')
      return
    }
    
    const preloadPromises = config.data.map(dataType => 
      this.preloadDataType(dataType, config.config.priority)
    )
    
    await Promise.allSettled(preloadPromises)
  }
  
  /**
   * Preload specific data type
   */
  private async preloadDataType(dataType: string, _priority: 'high' | 'medium' | 'low'): Promise<void> {
    // For now, we'll preload data regardless of user context
    // TODO: Add user context support when needed
    
    try {
      switch (dataType) {
        case 'properties':
          await this.queryClient.prefetchQuery({
            queryKey: queryKeys.properties.lists(),
            queryFn: async () => {
              const response = await api.properties.list({ limit: 20 })
              return response.data
            },
            ...cacheConfig.business
          })
          break
          
        case 'propertiesList':
          await this.queryClient.prefetchQuery({
            queryKey: queryKeys.properties.list({ limit: 20 }),
            queryFn: async () => {
              const response = await api.properties.list({ limit: 20 })
              return response.data
            },
            ...cacheConfig.business
          })
          break
          
        case 'recentTenants':
          await this.queryClient.prefetchQuery({
            queryKey: queryKeys.tenants.list({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
            queryFn: async () => {
              const response = await api.tenants.list({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' })
              return response.data
            },
            ...cacheConfig.business
          })
          break
          
        case 'tenantsList':
          await this.queryClient.prefetchQuery({
            queryKey: queryKeys.tenants.list({ page: 1, limit: 20 }),
            queryFn: async () => {
              const response = await api.tenants.list({ limit: 20 })
              return response.data
            },
            ...cacheConfig.business
          })
          break
          
        case 'maintenanceRequests':
          await this.queryClient.prefetchQuery({
            queryKey: queryKeys.maintenance.requests(),
            queryFn: async () => {
              const response = await api.maintenance.list({ 
                status: 'IN_PROGRESS', 
                limit: 10,
                sortBy: 'createdAt',
                sortOrder: 'desc'
              })
              return response.data
            },
            ...cacheConfig.realtime
          })
          break
          
        default:
          console.warn(`Unknown preload data type: ${dataType}`)
      }
    } catch (error) {
      console.warn(`Preload failed for ${dataType}:`, error)
    }
  }
  
  /**
   * Warm cache with critical user data
   */
  async warmCache(): Promise<void> {
    // For now, warm cache regardless of user context
    // TODO: Add user-specific caching when needed
    
    const warmupPromises = [
      // User profile and preferences
      this.queryClient.prefetchQuery({
        queryKey: queryKeys.auth.profile(),
        queryFn: async () => {
          const response = await api.users.profile()
          return response.data
        },
        ...cacheConfig.reference
      }),
      
      // Subscription status
      this.queryClient.prefetchQuery({
        queryKey: queryKeys.subscriptions.current(),
        queryFn: async () => {
          const response = await api.subscriptions.current()
          return response.data
        },
        ...cacheConfig.reference
      }),
      
      // Recent activity summary
      this.queryClient.prefetchQuery({
        queryKey: queryKeys.properties.list({ limit: 5 }),
        queryFn: async () => {
          const response = await api.properties.list({ limit: 5 })
          return response.data
        },
        ...cacheConfig.business
      })
    ]
    
    await Promise.allSettled(warmupPromises)
    console.warn('Cache warmed with critical user data')
  }
  
  /**
   * Preload critical path data
   */
  async preloadCriticalPath(): Promise<void> {
    const criticalQueries = [
      // Dashboard essentials
      this.preloadRoute('/dashboard'),
      
      // Properties overview
      this.preloadDataType('properties', 'high'),
      
      // User subscription check
      this.preloadDataType('subscription', 'high')
    ]
    
    await Promise.allSettled(criticalQueries)
  }
  
  /**
   * Check if connection is slow
   */
  private isSlowConnection(): boolean {
    const connection = (navigator as { connection?: { effectiveType?: string; saveData?: boolean } }).connection
    if (!connection) return false
    
    return (
      connection.effectiveType === 'slow-2g' ||
      connection.effectiveType === '2g' ||
      connection.saveData === true
    )
  }
  
  /**
   * Respect user's data saver preferences
   */
  private respectDataSaver(): boolean {
    const connection = (navigator as { connection?: { saveData?: boolean } }).connection
    return connection?.saveData === true
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear hover timers
    this.hoverTimers.forEach(timer => clearTimeout(timer))
    this.hoverTimers.clear()
    
    // Disconnect intersection observer
    this.intersectionObserver?.disconnect()
    
    // Cleanup intent detector
    this.intentDetector?.cleanup()
    
    // Clear preload queue
    this.preloadQueue.clear()
  }
}

/**
 * Intent detection for predictive preloading
 */
class IntentDetector {
  private mouseMovements: { x: number; y: number; timestamp: number }[] = []
  private readonly clickPatterns: string[] = []
  private intentCallbacks: ((prediction: { routePath: string; confidence: number }) => void)[] = []
  
  constructor() {
    this.setupEventListeners()
  }
  
  private setupEventListeners(): void {
    document.addEventListener('mousemove', this.handleMouseMove.bind(this))
    document.addEventListener('click', this.handleClick.bind(this))
  }
  
  private handleMouseMove(event: MouseEvent): void {
    this.mouseMovements.push({
      x: event.clientX,
      y: event.clientY,
      timestamp: Date.now()
    })
    
    // Keep only recent movements (last 2 seconds)
    const cutoff = Date.now() - 2000
    this.mouseMovements = this.mouseMovements.filter(m => m.timestamp > cutoff)
    
    // Analyze movement patterns
    this.analyzeMovementIntent()
  }
  
  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement
    const link = target.closest('a')
    
    if (link) {
      const href = link.getAttribute('href')
      if (href) {
        this.clickPatterns.push(href)
        
        // Keep only recent clicks (last 10)
        if (this.clickPatterns.length > 10) {
          this.clickPatterns.shift()
        }
      }
    }
  }
  
  private analyzeMovementIntent(): void {
    if (this.mouseMovements.length < 3) return
    
    const recent = this.mouseMovements.slice(-3)
    const isDirectional = this.isDirectionalMovement(recent)
    const isOverLink = this.isMouseOverLink()
    
    if (isDirectional && isOverLink) {
      const link = this.getLinkUnderMouse()
      if (link) {
        this.triggerIntent(link, 0.8)
      }
    }
  }
  
  private isDirectionalMovement(movements: { x: number; y: number }[]): boolean {
    if (movements.length < 2) return false
    
    const distances = movements.slice(1).map((curr, i) => {
      const prev = movements[i]
      if (!prev) return 0
      return Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2))
    })
    
    return distances.every(d => d > 5) // Consistent movement
  }
  
  private isMouseOverLink(): boolean {
    const element = document.elementFromPoint(
      this.mouseMovements[this.mouseMovements.length - 1]?.x || 0,
      this.mouseMovements[this.mouseMovements.length - 1]?.y || 0
    )
    
    return element?.closest('a') !== null
  }
  
  private getLinkUnderMouse(): string | null {
    const element = document.elementFromPoint(
      this.mouseMovements[this.mouseMovements.length - 1]?.x || 0,
      this.mouseMovements[this.mouseMovements.length - 1]?.y || 0
    )
    
    const link = element?.closest('a')
    return link?.getAttribute('href') || null
  }
  
  private triggerIntent(routePath: string, confidence: number): void {
    this.intentCallbacks.forEach(callback => {
      callback({ routePath, confidence })
    })
  }
  
  onIntent(callback: (prediction: { routePath: string; confidence: number }) => void): void {
    this.intentCallbacks.push(callback)
  }
  
  cleanup(): void {
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this))
    document.removeEventListener('click', this.handleClick.bind(this))
    this.intentCallbacks = []
  }
}

// Utility functions
export const preloadUtils = {
  /**
   * Create preload manager instance
   */
  createPreloadManager: (queryClient: QueryClient, _context: EnhancedRouterContext) => {
    return new PreloadManager(queryClient)
  },
  
  /**
   * Preload on component mount
   */
  useRoutePreload: (routePath: string, preloadManager: PreloadManager) => {
    React.useEffect(() => {
      void preloadManager.preloadRoute(routePath)
    }, [routePath, preloadManager])
  },
  
  /**
   * Create hover preload hook
   */
  useHoverPreload: (routePath: string, preloadManager: PreloadManager) => {
    return React.useCallback((element: HTMLElement | null) => {
      if (!element) return
      
      return preloadManager.setupHoverPreload(element, routePath)
    }, [routePath, preloadManager])
  }
}

export default PreloadManager
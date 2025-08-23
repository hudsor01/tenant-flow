/**
 * Performance optimization types for TenantFlow
 * Covers caching, monitoring, web vitals, and optimization strategies
 */

// ========================
// Web Vitals Types
// ========================

export interface WebVitalsMetric {
  name: string
  value: number
  delta: number
  id: string
  rating: 'good' | 'needs-improvement' | 'poor'
}

export interface ProductionMetric extends WebVitalsMetric {
  url: string
  timestamp: number
  userAgent?: string
  sessionId?: string
  userId?: string
}

export type WebVitalsType = 'CLS' | 'INP' | 'LCP' | 'FCP' | 'TTFB'

export interface WebVitalThreshold {
  good: number
  poor: number
}

export interface NavigationMetrics {
  domContentLoaded: {
    value: number
    thresholds: WebVitalThreshold
  }
  loadComplete: {
    value: number
    thresholds: WebVitalThreshold
  }
  domInteractive: {
    value: number
    thresholds: WebVitalThreshold
  }
  serverResponseTime: {
    value: number
    thresholds: WebVitalThreshold
  }
}

export type ResourceType = 'image' | 'script' | 'style' | 'font' | 'other'

export type ResourceThresholds = Record<string, {
  warn: number
  critical: number
}>

export interface PerformanceBudget {
  maxImageSize: number
  maxJSSize: number
  maxCSSSize: number
  maxFontSize: number
  maxTotalSize: number
  maxResourceCount: number
}

export interface BudgetViolation {
  type: string
  resource: string
  size: number
}

export interface PerformanceBudgetResult {
  totalSize: number
  resourceCount: number
  violations: BudgetViolation[]
  budgetStatus: 'passing' | 'failing'
}

// ========================
// Caching Types
// ========================

export interface CacheConfig {
  ttl: number // Time to live in seconds
  maxAge?: number
  staleWhileRevalidate?: number
  immutable?: boolean
  public?: boolean
  private?: boolean
}

export interface CacheEntry<T = unknown> {
  data: T
  timestamp: number
  expiresAt: number
  metadata?: {
    version?: string
    tags?: string[]
    size?: number
  }
}

export interface CacheKey {
  prefix: string
  identifier: string
  version?: string
  params?: Record<string, unknown>
}

export interface CacheStrategy {
  type: 'memory' | 'redis' | 'local-storage' | 'session-storage' | 'cdn'
  config: CacheConfig
  invalidationStrategy?: 'ttl' | 'tag-based' | 'manual'
}

export interface CacheHeaders {
  'Cache-Control'?: string
  'ETag'?: string
  'Last-Modified'?: string
  'Vary'?: string
  'Surrogate-Control'?: string
  'Surrogate-Key'?: string
}

export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  totalRequests: number
  memoryUsage?: number
  evictions?: number
}

// ========================
// API Response Caching
// ========================

export interface CachedApiResponse<T> {
  success: boolean
  data: T
  cached: boolean
  cacheKey: string
  cacheTimestamp: number
  expiresAt: number
  source: 'cache' | 'origin'
  headers?: CacheHeaders
}

export interface ApiCacheConfig {
  enabled: boolean
  defaultTtl: number
  maxSize: number
  strategies: Record<string, CacheStrategy>
  compression?: boolean
  encryption?: boolean
}

export interface CacheableEndpoint {
  path: string
  methods: string[]
  ttl: number
  tags?: string[]
  varyBy?: string[]
  condition?: (request: unknown) => boolean
}

// ========================
// Query Optimization Types
// ========================

export interface QueryOptimization {
  enablePagination: boolean
  defaultLimit: number
  maxLimit: number
  enableFiltering: boolean
  enableSorting: boolean
  enableSearch: boolean
  preloadRelations?: string[]
  selectFields?: string[]
}

export interface OptimizedQuery {
  sql: string
  parameters: unknown[]
  estimatedRows: number
  executionTime?: number
  useIndex?: string[]
  cacheKey?: string
  cacheTtl?: number
}

export interface QueryPerformanceMetrics {
  executionTime: number
  rowsExamined: number
  rowsReturned: number
  indexUsed: boolean
  cacheHit: boolean
  memoryUsage?: number
}

export interface DatabaseQueryCache {
  enabled: boolean
  maxQueries: number
  defaultTtl: number
  invalidateOnWrite: boolean
  keyGenerator: (query: string, params: unknown[]) => string
}

// ========================
// Component Lazy Loading
// ========================

export interface LazyLoadConfig {
  rootMargin?: string
  threshold?: number | number[]
  triggerOnce?: boolean
  placeholder?: React.ComponentType
  fallback?: React.ComponentType<{ error: Error }>
}

export interface LazyComponentOptions {
  preload?: boolean
  prefetch?: boolean
  loading?: React.ComponentType
  error?: React.ComponentType<{ error: Error; retry: () => void }>
  timeout?: number
  retries?: number
}

export interface ComponentLoadingState {
  isLoading: boolean
  isLoaded: boolean
  hasError: boolean
  error?: Error
  retryCount: number
}

export interface DynamicImportOptions {
  ssr?: boolean
  suspense?: boolean
  webpackChunkName?: string
}

// ========================
// Performance Monitoring
// ========================

export interface PerformanceMonitorConfig {
  enableWebVitals: boolean
  enableResourceMonitoring: boolean
  enableNavigationTiming: boolean
  enableCustomMetrics: boolean
  sampleRate: number
  endpoints: {
    webVitals?: string
    performance?: string
    errors?: string
  }
}

export interface CustomPerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'percent'
  category: 'timing' | 'size' | 'count' | 'score'
  tags?: Record<string, string>
  timestamp: number
}

export interface PerformanceEntry {
  name: string
  entryType: string
  startTime: number
  duration: number
  size?: number
  transferSize?: number
  encodedBodySize?: number
  decodedBodySize?: number
}

export interface PerformanceAlert {
  id: string
  type: 'threshold' | 'regression' | 'anomaly'
  severity: 'low' | 'medium' | 'high' | 'critical'
  metric: string
  value: number
  threshold: number
  timestamp: number
  description: string
  actions?: string[]
}

// ========================
// Edge Optimization Types
// ========================

export interface EdgeCacheConfig {
  regions: string[]
  defaultTtl: number
  purgeStrategy: 'tag-based' | 'url-based' | 'wildcard'
  compression: {
    enabled: boolean
    types: string[]
    level: number
  }
  ssl: {
    enabled: boolean
    tlsVersion: string
    hsts: boolean
  }
}

export interface CDNConfiguration {
  provider: 'cloudflare' | 'fastly' | 'aws-cloudfront' | 'vercel'
  zones: Record<string, EdgeCacheConfig>
  originShield?: {
    enabled: boolean
    location: string
  }
  waf?: {
    enabled: boolean
    rules: string[]
  }
}

export interface StaticAssetOptimization {
  images: {
    formats: string[]
    quality: number
    responsive: boolean
    lazy: boolean
  }
  css: {
    minification: boolean
    purgeUnused: boolean
    critical: boolean
  }
  javascript: {
    minification: boolean
    treeshaking: boolean
    splitting: boolean
  }
}

// ========================
// Performance Analytics
// ========================

export interface PerformanceReport {
  period: {
    start: string
    end: string
  }
  metrics: {
    webVitals: Record<WebVitalsType, WebVitalsMetric>
    loadTimes: NavigationMetrics
    resourceSizes: Record<ResourceType, number>
    cacheHitRate: number
    errorRate: number
  }
  trends: {
    improvement: string[]
    degradation: string[]
    stable: string[]
  }
  recommendations: string[]
}

export interface PerformanceBenchmark {
  name: string
  category: string
  target: number
  current: number
  status: 'passing' | 'warning' | 'failing'
  impact: 'low' | 'medium' | 'high'
}

// ========================
// Optimization Utilities
// ========================

export interface OptimizationResult<T> {
  original: T
  optimized: T
  savings: {
    size?: number
    time?: number
    requests?: number
  }
  strategy: string
}

export interface PerformanceMiddleware {
  name: string
  priority: number
  enabled: boolean
  config: Record<string, unknown>
  metrics?: {
    requestCount: number
    averageTime: number
    errorCount: number
  }
}

export interface LoadBalancerConfig {
  algorithm: 'round-robin' | 'least-connections' | 'ip-hash' | 'weighted'
  healthCheck: {
    endpoint: string
    interval: number
    timeout: number
    retries: number
  }
  servers: {
    url: string
    weight?: number
    backup?: boolean
  }[]
}

// ========================
// Runtime Performance Types
// ========================

export interface MemoryUsage {
  used: number
  total: number
  limit?: number
  percentage: number
}

export interface CPUUsage {
  percent: number
  loadAverage: number[]
  cores: number
}

export interface NetworkStats {
  requests: number
  bytesIn: number
  bytesOut: number
  latency: number
  errors: number
}

export interface RuntimeMetrics {
  memory: MemoryUsage
  cpu: CPUUsage
  network: NetworkStats
  uptime: number
  timestamp: number
}

// ========================
// Type Guards and Utilities
// ========================

export function isWebVitalsMetric(obj: unknown): obj is WebVitalsMetric {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'value' in obj &&
    'rating' in obj
  )
}

export function isCachedResponse<T>(obj: unknown): obj is CachedApiResponse<T> {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    'cached' in obj &&
    'source' in obj
  )
}

export function isPerformanceEntry(obj: unknown): obj is PerformanceEntry {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'entryType' in obj &&
    'startTime' in obj
  )
}

// ========================
// Configuration Presets
// ========================

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 300, // 5 minutes
  maxAge: 3600, // 1 hour
  staleWhileRevalidate: 86400, // 24 hours
  public: true
}

export const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
  maxImageSize: 300000, // 300KB
  maxJSSize: 500000, // 500KB
  maxCSSSize: 50000, // 50KB
  maxFontSize: 100000, // 100KB
  maxTotalSize: 2000000, // 2MB
  maxResourceCount: 50
}

export const WEB_VITALS_THRESHOLDS: Record<WebVitalsType, WebVitalThreshold> = {
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  LCP: { good: 2500, poor: 4000 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 }
}
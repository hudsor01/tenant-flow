import { Injectable, Logger } from '@nestjs/common'

export interface ModuleLoadMetrics {
    moduleName: string
    loadTime: number
    timestamp: Date
    memoryUsage?: NodeJS.MemoryUsage
}

export interface PerformanceThreshold {
    warning: number    // ms - warn if module load takes longer
    critical: number   // ms - critical if module load takes longer
}

@Injectable()
export class PerformanceMonitorService {
    private readonly logger = new Logger(PerformanceMonitorService.name)
    private readonly moduleMetrics = new Map<string, ModuleLoadMetrics>()
    private readonly loadStartTimes = new Map<string, number>()
    
    // Performance thresholds (configurable)
    private readonly thresholds: PerformanceThreshold = {
        warning: 100,   // 100ms
        critical: 500   // 500ms
    }

    /**
     * Start timing a module load
     */
    startModuleLoad(moduleName: string): void {
        this.loadStartTimes.set(moduleName, Date.now())
    }

    /**
     * End timing a module load and record metrics
     */
    endModuleLoad(moduleName: string): ModuleLoadMetrics | null {
        const startTime = this.loadStartTimes.get(moduleName)
        if (!startTime) {
            this.logger.warn(`No start time recorded for module: ${moduleName}`)
            return null
        }

        const loadTime = Date.now() - startTime
        const metrics: ModuleLoadMetrics = {
            moduleName,
            loadTime,
            timestamp: new Date(),
            memoryUsage: process.memoryUsage()
        }

        // Store metrics
        this.moduleMetrics.set(moduleName, metrics)
        this.loadStartTimes.delete(moduleName)

        // Log performance issues
        this.evaluatePerformance(metrics)

        return metrics
    }

    /**
     * Get metrics for a specific module
     */
    getModuleMetrics(moduleName: string): ModuleLoadMetrics | undefined {
        return this.moduleMetrics.get(moduleName)
    }

    /**
     * Get all recorded metrics
     */
    getAllMetrics(): ModuleLoadMetrics[] {
        return Array.from(this.moduleMetrics.values())
    }

    /**
     * Get slowest modules
     */
    getSlowestModules(limit = 10): ModuleLoadMetrics[] {
        return this.getAllMetrics()
            .sort((a, b) => b.loadTime - a.loadTime)
            .slice(0, limit)
    }

    /**
     * Generate performance report
     */
    generateReport(): {
        totalModules: number
        averageLoadTime: number
        slowestModule: ModuleLoadMetrics | null
        fastestModule: ModuleLoadMetrics | null
        modulesOverThreshold: ModuleLoadMetrics[]
        memoryReport: {
            current: NodeJS.MemoryUsage
            peak: number
        }
    } {
        const metrics = this.getAllMetrics()
        
        if (metrics.length === 0) {
            return {
                totalModules: 0,
                averageLoadTime: 0,
                slowestModule: null,
                fastestModule: null,
                modulesOverThreshold: [],
                memoryReport: {
                    current: process.memoryUsage(),
                    peak: 0
                }
            }
        }

        const loadTimes = metrics.map(m => m.loadTime)
        const averageLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length
        
        const sortedByTime = metrics.sort((a, b) => b.loadTime - a.loadTime)
        const slowestModule = sortedByTime[0] || null
        const fastestModule = sortedByTime[sortedByTime.length - 1] || null
        
        const modulesOverThreshold = metrics.filter(m => m.loadTime > this.thresholds.warning)
        
        const peakMemory = Math.max(...metrics.map(m => m.memoryUsage?.heapUsed || 0))

        return {
            totalModules: metrics.length,
            averageLoadTime: Math.round(averageLoadTime * 100) / 100,
            slowestModule,
            fastestModule,
            modulesOverThreshold,
            memoryReport: {
                current: process.memoryUsage(),
                peak: peakMemory
            }
        }
    }

    /**
     * Log performance report to console
     */
    logPerformanceReport(): void {
        const report = this.generateReport()
        
        this.logger.log('📊 Performance Report:')
        this.logger.log(`  Total Modules: ${report.totalModules}`)
        this.logger.log(`  Average Load Time: ${report.averageLoadTime}ms`)
        
        if (report.slowestModule) {
            this.logger.log(`  Slowest Module: ${report.slowestModule.moduleName} (${report.slowestModule.loadTime}ms)`)
        }
        
        if (report.fastestModule) {
            this.logger.log(`  Fastest Module: ${report.fastestModule.moduleName} (${report.fastestModule.loadTime}ms)`)
        }
        
        if (report.modulesOverThreshold.length > 0) {
            this.logger.warn(`  ⚠️ ${report.modulesOverThreshold.length} modules over ${this.thresholds.warning}ms threshold:`)
            report.modulesOverThreshold.forEach(module => {
                this.logger.warn(`    - ${module.moduleName}: ${module.loadTime}ms`)
            })
        }

        const memMB = Math.round(report.memoryReport.current.heapUsed / 1024 / 1024)
        const peakMB = Math.round(report.memoryReport.peak / 1024 / 1024)
        this.logger.log(`  Memory Usage: ${memMB}MB (Peak: ${peakMB}MB)`)
    }

    /**
     * Update performance thresholds
     */
    updateThresholds(thresholds: Partial<PerformanceThreshold>): void {
        Object.assign(this.thresholds, thresholds)
    }

    /**
     * Clear all metrics (useful for testing)
     */
    clearMetrics(): void {
        this.moduleMetrics.clear()
        this.loadStartTimes.clear()
    }

    private evaluatePerformance(metrics: ModuleLoadMetrics): void {
        const { moduleName, loadTime } = metrics
        
        if (loadTime > this.thresholds.critical) {
            this.logger.error(`🚨 CRITICAL: ${moduleName} took ${loadTime}ms to load (threshold: ${this.thresholds.critical}ms)`)
        } else if (loadTime > this.thresholds.warning) {
            this.logger.warn(`⚠️ WARNING: ${moduleName} took ${loadTime}ms to load (threshold: ${this.thresholds.warning}ms)`)
        } else {
            // Only log fast modules in development
            if (process.env.NODE_ENV === 'development') {
                this.logger.log(`✅ ${moduleName} loaded in ${loadTime}ms`)
            }
        }
    }
}
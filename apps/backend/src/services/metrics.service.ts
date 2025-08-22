import { Injectable, Logger } from '@nestjs/common'
import * as os from 'os'

@Injectable()
export class MetricsService {
  private readonly _logger = new Logger(MetricsService.name)
  private metrics = new Map<string, number>()

  increment(key: string, value = 1): void {
    const current = this.metrics.get(key) || 0
    this.metrics.set(key, current + value)
  }

  getMetric(key: string): number {
    return this.metrics.get(key) || 0
  }

  getAllMetrics(): Record<string, number> {
    const result: Record<string, number> = {}
    for (const [key, value] of this.metrics.entries()) {
      result[key] = value
    }
    return result
  }

  getSystemMetrics() {
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    
    return {
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        freeMemory: Math.round(os.freemem() / 1024 / 1024),
        totalMemory: Math.round(os.totalmem() / 1024 / 1024)
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        loadAverage: os.loadavg()
      },
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      customMetrics: this.getAllMetrics()
    }
  }

  reset(): void {
    this.metrics.clear()
  }
}
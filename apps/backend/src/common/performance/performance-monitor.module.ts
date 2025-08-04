import { Module, Global, OnModuleInit } from '@nestjs/common'
import { PerformanceMonitorService } from './performance-monitor.service'

@Global()
@Module({
    providers: [PerformanceMonitorService],
    exports: [PerformanceMonitorService]
})
export class PerformanceMonitorModule implements OnModuleInit {
    constructor(private readonly performanceMonitor: PerformanceMonitorService) {}

    onModuleInit() {
        // Set custom thresholds for NestJS modules after initialization
        this.performanceMonitor.updateThresholds({
            warning: 50,   // NestJS modules should load under 50ms
            critical: 200  // Critical if over 200ms
        })
    }
}
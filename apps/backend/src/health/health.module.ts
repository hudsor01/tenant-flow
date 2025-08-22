import { Module } from '@nestjs/common'
import { HealthIndicatorService, TerminusModule } from '@nestjs/terminus'
import { HttpModule } from '@nestjs/axios'
import { HealthController } from './health.controller'
import { PerformanceController } from './performance.controller'
import { EnhancedPerformanceController } from './enhanced-performance.controller'
import { UnifiedMetricsController } from './unified-metrics.controller'
import { SupabaseModule } from '../database/supabase.module'
import { SupabaseHealthIndicator } from './supabase.health'
import { PerformanceMonitoringService } from '../shared/services/performance-monitoring.service'
import { UnifiedPerformanceMonitoringService } from '../shared/services/unified-performance-monitoring.service'
import { MemoryMonitoringService } from '../shared/services/memory-monitoring.service'
import { MetricsAggregatorService } from '../shared/services/metrics-aggregator.service'

@Module({
	imports: [TerminusModule, HttpModule, SupabaseModule],
	controllers: [
		HealthController,
		PerformanceController, // Legacy controller (kept for backward compatibility)
		EnhancedPerformanceController, // Enhanced performance monitoring
		UnifiedMetricsController // Unified metrics dashboard
	],
	providers: [
		SupabaseHealthIndicator, 
		HealthIndicatorService,
		PerformanceMonitoringService, // Legacy service (kept for backward compatibility)
		UnifiedPerformanceMonitoringService, // Enhanced performance monitoring
		MemoryMonitoringService, // Memory monitoring and GC management
		MetricsAggregatorService // Unified metrics aggregation
	],
	exports: [
		PerformanceMonitoringService, // Export for backward compatibility
		UnifiedPerformanceMonitoringService, // Export for use in main.ts
		MemoryMonitoringService, // Export for use in main.ts
		MetricsAggregatorService // Export for other modules
	]
})
export class HealthModule {}
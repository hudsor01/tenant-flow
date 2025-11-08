import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ConfigurableModuleClass } from './prometheus.module-definition'
import { PrometheusService } from './prometheus.service'
import { MetricsController } from './metrics.controller'
import { BearerTokenGuard } from './guards/bearer-token.guard'

@Module({
	imports: [ConfigModule],
	controllers: [MetricsController],
	providers: [PrometheusService, BearerTokenGuard],
	exports: [PrometheusService]
})
export class PrometheusModule extends ConfigurableModuleClass {}

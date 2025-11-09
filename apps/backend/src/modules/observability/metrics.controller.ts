import { Controller, Get, Header, UseGuards } from '@nestjs/common'
import { PrometheusService } from './prometheus.service'
import { BearerTokenGuard } from './guards/bearer-token.guard'

@Controller('metrics')
export class MetricsController {
	constructor(private readonly prometheus: PrometheusService) {}

	@Get()
	@UseGuards(BearerTokenGuard)
	@Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
	async getMetrics(): Promise<string> {
		return this.prometheus.getMetrics()
	}
}

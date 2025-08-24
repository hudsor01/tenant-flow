import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class MetricsService {
	private readonly logger = new Logger(MetricsService.name)

	recordMetric(name: string, value: number, tags?: Record<string, string>): void {
		this.logger.debug(`Metric: ${name} = ${value}`, { tags })
	}

	incrementCounter(name: string, tags?: Record<string, string>): void {
		this.logger.debug(`Counter: ${name}++`, { tags })
	}

	recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
		this.logger.debug(`Histogram: ${name} = ${value}`, { tags })
	}
}
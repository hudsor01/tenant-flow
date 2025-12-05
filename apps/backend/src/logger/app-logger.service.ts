import { Inject, Injectable, LoggerService } from '@nestjs/common'
import { ClsService } from 'nestjs-cls'
import type { Logger as WinstonLogger } from 'winston'
import { WINSTON_MODULE_PROVIDER } from 'nest-winston'

interface LogMeta {
	[key: string]: unknown
}

@Injectable()
export class AppLogger implements LoggerService {
	constructor(
		@Inject(WINSTON_MODULE_PROVIDER)
		private readonly logger: WinstonLogger,
		private readonly cls: ClsService
	) {}

	log(message: unknown, contextOrMeta?: string | LogMeta, meta?: LogMeta) {
		const { context, mergedMeta } = this.normalize(contextOrMeta, meta)
		this.logger.info(message as string, this.mergeContext(mergedMeta, context))
	}

	warn(message: unknown, contextOrMeta?: string | LogMeta, meta?: LogMeta) {
		const { context, mergedMeta } = this.normalize(contextOrMeta, meta)
		this.logger.warn(message as string, this.mergeContext(mergedMeta, context))
	}

	error(message: unknown, contextOrMeta?: string | LogMeta, meta?: LogMeta) {
		const { context, mergedMeta } = this.normalize(contextOrMeta, meta)
		this.logger.error(message as string, this.mergeContext(mergedMeta, context))
	}

	debug(message: unknown, contextOrMeta?: string | LogMeta, meta?: LogMeta) {
		const { context, mergedMeta } = this.normalize(contextOrMeta, meta)
		this.logger.debug(message as string, this.mergeContext(mergedMeta, context))
	}

	verbose(message: unknown, contextOrMeta?: string | LogMeta, meta?: LogMeta) {
		const { context, mergedMeta } = this.normalize(contextOrMeta, meta)
		this.logger.verbose(message as string, this.mergeContext(mergedMeta, context))
	}

	private normalize(
		contextOrMeta?: string | LogMeta,
		meta?: LogMeta
	): { context?: string; mergedMeta: LogMeta } {
		if (typeof contextOrMeta === 'string') {
			return { context: contextOrMeta, mergedMeta: meta ?? {} }
		}

		return {
			mergedMeta: (contextOrMeta as LogMeta) ?? meta ?? {}
		}
	}

	private mergeContext(meta: LogMeta, context?: string): LogMeta {
		const requestContext = this.cls.get('REQUEST_CONTEXT') as
			| Record<string, unknown>
			| undefined

		return {
			...(context ? { context } : {}),
			...(requestContext?.requestId ? { requestId: requestContext.requestId } : {}),
			...(requestContext?.path ? { path: requestContext.path } : {}),
			...(requestContext?.method ? { method: requestContext.method } : {}),
			...(requestContext?.startTime ? { startTime: requestContext.startTime } : {}),
			...meta
		}
	}
}

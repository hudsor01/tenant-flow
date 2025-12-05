import type { AppLogger } from '../../logger/app-logger.service'

type AsyncFunction = (...args: unknown[]) => Promise<unknown>

/**
 * Decorator to measure method execution time
 */
export function MeasureMethod(thresholdMs = 100, logger?: AppLogger) {
	return function (
		target: object,
		propertyName: string | symbol,
		descriptor: PropertyDescriptor
	): PropertyDescriptor {
		const method = descriptor.value as AsyncFunction

		descriptor.value = async function (
			this: unknown,
			...args: unknown[]
		): Promise<unknown> {
			const start = process.hrtime()

			try {
				const result = await method.apply(this, args)
				const [seconds, nanoseconds] = process.hrtime(start)
				const duration = seconds * 1000 + nanoseconds / 1000000

				const className = target.constructor?.name || 'Unknown'
				if (logger) {
					if (duration > thresholdMs) {
						logger.warn(
							`${className}.${String(propertyName)} took ${duration.toFixed(2)}ms (threshold: ${thresholdMs}ms)`,
							className
						)
					} else {
						logger.log(
							`${className}.${String(propertyName)} executed in ${duration.toFixed(2)}ms`,
							className
						)
					}
				}

				return result
			} catch (error) {
				const [seconds, nanoseconds] = process.hrtime(start)
				const duration = seconds * 1000 + nanoseconds / 1000000

				const className = target.constructor?.name || 'Unknown'
				if (logger) {
					logger.error(
						`${className}.${String(propertyName)} failed after ${duration.toFixed(2)}ms`,
						className,
						{ error }
					)
				}
				throw error
			}
		}

		return descriptor
	}
}

/**
 * Decorator to add timeout to async methods
 */
export function AsyncTimeout(timeoutMs: number, timeoutMessage?: string) {
	return function (
		target: object,
		propertyName: string | symbol,
		descriptor: PropertyDescriptor
	): PropertyDescriptor {
		const method = descriptor.value as AsyncFunction

		descriptor.value = async function (
			this: unknown,
			...args: unknown[]
		): Promise<unknown> {
			let timeoutId: NodeJS.Timeout
			
			const timeoutPromise = new Promise((_, reject) => {
				timeoutId = setTimeout(() => {
					const className = target.constructor?.name || 'Unknown'
					const message =
						timeoutMessage ||
						`Method ${className}.${String(propertyName)} timed out after ${timeoutMs}ms`
					reject(new Error(message))
				}, timeoutMs)
			})

			return Promise.race([method.apply(this, args), timeoutPromise])
				.finally(() => {
					// Clear timeout to prevent memory leak and unhandled rejection
					clearTimeout(timeoutId)
				})
		}

		return descriptor
	}
}

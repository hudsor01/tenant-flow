import { Logger } from '@nestjs/common'
import type { AsyncFunction } from '../types'

const logger = new Logger('Performance')

/**
 * Decorator to measure method execution time
 */
export function MeasureMethod(thresholdMs = 100) {
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
				if (duration > thresholdMs) {
					logger.warn(
						`${className}.${String(propertyName)} took ${duration.toFixed(2)}ms (threshold: ${thresholdMs}ms)`
					)
				} else {
					logger.log(
						`${className}.${String(propertyName)} executed in ${duration.toFixed(2)}ms`
					)
				}

				return result
			} catch (error) {
				const [seconds, nanoseconds] = process.hrtime(start)
				const duration = seconds * 1000 + nanoseconds / 1000000

				const className = target.constructor?.name || 'Unknown'
				logger.error(
					`${className}.${String(propertyName)} failed after ${duration.toFixed(2)}ms`,
					error
				)
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
			const timeoutPromise = new Promise((_, reject) => {
				setTimeout(() => {
					const className = target.constructor?.name || 'Unknown'
					const message =
						timeoutMessage ||
						`Method ${className}.${String(propertyName)} timed out after ${timeoutMs}ms`
					reject(new Error(message))
				}, timeoutMs)
			})

			return Promise.race([method.apply(this, args), timeoutPromise])
		}

		return descriptor
	}
}

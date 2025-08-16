import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Decorator to access Fastify Sensible plugin features
 *
 * @fastify/sensible provides:
 * - HTTP error constructors (reply.notFound(), reply.badRequest(), etc.)
 * - Request type checking (req.is())
 * - Cache control helpers (reply.cacheControl(), reply.preventCache())
 * - Vary header helper (reply.vary())
 *
 * Usage example:
 * ```typescript
 * @Get('/:id')
 * async findOne(
 *   @Param('id') id: string,
 *   @FastifySensible() { reply }: { reply: FastifyReply }
 * ) {
 *   const item = await this.service.findById(id)
 *   if (!item) {
 *     return reply.notFound('Item not found')
 *   }
 *
 *   // Set cache control for successful responses
 *   reply.cacheControl('public', 'max-age', '1h')
 *   return item
 * }
 * ```
 */
export const FastifySensible = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext) => {
		const request = ctx.switchToHttp().getRequest<FastifyRequest>()
		const reply = ctx.switchToHttp().getResponse<FastifyReply>()

		return {
			request,
			reply,
			// Helper methods from @fastify/sensible
			httpErrors:
				(
					request as {
						server?: { httpErrors?: Record<string, unknown> }
					}
				).server?.httpErrors || {},
			assert: (
				condition: unknown,
				statusCode: number,
				message?: string
			) => {
				if (!condition) {
					reply.code(statusCode).send({
						error: message || `HTTP ${statusCode}`
					})
					throw new Error(
						message || `Assertion failed with status ${statusCode}`
					)
				}
			}
		}
	}
)

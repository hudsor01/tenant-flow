import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'

@Injectable()
export class StripeWebhookInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request = context.switchToHttp().getRequest()
		
		// Raw body is already parsed by Fastify content type parser
		// This interceptor ensures it's available for Stripe webhook verification
		if (request.url?.includes('/stripe/webhook') && request.rawBody) {
			// Body is already available, just proceed
			return next.handle()
		}
		
		return next.handle()
	}
}
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'
import { QueryValidationMiddleware } from '../middleware/query-validation.middleware'

/**
 * Security Module
 * 
 * Configures all security-related middleware and services.
 * This module ensures that all requests are validated for security threats
 * before they reach application services.
 */
@Module({
    providers: [QueryValidationMiddleware],
    exports: [QueryValidationMiddleware]
})
export class SecurityModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        // Apply query validation middleware to all routes
        // This middleware will:
        // - Validate all input parameters
        // - Check for SQL injection attempts
        // - Validate user IDs are proper UUIDs
        // - Block suspicious requests
        consumer
            .apply(QueryValidationMiddleware)
            .forRoutes('*') // Apply to all routes
    }
}
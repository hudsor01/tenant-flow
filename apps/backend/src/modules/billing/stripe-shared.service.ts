import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { createHmac } from 'crypto'
import Stripe from 'stripe'
import { AppConfigService } from '../../config/app-config.service'

/**
 * Shared Stripe utilities and helper methods
 */
@Injectable()
export class StripeSharedService {
  private readonly logger = new Logger(StripeSharedService.name)

  constructor(
    private readonly config: AppConfigService
  ) {}

  /**
   * Generate a deterministic idempotency key for Stripe API calls
   * Uses HMAC-SHA256 to create a stable, unique key for the same logical operation
   * This prevents duplicate charges on retries by producing the same key for identical inputs
   *
   * @param operation - Type of operation (e.g., 'pi', 'pi_connected', 'sub', 'cus')
   * @param user_id - User/tenant ID making the request
   * @param additionalContext - Additional identifying fields (e.g., connectedAccountId, amount)
   * @returns A deterministic idempotency key (max 255 chars for Stripe)
   */
  generateIdempotencyKey(
    operation: string,
    user_id: string,
    additionalContext?: string
  ): string {
    // Use dedicated idempotency key secret for HMAC to ensure keys are unique per deployment
    const secret = this.config.getIdempotencyKeySecret()

    if (!secret) {
      throw new Error(
        'Missing IDEMPOTENCY_KEY_SECRET environment variable. ' +
          'Please set IDEMPOTENCY_KEY_SECRET in your environment configuration.'
      )
    }

    // Combine all inputs into a stable string
    const context = additionalContext ? `_${additionalContext}` : ''
    const input = `${operation}_${user_id}${context}`

    // Generate deterministic hash using HMAC-SHA256
    const hash = createHmac('sha256', secret)
      .update(input)
      .digest('hex')
      .substring(0, 32) // Shorten to keep total length reasonable

    // Format: operation_hash (e.g., pi_connected_a1b2c3d4...)
    // This ensures same operation+user_id+context always produces same key
    return `${operation}_${hash}`
  }

  /**
   * Handle Stripe errors with proper HTTP status codes and error messages
   * Follows official Stripe error handling patterns
   * Supports all Stripe error types per official documentation
   *
   * @param error - Stripe error object
   * @throws Appropriate NestJS HTTP exception based on error type
   */
  handleStripeError(error: Stripe.errors.StripeError): never {
    // Map Stripe error types to HTTP status codes
    if (error.type === 'StripeCardError') {
      throw new BadRequestException(error.message || 'Card error')
    }

    if (error.type === 'StripeInvalidRequestError') {
      throw new BadRequestException(error.message || 'Invalid request')
    }

    if (error.type === 'StripeAPIError') {
      throw new InternalServerErrorException(
        'Stripe API error. Please try again later.'
      )
    }

    if (error.type === 'StripeAuthenticationError') {
      throw new InternalServerErrorException('Stripe authentication failed')
    }

    if (error.type === 'StripeRateLimitError') {
      throw new InternalServerErrorException(
        'Too many requests. Please try again later.'
      )
    }

    if (error.type === 'StripeConnectionError') {
      throw new InternalServerErrorException(
        'Connection error. Please check your internet connection and try again.'
      )
    }

    if (error.type === 'StripePermissionError') {
      throw new InternalServerErrorException(
        'Insufficient permissions for this operation'
      )
    }

    if (error.type === 'StripeIdempotencyError') {
      throw new BadRequestException(
        'Request with the same idempotency key already processed'
      )
    }

    // Default error - log to help debug unknown types
    this.logger.warn('Unhandled Stripe error type', {
      type: error.type,
      message: error.message
    })

    throw new InternalServerErrorException(
      error.message || 'An error occurred processing your payment'
    )
  }
}

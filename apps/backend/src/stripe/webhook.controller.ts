import { 
  Controller, 
  Post, 
  Get,
  Headers, 
  Body, 
  HttpCode, 
  HttpStatus, 
  BadRequestException, 
  Logger,
  UseGuards,
  Req,
  HttpException
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { FastifyRequest } from 'fastify'
import Stripe from 'stripe'
import { Public } from '../auth/decorators/public.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CsrfExempt } from '../common/guards/csrf.guard'
import { RateLimit, WebhookRateLimits } from '../common/decorators/rate-limit.decorator'
import { WebhookService } from './webhook.service'
import { RequestContext } from './webhook-observability.service'

@Controller('/stripe/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name)
  private _stripe: Stripe | null = null
  
  // Stripe's official IP addresses for webhooks
  // Source: https://stripe.com/docs/ips#webhook-ip-addresses
  private readonly STRIPE_WEBHOOK_IPS = [
    '3.18.12.63', '3.130.192.231', '13.235.14.237', '13.235.122.149',
    '18.211.135.69', '35.154.171.200', '52.15.183.38', '54.88.130.119',
    '54.88.130.237', '54.187.174.169', '54.187.205.235', '54.187.216.72'
  ]

  constructor(
    private readonly configService: ConfigService,
    private readonly webhookService: WebhookService
  ) {}

  private get stripe(): Stripe {
    if (!this._stripe) {
      const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY')
      if (!secretKey) {
        throw new BadRequestException('Stripe secret key not configured')
      }
      this._stripe = new Stripe(secretKey)
    }
    return this._stripe
  }

  /**
   * Main webhook endpoint for Stripe events
   * SECURITY: Webhooks are exempt from CSRF as they use signature verification
   * Protected by IP whitelisting and rate limiting to prevent abuse
   */
  @Post()
  @Public()
  @CsrfExempt() // Webhooks use signature verification instead of CSRF
  @RateLimit(WebhookRateLimits.STRIPE_WEBHOOK) // Protect against webhook abuse
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: FastifyRequest & { rawBody?: Buffer },
    @Body() _body: unknown,
    @Headers('stripe-signature') signature: string
  ) {
    // IP whitelisting for enhanced security
    const clientIP = this.getClientIP(req)
    const isProduction = this.configService.get('NODE_ENV') === 'production'
    
    // Only enforce IP whitelisting in production
    if (isProduction && !this.isStripeIP(clientIP)) {
      this.logger.warn(`Webhook request from unauthorized IP: ${clientIP}`)
      throw new BadRequestException('Unauthorized webhook source')
    }
    
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header')
    }

    // Use raw body stored by our custom parser
    const rawBody = req.rawBody
    if (!rawBody) {
      throw new BadRequestException('Raw body not available for webhook verification')
    }

    const payload = rawBody.toString('utf8')
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET')
    
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured')
    }

    // Verify signature and construct event using Stripe SDK
    let event: Stripe.Event
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret)
      this.logger.debug(`Processing webhook event: ${event.type} (${event.id})`)
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      throw new BadRequestException('Invalid webhook signature')
    }

    try {
      // Create request context for observability
      const requestContext: RequestContext = {
        correlationId: `wh-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        userAgent: req.headers['user-agent'],
        sourceIp: clientIP,
        requestId: req.headers['x-request-id'] as string,
        stripeSignature: signature,
        contentLength: rawBody.length,
        headers: {
          'stripe-signature': signature,
          'user-agent': req.headers['user-agent'] || 'unknown',
          'content-type': req.headers['content-type'] || 'application/json'
        }
      }

      // Process the webhook
      await this.webhookService.handleWebhookEvent(event, requestContext)
      
      this.logger.debug(`Webhook processing completed for ${event.type}`, {
        correlationId: requestContext.correlationId,
        eventId: event.id
      })
      return { received: true }
      
    } catch (processingError) {
      this.logger.error(`Webhook processing failed for ${event.type}:`, processingError)
      
      // Differentiate between retryable and non-retryable errors
      if (this.isNonRetryableError(processingError)) {
        // Don't retry validation errors, duplicate processing, etc.
        this.logger.warn(`Non-retryable error for ${event.type}, acknowledging to Stripe`)
        return { 
          received: true,
          error: processingError instanceof Error ? processingError.message : 'Processing failed'
        }
      }
      
      // For infrastructure errors, let Stripe retry
      this.logger.error(`Retryable error for ${event.type}, will let Stripe retry`)
      throw new HttpException('Webhook processing failed - will retry', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  /**
   * Determine if an error should not be retried by Stripe
   */
  private isNonRetryableError(error: unknown): boolean {
    // Check for specific error types that shouldn't be retried
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      
      // Don't retry validation errors
      if (message.includes('validation') || message.includes('invalid')) {
        return true
      }
      
      // Don't retry duplicate processing
      if (message.includes('duplicate') || message.includes('already processed')) {
        return true
      }
      
      // Don't retry business logic errors
      if (message.includes('insufficient funds') || 
          message.includes('subscription') ||
          message.includes('customer not found')) {
        return true
      }
      
      // Check for specific error codes if available
      if ('code' in error) {
        const code = String(error.code).toLowerCase()
        if (code.includes('validation') || 
            code.includes('duplicate') ||
            code === 'already_exists') {
          return true
        }
      }
    }
    
    // Default to retryable for unknown errors
    return false
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(req: FastifyRequest): string {
    // Check various headers for the real IP (in order of trust)
    const forwardedFor = req.headers['x-forwarded-for']
    const realIP = req.headers['x-real-ip']
    const cfConnectingIP = req.headers['cf-connecting-ip'] // Cloudflare
    
    if (forwardedFor) {
      // x-forwarded-for can contain multiple IPs, take the first one
      return Array.isArray(forwardedFor) ? forwardedFor[0]?.trim() || '' : forwardedFor.split(',')[0]?.trim() || ''
    }
    
    if (cfConnectingIP) {
      return Array.isArray(cfConnectingIP) ? cfConnectingIP[0] || '' : cfConnectingIP
    }
    
    if (realIP) {
      return Array.isArray(realIP) ? realIP[0] || '' : realIP
    }
    
    // Fallback to socket address - Fastify uses raw.socket
    return req.raw.socket?.remoteAddress || req.ip || 'unknown'
  }
  
  /**
   * Check if IP is in Stripe's whitelist
   */
  private isStripeIP(ip: string): boolean {
    // Handle IPv6 mapped IPv4 addresses (::ffff:x.x.x.x)
    const cleanIP = ip.replace(/^::ffff:/, '')
    
    return this.STRIPE_WEBHOOK_IPS.includes(cleanIP)
  }

  /**
   * Get webhook processing statistics
   */
  @Get('/stats')
  @UseGuards(JwtAuthGuard)
  async getWebhookStats() {
    const metrics = this.webhookService.getMetrics()
    return {
      success: true,
      data: metrics
    }
  }

  /**
   * Get webhook system health
   */
  @Get('/health')
  @Public()
  async getWebhookHealth() {
    const health = await this.webhookService.getSystemHealth()
    return {
      status: health.status,
      timestamp: new Date().toISOString(),
      details: health.details
    }
  }
}
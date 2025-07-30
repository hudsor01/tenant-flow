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
  UseGuards
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Stripe from 'stripe'
import { Public } from '../auth/decorators/public.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { WebhookService } from './webhook.service'

@Controller('/stripe/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name)
  private _stripe: Stripe | null = null

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
   */
  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: Buffer,
    @Headers('stripe-signature') signature: string
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header')
    }

    const payload = body.toString()
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
      // Process the webhook
      await this.webhookService.handleWebhookEvent(event)
      
      this.logger.debug(`Webhook processing completed for ${event.type}`)
      return { received: true }
      
    } catch (processingError) {
      this.logger.error(`Webhook processing failed for ${event.type}:`, processingError)
      
      // Return success to Stripe to prevent retries for business logic errors
      return { 
        received: true,
        error: 'Processing failed'
      }
    }
  }

  /**
   * Get webhook processing statistics
   */
  @Get('/stats')
  @UseGuards(JwtAuthGuard)
  async getWebhookStats() {
    return {
      success: true,
      data: {
        message: 'Basic webhook controller - no advanced stats available'
      }
    }
  }
}
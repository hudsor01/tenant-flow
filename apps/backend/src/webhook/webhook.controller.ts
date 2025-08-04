import { Controller, Post, Body, Headers, Logger, HttpCode } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { WebhookService } from './webhook.service';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @Public()
  @HttpCode(200)
  async handleGitHubWebhook(
    @Body() payload: any,
    @Headers('x-github-event') event: string,
    @Headers('x-hub-signature-256') signature: string,
  ) {
    this.logger.log(`Received GitHub webhook event: ${event}`);
    
    try {
      await this.webhookService.handleGitHubWebhook(payload, event, signature);
      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('health')
  @Public()
  @HttpCode(200)
  async health() {
    return {
      status: 'healthy',
      service: 'tenantflow-webhook',
      timestamp: new Date().toISOString(),
    };
  }
}
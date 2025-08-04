import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly webhookSecret: string;
  private readonly rebuildScript = '/home/dev-server/docker/rebuild-backend.sh';

  constructor(private readonly configService: ConfigService) {
    this.webhookSecret = this.configService.get<string>('GITHUB_WEBHOOK_SECRET') || 'tenantflow-webhook-secret-2025';
  }

  async handleGitHubWebhook(payload: any, event: string, signature: string): Promise<void> {
    // Verify GitHub signature
    this.verifyGitHubSignature(JSON.stringify(payload), signature);

    // Only handle push events to main branch
    if (event === 'push' && payload.ref === 'refs/heads/main') {
      this.logger.log(`Push to main branch detected from ${payload.repository.full_name}`);
      this.logger.log(`Commit: ${payload.head_commit.message} by ${payload.head_commit.author.name}`);
      
      // Trigger rebuild asynchronously (don't wait for completion)
      this.triggerRebuild(payload.head_commit.id).catch(error => {
        this.logger.error(`Rebuild failed: ${error.message}`, error.stack);
      });
    } else if (event === 'ping') {
      this.logger.log('Received GitHub ping - webhook is configured correctly');
    } else {
      this.logger.log(`Ignoring event: ${event} for ref: ${payload.ref || 'N/A'}`);
    }
  }

  private verifyGitHubSignature(payload: string, signature: string): void {
    if (!signature) {
      throw new UnauthorizedException('Missing GitHub signature');
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    const providedSignature = signature.replace('sha256=', '');

    if (!crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    )) {
      throw new UnauthorizedException('Invalid GitHub signature');
    }
  }

  private async triggerRebuild(commitId: string): Promise<void> {
    this.logger.log(`🚀 Starting container rebuild for commit ${commitId}`);
    
    try {
      const { stdout, stderr } = await execAsync(`bash ${this.rebuildScript}`);
      
      if (stderr) {
        this.logger.warn(`Rebuild stderr: ${stderr}`);
      }
      
      this.logger.log(`✅ Rebuild completed successfully: ${stdout.slice(-200)}`); // Last 200 chars
      
    } catch (error) {
      this.logger.error(`❌ Rebuild failed: ${error.message}`);
      throw error;
    }
  }
}
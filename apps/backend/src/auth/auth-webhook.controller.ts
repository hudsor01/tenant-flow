import { Controller, Post, Body, Headers, Logger, HttpCode } from '@nestjs/common'
import { AuthService } from './auth.service'
import { EmailService } from '../email/email.service'

interface SupabaseWebhookEvent {
    type: 'INSERT' | 'UPDATE' | 'DELETE'
    table: string
    schema: 'auth' | 'public'
    record: {
        id: string
        email?: string
        email_confirmed_at?: string | null
        user_metadata?: {
            name?: string
            full_name?: string
        }
        created_at: string
        updated_at: string
    }
    old_record?: any
}

@Controller('webhooks/auth')
export class AuthWebhookController {
    private readonly logger = new Logger(AuthWebhookController.name)

    constructor(
        private authService: AuthService,
        private emailService: EmailService
    ) {}

    @Post('supabase')
    @HttpCode(200)
    async handleSupabaseAuthWebhook(
        @Body() event: SupabaseWebhookEvent,
        @Headers('authorization') authHeader: string
    ) {
        this.logger.debug('Received Supabase auth webhook', {
            type: event.type,
            table: event.table,
            schema: event.schema,
            userId: event.record?.id,
            userEmail: event.record?.email
        })

        // Verify webhook is from Supabase (optional - add webhook secret validation here)
        // For now, we'll trust the request since it's behind our firewall

        try {
            // Handle user creation
            if (event.type === 'INSERT' && event.table === 'users' && event.schema === 'auth') {
                await this.handleUserCreated(event.record)
            }

            // Handle email confirmation
            if (event.type === 'UPDATE' && event.table === 'users' && event.schema === 'auth') {
                await this.handleUserUpdated(event.record)
            }

            return { success: true, message: 'Webhook processed successfully' }
        } catch (error) {
            this.logger.error('Error processing auth webhook', {
                error: error instanceof Error ? error.message : 'Unknown error',
                event: event
            })
            
            // Don't fail the webhook - log and continue
            return { success: false, error: 'Internal error processing webhook' }
        }
    }

    private async handleUserCreated(user: SupabaseWebhookEvent['record']) {
        this.logger.log('Processing new user creation', {
            userId: user.id,
            email: user.email,
            hasMetadata: !!user.user_metadata
        })

        if (!user.email) {
            this.logger.warn('User created without email', { userId: user.id })
            return
        }

        const userName = user.user_metadata?.name || user.user_metadata?.full_name || ''

        try {
            // Sync user with local database
            await this.authService.syncUserWithDatabase({
                id: user.id,
                email: user.email,
                email_confirmed_at: user.email_confirmed_at || undefined,
                user_metadata: user.user_metadata,
                created_at: user.created_at,
                updated_at: user.updated_at
            })

            // Send welcome email (even if email not confirmed yet)
            const emailResult = await this.emailService.sendWelcomeEmail(user.email, userName)
            
            if (emailResult.success) {
                this.logger.log('Welcome email sent successfully', {
                    userId: user.id,
                    email: user.email,
                    messageId: emailResult.messageId
                })
            } else {
                this.logger.warn('Failed to send welcome email', {
                    userId: user.id,
                    email: user.email,
                    error: emailResult.error
                })
            }
        } catch (error) {
            this.logger.error('Error processing user creation', {
                userId: user.id,
                email: user.email,
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    private async handleUserUpdated(user: SupabaseWebhookEvent['record']) {
        // Check if email was just confirmed
        if (user.email_confirmed_at && !user.email_confirmed_at.includes('1970')) {
            this.logger.log('User email confirmed', {
                userId: user.id,
                email: user.email,
                confirmedAt: user.email_confirmed_at
            })

            // Could send an "email confirmed" follow-up email here if needed
            // For now, just log it
        }
    }
}
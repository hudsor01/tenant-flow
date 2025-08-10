"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthWebhookController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const email_service_1 = require("../email/email.service");
const public_decorator_1 = require("./decorators/public.decorator");
const csrf_guard_1 = require("../common/guards/csrf.guard");
const rate_limit_decorator_1 = require("../common/decorators/rate-limit.decorator");
let AuthWebhookController = AuthWebhookController_1 = class AuthWebhookController {
    constructor(authService, emailService) {
        this.authService = authService;
        this.emailService = emailService;
        this.logger = new common_1.Logger(AuthWebhookController_1.name);
    }
    async handleSupabaseAuthWebhook(event, _authHeader) {
        this.logger.debug('Received Supabase auth webhook', {
            type: event.type,
            table: event.table,
            schema: event.schema,
            userId: event.record?.id,
            userEmail: event.record?.email
        });
        try {
            if (event.type === 'INSERT' && event.table === 'users' && event.schema === 'auth') {
                await this.handleUserCreated(event.record);
            }
            if (event.type === 'UPDATE' && event.table === 'users' && event.schema === 'auth') {
                await this.handleUserUpdated(event.record);
            }
            return { success: true, message: 'Webhook processed successfully' };
        }
        catch (error) {
            this.logger.error('Error processing auth webhook', {
                error: error instanceof Error ? error.message : 'Unknown error',
                event: event
            });
            return { success: false, error: 'Internal error processing webhook' };
        }
    }
    async handleUserCreated(user) {
        this.logger.log('Processing new user creation', {
            userId: user.id,
            email: user.email,
            hasMetadata: !!user.user_metadata
        });
        if (!user.email) {
            this.logger.warn('User created without email', { userId: user.id });
            return;
        }
        const userName = user.user_metadata?.name || user.user_metadata?.full_name || '';
        try {
            await this.authService.syncUserWithDatabase({
                id: user.id,
                email: user.email,
                email_confirmed_at: user.email_confirmed_at || undefined,
                user_metadata: user.user_metadata,
                created_at: user.created_at,
                updated_at: user.updated_at
            });
            const emailResult = await this.emailService.sendWelcomeEmail(user.email, userName);
            if (emailResult.success) {
                this.logger.log('Welcome email sent successfully', {
                    userId: user.id,
                    email: user.email,
                    messageId: emailResult.messageId
                });
            }
            else {
                this.logger.warn('Failed to send welcome email', {
                    userId: user.id,
                    email: user.email,
                    error: emailResult.error
                });
            }
        }
        catch (error) {
            this.logger.error('Error processing user creation', {
                userId: user.id,
                email: user.email,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async handleUserUpdated(user) {
        if (user.email_confirmed_at && !user.email_confirmed_at.includes('1970')) {
            this.logger.log('User email confirmed', {
                userId: user.id,
                email: user.email,
                confirmedAt: user.email_confirmed_at
            });
        }
    }
};
exports.AuthWebhookController = AuthWebhookController;
__decorate([
    (0, common_1.Post)('supabase'),
    (0, public_decorator_1.Public)(),
    (0, csrf_guard_1.CsrfExempt)(),
    (0, rate_limit_decorator_1.RateLimit)(rate_limit_decorator_1.WebhookRateLimits.SUPABASE_WEBHOOK),
    (0, common_1.HttpCode)(200),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('authorization')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AuthWebhookController.prototype, "handleSupabaseAuthWebhook", null);
exports.AuthWebhookController = AuthWebhookController = AuthWebhookController_1 = __decorate([
    (0, common_1.Controller)('webhooks/auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        email_service_1.EmailService])
], AuthWebhookController);

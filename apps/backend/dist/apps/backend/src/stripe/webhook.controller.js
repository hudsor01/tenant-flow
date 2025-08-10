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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var WebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = __importDefault(require("stripe"));
const public_decorator_1 = require("../auth/decorators/public.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const csrf_guard_1 = require("../common/guards/csrf.guard");
const rate_limit_decorator_1 = require("../common/decorators/rate-limit.decorator");
const webhook_service_1 = require("./webhook.service");
let WebhookController = WebhookController_1 = class WebhookController {
    constructor(configService, webhookService) {
        this.configService = configService;
        this.webhookService = webhookService;
        this.logger = new common_1.Logger(WebhookController_1.name);
        this._stripe = null;
        this.STRIPE_WEBHOOK_IPS = [
            '3.18.12.63', '3.130.192.231', '13.235.14.237', '13.235.122.149',
            '18.211.135.69', '35.154.171.200', '52.15.183.38', '54.88.130.119',
            '54.88.130.237', '54.187.174.169', '54.187.205.235', '54.187.216.72'
        ];
    }
    get stripe() {
        if (!this._stripe) {
            const secretKey = this.configService.get('STRIPE_SECRET_KEY');
            if (!secretKey) {
                throw new common_1.BadRequestException('Stripe secret key not configured');
            }
            this._stripe = new stripe_1.default(secretKey);
        }
        return this._stripe;
    }
    async handleWebhook(req, _body, signature) {
        const clientIP = this.getClientIP(req);
        const isProduction = this.configService.get('NODE_ENV') === 'production';
        if (isProduction && !this.isStripeIP(clientIP)) {
            this.logger.warn(`Webhook request from unauthorized IP: ${clientIP}`);
            throw new common_1.BadRequestException('Unauthorized webhook source');
        }
        if (!signature) {
            throw new common_1.BadRequestException('Missing stripe-signature header');
        }
        const rawBody = req.rawBody;
        if (!rawBody) {
            throw new common_1.BadRequestException('Raw body not available for webhook verification');
        }
        const payload = rawBody.toString('utf8');
        const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
        if (!webhookSecret) {
            throw new common_1.BadRequestException('Webhook secret not configured');
        }
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
            this.logger.debug(`Processing webhook event: ${event.type} (${event.id})`);
        }
        catch (err) {
            this.logger.error(`Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
            throw new common_1.BadRequestException('Invalid webhook signature');
        }
        try {
            await this.webhookService.handleWebhookEvent(event);
            this.logger.debug(`Webhook processing completed for ${event.type}`);
            return { received: true };
        }
        catch (processingError) {
            this.logger.error(`Webhook processing failed for ${event.type}:`, processingError);
            if (this.isNonRetryableError(processingError)) {
                this.logger.warn(`Non-retryable error for ${event.type}, acknowledging to Stripe`);
                return {
                    received: true,
                    error: processingError instanceof Error ? processingError.message : 'Processing failed'
                };
            }
            this.logger.error(`Retryable error for ${event.type}, will let Stripe retry`);
            throw new common_1.HttpException('Webhook processing failed - will retry', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    isNonRetryableError(error) {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes('validation') || message.includes('invalid')) {
                return true;
            }
            if (message.includes('duplicate') || message.includes('already processed')) {
                return true;
            }
            if (message.includes('insufficient funds') ||
                message.includes('subscription') ||
                message.includes('customer not found')) {
                return true;
            }
            if ('code' in error) {
                const code = String(error.code).toLowerCase();
                if (code.includes('validation') ||
                    code.includes('duplicate') ||
                    code === 'already_exists') {
                    return true;
                }
            }
        }
        return false;
    }
    getClientIP(req) {
        const forwardedFor = req.headers['x-forwarded-for'];
        const realIP = req.headers['x-real-ip'];
        const cfConnectingIP = req.headers['cf-connecting-ip'];
        if (forwardedFor) {
            return Array.isArray(forwardedFor) ? forwardedFor[0]?.trim() || '' : forwardedFor.split(',')[0]?.trim() || '';
        }
        if (cfConnectingIP) {
            return Array.isArray(cfConnectingIP) ? cfConnectingIP[0] || '' : cfConnectingIP;
        }
        if (realIP) {
            return Array.isArray(realIP) ? realIP[0] || '' : realIP;
        }
        return req.raw.socket?.remoteAddress || req.ip || 'unknown';
    }
    isStripeIP(ip) {
        const cleanIP = ip.replace(/^::ffff:/, '');
        return this.STRIPE_WEBHOOK_IPS.includes(cleanIP);
    }
    async getWebhookStats() {
        return {
            success: true,
            data: {
                message: 'Basic webhook controller - no advanced stats available'
            }
        };
    }
};
exports.WebhookController = WebhookController;
__decorate([
    (0, common_1.Post)(),
    (0, public_decorator_1.Public)(),
    (0, csrf_guard_1.CsrfExempt)(),
    (0, rate_limit_decorator_1.RateLimit)(rate_limit_decorator_1.WebhookRateLimits.STRIPE_WEBHOOK),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('stripe-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "handleWebhook", null);
__decorate([
    (0, common_1.Get)('/stats'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "getWebhookStats", null);
exports.WebhookController = WebhookController = WebhookController_1 = __decorate([
    (0, common_1.Controller)('/stripe/webhook'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        webhook_service_1.WebhookService])
], WebhookController);

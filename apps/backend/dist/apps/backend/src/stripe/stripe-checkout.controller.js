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
var StripeCheckoutController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeCheckoutController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const stripe_checkout_service_1 = require("./stripe-checkout.service");
let StripeCheckoutController = StripeCheckoutController_1 = class StripeCheckoutController {
    constructor(stripeCheckoutService) {
        this.stripeCheckoutService = stripeCheckoutService;
        this.logger = new common_1.Logger(StripeCheckoutController_1.name);
    }
    async createCheckoutSession(user, request) {
        if (user) {
            this.logger.log(`Creating checkout session for authenticated user: ${user.id}`);
            const enhancedRequest = {
                ...request,
                customerId: request.customerId || user.stripeCustomerId,
                customerEmail: request.customerEmail || user.email,
            };
            return this.stripeCheckoutService.createCheckoutSession(user.id, enhancedRequest);
        }
        else {
            this.logger.log('Creating checkout session for non-authenticated user');
            return this.stripeCheckoutService.createCheckoutSession(null, request);
        }
    }
    async createPortalSession(user, request) {
        this.logger.log(`Creating portal session for user: ${user.id}`);
        const customerId = request.customerId || user.stripeCustomerId;
        if (!customerId) {
            throw new Error('No Stripe customer ID found. Please subscribe to a plan first.');
        }
        const enhancedRequest = {
            ...request,
            customerId,
        };
        return this.stripeCheckoutService.createPortalSession(user.id, enhancedRequest);
    }
};
exports.StripeCheckoutController = StripeCheckoutController;
__decorate([
    (0, common_1.Post)('create-checkout-session'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a Stripe checkout session for subscription' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Checkout session created successfully',
        schema: {
            type: 'object',
            properties: {
                url: { type: 'string' },
                sessionId: { type: 'string' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StripeCheckoutController.prototype, "createCheckoutSession", null);
__decorate([
    (0, common_1.Post)('create-portal-session'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a Stripe customer portal session' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Portal session created successfully',
        schema: {
            type: 'object',
            properties: {
                url: { type: 'string' }
            }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request - Customer ID required' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], StripeCheckoutController.prototype, "createPortalSession", null);
exports.StripeCheckoutController = StripeCheckoutController = StripeCheckoutController_1 = __decorate([
    (0, swagger_1.ApiTags)('stripe-checkout'),
    (0, common_1.Controller)('stripe'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [stripe_checkout_service_1.StripeCheckoutService])
], StripeCheckoutController);

"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var StripeErrorHandler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeErrorHandler = void 0;
const common_1 = require("@nestjs/common");
let StripeErrorHandler = StripeErrorHandler_1 = class StripeErrorHandler {
    constructor() {
        this.logger = new common_1.Logger(StripeErrorHandler_1.name);
    }
    normalizeError(error) {
        if (error instanceof Error) {
            return error;
        }
        if (typeof error === 'string') {
            return new Error(error);
        }
        return new Error(`Unknown error: ${String(error)}`);
    }
    shouldRetry(error) {
        const stripeError = error;
        if (stripeError?.type === 'rate_limit_error') {
            return true;
        }
        const networkError = error;
        if (networkError?.code === 'ECONNRESET' || networkError?.code === 'ETIMEDOUT') {
            return true;
        }
        return false;
    }
    calculateDelay(attempt, baseDelayMs = 1000, maxDelayMs = 10000) {
        const exponentialDelay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
        return Math.round(exponentialDelay + jitter);
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async executeWithRetry(config) {
        return this.wrapAsync(config.operation, config.metadata?.operation || 'stripe-operation', config.maxAttempts || 3);
    }
    wrapSync(operation, operationName = 'stripe-operation') {
        try {
            return operation();
        }
        catch (error) {
            const errorObj = this.normalizeError(error);
            this.logger.error(`${operationName} failed: ${errorObj.message}`);
            throw errorObj;
        }
    }
    async wrapAsync(operation, operationName = 'stripe-operation', maxAttempts = 3) {
        let lastError = new Error('Unknown error');
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const result = await operation();
                if (attempt > 1) {
                    this.logger.warn(`${operationName} succeeded on attempt ${attempt}/${maxAttempts}`);
                }
                return result;
            }
            catch (error) {
                const errorObj = this.normalizeError(error);
                lastError = errorObj;
                if (this.shouldRetry(errorObj) && attempt < maxAttempts) {
                    const delay = this.calculateDelay(attempt);
                    this.logger.warn(`${operationName} failed on attempt ${attempt}/${maxAttempts}, retrying in ${delay}ms: ${lastError.message}`);
                    await this.delay(delay);
                    continue;
                }
                this.logger.error(`${operationName} failed after ${attempt} attempts: ${lastError.message}`);
                throw lastError;
            }
        }
        throw lastError;
    }
};
exports.StripeErrorHandler = StripeErrorHandler;
exports.StripeErrorHandler = StripeErrorHandler = StripeErrorHandler_1 = __decorate([
    (0, common_1.Injectable)()
], StripeErrorHandler);

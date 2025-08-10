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
var CsrfGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsrfGuard = exports.CsrfExempt = exports.IS_CSRF_EXEMPT_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
exports.IS_CSRF_EXEMPT_KEY = 'isCsrfExempt';
const CsrfExempt = () => Reflect.metadata(exports.IS_CSRF_EXEMPT_KEY, true);
exports.CsrfExempt = CsrfExempt;
let CsrfGuard = CsrfGuard_1 = class CsrfGuard {
    constructor(reflector) {
        this.reflector = reflector;
        this.logger = new common_1.Logger(CsrfGuard_1.name);
        this.STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
        this.GLOBAL_EXEMPT_ROUTES = [
            '/stripe/webhook',
            '/webhooks/auth/supabase',
            '/health',
            '/ping'
        ];
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const method = request.method;
        const url = request.url;
        if (!this.STATE_CHANGING_METHODS.includes(method)) {
            return true;
        }
        const isCsrfExempt = this.reflector.getAllAndOverride(exports.IS_CSRF_EXEMPT_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isCsrfExempt) {
            this.logger.debug(`CSRF protection bypassed by @CsrfExempt for ${method} ${url}`);
            return true;
        }
        if (this.isGlobalExemptRoute(url)) {
            this.logger.debug(`CSRF protection bypassed for global exempt route: ${method} ${url}`);
            return true;
        }
        const csrfToken = this.extractCsrfToken(request);
        if (!csrfToken) {
            this.logger.warn(`CSRF token missing for ${method} ${url}`, {
                userAgent: request.headers['user-agent'],
                origin: request.headers.origin,
                referer: request.headers.referer,
                ip: this.getClientIP(request)
            });
            throw new common_1.ForbiddenException({
                error: {
                    code: 'CSRF_TOKEN_MISSING',
                    message: 'CSRF token is required for this operation',
                    statusCode: 403,
                    details: {
                        hint: 'Include X-CSRF-Token header with a valid CSRF token',
                        documentation: 'GET /api/v1/csrf/token to obtain a token'
                    }
                }
            });
        }
        if (!this.isValidCsrfTokenFormat(csrfToken)) {
            this.logger.warn(`Invalid CSRF token format for ${method} ${url}`, {
                tokenLength: csrfToken.length,
                tokenPrefix: csrfToken.substring(0, 10),
                ip: this.getClientIP(request)
            });
            throw new common_1.ForbiddenException({
                error: {
                    code: 'CSRF_TOKEN_INVALID',
                    message: 'Invalid CSRF token format',
                    statusCode: 403,
                    details: {
                        hint: 'CSRF token must be 16-128 characters of alphanumeric, hyphens, or underscores'
                    }
                }
            });
        }
        this.logger.debug(`CSRF token validated for ${method} ${url}`);
        return true;
    }
    isGlobalExemptRoute(url) {
        const path = url.split('?')[0];
        return this.GLOBAL_EXEMPT_ROUTES.some(exemptRoute => {
            return path === exemptRoute ||
                path?.endsWith(exemptRoute) ||
                path?.includes(exemptRoute);
        });
    }
    extractCsrfToken(request) {
        const csrfHeader = request.headers['x-csrf-token'];
        if (csrfHeader) {
            return csrfHeader;
        }
        const xsrfHeader = request.headers['x-xsrf-token'];
        if (xsrfHeader) {
            return xsrfHeader;
        }
        const body = request.body;
        if (body && typeof body === 'object' && '_csrf' in body) {
            const formToken = body._csrf;
            if (typeof formToken === 'string') {
                return formToken;
            }
        }
        return null;
    }
    isValidCsrfTokenFormat(token) {
        if (typeof token !== 'string') {
            return false;
        }
        if (token.length < 16 || token.length > 128) {
            return false;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
            return false;
        }
        const fakeTokenPatterns = [
            /^test[-_]?token$/i,
            /^fake[-_]?token$/i,
            /^dummy[-_]?token$/i,
            /^csrf[-_]?not[-_]?configured$/i,
            /^1234567890abcdef$/i,
            /^(a|1)+$/,
            /^(abc|123)+$/i
        ];
        if (fakeTokenPatterns.some(pattern => pattern.test(token))) {
            return false;
        }
        return true;
    }
    getClientIP(request) {
        const forwardedFor = request.headers['x-forwarded-for'];
        const realIP = request.headers['x-real-ip'];
        const cfConnectingIP = request.headers['cf-connecting-ip'];
        if (forwardedFor) {
            return forwardedFor.split(',')[0]?.trim() || 'unknown';
        }
        if (cfConnectingIP) {
            return cfConnectingIP;
        }
        if (realIP) {
            return realIP;
        }
        return request.ip || 'unknown';
    }
};
exports.CsrfGuard = CsrfGuard;
exports.CsrfGuard = CsrfGuard = CsrfGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], CsrfGuard);

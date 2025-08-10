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
var JwtAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const auth_service_1 = require("../auth.service");
const public_decorator_1 = require("../decorators/public.decorator");
let JwtAuthGuard = JwtAuthGuard_1 = class JwtAuthGuard {
    constructor(authService, reflector) {
        this.authService = authService;
        this.reflector = reflector;
        this.logger = new common_1.Logger(JwtAuthGuard_1.name);
        this.JWT_PATTERN = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/;
        this.MIN_TOKEN_LENGTH = 50;
        this.MAX_TOKEN_LENGTH = 2048;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const method = request.method;
        const url = request.url;
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            this.logger.warn('Authentication token missing', {
                method,
                url: url?.substring(0, 100),
                userAgent: request.headers['user-agent']?.substring(0, 100),
                origin: request.headers.origin
            });
            throw new common_1.UnauthorizedException({
                error: {
                    code: 'AUTH_TOKEN_MISSING',
                    message: 'Authentication token is required',
                    statusCode: 401,
                    details: {
                        hint: 'Include Authorization: Bearer <token> header'
                    }
                }
            });
        }
        if (!this.isValidTokenFormat(token)) {
            this.logger.warn('Invalid token format detected', {
                method,
                url: url?.substring(0, 100),
                tokenLength: token.length,
                tokenPrefix: token.substring(0, 20),
                ip: this.getClientIP(request)
            });
            throw new common_1.UnauthorizedException({
                error: {
                    code: 'AUTH_TOKEN_INVALID_FORMAT',
                    message: 'Invalid authentication token format',
                    statusCode: 401
                }
            });
        }
        try {
            if (!this.authService) {
                this.logger.error('AuthService not available in JwtAuthGuard');
                throw new common_1.UnauthorizedException({
                    error: {
                        code: 'AUTH_SYSTEM_UNAVAILABLE',
                        message: 'Authentication system temporarily unavailable',
                        statusCode: 401
                    }
                });
            }
            const user = await this.authService.validateTokenAndGetUser(token);
            request['user'] = user;
            this.logger.debug('Token validation successful', {
                userId: user.id,
                userEmail: user.email,
                method,
                url: url?.substring(0, 100)
            });
            return true;
        }
        catch (error) {
            this.logger.warn('Token validation failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                errorType: error instanceof Error ? error.constructor.name : typeof error,
                method,
                url: url?.substring(0, 100),
                ip: this.getClientIP(request)
            });
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.UnauthorizedException({
                error: {
                    code: 'AUTH_TOKEN_VALIDATION_FAILED',
                    message: 'Authentication token validation failed',
                    statusCode: 401
                }
            });
        }
    }
    extractTokenFromHeader(request) {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            return undefined;
        }
        if (!authHeader.startsWith('Bearer ')) {
            return undefined;
        }
        const token = authHeader.substring(7);
        if (!token || token.trim() === '') {
            return undefined;
        }
        return token.trim();
    }
    isValidTokenFormat(token) {
        if (typeof token !== 'string') {
            return false;
        }
        if (token.length < this.MIN_TOKEN_LENGTH || token.length > this.MAX_TOKEN_LENGTH) {
            return false;
        }
        if (!this.JWT_PATTERN.test(token)) {
            return false;
        }
        const parts = token.split('.');
        if (parts.length !== 3) {
            return false;
        }
        if (parts.some(part => part.length < 4 || part.length > 1024)) {
            return false;
        }
        const fakeTokenPatterns = [
            /^test[-._]?token/i,
            /^fake[-._]?token/i,
            /^dummy[-._]?token/i,
            /^invalid[-._]?token/i,
            /^placeholder/i,
            /^example/i
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
            const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
            return ip?.trim() || 'unknown';
        }
        if (cfConnectingIP) {
            return Array.isArray(cfConnectingIP) ? cfConnectingIP[0] || 'unknown' : cfConnectingIP;
        }
        if (realIP) {
            return Array.isArray(realIP) ? realIP[0] || 'unknown' : realIP;
        }
        return request.ip || 'unknown';
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = JwtAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        core_1.Reflector])
], JwtAuthGuard);

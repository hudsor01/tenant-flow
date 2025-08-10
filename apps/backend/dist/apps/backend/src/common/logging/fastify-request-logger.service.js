"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FastifyRequestLoggerService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
let FastifyRequestLoggerService = class FastifyRequestLoggerService {
    constructor() {
        this.logger = new common_1.Logger('RequestLogger');
    }
    registerHooks(fastify) {
        fastify.addHook('onRequest', async (request, reply) => {
            const correlationId = (0, crypto_1.randomUUID)();
            request.correlationId = correlationId;
            reply.header('X-Correlation-ID', correlationId);
            request.startTime = Date.now();
            this.logger.debug('Request started', {
                correlationId,
                method: request.method,
                url: request.url,
                userAgent: request.headers['user-agent'],
                ip: this.extractClientIP(request),
                contentLength: request.headers['content-length'],
                contentType: request.headers['content-type']
            });
        });
        fastify.addHook('onResponse', async (request, reply) => {
            const duration = request.startTime ? Date.now() - request.startTime : 0;
            const statusCode = reply.statusCode;
            const isError = statusCode >= 400;
            const isSlowRequest = duration > 5000;
            const logData = {
                correlationId: request.correlationId,
                method: request.method,
                url: request.url,
                statusCode,
                duration,
                contentLength: reply.getHeader('content-length'),
                ip: this.extractClientIP(request),
                userAgent: request.headers['user-agent']
            };
            if (isError) {
                this.logger.error('Request completed with error', logData);
            }
            else if (isSlowRequest) {
                this.logger.warn('Slow request detected', { ...logData, slow: true });
            }
            else {
                this.logger.log('Request completed', logData);
            }
        });
        fastify.addHook('onError', async (request, _reply, error) => {
            const duration = request.startTime ? Date.now() - request.startTime : 0;
            this.logger.error('Request error occurred', {
                correlationId: request.correlationId,
                method: request.method,
                url: request.url,
                duration,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                },
                ip: this.extractClientIP(request),
                userAgent: request.headers['user-agent']
            });
        });
        this.logger.log('Request logging hooks registered successfully');
    }
    extractClientIP(request) {
        const forwarded = request.headers['x-forwarded-for'];
        const realIP = request.headers['x-real-ip'];
        const socketIP = request.socket?.remoteAddress;
        if (forwarded && typeof forwarded === 'string') {
            const firstIP = forwarded.split(',')[0];
            return firstIP ? firstIP.trim() : 'unknown';
        }
        return realIP || socketIP || 'unknown';
    }
};
exports.FastifyRequestLoggerService = FastifyRequestLoggerService;
exports.FastifyRequestLoggerService = FastifyRequestLoggerService = __decorate([
    (0, common_1.Injectable)()
], FastifyRequestLoggerService);

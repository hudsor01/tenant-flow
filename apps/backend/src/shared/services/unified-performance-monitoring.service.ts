import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomUUID } from 'crypto';

// --- Enums and Interfaces ---

export enum ErrorCode {
  CONFIG_ERROR = 'CONFIG_ERROR',
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  CONFLICT = 'CONFLICT',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  FORBIDDEN = 'FORBIDDEN',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export interface LogContext {
  requestId?: string;
  correlationId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  ip?: string;
  [key: string]: unknown;
}

export interface RequestMetric {
  path: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: number;
}

export interface HealthMetrics {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
}

@Injectable()
export class UnifiedPerformanceMonitoringService {
  private readonly logger: Logger;
  private readonly serviceName: string;
  private readonly version: string;
  private readonly environment: string;

  private readonly metrics: RequestMetric[] = [];
  private readonly maxMetrics = 1000;
  private writeIndex = 0;

  constructor(context?: string) {
    this.serviceName = context || 'UnifiedPerformanceMonitoringService';
    this.logger = new Logger(this.serviceName);
    this.version = process.env.APP_VERSION || '1.0.0';
    this.environment = process.env.NODE_ENV || 'development';
  }

  // --- Public API ---

  registerHooks(fastify: FastifyInstance): void {
    fastify.addHook('onRequest', this.onRequest.bind(this));
    fastify.addHook('onResponse', this.onResponse.bind(this));
    fastify.addHook('onError', this.onError.bind(this));
    this.logger.log('Unified performance and logging hooks registered');
  }

  // --- Logging Methods ---

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = { ...context, error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined };
    this.log('error', message, errorContext);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  debug(message: string, context?: LogContext): void {
    if (this.environment === 'development') {
      this.log('debug', message, context);
    }
  }

  // --- Error Handling ---

  createHttpException(statusCode: HttpStatus, message: string, code: ErrorCode, context?: unknown): HttpException {
    const exception = new HttpException({ code, message, timestamp: new Date().toISOString(), context }, statusCode);
    this.error(`Creating HTTP Exception: ${message}`, exception, { ...context as object, errorCode: code });
    return exception;
  }

  // --- Metrics ---

  getHealthMetrics(): HealthMetrics {
    const memoryUsage = process.memoryUsage();
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      },
    };
  }

  getRequestMetrics(): RequestMetric[] {
      return this.metrics.filter(Boolean);
  }

  // --- Public Method to Register Hooks ---
  
  registerPerformanceHooks(instance: FastifyInstance): void {
    instance.addHook('onRequest', this.onRequest.bind(this));
    instance.addHook('onResponse', this.onResponse.bind(this));
    instance.addHook('onError', this.onError.bind(this));
    this.info('Performance monitoring hooks registered');
  }

  // --- Private Hook Implementations ---

  private async onRequest(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const requestId = (request.headers['x-request-id'] as string) || randomUUID();
    const context: LogContext = {
      requestId,
      correlationId: requestId,
      endpoint: request.url,
      method: request.method,
      ip: request.ip || (request.headers['x-forwarded-for'] as string) || 'unknown',
    };

    (request as any).startTime = Date.now();
    (request as any).logContext = context;

    reply.header('x-request-id', requestId);
    this.debug('Request started', context);
  }

  private async onResponse(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const duration = Date.now() - (request as any).startTime;
    const logContext = (request as any).logContext || {};

    const metric: RequestMetric = {
        path: this.normalizePath(request.url || 'unknown'),
        method: request.method,
        statusCode: reply.statusCode,
        duration,
        timestamp: Date.now(),
    };
    this.addRequestMetric(metric);

    const level = reply.statusCode >= 500 ? 'error' : reply.statusCode >= 400 ? 'warn' : 'info';
    this[level](`Request finished`, {
      ...logContext,
      statusCode: reply.statusCode,
      duration,
    });

    if (duration > 1000) {
        this.warn('Slow request detected', { ...logContext, duration });
    }
  }

  private async onError(request: FastifyRequest, reply: FastifyReply, error: Error): Promise<void> {
    const logContext = (request as any).logContext || {};
    this.error('Request error occurred', error, {
      ...logContext,
      path: request.url,
      method: request.method,
    });
  }

  // --- Private Helper Methods ---

  private log(level: 'info' | 'error' | 'warn' | 'debug', message: string, context?: LogContext) {
    const logData = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      version: this.version,
      environment: this.environment,
      message,
      ...context,
    };
    this.logger[level](message, JSON.stringify(logData));
  }

  private addRequestMetric(metric: RequestMetric): void {
    this.metrics[this.writeIndex] = metric;
    this.writeIndex = (this.writeIndex + 1) % this.maxMetrics;
  }

  private normalizePath(path: string): string {
    return path
      .split('?')[0]
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}/gi, '/:uuid');
  }
}

declare module 'fastify' {
    interface FastifyRequest {
      startTime: number;
      logContext: LogContext;
    }
  }
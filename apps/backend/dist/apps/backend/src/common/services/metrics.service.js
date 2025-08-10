"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
const logger_service_1 = require("./logger.service");
const os = __importStar(require("os"));
const process = __importStar(require("process"));
let MetricsService = class MetricsService {
    constructor(logger) {
        this.logger = logger;
        this.metrics = [];
        this.maxMetrics = 1000;
        this.logger.setContext('MetricsService');
        setInterval(() => {
            this.logSystemMetrics();
        }, 5 * 60 * 1000);
    }
    recordMetric(metric) {
        const fullMetric = {
            ...metric,
            timestamp: new Date(),
        };
        this.metrics.push(fullMetric);
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }
        if (metric.duration > 1000) {
            this.logger.warn(`Slow operation detected - ${metric.operation}: ${metric.duration}ms`);
        }
        this.logger.logPerformance(metric.operation, metric.duration, {
            success: metric.success,
            ...metric.metadata,
        });
    }
    async trackPerformance(operation, fn, metadata) {
        const startTime = Date.now();
        let success = true;
        try {
            const result = await fn();
            return result;
        }
        catch (error) {
            success = false;
            throw error;
        }
        finally {
            const duration = Date.now() - startTime;
            this.recordMetric({
                operation,
                duration,
                success,
                metadata,
            });
        }
    }
    trackSync(operation, fn, metadata) {
        const startTime = Date.now();
        let success = true;
        try {
            const result = fn();
            return result;
        }
        catch (error) {
            success = false;
            throw error;
        }
        finally {
            const duration = Date.now() - startTime;
            this.recordMetric({
                operation,
                duration,
                success,
                metadata,
            });
        }
    }
    getSystemMetrics() {
        const memUsage = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        return {
            cpu: {
                usage: process.cpuUsage().user / 1000,
                loadAverage: os.loadavg(),
            },
            memory: {
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                rss: memUsage.rss,
                external: memUsage.external,
                arrayBuffers: memUsage.arrayBuffers,
                percentUsed: (memUsage.heapUsed / memUsage.heapTotal) * 100,
            },
            system: {
                uptime: process.uptime(),
                platform: os.platform(),
                nodeVersion: process.version,
                totalMemory: totalMem,
                freeMemory: freeMem,
            },
        };
    }
    logSystemMetrics() {
        const metrics = this.getSystemMetrics();
        this.logger.logWithMetadata('info', 'System metrics', {
            cpu: metrics.cpu,
            memory: {
                heapUsedMB: Math.round(metrics.memory.heapUsed / 1024 / 1024),
                heapTotalMB: Math.round(metrics.memory.heapTotal / 1024 / 1024),
                rssMB: Math.round(metrics.memory.rss / 1024 / 1024),
                percentUsed: metrics.memory.percentUsed.toFixed(2),
            },
            system: {
                uptimeHours: (metrics.system.uptime / 3600).toFixed(2),
                freeMemoryGB: (metrics.system.freeMemory / 1024 / 1024 / 1024).toFixed(2),
                totalMemoryGB: (metrics.system.totalMemory / 1024 / 1024 / 1024).toFixed(2),
            },
        });
        if (metrics.memory.percentUsed > 90) {
            this.logger.logWithMetadata('error', 'High memory usage detected', {
                percentUsed: metrics.memory.percentUsed,
                heapUsedMB: Math.round(metrics.memory.heapUsed / 1024 / 1024),
                heapTotalMB: Math.round(metrics.memory.heapTotal / 1024 / 1024),
            });
        }
    }
    getPerformanceStats(operation) {
        const relevantMetrics = operation
            ? this.metrics.filter(m => m.operation === operation)
            : this.metrics;
        if (relevantMetrics.length === 0) {
            return { message: 'No metrics available' };
        }
        const durations = relevantMetrics.map(m => m.duration);
        const successCount = relevantMetrics.filter(m => m.success).length;
        const failureCount = relevantMetrics.length - successCount;
        return {
            operation,
            count: relevantMetrics.length,
            successCount,
            failureCount,
            successRate: (successCount / relevantMetrics.length) * 100,
            avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
            minDuration: Math.min(...durations),
            maxDuration: Math.max(...durations),
            p50: this.percentile(durations, 50),
            p95: this.percentile(durations, 95),
            p99: this.percentile(durations, 99),
        };
    }
    percentile(values, percentile) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index] || 0;
    }
    clearMetrics() {
        this.metrics = [];
        this.logger.log('Performance metrics cleared');
    }
    exportMetrics() {
        return [...this.metrics];
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService])
], MetricsService);

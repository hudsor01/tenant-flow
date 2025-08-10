"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PerformanceMonitorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitorService = void 0;
const common_1 = require("@nestjs/common");
let PerformanceMonitorService = PerformanceMonitorService_1 = class PerformanceMonitorService {
    constructor() {
        this.logger = new common_1.Logger(PerformanceMonitorService_1.name);
        this.moduleMetrics = new Map();
        this.loadStartTimes = new Map();
        this.thresholds = {
            warning: 100,
            critical: 500
        };
    }
    startModuleLoad(moduleName) {
        this.loadStartTimes.set(moduleName, Date.now());
    }
    endModuleLoad(moduleName) {
        const startTime = this.loadStartTimes.get(moduleName);
        if (!startTime) {
            this.logger.warn(`No start time recorded for module: ${moduleName}`);
            return null;
        }
        const loadTime = Date.now() - startTime;
        const metrics = {
            moduleName,
            loadTime,
            timestamp: new Date(),
            memoryUsage: process.memoryUsage()
        };
        this.moduleMetrics.set(moduleName, metrics);
        this.loadStartTimes.delete(moduleName);
        this.evaluatePerformance(metrics);
        return metrics;
    }
    getModuleMetrics(moduleName) {
        return this.moduleMetrics.get(moduleName);
    }
    getAllMetrics() {
        return Array.from(this.moduleMetrics.values());
    }
    getSlowestModules(limit = 10) {
        return this.getAllMetrics()
            .sort((a, b) => b.loadTime - a.loadTime)
            .slice(0, limit);
    }
    generateReport() {
        const metrics = this.getAllMetrics();
        if (metrics.length === 0) {
            return {
                totalModules: 0,
                averageLoadTime: 0,
                slowestModule: null,
                fastestModule: null,
                modulesOverThreshold: [],
                memoryReport: {
                    current: process.memoryUsage(),
                    peak: 0
                }
            };
        }
        const loadTimes = metrics.map(m => m.loadTime);
        const averageLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
        const sortedByTime = metrics.sort((a, b) => b.loadTime - a.loadTime);
        const slowestModule = sortedByTime[0] || null;
        const fastestModule = sortedByTime[sortedByTime.length - 1] || null;
        const modulesOverThreshold = metrics.filter(m => m.loadTime > this.thresholds.warning);
        const peakMemory = Math.max(...metrics.map(m => m.memoryUsage?.heapUsed || 0));
        return {
            totalModules: metrics.length,
            averageLoadTime: Math.round(averageLoadTime * 100) / 100,
            slowestModule,
            fastestModule,
            modulesOverThreshold,
            memoryReport: {
                current: process.memoryUsage(),
                peak: peakMemory
            }
        };
    }
    logPerformanceReport() {
        const report = this.generateReport();
        this.logger.log('📊 Performance Report:');
        this.logger.log(`  Total Modules: ${report.totalModules}`);
        this.logger.log(`  Average Load Time: ${report.averageLoadTime}ms`);
        if (report.slowestModule) {
            this.logger.log(`  Slowest Module: ${report.slowestModule.moduleName} (${report.slowestModule.loadTime}ms)`);
        }
        if (report.fastestModule) {
            this.logger.log(`  Fastest Module: ${report.fastestModule.moduleName} (${report.fastestModule.loadTime}ms)`);
        }
        if (report.modulesOverThreshold.length > 0) {
            this.logger.warn(`  ⚠️ ${report.modulesOverThreshold.length} modules over ${this.thresholds.warning}ms threshold:`);
            report.modulesOverThreshold.forEach(module => {
                this.logger.warn(`    - ${module.moduleName}: ${module.loadTime}ms`);
            });
        }
        const memMB = Math.round(report.memoryReport.current.heapUsed / 1024 / 1024);
        const peakMB = Math.round(report.memoryReport.peak / 1024 / 1024);
        this.logger.log(`  Memory Usage: ${memMB}MB (Peak: ${peakMB}MB)`);
    }
    updateThresholds(thresholds) {
        Object.assign(this.thresholds, thresholds);
    }
    clearMetrics() {
        this.moduleMetrics.clear();
        this.loadStartTimes.clear();
    }
    evaluatePerformance(metrics) {
        const { moduleName, loadTime } = metrics;
        if (loadTime > this.thresholds.critical) {
            this.logger.error(`🚨 CRITICAL: ${moduleName} took ${loadTime}ms to load (threshold: ${this.thresholds.critical}ms)`);
        }
        else if (loadTime > this.thresholds.warning) {
            this.logger.warn(`⚠️ WARNING: ${moduleName} took ${loadTime}ms to load (threshold: ${this.thresholds.warning}ms)`);
        }
        else {
            if (process.env.NODE_ENV === 'development') {
                this.logger.log(`✅ ${moduleName} loaded in ${loadTime}ms`);
            }
        }
    }
};
exports.PerformanceMonitorService = PerformanceMonitorService;
exports.PerformanceMonitorService = PerformanceMonitorService = PerformanceMonitorService_1 = __decorate([
    (0, common_1.Injectable)()
], PerformanceMonitorService);

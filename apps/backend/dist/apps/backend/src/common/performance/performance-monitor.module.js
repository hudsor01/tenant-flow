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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitorModule = void 0;
const common_1 = require("@nestjs/common");
const performance_monitor_service_1 = require("./performance-monitor.service");
let PerformanceMonitorModule = class PerformanceMonitorModule {
    constructor(performanceMonitor) {
        this.performanceMonitor = performanceMonitor;
    }
    onModuleInit() {
        this.performanceMonitor.updateThresholds({
            warning: 50,
            critical: 200
        });
    }
};
exports.PerformanceMonitorModule = PerformanceMonitorModule;
exports.PerformanceMonitorModule = PerformanceMonitorModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [performance_monitor_service_1.PerformanceMonitorService],
        exports: [performance_monitor_service_1.PerformanceMonitorService]
    }),
    __metadata("design:paramtypes", [performance_monitor_service_1.PerformanceMonitorService])
], PerformanceMonitorModule);

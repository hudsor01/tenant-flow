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
exports.PrivacyService = void 0;
const common_1 = require("@nestjs/common");
const logger_service_1 = require("../services/logger.service");
let PrivacyService = class PrivacyService {
    constructor(logger) {
        this.logger = logger;
        if (this.logger && typeof this.logger.setContext === 'function') {
            this.logger.setContext('PrivacyService');
        }
    }
    async exportUserData(userId) {
        this.logger.log(`User data export requested for ${userId}`);
        return {
            userId,
            exportedAt: new Date(),
            data: {}
        };
    }
    async deleteUserData(userId) {
        this.logger.log(`User data deletion requested for ${userId}`);
    }
    async getDataRetentionStatus() {
        return {
            retentionPeriod: '7 years',
            lastPurge: new Date(),
            nextPurge: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };
    }
};
exports.PrivacyService = PrivacyService;
exports.PrivacyService = PrivacyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService])
], PrivacyService);

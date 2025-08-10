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
exports.FairHousingService = void 0;
const common_1 = require("@nestjs/common");
const logger_service_1 = require("../services/logger.service");
let FairHousingService = class FairHousingService {
    constructor(logger) {
        this.logger = logger;
        if (this.logger && typeof this.logger.setContext === 'function') {
            this.logger.setContext('FairHousing');
        }
    }
    async validateTenantData(data, _context) {
        const prohibitedFields = [
            'race', 'color', 'religion', 'sex', 'gender', 'national_origin',
            'familial_status', 'disability', 'age', 'marital_status'
        ];
        for (const field of prohibitedFields) {
            if (field in data) {
                this.logger.warn(`Potential Fair Housing violation: Field '${field}' present in tenant data`);
            }
        }
        this.logger.debug('Fair Housing validation completed');
    }
};
exports.FairHousingService = FairHousingService;
exports.FairHousingService = FairHousingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService])
], FairHousingService);

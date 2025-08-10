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
exports.CreateCheckoutSessionDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const database_1 = require("@repo/database");
class CreateCheckoutSessionDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { planType: { required: true, type: () => Object }, billingInterval: { required: true, type: () => Object }, successUrl: { required: false, type: () => String }, cancelUrl: { required: false, type: () => String }, couponId: { required: false, type: () => String } };
    }
}
exports.CreateCheckoutSessionDto = CreateCheckoutSessionDto;
__decorate([
    (0, class_validator_1.IsEnum)(database_1.PlanType),
    __metadata("design:type", String)
], CreateCheckoutSessionDto.prototype, "planType", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['monthly', 'annual']),
    __metadata("design:type", String)
], CreateCheckoutSessionDto.prototype, "billingInterval", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCheckoutSessionDto.prototype, "successUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCheckoutSessionDto.prototype, "cancelUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCheckoutSessionDto.prototype, "couponId", void 0);

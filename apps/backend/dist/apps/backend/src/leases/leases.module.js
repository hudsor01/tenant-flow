"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeasesModule = void 0;
const common_1 = require("@nestjs/common");
const leases_controller_1 = require("./leases.controller");
const leases_service_1 = require("./leases.service");
const lease_repository_1 = require("./lease.repository");
const lease_pdf_service_1 = require("./services/lease-pdf.service");
const prisma_module_1 = require("../prisma/prisma.module");
const pdf_module_1 = require("../common/pdf/pdf.module");
let LeasesModule = class LeasesModule {
};
exports.LeasesModule = LeasesModule;
exports.LeasesModule = LeasesModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, pdf_module_1.PDFModule],
        controllers: [leases_controller_1.LeasesController],
        providers: [leases_service_1.LeasesService, lease_repository_1.LeaseRepository, lease_pdf_service_1.LeasePDFService],
        exports: [leases_service_1.LeasesService, lease_repository_1.LeaseRepository, lease_pdf_service_1.LeasePDFService]
    })
], LeasesModule);

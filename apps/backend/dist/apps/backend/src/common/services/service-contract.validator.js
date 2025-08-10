"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceValidator = exports.ServiceTestValidator = exports.ServiceContractValidator = void 0;
exports.ValidateCrudService = ValidateCrudService;
const common_1 = require("@nestjs/common");
const base_crud_service_1 = require("./base-crud.service");
class ServiceContractValidator {
    constructor() {
        this.logger = new common_1.Logger(ServiceContractValidator.name);
    }
    validateService(service, serviceName) {
        const errors = [];
        const warnings = [];
        try {
            this.validateRequiredMethods(service, errors);
            this.validateAbstractMethods(service, errors);
            this.validateErrorHandling(service, warnings);
            this.validateLogging(service, warnings);
        }
        catch (error) {
            errors.push(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        const result = {
            isValid: errors.length === 0,
            errors,
            warnings
        };
        this.logValidationResult(serviceName, result);
        return result;
    }
    generateServiceMetadata(service, serviceName) {
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(service));
        const baseMethods = Object.getOwnPropertyNames(base_crud_service_1.BaseCrudService.prototype);
        const serviceWithProps = service;
        return {
            serviceName,
            entityName: serviceWithProps.entityName || 'Unknown',
            hasCustomMethods: methods.some(method => !baseMethods.includes(method)),
            implementsAllAliases: this.checkAliasMethods(service),
            hasProperErrorHandling: this.checkErrorHandling(service)
        };
    }
    validateRequiredMethods(service, errors) {
        const requiredMethods = [
            'getByOwner',
            'getByIdOrThrow',
            'getStats',
            'create',
            'update',
            'delete'
        ];
        for (const method of requiredMethods) {
            if (typeof service[method] !== 'function') {
                errors.push(`Missing required method: ${String(method)}`);
            }
        }
    }
    validateAbstractMethods(service, errors) {
        const abstractMethods = [
            'findByIdAndOwner',
            'calculateStats',
            'prepareCreateData',
            'prepareUpdateData',
            'createOwnerWhereClause'
        ];
        for (const method of abstractMethods) {
            const implementation = service[method];
            if (typeof implementation !== 'function') {
                errors.push(`Missing abstract method implementation: ${method}`);
            }
            else {
                try {
                    const methodString = implementation.toString();
                    if (methodString.includes('throw') && methodString.includes('abstract')) {
                        errors.push(`Abstract method not implemented: ${method}`);
                    }
                }
                catch {
                }
            }
        }
    }
    validateErrorHandling(service, warnings) {
        const errorHandler = service['errorHandler'];
        if (!errorHandler) {
            warnings.push('ErrorHandlerService not found - error handling may be inconsistent');
        }
        const logger = service['logger'];
        if (!logger) {
            warnings.push('Logger not found - operation logging may be missing');
        }
    }
    validateLogging(service, warnings) {
        const logger = service['logger'];
        if (logger && !logger.log) {
            warnings.push('Logger instance does not have log method');
        }
    }
    checkAliasMethods(service) {
        const aliasMethods = ['findAllByOwner', 'findById', 'findOne', 'remove'];
        return aliasMethods.every(method => typeof service[method] === 'function');
    }
    checkErrorHandling(service) {
        const serviceWithProps = service;
        return !!serviceWithProps.errorHandler && !!serviceWithProps.logger;
    }
    logValidationResult(serviceName, result) {
        if (result.isValid) {
            this.logger.log(`✅ Service validation passed: ${serviceName}`);
        }
        else {
            this.logger.error(`❌ Service validation failed: ${serviceName}`);
            result.errors.forEach(error => {
                this.logger.error(`  - ${error}`);
            });
        }
        if (result.warnings.length > 0) {
            this.logger.warn(`⚠️  Service warnings for ${serviceName}:`);
            result.warnings.forEach(warning => {
                this.logger.warn(`  - ${warning}`);
            });
        }
    }
}
exports.ServiceContractValidator = ServiceContractValidator;
function ValidateCrudService(_serviceName) {
    return function (constructor) {
        return constructor;
    };
}
class ServiceTestValidator {
    constructor() {
        this.validator = new ServiceContractValidator();
    }
    validateAllServices(services) {
        const allErrors = [];
        const allWarnings = [];
        for (const [name, service] of Object.entries(services)) {
            const result = this.validator.validateService(service, name);
            allErrors.push(...result.errors.map(error => `${name}: ${error}`));
            allWarnings.push(...result.warnings.map(warning => `${name}: ${warning}`));
        }
        return {
            isValid: allErrors.length === 0,
            errors: allErrors,
            warnings: allWarnings
        };
    }
    generateComplianceReport(services) {
        const results = Object.entries(services).map(([name, service]) => {
            const validation = this.validator.validateService(service, name);
            const metadata = this.validator.generateServiceMetadata(service, name);
            return {
                name,
                validation,
                metadata
            };
        });
        const compliantServices = results.filter(r => r.validation.isValid);
        const nonCompliantServices = results.filter(r => !r.validation.isValid);
        let report = '# CRUD Service Compliance Report\n\n';
        report += `**Total Services:** ${results.length}\n`;
        report += `**Compliant:** ${compliantServices.length}\n`;
        report += `**Non-Compliant:** ${nonCompliantServices.length}\n\n`;
        if (compliantServices.length > 0) {
            report += '## ✅ Compliant Services\n\n';
            compliantServices.forEach(({ name, metadata }) => {
                report += `- **${name}** (${metadata.entityName})\n`;
                if (metadata.hasCustomMethods) {
                    report += '  - Has custom methods\n';
                }
            });
            report += '\n';
        }
        if (nonCompliantServices.length > 0) {
            report += '## ❌ Non-Compliant Services\n\n';
            nonCompliantServices.forEach(({ name, validation }) => {
                report += `### ${name}\n\n`;
                validation.errors.forEach(error => {
                    report += `- ❌ ${error}\n`;
                });
                validation.warnings.forEach(warning => {
                    report += `- ⚠️ ${warning}\n`;
                });
                report += '\n';
            });
        }
        return report;
    }
}
exports.ServiceTestValidator = ServiceTestValidator;
exports.serviceValidator = new ServiceContractValidator();

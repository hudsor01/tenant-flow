"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainArchitecturePatterns = exports.TypeGuards = exports.DomainServiceFactory = exports.DomainErrorType = void 0;
var DomainErrorType;
(function (DomainErrorType) {
    DomainErrorType["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    DomainErrorType["NOT_FOUND_ERROR"] = "NOT_FOUND_ERROR";
    DomainErrorType["OWNERSHIP_ERROR"] = "OWNERSHIP_ERROR";
    DomainErrorType["BUSINESS_RULE_ERROR"] = "BUSINESS_RULE_ERROR";
    DomainErrorType["CONFLICT_ERROR"] = "CONFLICT_ERROR";
})(DomainErrorType || (exports.DomainErrorType = DomainErrorType = {}));
class DomainServiceFactory {
    static createCrudService(_config) {
        throw new Error('Factory implementation depends on DI container configuration');
    }
}
exports.DomainServiceFactory = DomainServiceFactory;
exports.TypeGuards = {
    isDomainEntity: (obj) => {
        return obj !== null && typeof obj === 'object' &&
            'id' in obj && 'createdAt' in obj && 'updatedAt' in obj;
    },
    isOwnedEntity: (obj) => {
        return exports.TypeGuards.isDomainEntity(obj) && 'ownerId' in obj;
    },
    isValidQueryOptions: (obj) => {
        return obj === null || (typeof obj === 'object' &&
            (!('limit' in obj) || typeof obj.limit === 'number' || typeof obj.limit === 'string') &&
            (!('offset' in obj) || typeof obj.offset === 'number' || typeof obj.offset === 'string'));
    }
};
exports.DomainArchitecturePatterns = {
    TypeGuards: exports.TypeGuards,
    DomainErrorType,
    DomainServiceFactory
};

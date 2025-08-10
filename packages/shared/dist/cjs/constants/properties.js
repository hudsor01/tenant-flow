"use strict";
/**
 * Property constants
 * Central source of truth for property-related enums and constants
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNIT_STATUS_OPTIONS = exports.PROPERTY_TYPE_OPTIONS = exports.UNIT_STATUS = exports.PROPERTY_TYPE = exports.PROPERTY_STATUS = void 0;
exports.PROPERTY_STATUS = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    UNDER_CONTRACT: 'UNDER_CONTRACT',
    SOLD: 'SOLD'
};
// Property type enum - matches Prisma schema PropertyType enum
exports.PROPERTY_TYPE = {
    SINGLE_FAMILY: 'SINGLE_FAMILY',
    MULTI_UNIT: 'MULTI_UNIT',
    APARTMENT: 'APARTMENT',
    COMMERCIAL: 'COMMERCIAL'
};
// Unit status enum - matches Prisma schema UnitStatus enum
exports.UNIT_STATUS = {
    VACANT: 'VACANT',
    OCCUPIED: 'OCCUPIED',
    MAINTENANCE: 'MAINTENANCE',
    RESERVED: 'RESERVED'
};
// Derived options arrays for frontend use
exports.PROPERTY_TYPE_OPTIONS = Object.values(exports.PROPERTY_TYPE);
exports.UNIT_STATUS_OPTIONS = Object.values(exports.UNIT_STATUS);
//# sourceMappingURL=properties.js.map
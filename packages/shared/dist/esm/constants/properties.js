/**
 * Property constants
 * Central source of truth for property-related enums and constants
 */
export const PROPERTY_STATUS = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    UNDER_CONTRACT: 'UNDER_CONTRACT',
    SOLD: 'SOLD'
};
// Property type enum - matches Prisma schema PropertyType enum
export const PROPERTY_TYPE = {
    SINGLE_FAMILY: 'SINGLE_FAMILY',
    MULTI_UNIT: 'MULTI_UNIT',
    APARTMENT: 'APARTMENT',
    COMMERCIAL: 'COMMERCIAL'
};
// Unit status enum - matches Prisma schema UnitStatus enum
export const UNIT_STATUS = {
    VACANT: 'VACANT',
    OCCUPIED: 'OCCUPIED',
    MAINTENANCE: 'MAINTENANCE',
    RESERVED: 'RESERVED'
};
// Derived options arrays for frontend use
export const PROPERTY_TYPE_OPTIONS = Object.values(PROPERTY_TYPE);
export const UNIT_STATUS_OPTIONS = Object.values(UNIT_STATUS);
//# sourceMappingURL=properties.js.map
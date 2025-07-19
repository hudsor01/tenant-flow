/**
 * Property constants
 * Runtime constants and enums for property management
 */
export const PROPERTY_TYPE = {
    SINGLE_FAMILY: 'SINGLE_FAMILY',
    MULTI_UNIT: 'MULTI_UNIT',
    APARTMENT: 'APARTMENT',
    COMMERCIAL: 'COMMERCIAL'
};
export const PROPERTY_TYPE_OPTIONS = Object.values(PROPERTY_TYPE);
export const UNIT_STATUS = {
    VACANT: 'VACANT',
    OCCUPIED: 'OCCUPIED',
    MAINTENANCE: 'MAINTENANCE',
    RESERVED: 'RESERVED'
};
export const UNIT_STATUS_OPTIONS = Object.values(UNIT_STATUS);

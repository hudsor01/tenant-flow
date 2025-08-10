"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNIT_STATUS_OPTIONS = exports.PROPERTY_TYPE_OPTIONS = exports.UNIT_STATUS = exports.PROPERTY_TYPE = exports.PROPERTY_STATUS = void 0;
exports.PROPERTY_STATUS = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    UNDER_CONTRACT: 'UNDER_CONTRACT',
    SOLD: 'SOLD'
};
exports.PROPERTY_TYPE = {
    SINGLE_FAMILY: 'SINGLE_FAMILY',
    MULTI_UNIT: 'MULTI_UNIT',
    APARTMENT: 'APARTMENT',
    COMMERCIAL: 'COMMERCIAL'
};
exports.UNIT_STATUS = {
    VACANT: 'VACANT',
    OCCUPIED: 'OCCUPIED',
    MAINTENANCE: 'MAINTENANCE',
    RESERVED: 'RESERVED'
};
exports.PROPERTY_TYPE_OPTIONS = Object.values(exports.PROPERTY_TYPE);
exports.UNIT_STATUS_OPTIONS = Object.values(exports.UNIT_STATUS);

"use strict";
/**
 * Property management types
 * All types related to properties, units, and property management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnitStatusColor = exports.getUnitStatusLabel = exports.getPropertyTypeLabel = void 0;
// Property type display helpers
const getPropertyTypeLabel = (type) => {
    const labels = {
        SINGLE_FAMILY: 'Single Family',
        MULTI_UNIT: 'Multi Unit',
        APARTMENT: 'Apartment',
        COMMERCIAL: 'Commercial'
    };
    return labels[type] || type;
};
exports.getPropertyTypeLabel = getPropertyTypeLabel;
// Unit status display helpers
const getUnitStatusLabel = (status) => {
    const labels = {
        VACANT: 'Vacant',
        OCCUPIED: 'Occupied',
        MAINTENANCE: 'Under Maintenance',
        RESERVED: 'Reserved'
    };
    return labels[status] || status;
};
exports.getUnitStatusLabel = getUnitStatusLabel;
const getUnitStatusColor = (status) => {
    const colors = {
        VACANT: 'bg-yellow-100 text-yellow-800',
        OCCUPIED: 'bg-blue-100 text-blue-800',
        MAINTENANCE: 'bg-orange-100 text-orange-800',
        RESERVED: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};
exports.getUnitStatusColor = getUnitStatusColor;
//# sourceMappingURL=properties.js.map
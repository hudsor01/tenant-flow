/**
 * Property management types
 * All types related to properties, units, and property management
 */
// Property type display helpers
export const getPropertyTypeLabel = (type) => {
    const labels = {
        SINGLE_FAMILY: 'Single Family',
        MULTI_UNIT: 'Multi Unit',
        APARTMENT: 'Apartment',
        COMMERCIAL: 'Commercial'
    };
    return labels[type] || type;
};
// Unit status display helpers
export const getUnitStatusLabel = (status) => {
    const labels = {
        VACANT: 'Vacant',
        OCCUPIED: 'Occupied',
        MAINTENANCE: 'Under Maintenance',
        RESERVED: 'Reserved'
    };
    return labels[status] || status;
};
export const getUnitStatusColor = (status) => {
    const colors = {
        VACANT: 'bg-yellow-100 text-yellow-800',
        OCCUPIED: 'bg-blue-100 text-blue-800',
        MAINTENANCE: 'bg-orange-100 text-orange-800',
        RESERVED: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};
//# sourceMappingURL=properties.js.map
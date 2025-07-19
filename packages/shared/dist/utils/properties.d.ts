/**
 * Property utilities
 * Helper functions for property and unit display
 */
type PropertyType = 'SINGLE_FAMILY' | 'MULTI_UNIT' | 'APARTMENT' | 'COMMERCIAL';
type UnitStatus = 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED';
export declare const getPropertyTypeLabel: (type: PropertyType) => string;
export declare const getUnitStatusLabel: (status: UnitStatus) => string;
export declare const getUnitStatusColor: (status: UnitStatus) => string;
export {};

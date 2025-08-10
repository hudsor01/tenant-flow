/**
 * Property constants
 * Central source of truth for property-related enums and constants
 */
export declare const PROPERTY_STATUS: {
    readonly ACTIVE: "ACTIVE";
    readonly INACTIVE: "INACTIVE";
    readonly UNDER_CONTRACT: "UNDER_CONTRACT";
    readonly SOLD: "SOLD";
};
export type PropertyStatus = typeof PROPERTY_STATUS[keyof typeof PROPERTY_STATUS];
export declare const PROPERTY_TYPE: {
    readonly SINGLE_FAMILY: "SINGLE_FAMILY";
    readonly MULTI_UNIT: "MULTI_UNIT";
    readonly APARTMENT: "APARTMENT";
    readonly COMMERCIAL: "COMMERCIAL";
};
export type PropertyType = typeof PROPERTY_TYPE[keyof typeof PROPERTY_TYPE];
export declare const UNIT_STATUS: {
    readonly VACANT: "VACANT";
    readonly OCCUPIED: "OCCUPIED";
    readonly MAINTENANCE: "MAINTENANCE";
    readonly RESERVED: "RESERVED";
};
export type UnitStatus = typeof UNIT_STATUS[keyof typeof UNIT_STATUS];
export declare const PROPERTY_TYPE_OPTIONS: ("SINGLE_FAMILY" | "MULTI_UNIT" | "APARTMENT" | "COMMERCIAL")[];
export declare const UNIT_STATUS_OPTIONS: ("VACANT" | "OCCUPIED" | "MAINTENANCE" | "RESERVED")[];
//# sourceMappingURL=properties.d.ts.map
/**
 * Maintenance constants
 */
export declare const PRIORITY: {
    readonly LOW: "LOW";
    readonly MEDIUM: "MEDIUM";
    readonly HIGH: "HIGH";
    readonly EMERGENCY: "EMERGENCY";
};
export declare const MAINTENANCE_CATEGORY: {
    readonly GENERAL: "GENERAL";
    readonly PLUMBING: "PLUMBING";
    readonly ELECTRICAL: "ELECTRICAL";
    readonly HVAC: "HVAC";
    readonly APPLIANCES: "APPLIANCES";
    readonly SAFETY: "SAFETY";
    readonly OTHER: "OTHER";
};
export type MaintenanceCategory = typeof MAINTENANCE_CATEGORY[keyof typeof MAINTENANCE_CATEGORY];
export declare const REQUEST_STATUS: {
    readonly OPEN: "OPEN";
    readonly IN_PROGRESS: "IN_PROGRESS";
    readonly COMPLETED: "COMPLETED";
    readonly CANCELED: "CANCELED";
    readonly ON_HOLD: "ON_HOLD";
};
export type Priority = typeof PRIORITY[keyof typeof PRIORITY];
export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS];
export declare const PRIORITY_OPTIONS: ("LOW" | "MEDIUM" | "HIGH" | "EMERGENCY")[];
export declare const REQUEST_STATUS_OPTIONS: ("COMPLETED" | "OPEN" | "IN_PROGRESS" | "CANCELED" | "ON_HOLD")[];
//# sourceMappingURL=maintenance.d.ts.map
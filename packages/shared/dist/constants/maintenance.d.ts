/**
 * Maintenance constants
 * Runtime constants and enums for maintenance management
 */
export declare const PRIORITY: {
    readonly LOW: "LOW";
    readonly MEDIUM: "MEDIUM";
    readonly HIGH: "HIGH";
    readonly EMERGENCY: "EMERGENCY";
};
export declare const PRIORITY_OPTIONS: ("LOW" | "MEDIUM" | "HIGH" | "EMERGENCY")[];
export declare const REQUEST_STATUS: {
    readonly OPEN: "OPEN";
    readonly IN_PROGRESS: "IN_PROGRESS";
    readonly COMPLETED: "COMPLETED";
    readonly CANCELED: "CANCELED";
    readonly ON_HOLD: "ON_HOLD";
};
export declare const REQUEST_STATUS_OPTIONS: ("OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD")[];

/**
 * Maintenance Management Types
 * Centralized type definitions for maintenance requests and management
 */
export declare const PRIORITY: {
    readonly LOW: "LOW";
    readonly MEDIUM: "MEDIUM";
    readonly HIGH: "HIGH";
    readonly URGENT: "URGENT";
};
export type Priority = typeof PRIORITY[keyof typeof PRIORITY];
export declare const REQUEST_STATUS: {
    readonly OPEN: "OPEN";
    readonly IN_PROGRESS: "IN_PROGRESS";
    readonly COMPLETED: "COMPLETED";
    readonly CANCELLED: "CANCELLED";
    readonly ON_HOLD: "ON_HOLD";
};
export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS];
export interface MaintenanceRequest {
    id: string;
    unitId: string;
    title: string;
    description: string;
    category: string | null;
    priority: Priority;
    status: RequestStatus;
    preferredDate: Date | null;
    allowEntry: boolean;
    contactPhone: string | null;
    requestedBy: string | null;
    notes: string | null;
    photos: string[];
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    assignedTo: string | null;
    estimatedCost: number | null;
    actualCost: number | null;
}
export interface MaintenanceWithDetails extends MaintenanceRequest {
    property: {
        id: string;
        name: string;
        address: string;
    };
    unit: {
        id: string;
        unitNumber: string;
    };
    tenant?: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
    };
    assignedUser?: {
        id: string;
        name: string;
        email: string;
    };
}
export interface CreateMaintenanceDTO {
    unitId: string;
    title: string;
    description: string;
    category?: string;
    priority: Priority;
    preferredDate?: Date;
    allowEntry: boolean;
    contactPhone?: string;
    requestedBy?: string;
    photos?: string[];
}
export interface UpdateMaintenanceDTO extends Partial<CreateMaintenanceDTO> {
    status?: RequestStatus;
    assignedTo?: string;
    notes?: string;
    estimatedCost?: number;
    actualCost?: number;
    completedAt?: Date;
}

/**
 * Maintenance management types
 * All types related to maintenance requests, priorities, and maintenance operations
 */
import type { PRIORITY, REQUEST_STATUS } from '../constants/maintenance';
export type Priority = typeof PRIORITY[keyof typeof PRIORITY];
export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS];
export declare const getPriorityLabel: (priority: Priority) => string;
export declare const getPriorityColor: (priority: Priority) => string;
export declare const getRequestStatusLabel: (status: RequestStatus) => string;
export declare const getRequestStatusColor: (status: RequestStatus) => string;
export interface MaintenanceRequest {
    id: string;
    unitId: string;
    title: string;
    description: string;
    category: string | null;
    priority: Priority;
    status: RequestStatus;
    preferredDate: string | null;
    allowEntry: boolean;
    contactPhone: string | null;
    requestedBy: string | null;
    notes: string | null;
    photos: string[];
    assignedTo: string | null;
    estimatedCost: number | null;
    actualCost: number | null;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
    Unit?: {
        id: string;
        unitNumber: string;
        property?: {
            id: string;
            name: string;
        };
    };
    Expense?: {
        id: string;
        propertyId: string;
        maintenanceId: string | null;
        amount: number;
        category: string;
        description: string;
        date: string;
        receiptUrl: string | null;
        vendorName: string | null;
        vendorContact: string | null;
        createdAt: string;
        updatedAt: string;
    }[];
    files?: {
        id: string;
        filename: string;
        originalName: string;
        mimeType: string;
        size: number | null;
        url: string;
        uploadedById: string | null;
        propertyId: string | null;
        maintenanceRequestId: string | null;
        createdAt: string;
    }[];
}
export interface MaintenanceRequestWithDetails extends Omit<MaintenanceRequest, 'Unit'> {
    Unit?: {
        id: string;
        unitNumber: string;
        property?: {
            id: string;
            name: string;
        };
        Property?: {
            id: string;
            name: string;
        };
    };
}
export interface MaintenanceRequestData {
    id: number;
    property: string;
    issue: string;
    reportedDate: string;
    status: 'Completed' | 'In Progress' | 'Open';
}
//# sourceMappingURL=maintenance.d.ts.map
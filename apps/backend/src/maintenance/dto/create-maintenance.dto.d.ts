import type { Priority, RequestStatus } from '@prisma/client';
export declare class CreateMaintenanceDto {
    unitId: string;
    title: string;
    description: string;
    category?: string;
    priority?: Priority;
    status?: RequestStatus;
    preferredDate?: Date;
    allowEntry?: boolean;
    contactPhone?: string;
    requestedBy?: string;
    notes?: string;
    photos?: string[];
}
export declare class UpdateMaintenanceDto {
    title?: string;
    description?: string;
    category?: string;
    priority?: Priority;
    status?: RequestStatus;
    preferredDate?: Date;
    allowEntry?: boolean;
    contactPhone?: string;
    assignedTo?: string;
    estimatedCost?: number;
    actualCost?: number;
    completedAt?: string;
    notes?: string;
    photos?: string[];
}
export interface MaintenanceQuery {
    page?: number;
    limit?: number;
    unitId?: string;
    status?: RequestStatus;
    priority?: Priority;
    category?: string;
    assignedTo?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
}
//# sourceMappingURL=create-maintenance.dto.d.ts.map
import { PrismaService } from 'nestjs-prisma';
import { SupabaseService } from '../stripe/services/supabase.service';
import type { CreateMaintenanceDto, UpdateMaintenanceDto, MaintenanceQuery } from './dto/create-maintenance.dto';
import type { MaintenanceRequest } from '@prisma/client';
export declare class MaintenanceService {
    private prisma;
    private supabaseService;
    private readonly logger;
    constructor(prisma: PrismaService, supabaseService: SupabaseService);
    create(createMaintenanceDto: CreateMaintenanceDto): Promise<MaintenanceRequest>;
    findAll(query: MaintenanceQuery): Promise<({
        Unit: {
            Property: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                address: string;
                city: string;
                state: string;
                zipCode: string;
                imageUrl: string | null;
                ownerId: string;
                propertyType: import("@prisma/client").$Enums.PropertyType;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.UnitStatus;
            createdAt: Date;
            updatedAt: Date;
            unitNumber: string;
            propertyId: string;
            bedrooms: number;
            bathrooms: number;
            squareFeet: number | null;
            rent: number;
            lastInspectionDate: Date | null;
        };
    } & {
        id: string;
        unitId: string;
        status: import("@prisma/client").$Enums.RequestStatus;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        title: string;
        category: string | null;
        priority: import("@prisma/client").$Enums.Priority;
        preferredDate: Date | null;
        allowEntry: boolean;
        contactPhone: string | null;
        requestedBy: string | null;
        notes: string | null;
        photos: string[];
        completedAt: Date | null;
        assignedTo: string | null;
        estimatedCost: number | null;
        actualCost: number | null;
    })[]>;
    findOne(id: string): Promise<({
        Unit: {
            Property: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                address: string;
                city: string;
                state: string;
                zipCode: string;
                imageUrl: string | null;
                ownerId: string;
                propertyType: import("@prisma/client").$Enums.PropertyType;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.UnitStatus;
            createdAt: Date;
            updatedAt: Date;
            unitNumber: string;
            propertyId: string;
            bedrooms: number;
            bathrooms: number;
            squareFeet: number | null;
            rent: number;
            lastInspectionDate: Date | null;
        };
    } & {
        id: string;
        unitId: string;
        status: import("@prisma/client").$Enums.RequestStatus;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        title: string;
        category: string | null;
        priority: import("@prisma/client").$Enums.Priority;
        preferredDate: Date | null;
        allowEntry: boolean;
        contactPhone: string | null;
        requestedBy: string | null;
        notes: string | null;
        photos: string[];
        completedAt: Date | null;
        assignedTo: string | null;
        estimatedCost: number | null;
        actualCost: number | null;
    }) | null>;
    update(id: string, updateMaintenanceDto: UpdateMaintenanceDto): Promise<MaintenanceRequest>;
    remove(id: string): Promise<MaintenanceRequest>;
    getStats(): Promise<{
        total: number;
        open: number;
        inProgress: number;
        completed: number;
    }>;
    sendNotification(notificationData: {
        type: 'new_request' | 'status_update' | 'emergency_alert';
        maintenanceRequestId: string;
        recipientEmail: string;
        recipientName: string;
        recipientRole: 'owner' | 'tenant';
        actionUrl?: string;
    }, _userId: string): Promise<{
        emailId: any;
        sentAt: string;
        type: "new_request" | "status_update" | "emergency_alert";
    }>;
    logNotification(logData: {
        type: 'maintenance_notification';
        recipientEmail: string;
        recipientName: string;
        subject: string;
        maintenanceRequestId: string;
        notificationType: string;
        status: 'sent' | 'failed';
    }, _userId: string): Promise<{
        id: string;
        type: "maintenance_notification";
        recipientEmail: string;
        recipientName: string;
        subject: string;
        maintenanceRequestId: string;
        notificationType: string;
        sentAt: string;
        status: "sent" | "failed";
    }>;
    private getEmailSubject;
}
//# sourceMappingURL=maintenance.service.d.ts.map
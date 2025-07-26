import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../common/supabase.service';
import { ErrorHandlerService } from '../common/errors/error-handler.service';
import type { CreateMaintenanceDto, UpdateMaintenanceDto, MaintenanceQuery } from './dto/create-maintenance.dto';
import type { MaintenanceRequest } from '@prisma/client';
export declare class MaintenanceService {
    private prisma;
    private supabaseService;
    private errorHandler;
    private readonly logger;
    constructor(prisma: PrismaService, supabaseService: SupabaseService, errorHandler: ErrorHandlerService);
    create(createMaintenanceDto: CreateMaintenanceDto): Promise<MaintenanceRequest>;
    findAll(query: MaintenanceQuery): Promise<({
        Unit: {
            Property: {
                createdAt: Date;
                updatedAt: Date;
                name: string;
                id: string;
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
            status: import("@prisma/client").$Enums.UnitStatus;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            unitNumber: string;
            propertyId: string;
            bedrooms: number;
            bathrooms: number;
            squareFeet: number | null;
            rent: number;
            lastInspectionDate: Date | null;
        };
    } & {
        priority: import("@prisma/client").$Enums.Priority;
        status: import("@prisma/client").$Enums.RequestStatus;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        description: string;
        unitId: string;
        title: string;
        category: string | null;
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
                createdAt: Date;
                updatedAt: Date;
                name: string;
                id: string;
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
            status: import("@prisma/client").$Enums.UnitStatus;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            unitNumber: string;
            propertyId: string;
            bedrooms: number;
            bathrooms: number;
            squareFeet: number | null;
            rent: number;
            lastInspectionDate: Date | null;
        };
    } & {
        priority: import("@prisma/client").$Enums.Priority;
        status: import("@prisma/client").$Enums.RequestStatus;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        description: string;
        unitId: string;
        title: string;
        category: string | null;
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
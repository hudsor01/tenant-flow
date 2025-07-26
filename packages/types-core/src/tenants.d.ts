export interface Tenant {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    emergencyContact: string | null;
    unitId: string | null;
    leaseId: string | null;
    moveInDate: Date | null;
    moveOutDate: Date | null;
    isActive: boolean;
    notes: string | null;
    documents: string[];
    createdAt: Date;
    updatedAt: Date;
}
export interface TenantWithDetails extends Tenant {
    unit?: {
        id: string;
        unitNumber: string;
        property: {
            id: string;
            name: string;
            address: string;
        };
    };
    lease?: {
        id: string;
        startDate: Date;
        endDate: Date;
        monthlyRent: number;
        status: string;
    };
}
export interface TenantQuery {
    search?: string;
    unitId?: string;
    propertyId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface CreateTenantDTO {
    name: string;
    email: string;
    phone?: string;
    emergencyContact?: string;
    unitId?: string;
    moveInDate?: Date;
    notes?: string;
}
export interface UpdateTenantDTO extends Partial<CreateTenantDTO> {
    moveOutDate?: Date;
    isActive?: boolean;
}
//# sourceMappingURL=tenants.d.ts.map
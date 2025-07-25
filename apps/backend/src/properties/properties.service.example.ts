import { Injectable } from '@nestjs/common'
import { MultiTenantPrismaService } from '../common/prisma/multi-tenant-prisma.service'

// Example DTO interface
interface CreatePropertyDto {
    name: string
    address: string
    city: string
    state: string
    zipCode: string
    description?: string
    imageUrl?: string
}

@Injectable()
export class PropertiesService {
    constructor(
        private multiTenantPrisma: MultiTenantPrismaService
    ) {}
    
    /**
     * Get all properties for a user (respects RLS)
     */
    async getUserProperties(userId: string) {
        // This query will only return properties the user has access to
        return this.multiTenantPrisma.withTenantContext(userId, async (prisma) => {
            return prisma.property.findMany({
                include: {
                    Unit: true
                }
            })
        })
    }
    
    /**
     * Admin operation: Get all properties in system
     */
    async getAllPropertiesAdmin() {
        const adminPrisma = this.multiTenantPrisma.getAdminClient()
        return adminPrisma.property.findMany({
            include: {
                User: true,
                Unit: true
            }
        })
    }
    
    /**
     * Create a new property (respects RLS)
     */
    async createProperty(userId: string, data: CreatePropertyDto) {
        return this.multiTenantPrisma.withTenantContext(userId, async (prisma) => {
            return prisma.property.create({
                data: {
                    ...data,
                    ownerId: userId // Ensure the property is owned by the user
                }
            })
        })
    }
}
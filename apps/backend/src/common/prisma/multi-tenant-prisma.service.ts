import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class MultiTenantPrismaService {
    private adminPrisma: PrismaClient
    
    constructor(private prisma: PrismaService) {
        // Admin connection uses the default PrismaService (with BYPASSRLS)
        this.adminPrisma = this.prisma
    }
    
    /**
     * Get admin Prisma client that bypasses RLS
     * Use for: user sync, billing, cross-tenant operations
     */
    getAdminClient(): PrismaClient {
        return this.adminPrisma
    }
    
    /**
     * Get tenant-scoped Prisma client that respects RLS
     * Use for: all user-facing operations
     */
    async getTenantClient(userId: string): Promise<PrismaClient> {
        // Create a new client for this request
        const tenantPrisma = new PrismaClient({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL
                }
            }
        })
        
        // Use a transaction to set the JWT claims for RLS
        await tenantPrisma.$transaction(async (tx) => {
            // Set the user context for RLS policies
            await tx.$executeRawUnsafe(
                `SET LOCAL request.jwt.claims = '{"sub": "${userId}"}'::jsonb`
            )
        })
        
        return tenantPrisma
    }
    
    /**
     * Execute a query with tenant context
     * Automatically handles setting and clearing the context
     */
    async withTenantContext<T>(
        userId: string,
        callback: (prisma: PrismaClient) => Promise<T>
    ): Promise<T> {
        const tenantPrisma = new PrismaClient({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL
                }
            }
        })
        
        try {
            // Execute the callback within a transaction that sets the context
            const result = await tenantPrisma.$transaction(async (tx) => {
                // Set the user context for RLS policies
                await tx.$executeRawUnsafe(
                    `SET LOCAL request.jwt.claims = '{"sub": "${userId}"}'::jsonb`
                )
                
                // Execute the actual query
                return callback(tx as PrismaClient)
            })
            
            return result
        } finally {
            await tenantPrisma.$disconnect()
        }
    }
}
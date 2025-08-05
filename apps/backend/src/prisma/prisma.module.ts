import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { MultiTenantPrismaService } from '../common/prisma/multi-tenant-prisma.service';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [PrismaService, MultiTenantPrismaService],
    exports: [PrismaService, MultiTenantPrismaService],
})
export class PrismaModule {}
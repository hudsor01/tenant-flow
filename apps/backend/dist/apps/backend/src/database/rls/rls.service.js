"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RLSService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("@nestjs/config");
let RLSService = class RLSService {
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    ensureSupabaseClient() {
        if (!this.supabaseAdmin) {
            const supabaseUrl = this.configService.get('SUPABASE_URL');
            const supabaseServiceKey = this.configService.get('SUPABASE_SERVICE_ROLE_KEY');
            if (!supabaseUrl || !supabaseServiceKey) {
                throw new Error('Supabase configuration missing');
            }
            this.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });
        }
        return this.supabaseAdmin;
    }
    async verifyRLSEnabled() {
        const criticalTables = [
            'Property',
            'Unit',
            'Tenant',
            'Lease',
            'MaintenanceRequest',
            'Document',
            'Expense',
            'Invoice',
            'Subscription'
        ];
        const results = [];
        for (const table of criticalTables) {
            const { data, error } = await this.ensureSupabaseClient()
                .from('pg_tables')
                .select('tablename, rowsecurity')
                .eq('schemaname', 'public')
                .eq('tablename', table)
                .single();
            if (error) {
                results.push({
                    table,
                    enabled: false,
                    policyCount: 0,
                    policyNames: [],
                    lastAudit: new Date()
                });
            }
            else {
                const enabled = Boolean(data?.rowsecurity);
                const policies = enabled ? await this.getTablePolicies(table) : [];
                results.push({
                    table,
                    enabled,
                    policyCount: policies.length,
                    policyNames: policies.map(p => p.policyname),
                    lastAudit: new Date()
                });
            }
        }
        return results;
    }
    async getTablePolicies(tableName) {
        const { data, error } = await this.ensureSupabaseClient()
            .rpc('get_policies_for_table', { table_name: tableName });
        if (error) {
            throw new Error(`Failed to get policies for ${tableName}: ${error.message}`);
        }
        return data || [];
    }
    async testRLSPolicies(userId, _role) {
        const testResults = {
            property: {
                canViewOwn: false,
                cannotViewOthers: false,
                canCreate: false,
                canUpdate: false,
                canDelete: false
            },
            unit: {
                canViewOwn: false,
                cannotViewOthers: false,
                canCreate: false,
                canUpdate: false
            },
            tenant: {
                canViewOwn: false,
                canViewInProperties: false,
                cannotViewUnrelated: false
            },
            lease: {
                canViewOwn: false,
                cannotViewOthers: false
            }
        };
        try {
            const ownProperties = await this.prisma.property.findMany({
                where: { ownerId: userId }
            });
            testResults.property.canViewOwn = ownProperties.length > 0;
        }
        catch {
            testResults.property.canViewOwn = false;
        }
        return testResults;
    }
    async applyRLSPolicies() {
        const errors = [];
        try {
            const { error } = await this.ensureSupabaseClient().rpc('apply_rls_policies');
            if (error) {
                errors.push(`Failed to apply RLS policies: ${error.message}`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(`Error applying RLS policies: ${errorMessage}`);
        }
        return {
            success: errors.length === 0,
            errors
        };
    }
    async generateRLSAuditReport() {
        const tableStatuses = await this.verifyRLSEnabled();
        const policies = {};
        const recommendations = [];
        const criticalIssues = [];
        for (const tableStatus of tableStatuses) {
            if (tableStatus.enabled) {
                try {
                    const tablePolicies = await this.getTablePolicies(tableStatus.table);
                    policies[tableStatus.table] = tablePolicies.map(policy => {
                        const whereClause = policy.qual ? ` WHERE ${policy.qual}` : '';
                        return {
                            name: policy.policyname,
                            tableName: policy.tablename,
                            enabled: policy.permissive === 'PERMISSIVE',
                            description: `${policy.cmd} ON ${policy.tablename} FOR ${policy.roles.join(', ')}${whereClause}`,
                            operations: [policy.cmd],
                            roles: policy.roles
                        };
                    });
                }
                catch {
                    recommendations.push(`Failed to retrieve policies for ${tableStatus.table}`);
                }
            }
            else {
                recommendations.push(`Enable RLS on ${tableStatus.table} table`);
                criticalIssues.push(`RLS not enabled on critical table: ${tableStatus.table}`);
            }
        }
        if (recommendations.length === 0) {
            recommendations.push('All critical tables have RLS enabled');
        }
        const enabledTables = tableStatuses.filter(t => t.enabled).length;
        const securityScore = Math.round((enabledTables / tableStatuses.length) * 100);
        const report = {
            timestamp: new Date().toISOString(),
            tableStatuses,
            policies,
            recommendations,
            securityScore,
            criticalIssues
        };
        return report;
    }
};
exports.RLSService = RLSService;
exports.RLSService = RLSService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], RLSService);

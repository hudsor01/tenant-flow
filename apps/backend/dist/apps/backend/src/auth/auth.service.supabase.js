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
var AuthServiceSupabase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthServiceSupabase = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const SupabaseUserRowSchema = zod_1.z.object({
    id: zod_1.z.string().uuid('Invalid user ID format'),
    email: zod_1.z.string().email('Invalid email format'),
    name: zod_1.z.string().nullable().optional(),
    avatarUrl: zod_1.z.string().url('Invalid avatar URL format').nullable().optional(),
    role: zod_1.z.enum(['OWNER', 'MANAGER', 'TENANT', 'ADMIN']),
    phone: zod_1.z.string().nullable().optional(),
    createdAt: zod_1.z.union([zod_1.z.string().datetime({ offset: true }), zod_1.z.date()]),
    updatedAt: zod_1.z.union([zod_1.z.string().datetime({ offset: true }), zod_1.z.date()]),
    emailVerified: zod_1.z.boolean().optional(),
    bio: zod_1.z.string().nullable().optional(),
    supabaseId: zod_1.z.string().uuid('Invalid Supabase ID format').optional(),
    organizationId: zod_1.z.string().uuid('Invalid organization ID format').nullable().optional()
});
let AuthServiceSupabase = AuthServiceSupabase_1 = class AuthServiceSupabase {
    constructor(supabase) {
        this.supabase = supabase;
        this.logger = new common_1.Logger(AuthServiceSupabase_1.name);
    }
    async syncUserWithDatabaseViaSupabase(supabaseUser) {
        if (!supabaseUser) {
            this.logger.error('syncUserWithDatabase called with undefined supabaseUser');
            throw new Error('Supabase user is required');
        }
        this.logger.debug('syncUserWithDatabase called', {
            hasUser: !!supabaseUser,
            userId: supabaseUser?.id,
            userEmail: supabaseUser?.email
        });
        const { id: supabaseId, email, user_metadata } = supabaseUser;
        if (!email) {
            throw new common_1.UnauthorizedException('User email is required');
        }
        const name = user_metadata?.name || user_metadata?.full_name || '';
        const avatarUrl = user_metadata?.avatar_url || null;
        try {
            const { data: existingUser, error: selectError } = await this.supabase
                .from('User')
                .select('*')
                .eq('id', supabaseId)
                .single();
            const isNewUser = !existingUser || selectError?.code === 'PGRST116';
            if (isNewUser) {
                const { data: newUser, error: insertError } = await this.supabase
                    .from('User')
                    .insert({
                    id: supabaseId,
                    email,
                    name,
                    avatarUrl,
                    role: 'OWNER',
                    supabaseId,
                    createdAt: supabaseUser.created_at || new Date().toISOString(),
                    updatedAt: supabaseUser.updated_at || new Date().toISOString()
                })
                    .select()
                    .single();
                if (insertError) {
                    this.logger.error('Failed to insert user via Supabase', {
                        error: insertError,
                        userId: supabaseId
                    });
                    throw new Error(`Failed to sync user: ${insertError.message}`);
                }
                return this.normalizeSupabaseUser(newUser);
            }
            else {
                const { data: updatedUser, error: updateError } = await this.supabase
                    .from('User')
                    .update({
                    email,
                    name,
                    avatarUrl,
                    updatedAt: new Date().toISOString()
                })
                    .eq('id', supabaseId)
                    .select()
                    .single();
                if (updateError) {
                    this.logger.error('Failed to update user via Supabase', {
                        error: updateError,
                        userId: supabaseId
                    });
                    throw new Error(`Failed to update user: ${updateError.message}`);
                }
                return this.normalizeSupabaseUser(updatedUser);
            }
        }
        catch (error) {
            this.logger.error('Error in syncUserWithDatabaseViaSupabase', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: supabaseId
            });
            throw error;
        }
    }
    normalizeSupabaseUser(supabaseRow) {
        this.logger.debug('Normalizing Supabase user data', {
            hasData: !!supabaseRow,
            dataType: typeof supabaseRow
        });
        try {
            const validatedRow = SupabaseUserRowSchema.parse(supabaseRow);
            return this.convertToValidatedUser(validatedRow);
        }
        catch (error) {
            this.logger.error('Supabase user data validation failed', {
                error: error instanceof zod_1.z.ZodError ? error.issues : error,
                rawData: JSON.stringify(supabaseRow).substring(0, 500)
            });
            throw new Error(`Invalid user data received from database: ${error instanceof zod_1.z.ZodError ? error.issues.map(i => i.message).join(', ') : 'Unknown validation error'}`);
        }
    }
    convertToValidatedUser(validatedRow) {
        const toISOString = (date) => {
            if (typeof date === 'string')
                return date;
            if (date instanceof Date)
                return date.toISOString();
            return new Date().toISOString();
        };
        return {
            id: validatedRow.id,
            email: validatedRow.email,
            name: validatedRow.name || undefined,
            avatarUrl: validatedRow.avatarUrl || undefined,
            role: validatedRow.role,
            phone: validatedRow.phone || null,
            createdAt: toISOString(validatedRow.createdAt),
            updatedAt: toISOString(validatedRow.updatedAt),
            emailVerified: validatedRow.emailVerified ?? true,
            bio: validatedRow.bio || null,
            supabaseId: validatedRow.supabaseId || validatedRow.id,
            stripeCustomerId: null,
            organizationId: validatedRow.organizationId || null
        };
    }
};
exports.AuthServiceSupabase = AuthServiceSupabase;
exports.AuthServiceSupabase = AuthServiceSupabase = AuthServiceSupabase_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Function])
], AuthServiceSupabase);

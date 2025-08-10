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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
const prisma_service_1 = require("../prisma/prisma.service");
const error_handler_service_1 = require("../common/errors/error-handler.service");
const email_service_1 = require("../email/email.service");
const simple_security_service_1 = require("../common/security/simple-security.service");
function normalizePrismaUser(prismaUser) {
    return {
        id: prismaUser.id,
        email: prismaUser.email,
        name: prismaUser.name || undefined,
        avatarUrl: prismaUser.avatarUrl || undefined,
        role: prismaUser.role,
        phone: prismaUser.phone ?? null,
        createdAt: prismaUser.createdAt.toISOString(),
        updatedAt: prismaUser.updatedAt.toISOString(),
        emailVerified: true,
        bio: prismaUser.bio ?? null,
        supabaseId: prismaUser.supabaseId ?? prismaUser.id,
        stripeCustomerId: prismaUser.stripeCustomerId ?? null,
        organizationId: null
    };
}
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, errorHandler, emailService, securityService) {
        this.prisma = prisma;
        this.errorHandler = errorHandler;
        this.emailService = emailService;
        this.securityService = securityService;
        this.logger = new common_1.Logger(AuthService_1.name);
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceKey) {
            throw this.errorHandler.createConfigError('Missing required Supabase configuration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
        }
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
    }
    async validateSupabaseToken(token) {
        if (!token || typeof token !== 'string') {
            throw new common_1.UnauthorizedException('Invalid token format');
        }
        if (token.length < 20 || token.length > 2048) {
            throw new common_1.UnauthorizedException('Token length invalid');
        }
        if (!token.includes('.') || token.split('.').length !== 3) {
            throw new common_1.UnauthorizedException('Malformed token');
        }
        try {
            this.logger.debug('Validating token', { tokenLength: token.length });
            const { data: { user }, error } = await this.supabase.auth.getUser(token);
            this.logger.debug('Supabase validation response', {
                hasUser: !!user,
                hasError: !!error,
                errorType: error?.name,
                userId: user?.id
            });
            if (error || !user) {
                this.logger.warn('Token validation failed', {
                    errorType: error?.name,
                    errorStatus: error?.status,
                    hasUser: !!user
                });
                throw new common_1.UnauthorizedException('Invalid or expired token');
            }
            if (!user.email_confirmed_at) {
                this.logger.warn('Unverified email login attempt', { userId: user.id });
                throw new common_1.UnauthorizedException('Email verification required');
            }
            if (!user.id || !user.email) {
                this.logger.error('Invalid user data from Supabase', {
                    hasId: !!user.id,
                    hasEmail: !!user.email
                });
                throw new common_1.UnauthorizedException('User data integrity error');
            }
            const localUser = await this.syncUserWithDatabase(user);
            return localUser;
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            this.logger.error('Unexpected error in token validation', {
                errorType: error instanceof Error ? error.constructor.name : typeof error,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            });
            throw new common_1.UnauthorizedException('Token validation failed');
        }
    }
    async syncUserWithDatabase(supabaseUser) {
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
        const existingUser = await this.prisma.user.findUnique({
            where: { id: supabaseId }
        });
        const isNewUser = !existingUser;
        const user = await this.prisma.user.upsert({
            where: { id: supabaseId },
            update: {
                email,
                name,
                avatarUrl,
                updatedAt: new Date()
            },
            create: {
                id: supabaseId,
                email,
                name,
                avatarUrl,
                role: 'OWNER',
                supabaseId,
                createdAt: supabaseUser.created_at
                    ? new Date(supabaseUser.created_at)
                    : new Date(),
                updatedAt: supabaseUser.updated_at
                    ? new Date(supabaseUser.updated_at)
                    : new Date()
            }
        });
        if (isNewUser && name) {
            try {
                const emailResult = await this.emailService.sendWelcomeEmail(email, name);
                if (emailResult.success) {
                    this.logger.debug('Welcome email sent to new user', {
                        userId: supabaseId,
                        email,
                        messageId: emailResult.messageId
                    });
                }
                else {
                    this.logger.warn('Failed to send welcome email to new user', {
                        userId: supabaseId,
                        email,
                        error: emailResult.error
                    });
                }
            }
            catch (emailError) {
                this.logger.error('Error sending welcome email to new user', {
                    userId: supabaseId,
                    email,
                    error: emailError instanceof Error ? emailError.message : 'Unknown email error'
                });
            }
        }
        const subscription = await this.prisma.subscription.findFirst({
            where: { userId: supabaseId },
            select: { stripeCustomerId: true }
        });
        return {
            ...normalizePrismaUser(user),
            supabaseId,
            stripeCustomerId: subscription?.stripeCustomerId || null
        };
    }
    async getUserBySupabaseId(supabaseId) {
        const user = await this.prisma.user.findUnique({
            where: { id: supabaseId }
        });
        return user ? normalizePrismaUser(user) : null;
    }
    async updateUserProfile(supabaseId, updates) {
        const user = await this.prisma.user.update({
            where: { id: supabaseId },
            data: {
                ...updates,
                updatedAt: new Date()
            }
        });
        return { user: normalizePrismaUser(user) };
    }
    async validateTokenAndGetUser(token) {
        return this.validateSupabaseToken(token);
    }
    async getUserByEmail(email) {
        const user = await this.prisma.user.findUnique({
            where: { email }
        });
        return user ? normalizePrismaUser(user) : null;
    }
    async userHasRole(supabaseId, role) {
        const user = await this.getUserBySupabaseId(supabaseId);
        return user?.role === role;
    }
    async getUserStats() {
        const [total, owners, managers, tenants] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.user.count({ where: { role: 'OWNER' } }),
            this.prisma.user.count({ where: { role: 'MANAGER' } }),
            this.prisma.user.count({ where: { role: 'TENANT' } })
        ]);
        return {
            total,
            byRole: {
                owners,
                managers,
                tenants
            }
        };
    }
    async createUser(userData) {
        try {
            if (!userData.email || !userData.name) {
                throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.BAD_REQUEST, 'Email and name are required', { operation: 'createUser', resource: 'auth' });
            }
            if (userData.password) {
                const passwordValidation = this.securityService.validatePassword(userData.password);
                if (!passwordValidation.valid) {
                    throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.BAD_REQUEST, 'Password does not meet security requirements', {
                        operation: 'createUser',
                        resource: 'auth',
                        metadata: {
                            errors: passwordValidation.errors
                        }
                    });
                }
                this.logger.debug('Password validation passed', {
                    email: userData.email,
                    valid: passwordValidation.valid
                });
            }
            this.logger.debug('Creating Supabase user', {
                email: userData.email,
                hasPassword: !!userData.password
            });
            const { data, error } = await this.supabase.auth.admin.createUser({
                email: userData.email,
                password: userData.password || undefined,
                email_confirm: false,
                user_metadata: {
                    name: userData.name,
                    full_name: userData.name
                }
            });
            if (error) {
                this.logger.error('Failed to create Supabase user', {
                    error: {
                        message: error.message,
                        status: error.status,
                        name: error.name
                    },
                    email: userData.email
                });
                if (error.message?.includes('already registered')) {
                    throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.CONFLICT, 'User with this email already exists', { operation: 'createUser', resource: 'auth', metadata: { email: userData.email } });
                }
                if (error.message?.includes('invalid email')) {
                    throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.BAD_REQUEST, 'Invalid email format', { operation: 'createUser', resource: 'auth', metadata: { email: userData.email } });
                }
                throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.INTERNAL_SERVER_ERROR, error.message || 'Failed to create user account', {
                    operation: 'createUser',
                    resource: 'auth',
                    metadata: {
                        errorMessage: error.message,
                        errorCode: error.code || 'UNKNOWN'
                    }
                });
            }
            if (!data) {
                this.logger.error('Supabase returned null data', {
                    email: userData.email,
                    hasError: !!error
                });
                throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create user account - no response data', { operation: 'createUser', resource: 'auth' });
            }
            if (!data.user) {
                this.logger.error('Supabase returned no user data', {
                    hasData: true,
                    dataKeys: Object.keys(data),
                    userData: JSON.stringify(data, null, 2).substring(0, 500),
                    email: userData.email
                });
                throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create user account - no user data returned', {
                    operation: 'createUser',
                    resource: 'auth',
                    metadata: {
                        hasData: true,
                        dataKeys: Object.keys(data).join(',')
                    }
                });
            }
            if (!data.user.id || !data.user.email) {
                this.logger.error('Supabase returned incomplete user data', {
                    hasId: !!data.user.id,
                    hasEmail: !!data.user.email,
                    userKeys: Object.keys(data.user),
                    email: userData.email
                });
                throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.INTERNAL_SERVER_ERROR, 'Failed to create user account - incomplete user data', {
                    operation: 'createUser',
                    resource: 'auth',
                    metadata: {
                        userId: data.user.id || 'unknown',
                        userEmail: data.user.email || 'unknown',
                        hasId: !!data.user.id,
                        hasEmail: !!data.user.email
                    }
                });
            }
            this.logger.debug('Successfully created Supabase user', {
                userId: data.user.id,
                userEmail: data.user.email,
                hasMetadata: !!data.user.user_metadata
            });
            try {
                await this.syncUserWithDatabase(data.user);
                this.logger.debug('Successfully synced user with local database', {
                    userId: data.user.id
                });
            }
            catch (syncError) {
                this.logger.error('Failed to sync user with local database', {
                    userId: data.user.id,
                    email: data.user.email,
                    error: syncError instanceof Error ? syncError.message : 'Unknown sync error'
                });
            }
            const response = {
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    name: userData.name
                },
                access_token: 'temp_token_email_confirmation_required',
                refresh_token: 'temp_refresh_token_email_confirmation_required'
            };
            try {
                const emailResult = await this.emailService.sendWelcomeEmail(data.user.email, userData.name);
                if (emailResult.success) {
                    this.logger.debug('Welcome email sent successfully', {
                        userId: data.user.id,
                        email: data.user.email,
                        messageId: emailResult.messageId
                    });
                }
                else {
                    this.logger.warn('Failed to send welcome email', {
                        userId: data.user.id,
                        email: data.user.email,
                        error: emailResult.error
                    });
                }
            }
            catch (emailError) {
                this.logger.error('Error sending welcome email', {
                    userId: data.user.id,
                    email: data.user.email,
                    error: emailError instanceof Error ? emailError.message : 'Unknown email error'
                });
            }
            this.logger.debug('createUser completed successfully', {
                userId: response.user.id,
                email: response.user.email
            });
            return response;
        }
        catch (error) {
            if (error instanceof Error && error.name?.includes('BusinessError')) {
                throw error;
            }
            this.logger.error('Unexpected error in createUser', {
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    name: error instanceof Error ? error.name : 'Unknown',
                    stack: error instanceof Error ? error.stack : undefined
                },
                email: userData.email
            });
            throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.INTERNAL_SERVER_ERROR, 'An unexpected error occurred while creating user account', {
                operation: 'createUser',
                resource: 'auth',
                metadata: {
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    errorType: error instanceof Error ? error.constructor.name : typeof error
                }
            });
        }
    }
    async deleteUser(supabaseId) {
        await this.prisma.user.delete({
            where: { id: supabaseId }
        });
    }
    async refreshToken(refreshToken) {
        try {
            this.logger.debug('Attempting to refresh token');
            const { data, error } = await this.supabase.auth.refreshSession({
                refresh_token: refreshToken
            });
            if (error || !data.session) {
                this.logger.error('Failed to refresh token:', {
                    error: error?.message,
                    hasSession: !!data?.session
                });
                throw new common_1.UnauthorizedException('Invalid or expired refresh token');
            }
            if (!data.user) {
                throw new common_1.UnauthorizedException('No user data returned from refresh');
            }
            const user = await this.syncUserWithDatabase(data.user);
            this.logger.debug('Token refreshed successfully', {
                userId: user.id,
                expiresIn: data.session.expires_in
            });
            return {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_in: data.session.expires_in || 3600,
                user
            };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            this.logger.error('Unexpected error during token refresh:', error);
            throw new common_1.UnauthorizedException('Failed to refresh token');
        }
    }
    async login(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error || !data.session) {
                this.logger.error('Login failed:', {
                    error: error?.message,
                    email
                });
                throw new common_1.UnauthorizedException('Invalid email or password');
            }
            if (!data.user) {
                throw new common_1.UnauthorizedException('No user data returned from login');
            }
            const user = await this.syncUserWithDatabase(data.user);
            return {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_in: data.session.expires_in || 3600,
                user
            };
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            this.logger.error('Unexpected error during login:', error);
            throw new common_1.UnauthorizedException('Login failed');
        }
    }
    async logout(token) {
        try {
            const { error } = await this.supabase.auth.admin.signOut(token);
            if (error) {
                this.logger.error('Logout failed:', error);
            }
            this.logger.debug('User logged out successfully');
        }
        catch (error) {
            this.logger.error('Unexpected error during logout:', error);
        }
    }
    async testSupabaseConnection() {
        try {
            const { data, error } = await this.supabase.auth.getSession();
            if (error) {
                this.logger.error('Supabase connection test failed:', error);
                throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.SERVICE_UNAVAILABLE, 'Authentication service connection failed', { operation: 'testConnection', resource: 'auth', metadata: { error: error.message } });
            }
            return {
                connected: true,
                auth: {
                    session: data.session ? 'exists' : 'none',
                    url: process.env.SUPABASE_URL?.substring(0, 30) + '...'
                }
            };
        }
        catch (error) {
            this.logger.error('Supabase connection test error:', error);
            throw error;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        error_handler_service_1.ErrorHandlerService,
        email_service_1.EmailService,
        simple_security_service_1.SimpleSecurityService])
], AuthService);

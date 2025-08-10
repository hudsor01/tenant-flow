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
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = UsersService_1 = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(UsersService_1.name);
    }
    async getUserById(id) {
        return await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                bio: true,
                avatarUrl: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                stripeCustomerId: true
            }
        });
    }
    async updateUser(id, data) {
        return await this.prisma.user.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });
    }
    async updateUserProfile(id, data) {
        return await this.prisma.user.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date()
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                bio: true,
                avatarUrl: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                stripeCustomerId: true
            }
        });
    }
    async checkUserExists(userId) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true }
            });
            return !!user;
        }
        catch (error) {
            this.logger.warn('Failed to check user existence', { userId, error: error instanceof Error ? error.message : String(error) });
            return false;
        }
    }
    async ensureUserExists(authUser, options = {}) {
        const { role = 'OWNER', name, maxRetries = 3, retryDelayMs = 1000 } = options;
        try {
            const existingUser = await this.checkUserExists(authUser.id);
            if (existingUser) {
                return {
                    success: true,
                    userId: authUser.id,
                    action: 'already_exists'
                };
            }
            let lastError = {};
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const result = await this.createUser(authUser, {
                        role,
                        name: name ||
                            authUser.user_metadata?.name ||
                            authUser.user_metadata?.full_name
                    });
                    if (result.success) {
                        return result;
                    }
                    else {
                        lastError = result.error || 'Unknown error';
                        this.logger.warn(`User creation failed (attempt ${attempt}/${maxRetries})`, { error: result.error });
                    }
                }
                catch (err) {
                    lastError = String(err);
                    this.logger.warn(`User creation attempt failed (${attempt}/${maxRetries})`, { error: err });
                    if (this.isNonRetryableError(err)) {
                        break;
                    }
                }
                if (attempt < maxRetries) {
                    const delay = retryDelayMs * Math.pow(2, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            return {
                success: false,
                error: `Failed to create user after ${maxRetries} attempts`,
                details: { message: String(lastError) }
            };
        }
        catch (error) {
            return {
                success: false,
                error: 'Unexpected error during user creation',
                details: { message: String(error) }
            };
        }
    }
    async createUser(authUser, options) {
        try {
            const user = await this.prisma.user.upsert({
                where: { id: authUser.id },
                update: {
                    name: options.name,
                    updatedAt: new Date()
                },
                create: {
                    id: authUser.id,
                    supabaseId: authUser.id,
                    email: authUser.email,
                    name: options.name || null,
                    role: options.role,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
            return {
                success: true,
                userId: user.id,
                action: 'created',
                details: {
                    userId: user.id,
                    email: user.email,
                    name: user.name
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: 'Failed to create user record',
                details: { message: String(error) }
            };
        }
    }
    isNonRetryableError(error) {
        if (!error)
            return false;
        const errorObject = error;
        const message = errorObject?.message?.toLowerCase() || '';
        return (message.includes('unique constraint') ||
            message.includes('invalid input') ||
            message.includes('permission denied') ||
            message.includes('already exists') ||
            errorObject?.code === '23505');
    }
    async verifyUserCreation(userId) {
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            const userExists = await this.checkUserExists(userId);
            return userExists;
        }
        catch (error) {
            this.logger.warn('Failed to verify user creation', { userId, error: error instanceof Error ? error.message : String(error) });
            return false;
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);

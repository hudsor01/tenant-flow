import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '@prisma/client';

export interface SupabaseUser {
  id: string;
  email?: string; // Supabase User.email can be undefined in some cases
  email_confirmed_at?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    avatar_url?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ValidatedUser extends User {
  supabaseId: string;
}

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {
    // Initialize Supabase client for server-side operations
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase configuration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Validate Supabase JWT token and return user information
   */
  async validateSupabaseToken(token: string): Promise<ValidatedUser> {
    try {
      // Verify the JWT token with Supabase
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Ensure user email is verified
      if (!user.email_confirmed_at) {
        throw new UnauthorizedException('Email not verified');
      }

      // Sync user data with local Prisma database
      const localUser = await this.syncUserWithDatabase(user);

      return {
        ...localUser,
        supabaseId: user.id,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token validation failed');
    }
  }

  /**
   * Sync Supabase user with local Prisma database
   */
  private async syncUserWithDatabase(supabaseUser: SupabaseUser): Promise<User> {
    const { id: supabaseId, email, user_metadata } = supabaseUser;

    // Ensure email exists (required by Prisma User model)
    if (!email) {
      throw new UnauthorizedException('User email is required');
    }

    // Extract name from metadata (Supabase stores it in different places)
    const name = user_metadata?.name || user_metadata?.full_name || null;
    const avatarUrl = user_metadata?.avatar_url || null;

    // Use upsert to create or update user
    const user = await this.prisma.user.upsert({
      where: { id: supabaseId },
      update: {
        email,
        name,
        avatarUrl,
        updatedAt: new Date(),
      },
      create: {
        id: supabaseId, // Use Supabase ID as primary key
        email,
        name,
        avatarUrl,
        role: 'OWNER', // Default role for new users
        createdAt: supabaseUser.created_at ? new Date(supabaseUser.created_at) : new Date(),
        updatedAt: supabaseUser.updated_at ? new Date(supabaseUser.updated_at) : new Date(),
      },
    });

    return user;
  }

  /**
   * Get user by Supabase ID
   */
  async getUserBySupabaseId(supabaseId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: supabaseId },
    });
  }

  /**
   * Update user profile in local database
   */
  async updateUserProfile(
    supabaseId: string,
    updates: {
      name?: string;
      phone?: string;
      bio?: string;
      avatarUrl?: string;
    },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: supabaseId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete user and all associated data
   */
  async deleteUser(supabaseId: string): Promise<void> {
    // Delete user from local database (cascade will handle related data)
    await this.prisma.user.delete({
      where: { id: supabaseId },
    });

    // Note: Supabase user deletion should be handled by the frontend
    // or through Supabase admin API if needed
  }

  /**
   * Admin function to get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Check if user has specific role
   */
  async userHasRole(supabaseId: string, role: string): Promise<boolean> {
    const user = await this.getUserBySupabaseId(supabaseId);
    return user?.role === role;
  }

  /**
   * Get user statistics for admin purposes
   */
  async getUserStats() {
    const [total, owners, managers, tenants] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'OWNER' } }),
      this.prisma.user.count({ where: { role: 'MANAGER' } }),
      this.prisma.user.count({ where: { role: 'TENANT' } }),
    ]);

    return {
      total,
      byRole: {
        owners,
        managers,
        tenants,
      },
    };
  }
}
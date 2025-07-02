import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import { RequestWithUser } from './auth.types';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

// DTOs for request validation
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  avatarUrl?: string;
}

export class SyncUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Get current user profile
   * This replaces the need for separate /users/me endpoint
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req: RequestWithUser) {
    try {
      const user = await this.authService.getUserBySupabaseId(req.user.id);
      
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Return user data without sensitive information
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch user profile',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update user profile
   */
  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      const updatedUser = await this.authService.updateUserProfile(
        req.user.id,
        updateProfileDto,
      );

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        bio: updatedUser.bio,
        avatarUrl: updatedUser.avatarUrl,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to update profile',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Sync user data from Supabase (useful for webhooks or manual sync)
   */
  @Post('sync-user')
  @UseGuards(JwtAuthGuard)
  async syncUser(
    @Body() syncUserDto: SyncUserDto,
    @Request() req: RequestWithUser,
  ) {
    try {
      // Only allow users to sync their own data
      if (syncUserDto.email !== req.user.email) {
        throw new HttpException(
          'Cannot sync data for different user',
          HttpStatus.FORBIDDEN,
        );
      }

      const supabaseUser = {
        id: req.user.id,
        email: syncUserDto.email,
        email_confirmed_at: new Date().toISOString(), // Assume verified if they have valid token
        user_metadata: {
          name: syncUserDto.name,
          avatar_url: syncUserDto.avatarUrl,
        },
        created_at: req.user.createdAt?.toISOString() || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const syncedUser = await this.authService['syncUserWithDatabase'](supabaseUser);

      return {
        id: syncedUser.id,
        email: syncedUser.email,
        name: syncedUser.name,
        phone: syncedUser.phone,
        bio: syncedUser.bio,
        avatarUrl: syncedUser.avatarUrl,
        role: syncedUser.role,
        createdAt: syncedUser.createdAt,
        updatedAt: syncedUser.updatedAt,
      };
    } catch (error) {
      throw new HttpException(
        'Failed to sync user data',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Health check endpoint for authentication system
   */
  @Get('health')
  async healthCheck() {
    return {
      status: 'ok',
      service: 'auth',
      timestamp: new Date().toISOString(),
      features: {
        supabaseIntegration: true,
        profileManagement: true,
        roleBasedAccess: true,
      },
    };
  }

  /**
   * Get user statistics (admin only)
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getUserStats(@Request() req: RequestWithUser) {
    try {
      // Check if user is admin (you might want to create a separate AdminGuard)
      const user = await this.authService.getUserBySupabaseId(req.user.id);
      if (!user || user.role !== 'ADMIN') {
        throw new HttpException(
          'Insufficient permissions',
          HttpStatus.FORBIDDEN,
        );
      }

      return await this.authService.getUserStats();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch user statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
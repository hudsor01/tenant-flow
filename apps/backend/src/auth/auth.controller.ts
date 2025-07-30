import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common'
import { UsersService } from '../users/users.service'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { ErrorHandlingInterceptor } from '../common/interceptors/error-handling.interceptor'
import { CurrentUser } from './decorators/current-user.decorator'
import { ValidatedUser } from './auth.service'

@Controller('auth')
@UseInterceptors(ErrorHandlingInterceptor)
export class AuthController {
    constructor(
        private readonly usersService: UsersService
    ) { }

    // Note: All auth operations are handled by Supabase directly
    // Auth endpoints are now implemented as standard NestJS routes
    // Profile updates available at: PUT /api/v1/users/profile
    
    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getCurrentUser(@CurrentUser() user: ValidatedUser) {
        const userProfile = await this.usersService.getUserById(user.id)
        if (!userProfile) {
            throw new Error('User not found')
        }
        return userProfile
    }
    
    // DEBUG ENDPOINTS REMOVED FOR SECURITY
    // These endpoints exposed sensitive system information and have been removed.
    // For production diagnostics, use proper monitoring tools and secure admin interfaces.
}

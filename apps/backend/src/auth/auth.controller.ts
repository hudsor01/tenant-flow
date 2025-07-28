import { Controller, Get, Logger } from '@nestjs/common'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name)
    
    constructor(
        private readonly authService: AuthService
    ) { }

    // Note: All auth operations are handled by Supabase directly
    // Auth endpoints implemented in Hono routes (/api/hono/auth/*)
    // Profile updates available at: PUT /api/hono/auth/profile
    
    @Get('debug-connection')
    async debugConnection() {
        try {
            const testResult = await this.authService.testSupabaseConnection()
            return { success: true, result: testResult }
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error',
                details: error
            }
        }
    }

    @Get('stats')
    async getUserStats() {
        return await this.authService.getUserStats()
    }
}

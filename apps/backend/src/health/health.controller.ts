import { Controller, Get } from '@nestjs/common'
import { Public } from '../auth/decorators/public.decorator'

@Controller()
export class HealthController {
  private startTime = Date.now()

  @Get('health')
  @Public()
  getHealth() {
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString()
    }
  }

  @Get('/')
  @Public()
  getRoot() {
    return {
      status: 'ok',
      service: 'tenantflow-backend',
      version: '1.0.0'
    }
  }
}
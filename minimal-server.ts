import { NestFactory } from '@nestjs/core'
import { Module, Controller, Get } from '@nestjs/common'
import { FastifyAdapter } from '@nestjs/platform-fastify'

@Controller()
class HealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'TenantFlow Backend',
      version: '1.0.0'
    }
  }

  @Get('api/v1/health') 
  apiHealth() {
    return this.health()
  }

  @Get()
  root() {
    return {
      message: 'TenantFlow Backend API',
      status: 'running',
      docs: '/api/docs'
    }
  }
}

@Module({
  controllers: [HealthController]
})
class MinimalAppModule {}

async function bootstrap() {
  console.log('🚀 Starting TenantFlow Backend...')
  
  const app = await NestFactory.create(
    MinimalAppModule,
    new FastifyAdapter({ logger: false })
  )
  
  app.enableCors({
    origin: ['https://tenantflow.app', 'https://www.tenantflow.app'],
    credentials: true
  })
  
  const port = process.env.PORT || 4600
  await app.listen(port, '0.0.0.0')
  
  console.log(`✅ TenantFlow Backend running on port ${port}`)
  console.log(`💚 Health endpoint: http://localhost:${port}/health`)
}

bootstrap().catch(console.error)
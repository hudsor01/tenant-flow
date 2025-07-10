import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import { join } from 'path'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import type { Request, Response } from 'express'

let app: NestExpressApplication

async function createApp() {
  if (!app) {
    app = await NestFactory.create<NestExpressApplication>(AppModule)
    const configService = app.get(ConfigService)
    const logger = new Logger('Serverless')

    // Serve static files for uploads
    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
      prefix: '/uploads/'
    })

    // Security middleware - relaxed for Vercel
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:']
          }
        },
        crossOriginEmbedderPolicy: false
      })
    )

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true
        }
      })
    )

    // CORS configuration for Vercel
    const corsOrigins = configService
      .get<string>('CORS_ORIGINS')
      ?.split(',') || [
      'https://tenantflow.app',
      'https://www.tenantflow.app',
      'https://api.tenantflow.app'
    ]

    app.enableCors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control'
      ]
    })

    // Global prefix for API routes
    app.setGlobalPrefix('api/v1')

    // Initialize the app
    await app.init()

    logger.log('🚀 TenantFlow API initialized for serverless deployment')
  }

  return app
}

// Export handler for Vercel
export default async function handler(req: Request, res: Response) {
  const app = await createApp()
  const expressApp = app.getHttpAdapter().getInstance()
  
  // Handle the request with Express
  return new Promise((resolve, reject) => {
    expressApp(req, res, (err: unknown) => {
      if (err) {
        reject(err)
      } else {
        resolve(undefined)
      }
    })
  })
}

// For module.exports compatibility
module.exports = handler
module.exports.default = handler
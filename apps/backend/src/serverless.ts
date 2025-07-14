import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import { join } from 'path'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { AppModule } from './app.module'
import type { FastifyRequest, FastifyReply } from 'fastify'

let app: NestFastifyApplication

async function createApp() {
  if (!app) {
    const fastifyAdapter = new FastifyAdapter({
      bodyLimit: 10485760, // 10MB limit for file uploads
      logger: false, // Use NestJS logger instead
    })

    app = await NestFactory.create<NestFastifyApplication>(AppModule, fastifyAdapter)
    const configService = app.get(ConfigService)
    const logger = new Logger('Serverless')

    // Register Fastify multipart plugin for file uploads
    await app.register(require('@fastify/multipart'), {
      limits: {
        fieldNameSize: 100, // Max field name size in bytes
        fieldSize: 100,     // Max field value size in bytes
        fields: 10,         // Max number of non-file fields
        fileSize: 10485760, // 10MB max file size
        files: 1,           // Max number of file fields
        headerPairs: 2000   // Max number of header key=>value pairs
      }
    })

    // Register content type parsers for JSON and raw body support (Stripe webhooks)
    await app.register(async function (fastify: any) {
      // Special handling for Stripe webhooks - preserve raw body
      fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req: any, body: any, done: any) {
        if (req.url === '/api/v1/stripe/webhook') {
          // Attach raw body for Stripe signature verification
          req.rawBody = body
          done(null, body)
        } else {
          try {
            const json = JSON.parse(body.toString())
            done(null, json)
          } catch (err) {
            done(err instanceof Error ? err : new Error('Invalid JSON'), undefined)
          }
        }
      })
    })

    // Static file serving for uploads
    await app.register(require('@fastify/static'), {
      root: join(__dirname, '..', 'uploads'),
      prefix: '/uploads/'
    })

    // Security middleware for Fastify
    await app.register(require('@fastify/helmet'), {
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

// Export handler for Vercel with Fastify
export default async function handler(req: any, res: any) {
  const app = await createApp()
  
  // Handle the request with Fastify
  const fastifyInstance = app.getHttpAdapter().getInstance()
  fastifyInstance.server.emit('request', req, res)
}

// For module.exports compatibility
module.exports = handler
module.exports.default = handler

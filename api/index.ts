import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { type NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify'
import type { VercelRequest, VercelResponse } from '@vercel/node'

// Vercel serverless function handler
let app: NestFastifyApplication | null = null

async function createApp(): Promise<NestFastifyApplication> {
  if (app) {
    return app
  }

  const logger = new Logger('VercelServerless')
  
  // Minimal Fastify configuration for Vercel - NO PLUGINS
  const fastifyOptions = {
    logger: false,
    trustProxy: true,
    requestTimeout: 9000, // Under Vercel's 10s timeout
    bodyLimit: 10 * 1024 * 1024, // 10MB limit
  }

  try {
    // Dynamically import AppModule to support ESM
    // @ts-ignore
    const { AppModule } = await import('../../apps/backend/src/app.module.js')
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(fastifyOptions),
      {
        logger: ['error', 'warn'],
        bodyParser: true, // Enable built-in body parser
      }
    )

    // Minimal validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false, // Relaxed for serverless
      })
    )

    // Simple CORS for Vercel
    const corsOrigins = [
      'https://tenantflow.app',
      'https://www.tenantflow.app',
    ]
    
    if (process.env.VERCEL_URL) {
      corsOrigins.push(`https://${process.env.VERCEL_URL}`)
    }
    
    app.enableCors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    })

    // Set global prefix to match routing
    app.setGlobalPrefix('api/v1', {
      exclude: ['/health', '/ping']
    })

    await app.init()
    
    // Register Fastify hooks for serverless consistency
    const { FastifyHooksService } = await import('../../apps/backend/src/common/hooks/fastify-hooks.service.js')
    const fastifyHooksService = app.get(FastifyHooksService)
    const fastifyInstance = app.getHttpAdapter().getInstance()
    fastifyHooksService.registerHooks(fastifyInstance)
    
    logger.log('✅ NestJS app initialized for Vercel with Fastify hooks')
    
    return app
  } catch (error) {
    logger.error('❌ Failed to create NestJS app:', error)
    throw error
  }
}

// Vercel serverless function handler with proper Fastify integration
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await createApp()
    const fastifyAdapter = app.getHttpAdapter()
    const fastifyInstance = fastifyAdapter.getInstance()
    
    // Ensure Fastify is ready
    await fastifyInstance.ready()
    
    // Convert Vercel request/response to Fastify format
    const fastifyRequest = {
      method: req.method || 'GET',
      url: req.url || '/',
      headers: req.headers,
      body: req.body,
      raw: req,
    }
    
    const fastifyReply = {
      raw: res,
      send: (payload: any) => {
        if (!res.headersSent) {
          if (typeof payload === 'object') {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(payload))
          } else {
            res.end(payload)
          }
        }
      },
      code: (statusCode: number) => {
        if (!res.headersSent) {
          res.statusCode = statusCode
        }
        return fastifyReply
      },
      header: (key: string, value: string) => {
        if (!res.headersSent) {
          res.setHeader(key, value)
        }
        return fastifyReply
      },
      headers: (headers: Record<string, string>) => {
        if (!res.headersSent) {
          Object.entries(headers).forEach(([key, value]) => {
            res.setHeader(key, value)
          })
        }
        return fastifyReply
      }
    }
    
    // Process request through NestJS/Fastify
    await fastifyInstance.routing(fastifyRequest as any, fastifyReply as any)
    
  } catch (error) {
    console.error('Serverless function error:', error)
    
    // Ensure we can send a response
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        path: req.url
      })
    }
  }
}

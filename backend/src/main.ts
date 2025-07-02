import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration for production
  const corsOrigins = configService.get<string>('CORS_ORIGINS')?.split(',') || [
    'https://tenantflow.app',
    'https://www.tenantflow.app',
    'https://api.tenantflow.app',
  ];

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
      'Cache-Control',
    ],
  });

  // Global prefix for API routes
  app.setGlobalPrefix('api/v1');

  const port = configService.get<number>('PORT') || 3001;
  
  await app.listen(port);
  
  logger.log(`🚀 TenantFlow API Server running on http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/v1`);
  logger.log(`🔐 Authentication: Supabase Hybrid Mode`);
  logger.log(`🌍 Environment: ${configService.get<string>('NODE_ENV') || 'development'}`);
  logger.log(`🔗 CORS Origins: ${corsOrigins.join(', ')}`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

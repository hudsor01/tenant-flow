import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'

export async function setupSwagger(app: NestFastifyApplication): Promise<void> {
	const config = new DocumentBuilder()
		.setTitle('TenantFlow API')
		.setDescription('API documentation')
		.setVersion('1.0')
		.addBearerAuth()
		.build()
	
	const document = SwaggerModule.createDocument(app, config)
	SwaggerModule.setup('docs', app, document)
}
import type { FastifyAdapter } from '@nestjs/platform-fastify'

export interface EnvironmentConfig {
	NODE_ENV: string
	PORT: number
	DATABASE_URL?: string
}

export function validateEnvironment(): EnvironmentConfig {
	return {
		NODE_ENV: process.env.NODE_ENV ?? 'development',
		PORT: parseInt(process.env.PORT ?? '3001', 10),
		DATABASE_URL: process.env.DATABASE_URL
	}
}

export async function initializeTypeProviders(
	_app: FastifyAdapter
): Promise<void> {
	// Minimal type provider setup
	// This can be expanded later with proper schema validation
	return Promise.resolve()
}

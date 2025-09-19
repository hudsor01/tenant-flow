import { FastifyInstance } from 'fastify'

declare module 'fastify' {
	interface FastifyInstance {
		// Additional Fastify instance extensions can be added here
	}
}

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			NODE_ENV: 'development' | 'production' | 'test'
			PORT?: string
			DATABASE_URL: string
			JWT_SECRET: string
			STRIPE_SECRET_KEY: string
			RESEND_API_KEY: string
		}
	}
}

export {}
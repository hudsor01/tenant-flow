/**
 * Compile-time configuration constants.
 * Contains validation enums and type definitions for environment configuration.
 * Default values are now inlined in config.schema.ts for single source of truth.
 */

export const NODE_ENVIRONMENTS = [
	'development',
	'production',
	'test'
] as const

export const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const

export const STORAGE_PROVIDERS = ['local', 'supabase', 's3'] as const

export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number]
export type LogLevel = (typeof LOG_LEVELS)[number]
export type StorageProvider = (typeof STORAGE_PROVIDERS)[number]

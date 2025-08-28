// Native solutions that replaced 2000+ lines of custom code
export * from './context/request-context'
export * from './middleware/context.middleware'
export * from './interceptors/performance.interceptor'

// Services removed - using native NestJS/Fastify features directly
export * from './decorators'
export * from './guards'
export * from './filters'
export * from './exceptions'

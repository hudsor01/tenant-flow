// Purpose: Augment NestFastifyApplication to include a 'redis' property for type-safe DI/session/caching.
// Assumptions: Only backend uses this augmentation. No runtime side effects.

import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import type Redis from 'ioredis'

declare module '@nestjs/platform-fastify' {
    interface NestFastifyApplication {
        redis?: Redis
    }
}
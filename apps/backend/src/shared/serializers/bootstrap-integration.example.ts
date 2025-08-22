/**
 * Bootstrap Integration Example for Custom Serializers
 * 
 * This file shows how to integrate custom serializers into main.ts
 * Choose between global registration or route-specific application
 */

import type { FastifyInstance } from 'fastify'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import {
  type CurrencySerializerOptions,
  type DateSerializerOptions,
  registerCurrencySerializerForRoute,
  registerDateSerializerForRoute
} from './index'

/**
 * Option 1: Global serializer registration in main.ts bootstrap()
 * 
 * Add this to main.ts after creating the NestJS application:
 * 
 * ```typescript
 * // In main.ts bootstrap function, after app creation
 * const app = await NestFactory.create<NestFastifyApplication>(
 *   AppModule,
 *   new FastifyAdapter({ trustProxy: true, bodyLimit: 10485760 })
 * )
 * 
 * // Register global serializers
 * registerGlobalSerializers(app)
 * ```
 */
export function registerGlobalSerializers(app: NestFastifyApplication): void {
  const fastifyInstance = app.getHttpAdapter().getInstance()
  
  // Register date serializer globally with conservative settings
  registerGlobalDateSerializer(fastifyInstance, {
    useUTC: true,
    includeMilliseconds: false  // Cleaner API responses
  })
  
  // Register currency serializer globally for financial endpoints
  registerGlobalCurrencySerializer(fastifyInstance, {
    defaultCurrency: 'USD',
    convertCentsToDisplay: true,  // Stripe integration
    decimalPlaces: 2,
    includeCurrencySymbol: false  // Let frontend handle symbols
  })
  
  console.log('✅ Global serializers registered successfully')
}

/**
 * Global date serializer registration
 */
function registerGlobalDateSerializer(
  fastify: FastifyInstance, 
  options: DateSerializerOptions
) {
  // Hook into Fastify's reply serialization
  fastify.addHook('onSend', async (request, reply, payload) => {
    // Only process JSON responses
    if (reply.getHeader('content-type')?.toString().includes('application/json')) {
      try {
        const data = JSON.parse(payload as string)
        const serializedData = JSON.stringify(data, (key, value) => {
          if (value instanceof Date) {
            return options.includeMilliseconds ? value.toISOString() : value.toISOString().replace(/\.\d{3}Z$/, 'Z')
          }
          return value
        })
        return serializedData
      } catch {
        // If parsing fails, return original payload
        return payload
      }
    }
    return payload
  })
}

/**
 * Global currency serializer registration
 */
function registerGlobalCurrencySerializer(
  fastify: FastifyInstance,
  options: CurrencySerializerOptions
) {
  const { convertCentsToDisplay = true, decimalPlaces = 2 } = options
  
  fastify.addHook('onSend', async (request, reply, payload) => {
    if (reply.getHeader('content-type')?.toString().includes('application/json')) {
      try {
        const data = JSON.parse(payload as string)
        const serializedData = JSON.stringify(data, (key, value) => {
          // Apply currency formatting to relevant fields
          if (typeof value === 'number' && isCurrencyField(key)) {
            let amount = value
            if (convertCentsToDisplay && amount >= 100) {
              amount = amount / 100
            }
            return Number(amount.toFixed(decimalPlaces))
          }
          return value
        })
        return serializedData
      } catch {
        return payload
      }
    }
    return payload
  })
}

/**
 * Determine if a field name indicates currency data
 */
function isCurrencyField(fieldName: string): boolean {
  const currencyFields = [
    'amount', 'price', 'rent', 'cost', 'revenue', 'total', 
    'monthlyRent', 'securityDeposit', 'totalRevenue',
    'amountPaid', 'amountDue', 'totalMonthlyRent'
  ]
  
  return currencyFields.some(field => 
    fieldName.toLowerCase().includes(field.toLowerCase())
  )
}

/**
 * Option 2: Route-specific serializer registration
 * 
 * Use this approach for more granular control.
 * Add this to specific controllers or modules:
 * 
 * ```typescript
 * // In a controller or service
 * @Controller('billing')
 * export class BillingController {
 *   constructor(private fastify: FastifyInstance) {
 *     // Apply currency serializer only to this controller's routes
 *     registerCurrencySerializerForRoute(this.fastify, {
 *       convertCentsToDisplay: true
 *     })
 *   }
 * }
 * ```
 */

/**
 * Option 3: Per-endpoint schema-based serialization
 * 
 * Most surgical approach - define serialization in OpenAPI schemas:
 * 
 * ```typescript
 * @ApiResponse({
 *   status: 200,
 *   schema: {
 *     type: 'object',
 *     properties: {
 *       amount: CurrencyAmountSchema,
 *       timestamp: DateTimeSchema
 *     }
 *   }
 * })
 * async getSubscription() {
 *   // Response will be automatically serialized according to schema
 * }
 * ```
 */

/**
 * Performance consideration: Selective application
 * 
 * For maximum performance, only apply serializers to routes that need them:
 */
export function applySerializersSelectively(app: NestFastifyApplication) {
  const fastify = app.getHttpAdapter().getInstance()
  
  // Only apply to billing/subscription routes
  fastify.register(async function billingSerializers(childFastify) {
    childFastify.addHook('preHandler', async (request, reply) => {
      // Only apply to billing-related routes
      if (request.url.startsWith('/api/v1/billing') || 
          request.url.startsWith('/api/v1/stripe')) {
        registerCurrencySerializerForRoute(childFastify)
      }
    })
  })
  
  // Apply date serializer to dashboard routes (lots of timestamps)
  fastify.register(async function dashboardSerializers(childFastify) {
    childFastify.addHook('preHandler', async (request, reply) => {
      if (request.url.startsWith('/api/v1/dashboard')) {
        registerDateSerializerForRoute(childFastify)
      }
    })
  })
}

/**
 * Recommended approach for TenantFlow:
 * Start with Option 1 (global registration) for simplicity,
 * then move to Option 3 (schema-based) for specific endpoints
 * that need different serialization behavior.
 */
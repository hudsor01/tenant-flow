import { routeSchemaRegistry } from '../utils/route-schema-registry'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export interface RouteSchemaConfig {
  method: HttpMethod
  path: string // controller route path, without global prefix (e.g., 'properties', 'properties/:id')
  schema: Record<string, unknown>
}

export function RouteSchema(config: RouteSchemaConfig): MethodDecorator {
  return function (_target, _propertyKey, _descriptor) {
    routeSchemaRegistry.register(config)
  }
}


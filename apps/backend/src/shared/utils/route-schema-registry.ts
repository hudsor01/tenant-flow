import type { HttpMethod } from '@repo/shared/types/core'

export interface RegisteredRouteSchema {
  method: HttpMethod
  path: string
  schema: Record<string, unknown>
}

class RouteSchemaRegistry {
  private readonly items: RegisteredRouteSchema[] = []

  register(entry: RegisteredRouteSchema) {
    // Avoid duplicates
    const exists = this.items.find(
      i => i.method === entry.method && this.normalize(i.path) === this.normalize(entry.path)
    )
    if (!exists) this.items.push({ ...entry, path: this.normalize(entry.path) })
  }

  find(method: string, url: string, globalPrefix?: string): RegisteredRouteSchema | undefined {
    const m = method.toUpperCase() as HttpMethod
    const u = this.normalize(url)
    const prefix = globalPrefix ? '/' + this.normalize(globalPrefix) : ''
    for (const item of this.items) {
      const p = '/' + this.normalize(item.path)
      if (item.method !== m) continue
      if (u === p) return item
      if (prefix && u === prefix + p) return item
      if (u.endsWith(p)) return item
      if (prefix && u.endsWith(prefix + p)) return item
    }
    return undefined
  }

  getAll() {
    return [...this.items]
  }

  private normalize(s: string): string {
    return s.replace(/\s+/g, '').replace(/(^\/|\/$)/g, '')
  }
}

export const routeSchemaRegistry = new RouteSchemaRegistry()


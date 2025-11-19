export type SearchResultType = 'properties' | 'tenants' | 'units' | 'leases'

export interface SearchResult {
  id: string
  type: SearchResultType
  name: string
  description?: string
  metadata?: Record<string, unknown>
}

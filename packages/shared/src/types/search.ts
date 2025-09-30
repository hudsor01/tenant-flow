export type SearchResultType = 'property' | 'tenant' | 'unit' | 'lease'

export interface SearchResult {
  id: string
  type: SearchResultType
  name: string
  description?: string
  metadata?: Record<string, unknown>
}

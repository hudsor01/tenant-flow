/**
 * Shared repository type contracts
 * Centralizes common repository interfaces and error types so both
 * backend services and utilities can rely on a single source of truth.
 */

export interface PaginationOptions {
  page?: number
  limit?: number
  offset?: number
}

export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

export interface BaseFilterOptions extends PaginationOptions {
  sort?: SortOptions
  search?: string
}

export interface BaseRepository<
  Entity,
  CreateData,
  UpdateData,
  FilterOptions = Record<string, unknown>
> {
  findById(id: string): Promise<Entity | null>
  findByUserId(userId: string, filters?: FilterOptions): Promise<Entity[]>
  findAll(filters?: FilterOptions): Promise<Entity[]>
  create(userId: string, data: CreateData): Promise<Entity>
  update(id: string, data: UpdateData): Promise<Entity>
  delete(id: string): Promise<void>
  exists(id: string): Promise<boolean>
  count(filters?: FilterOptions): Promise<number>
}

export class RepositoryError extends Error {
  constructor(message: string, public override readonly cause?: Error) {
    super(message)
    this.name = 'RepositoryError'
  }
}

export class EntityNotFoundError extends RepositoryError {
  constructor(entityName: string, id: string) {
    super(`${entityName} with ID ${id} not found`)
    this.name = 'EntityNotFoundError'
  }
}

export class DuplicateEntityError extends RepositoryError {
  constructor(entityName: string, field: string, value: string) {
    super(`${entityName} with ${field} '${value}' already exists`)
    this.name = 'DuplicateEntityError'
  }
}

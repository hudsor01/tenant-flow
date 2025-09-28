/**
 * Base repository interface defining common CRUD operations
 * All entity repositories should extend this interface
 */
export interface BaseRepository<T, CreateData, UpdateData, FilterOptions = Record<string, unknown>> {
  /**
   * Find entity by ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find entities by user ID with optional filters
   */
  findByUserId(userId: string, filters?: FilterOptions): Promise<T[]>;

  /**
   * Find all entities with optional filters
   */
  findAll(filters?: FilterOptions): Promise<T[]>;

  /**
   * Create new entity
   */
  create(userId: string, data: CreateData): Promise<T>;

  /**
   * Update existing entity
   */
  update(id: string, data: UpdateData): Promise<T>;

  /**
   * Delete entity by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Check if entity exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Count entities with optional filters
   */
  count(filters?: FilterOptions): Promise<number>;
}

/**
 * Repository error types for consistent error handling
 */
export class RepositoryError extends Error {
  constructor(override message: string, public override readonly cause?: Error) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class EntityNotFoundError extends RepositoryError {
  constructor(entityName: string, id: string) {
    super(`${entityName} with ID ${id} not found`);
    this.name = 'EntityNotFoundError';
  }
}

export class DuplicateEntityError extends RepositoryError {
  constructor(entityName: string, field: string, value: string) {
    super(`${entityName} with ${field} '${value}' already exists`);
    this.name = 'DuplicateEntityError';
  }
}

/**
 * Common filter types
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface BaseFilterOptions extends PaginationOptions {
  sort?: SortOptions;
  search?: string;
}
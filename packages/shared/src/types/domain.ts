/**
 * Domain-Driven Design Types for TenantFlow
 * 
 * These types provide common patterns for implementing DDD concepts
 * across frontend and backend, ensuring consistency in domain modeling.
 */

// ========================
// Value Object Base Types
// ========================

export interface ValueObject<T> {
  equals(other: T): boolean
  toString(): string
}

export abstract class BaseValueObject<T> implements ValueObject<T> {
  abstract equals(other: T): boolean
  abstract toString(): string
}

// ========================
// Entity Base Types
// ========================

export interface Entity<TId = string> {
  readonly id: TId
  equals(other: Entity<TId>): boolean
}

export abstract class BaseEntity<TId = string> implements Entity<TId> {
  constructor(public readonly id: TId) {}

  equals(other: Entity<TId>): boolean {
    return this.id === other.id
  }
}

// ========================
// Aggregate Root Types
// ========================

export interface AggregateRoot<TId = string> extends Entity<TId> {
  readonly version: number
  getUncommittedEvents(): DomainEvent[]
  markEventsAsCommitted(): void
}

export interface DomainEvent<TPayload = unknown> {
  readonly id: string
  readonly aggregateId: string
  readonly aggregateType: string
  readonly eventType: string
  readonly version: number
  readonly timestamp: Date
  readonly payload: TPayload
  readonly metadata?: Record<string, unknown>
}

// ========================
// Repository Patterns
// ========================

export interface Repository<TEntity extends Entity<TId>, TId = string> {
  findById(id: TId): Promise<TEntity | null>
  save(entity: TEntity): Promise<TEntity>
  delete(id: TId): Promise<void>
}

export interface QueryRepository<TEntity, TQuery = Record<string, unknown>> {
  findMany(query?: TQuery): Promise<TEntity[]>
  count(query?: TQuery): Promise<number>
}

// ========================
// Specification Pattern
// ========================

export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean
  and(other: Specification<T>): Specification<T>
  or(other: Specification<T>): Specification<T>
  not(): Specification<T>
}

export abstract class BaseSpecification<T> implements Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean

  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other)
  }

  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other)
  }

  not(): Specification<T> {
    return new NotSpecification(this)
  }
}

class AndSpecification<T> extends BaseSpecification<T> {
  constructor(
    private left: Specification<T>,
    private right: Specification<T>
  ) {
    super()
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate)
  }
}

class OrSpecification<T> extends BaseSpecification<T> {
  constructor(
    private left: Specification<T>,
    private right: Specification<T>
  ) {
    super()
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate)
  }
}

class NotSpecification<T> extends BaseSpecification<T> {
  constructor(private spec: Specification<T>) {
    super()
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this.spec.isSatisfiedBy(candidate)
  }
}

// ========================
// Command/Query Patterns
// ========================

export interface Command {
  readonly type: string
  readonly timestamp: Date
  readonly correlationId?: string
  readonly causationId?: string
}

export interface Query<TResult = unknown> {
  readonly type: string
  readonly timestamp: Date
  readonly __result?: TResult // Phantom type to ensure TResult is used
}

export interface CommandHandler<TCommand extends Command, TResult = void> {
  handle(command: TCommand): Promise<TResult>
}

export interface QueryHandler<TQuery extends Query<TResult>, TResult = unknown> {
  handle(query: TQuery): Promise<TResult>
}

// ========================
// Result Pattern
// ========================

export type Result<T, E = Error> = Success<T> | Failure<E>

export interface Success<T> {
  readonly success: true
  readonly value: T
  readonly error?: never
}

export interface Failure<E> {
  readonly success: false
  readonly value?: never
  readonly error: E
}

export const Result = {
  success: <T>(value: T): Success<T> => ({
    success: true,
    value
  }),

  failure: <E>(error: E): Failure<E> => ({
    success: false,
    error
  }),

  isSuccess: <T, E>(result: Result<T, E>): result is Success<T> => {
    return result.success === true
  },

  isFailure: <T, E>(result: Result<T, E>): result is Failure<E> => {
    return result.success === false
  }
}

// ========================
// Business Rule Types
// ========================

export interface BusinessRule {
  readonly message: string
  isBroken(): boolean
}

export class BusinessRuleValidationError extends Error {
  constructor(
    public readonly brokenRule: BusinessRule,
    message?: string
  ) {
    super(message || brokenRule.message)
    this.name = 'BusinessRuleValidationError'
  }
}

// ========================
// Domain Service Pattern
// ========================

export interface DomainService {
  readonly name: string
}

// ========================
// Factory Pattern
// ========================

export interface Factory<TEntity, TProps = unknown> {
  create(props: TProps): Promise<TEntity> | TEntity
}

// ========================
// Unit of Work Pattern
// ========================

export interface UnitOfWork {
  begin(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  registerNew<T extends Entity>(entity: T): void
  registerUpdated<T extends Entity>(entity: T): void
  registerDeleted<T extends Entity>(entity: T): void
}

// ========================
// ID Types for Type Safety
// ========================

export type Brand<T, TBrand> = T & { readonly __brand: TBrand }

export type UserId = Brand<string, 'UserId'>
export type PropertyId = Brand<string, 'PropertyId'>
export type UnitId = Brand<string, 'UnitId'>
export type TenantId = Brand<string, 'TenantId'>
export type LeaseId = Brand<string, 'LeaseId'>
export type MaintenanceRequestId = Brand<string, 'MaintenanceRequestId'>
export type OrganizationId = Brand<string, 'OrganizationId'>
export type DocumentId = Brand<string, 'DocumentId'>
export type FileId = Brand<string, 'FileId'>
export type ActivityId = Brand<string, 'ActivityId'>
export type NotificationId = Brand<string, 'NotificationId'>
export type ReminderLogId = Brand<string, 'ReminderLogId'>
export type BlogArticleId = Brand<string, 'BlogArticleId'>
export type CustomerInvoiceId = Brand<string, 'CustomerInvoiceId'>

// Helper functions for ID creation
export const createId = {
  user: (id: string): UserId => id as UserId,
  property: (id: string): PropertyId => id as PropertyId,
  unit: (id: string): UnitId => id as UnitId,
  tenant: (id: string): TenantId => id as TenantId,
  lease: (id: string): LeaseId => id as LeaseId,
  maintenanceRequest: (id: string): MaintenanceRequestId => id as MaintenanceRequestId,
  organization: (id: string): OrganizationId => id as OrganizationId,
  document: (id: string): DocumentId => id as DocumentId,
  file: (id: string): FileId => id as FileId,
  activity: (id: string): ActivityId => id as ActivityId,
  notification: (id: string): NotificationId => id as NotificationId,
  reminderLog: (id: string): ReminderLogId => id as ReminderLogId,
  blogArticle: (id: string): BlogArticleId => id as BlogArticleId,
  customerInvoice: (id: string): CustomerInvoiceId => id as CustomerInvoiceId
}

// ========================
// Common Value Objects
// ========================

export class Money extends BaseValueObject<Money> {
  constructor(
    public readonly amount: number,
    public readonly currency = 'USD'
  ) {
    super()
    if (amount < 0) {
      throw new Error('Money amount cannot be negative')
    }
    if (!currency || currency.length !== 3) {
      throw new Error('Currency must be a valid 3-letter code')
    }
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency
  }

  toString(): string {
    return `${this.amount} ${this.currency}`
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add money with different currencies')
    }
    return new Money(this.amount + other.amount, this.currency)
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot subtract money with different currencies')
    }
    return new Money(this.amount - other.amount, this.currency)
  }

  multiply(multiplier: number): Money {
    return new Money(this.amount * multiplier, this.currency)
  }

  isZero(): boolean {
    return this.amount === 0
  }

  isPositive(): boolean {
    return this.amount > 0
  }

  isNegative(): boolean {
    return this.amount < 0
  }
}

export class Email extends BaseValueObject<Email> {
  constructor(public readonly value: string) {
    super()
    if (!this.isValidEmail(value)) {
      throw new Error('Invalid email format')
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  equals(other: Email): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase()
  }

  toString(): string {
    return this.value
  }

  getDomain(): string {
    const parts = this.value.split('@')
    return parts[1] || ''
  }

  getLocalPart(): string {
    const parts = this.value.split('@')
    return parts[0] || ''
  }
}

export class PhoneNumber extends BaseValueObject<PhoneNumber> {
  constructor(public readonly value: string) {
    super()
    if (!this.isValidPhoneNumber(value)) {
      throw new Error('Invalid phone number format')
    }
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic international phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    return phoneRegex.test(phone.replace(/\s|-/g, ''))
  }

  equals(other: PhoneNumber): boolean {
    return this.normalize() === other.normalize()
  }

  toString(): string {
    return this.value
  }

  private normalize(): string {
    return this.value.replace(/\s|-/g, '')
  }
}

export class Address extends BaseValueObject<Address> {
  constructor(
    public readonly street: string,
    public readonly city: string,
    public readonly state: string,
    public readonly zipCode: string,
    public readonly country = 'US'
  ) {
    super()
    if (!street?.trim()) throw new Error('Street is required')
    if (!city?.trim()) throw new Error('City is required')
    if (!state?.trim()) throw new Error('State is required')
    if (!zipCode?.trim()) throw new Error('ZIP code is required')
    if (!country?.trim()) throw new Error('Country is required')
  }

  equals(other: Address): boolean {
    return (
      this.street === other.street &&
      this.city === other.city &&
      this.state === other.state &&
      this.zipCode === other.zipCode &&
      this.country === other.country
    )
  }

  toString(): string {
    return `${this.street}, ${this.city}, ${this.state} ${this.zipCode}, ${this.country}`
  }

  getFullAddress(): string {
    return this.toString()
  }
}

// ========================
// Domain Exception Types
// ========================

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', { field })
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends DomainError {
  constructor(entityName: string, id: string) {
    super(`${entityName} with ID ${id} not found`, 'NOT_FOUND', { entityName, id })
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONFLICT', context)
    this.name = 'ConflictError'
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden operation') {
    super(message, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}
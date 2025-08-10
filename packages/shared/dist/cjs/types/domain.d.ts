/**
 * Domain-Driven Design Types for TenantFlow
 *
 * These types provide common patterns for implementing DDD concepts
 * across frontend and backend, ensuring consistency in domain modeling.
 */
export interface ValueObject<T> {
    equals(other: T): boolean;
    toString(): string;
}
export declare abstract class BaseValueObject<T> implements ValueObject<T> {
    abstract equals(other: T): boolean;
    abstract toString(): string;
}
export interface Entity<TId = string> {
    readonly id: TId;
    equals(other: Entity<TId>): boolean;
}
export declare abstract class BaseEntity<TId = string> implements Entity<TId> {
    readonly id: TId;
    constructor(id: TId);
    equals(other: Entity<TId>): boolean;
}
export interface AggregateRoot<TId = string> extends Entity<TId> {
    readonly version: number;
    getUncommittedEvents(): DomainEvent[];
    markEventsAsCommitted(): void;
}
export interface DomainEvent<TPayload = unknown> {
    readonly id: string;
    readonly aggregateId: string;
    readonly aggregateType: string;
    readonly eventType: string;
    readonly version: number;
    readonly timestamp: Date;
    readonly payload: TPayload;
    readonly metadata?: Record<string, unknown>;
}
export interface Repository<TEntity extends Entity<TId>, TId = string> {
    findById(id: TId): Promise<TEntity | null>;
    save(entity: TEntity): Promise<TEntity>;
    delete(id: TId): Promise<void>;
}
export interface QueryRepository<TEntity, TQuery = Record<string, unknown>> {
    findMany(query?: TQuery): Promise<TEntity[]>;
    count(query?: TQuery): Promise<number>;
}
export interface Specification<T> {
    isSatisfiedBy(candidate: T): boolean;
    and(other: Specification<T>): Specification<T>;
    or(other: Specification<T>): Specification<T>;
    not(): Specification<T>;
}
export declare abstract class BaseSpecification<T> implements Specification<T> {
    abstract isSatisfiedBy(candidate: T): boolean;
    and(other: Specification<T>): Specification<T>;
    or(other: Specification<T>): Specification<T>;
    not(): Specification<T>;
}
export interface Command {
    readonly type: string;
    readonly timestamp: Date;
    readonly correlationId?: string;
    readonly causationId?: string;
}
export interface Query<TResult = unknown> {
    readonly type: string;
    readonly timestamp: Date;
    readonly __result?: TResult;
}
export interface CommandHandler<TCommand extends Command, TResult = void> {
    handle(command: TCommand): Promise<TResult>;
}
export interface QueryHandler<TQuery extends Query<TResult>, TResult = unknown> {
    handle(query: TQuery): Promise<TResult>;
}
export type Result<T, E = Error> = Success<T> | Failure<E>;
export interface Success<T> {
    readonly success: true;
    readonly value: T;
    readonly error?: never;
}
export interface Failure<E> {
    readonly success: false;
    readonly value?: never;
    readonly error: E;
}
export declare const Result: {
    success: <T>(value: T) => Success<T>;
    failure: <E>(error: E) => Failure<E>;
    isSuccess: <T, E>(result: Result<T, E>) => result is Success<T>;
    isFailure: <T, E>(result: Result<T, E>) => result is Failure<E>;
};
export interface BusinessRule {
    readonly message: string;
    isBroken(): boolean;
}
export declare class BusinessRuleValidationError extends Error {
    readonly brokenRule: BusinessRule;
    constructor(brokenRule: BusinessRule, message?: string);
}
export interface DomainService {
    readonly name: string;
}
export interface Factory<TEntity, TProps = unknown> {
    create(props: TProps): Promise<TEntity> | TEntity;
}
export interface UnitOfWork {
    begin(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    registerNew<T extends Entity>(entity: T): void;
    registerUpdated<T extends Entity>(entity: T): void;
    registerDeleted<T extends Entity>(entity: T): void;
}
export type Brand<T, TBrand> = T & {
    readonly __brand: TBrand;
};
export type UserId = Brand<string, 'UserId'>;
export type PropertyId = Brand<string, 'PropertyId'>;
export type UnitId = Brand<string, 'UnitId'>;
export type TenantId = Brand<string, 'TenantId'>;
export type LeaseId = Brand<string, 'LeaseId'>;
export type MaintenanceRequestId = Brand<string, 'MaintenanceRequestId'>;
export type OrganizationId = Brand<string, 'OrganizationId'>;
export type DocumentId = Brand<string, 'DocumentId'>;
export type FileId = Brand<string, 'FileId'>;
export type ActivityId = Brand<string, 'ActivityId'>;
export type NotificationId = Brand<string, 'NotificationId'>;
export type ReminderLogId = Brand<string, 'ReminderLogId'>;
export type BlogArticleId = Brand<string, 'BlogArticleId'>;
export type CustomerInvoiceId = Brand<string, 'CustomerInvoiceId'>;
export declare const createId: {
    user: (id: string) => UserId;
    property: (id: string) => PropertyId;
    unit: (id: string) => UnitId;
    tenant: (id: string) => TenantId;
    lease: (id: string) => LeaseId;
    maintenanceRequest: (id: string) => MaintenanceRequestId;
    organization: (id: string) => OrganizationId;
    document: (id: string) => DocumentId;
    file: (id: string) => FileId;
    activity: (id: string) => ActivityId;
    notification: (id: string) => NotificationId;
    reminderLog: (id: string) => ReminderLogId;
    blogArticle: (id: string) => BlogArticleId;
    customerInvoice: (id: string) => CustomerInvoiceId;
};
export declare class Money extends BaseValueObject<Money> {
    readonly amount: number;
    readonly currency: string;
    constructor(amount: number, currency?: string);
    equals(other: Money): boolean;
    toString(): string;
    add(other: Money): Money;
    subtract(other: Money): Money;
    multiply(multiplier: number): Money;
    isZero(): boolean;
    isPositive(): boolean;
    isNegative(): boolean;
}
export declare class Email extends BaseValueObject<Email> {
    readonly value: string;
    constructor(value: string);
    private isValidEmail;
    equals(other: Email): boolean;
    toString(): string;
    getDomain(): string;
    getLocalPart(): string;
}
export declare class PhoneNumber extends BaseValueObject<PhoneNumber> {
    readonly value: string;
    constructor(value: string);
    private isValidPhoneNumber;
    equals(other: PhoneNumber): boolean;
    toString(): string;
    private normalize;
}
export declare class Address extends BaseValueObject<Address> {
    readonly street: string;
    readonly city: string;
    readonly state: string;
    readonly zipCode: string;
    readonly country: string;
    constructor(street: string, city: string, state: string, zipCode: string, country?: string);
    equals(other: Address): boolean;
    toString(): string;
    getFullAddress(): string;
}
export declare class DomainError extends Error {
    readonly code?: string | undefined;
    readonly context?: Record<string, unknown> | undefined;
    constructor(message: string, code?: string | undefined, context?: Record<string, unknown> | undefined);
}
export declare class ValidationError extends DomainError {
    readonly field?: string | undefined;
    constructor(message: string, field?: string | undefined);
}
export declare class NotFoundError extends DomainError {
    constructor(entityName: string, id: string);
}
export declare class ConflictError extends DomainError {
    constructor(message: string, context?: Record<string, unknown>);
}
export declare class UnauthorizedError extends DomainError {
    constructor(message?: string);
}
export declare class ForbiddenError extends DomainError {
    constructor(message?: string);
}
//# sourceMappingURL=domain.d.ts.map
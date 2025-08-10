/**
 * Domain-Driven Design Types for TenantFlow
 *
 * These types provide common patterns for implementing DDD concepts
 * across frontend and backend, ensuring consistency in domain modeling.
 */
export class BaseValueObject {
}
export class BaseEntity {
    id;
    constructor(id) {
        this.id = id;
    }
    equals(other) {
        return this.id === other.id;
    }
}
export class BaseSpecification {
    and(other) {
        return new AndSpecification(this, other);
    }
    or(other) {
        return new OrSpecification(this, other);
    }
    not() {
        return new NotSpecification(this);
    }
}
class AndSpecification extends BaseSpecification {
    left;
    right;
    constructor(left, right) {
        super();
        this.left = left;
        this.right = right;
    }
    isSatisfiedBy(candidate) {
        return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
    }
}
class OrSpecification extends BaseSpecification {
    left;
    right;
    constructor(left, right) {
        super();
        this.left = left;
        this.right = right;
    }
    isSatisfiedBy(candidate) {
        return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
    }
}
class NotSpecification extends BaseSpecification {
    spec;
    constructor(spec) {
        super();
        this.spec = spec;
    }
    isSatisfiedBy(candidate) {
        return !this.spec.isSatisfiedBy(candidate);
    }
}
export const Result = {
    success: (value) => ({
        success: true,
        value
    }),
    failure: (error) => ({
        success: false,
        error
    }),
    isSuccess: (result) => {
        return result.success === true;
    },
    isFailure: (result) => {
        return result.success === false;
    }
};
export class BusinessRuleValidationError extends Error {
    brokenRule;
    constructor(brokenRule, message) {
        super(message || brokenRule.message);
        this.brokenRule = brokenRule;
        this.name = 'BusinessRuleValidationError';
    }
}
// Helper functions for ID creation
export const createId = {
    user: (id) => id,
    property: (id) => id,
    unit: (id) => id,
    tenant: (id) => id,
    lease: (id) => id,
    maintenanceRequest: (id) => id,
    organization: (id) => id,
    document: (id) => id,
    file: (id) => id,
    activity: (id) => id,
    notification: (id) => id,
    reminderLog: (id) => id,
    blogArticle: (id) => id,
    customerInvoice: (id) => id
};
// ========================
// Common Value Objects
// ========================
export class Money extends BaseValueObject {
    amount;
    currency;
    constructor(amount, currency = 'USD') {
        super();
        this.amount = amount;
        this.currency = currency;
        if (amount < 0) {
            throw new Error('Money amount cannot be negative');
        }
        if (!currency || currency.length !== 3) {
            throw new Error('Currency must be a valid 3-letter code');
        }
    }
    equals(other) {
        return this.amount === other.amount && this.currency === other.currency;
    }
    toString() {
        return `${this.amount} ${this.currency}`;
    }
    add(other) {
        if (this.currency !== other.currency) {
            throw new Error('Cannot add money with different currencies');
        }
        return new Money(this.amount + other.amount, this.currency);
    }
    subtract(other) {
        if (this.currency !== other.currency) {
            throw new Error('Cannot subtract money with different currencies');
        }
        return new Money(this.amount - other.amount, this.currency);
    }
    multiply(multiplier) {
        return new Money(this.amount * multiplier, this.currency);
    }
    isZero() {
        return this.amount === 0;
    }
    isPositive() {
        return this.amount > 0;
    }
    isNegative() {
        return this.amount < 0;
    }
}
export class Email extends BaseValueObject {
    value;
    constructor(value) {
        super();
        this.value = value;
        if (!this.isValidEmail(value)) {
            throw new Error('Invalid email format');
        }
    }
    isValidEmail(email) {
        // Use bounded quantifiers to prevent ReDoS attacks
        // RFC 5321: local part max 64 chars, domain parts max 63 chars each
        const emailRegex = /^[^\s@]{1,64}@[^\s@]{1,63}(?:\.[^\s@]{1,63})+$/;
        return emailRegex.test(email);
    }
    equals(other) {
        return this.value.toLowerCase() === other.value.toLowerCase();
    }
    toString() {
        return this.value;
    }
    getDomain() {
        const parts = this.value.split('@');
        return parts[1] || '';
    }
    getLocalPart() {
        const parts = this.value.split('@');
        return parts[0] || '';
    }
}
export class PhoneNumber extends BaseValueObject {
    value;
    constructor(value) {
        super();
        this.value = value;
        if (!this.isValidPhoneNumber(value)) {
            throw new Error('Invalid phone number format');
        }
    }
    isValidPhoneNumber(phone) {
        // Basic international phone number validation
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(phone.replace(/\s|-/g, ''));
    }
    equals(other) {
        return this.normalize() === other.normalize();
    }
    toString() {
        return this.value;
    }
    normalize() {
        return this.value.replace(/\s|-/g, '');
    }
}
export class Address extends BaseValueObject {
    street;
    city;
    state;
    zipCode;
    country;
    constructor(street, city, state, zipCode, country = 'US') {
        super();
        this.street = street;
        this.city = city;
        this.state = state;
        this.zipCode = zipCode;
        this.country = country;
        if (!street?.trim())
            throw new Error('Street is required');
        if (!city?.trim())
            throw new Error('City is required');
        if (!state?.trim())
            throw new Error('State is required');
        if (!zipCode?.trim())
            throw new Error('ZIP code is required');
        if (!country?.trim())
            throw new Error('Country is required');
    }
    equals(other) {
        return (this.street === other.street &&
            this.city === other.city &&
            this.state === other.state &&
            this.zipCode === other.zipCode &&
            this.country === other.country);
    }
    toString() {
        return `${this.street}, ${this.city}, ${this.state} ${this.zipCode}, ${this.country}`;
    }
    getFullAddress() {
        return this.toString();
    }
}
// ========================
// Domain Exception Types
// ========================
export class DomainError extends Error {
    code;
    context;
    constructor(message, code, context) {
        super(message);
        this.code = code;
        this.context = context;
        this.name = 'DomainError';
    }
}
export class ValidationError extends DomainError {
    field;
    constructor(message, field) {
        super(message, 'VALIDATION_ERROR', { field });
        this.field = field;
        this.name = 'ValidationError';
    }
}
export class NotFoundError extends DomainError {
    constructor(entityName, id) {
        super(`${entityName} with ID ${id} not found`, 'NOT_FOUND', { entityName, id });
        this.name = 'NotFoundError';
    }
}
export class ConflictError extends DomainError {
    constructor(message, context) {
        super(message, 'CONFLICT', context);
        this.name = 'ConflictError';
    }
}
export class UnauthorizedError extends DomainError {
    constructor(message = 'Unauthorized access') {
        super(message, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}
export class ForbiddenError extends DomainError {
    constructor(message = 'Forbidden operation') {
        super(message, 'FORBIDDEN');
        this.name = 'ForbiddenError';
    }
}
//# sourceMappingURL=domain.js.map
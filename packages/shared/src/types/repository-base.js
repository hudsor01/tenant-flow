"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuplicateEntityError = exports.EntityNotFoundError = exports.RepositoryError = void 0;
class RepositoryError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'RepositoryError';
    }
}
exports.RepositoryError = RepositoryError;
class EntityNotFoundError extends RepositoryError {
    constructor(entityName, id) {
        super(`${entityName} with ID ${id} not found`);
        this.name = 'EntityNotFoundError';
    }
}
exports.EntityNotFoundError = EntityNotFoundError;
class DuplicateEntityError extends RepositoryError {
    constructor(entityName, field, value) {
        super(`${entityName} with ${field} '${value}' already exists`);
        this.name = 'DuplicateEntityError';
    }
}
exports.DuplicateEntityError = DuplicateEntityError;
//# sourceMappingURL=repository-base.js.map
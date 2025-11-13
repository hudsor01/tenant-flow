"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidUser = isValidUser;
exports.isValidProperty = isValidProperty;
function isValidUser(entity) {
    return (typeof entity === 'object' &&
        entity !== null &&
        'id' in entity &&
        'email' in entity &&
        'createdAt' in entity);
}
function isValidProperty(entity) {
    return (typeof entity === 'object' &&
        entity !== null &&
        'id' in entity &&
        'name' in entity &&
        'address' in entity);
}
//# sourceMappingURL=supabase.js.map
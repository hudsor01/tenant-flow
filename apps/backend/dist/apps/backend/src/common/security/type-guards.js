"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTClaimsSchema = exports.QueryParamSchema = exports.SanitizedStringSchema = exports.UserRoleSchema = exports.EmailSchema = exports.UUIDSchema = void 0;
exports.isValidUserId = isValidUserId;
exports.isValidEmail = isValidEmail;
exports.isValidUserRole = isValidUserRole;
exports.sanitizeAndValidateString = sanitizeAndValidateString;
exports.validateQueryParams = validateQueryParams;
exports.validateJWTClaims = validateJWTClaims;
exports.performSecurityValidation = performSecurityValidation;
const zod_1 = require("zod");
const common_1 = require("@nestjs/common");
const logger = new common_1.Logger('SecurityTypeGuards');
exports.UUIDSchema = zod_1.z.string().uuid('Invalid UUID format');
exports.EmailSchema = zod_1.z.string()
    .email('Invalid email format')
    .max(254, 'Email too long')
    .refine(email => !email.includes('..'), 'Email contains consecutive dots')
    .refine(email => !email.startsWith('.'), 'Email cannot start with dot')
    .refine(email => !email.endsWith('.'), 'Email cannot end with dot');
exports.UserRoleSchema = zod_1.z.enum(['OWNER', 'MANAGER', 'TENANT', 'ADMIN']);
function isValidUserId(userId) {
    try {
        exports.UUIDSchema.parse(userId);
        return true;
    }
    catch (error) {
        logger.warn('Invalid user ID format detected', {
            userId: typeof userId === 'string' ? userId.substring(0, 8) + '...' : typeof userId,
            error: error instanceof zod_1.z.ZodError ? error.issues[0]?.message : 'Unknown error'
        });
        return false;
    }
}
function isValidEmail(email) {
    try {
        exports.EmailSchema.parse(email);
        return true;
    }
    catch (error) {
        logger.warn('Invalid email format detected', {
            email: typeof email === 'string' ? email.substring(0, 5) + '...' : typeof email,
            error: error instanceof zod_1.z.ZodError ? error.issues[0]?.message : 'Unknown error'
        });
        return false;
    }
}
function isValidUserRole(role) {
    try {
        exports.UserRoleSchema.parse(role);
        return true;
    }
    catch (error) {
        logger.warn('Invalid user role detected', {
            role: typeof role === 'string' ? role : typeof role,
            error: error instanceof zod_1.z.ZodError ? error.issues[0]?.message : 'Unknown error'
        });
        return false;
    }
}
exports.SanitizedStringSchema = zod_1.z.string()
    .trim()
    .max(10000, 'Input too long')
    .refine(str => !str.includes('\0'), 'Null bytes not allowed')
    .refine(str => !/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(str), 'Control characters not allowed')
    .refine(str => !str.includes('../'), 'Directory traversal patterns not allowed')
    .refine(str => !str.includes('..\\'), 'Directory traversal patterns not allowed')
    .refine(str => !/\.\.[\\/]/.test(str), 'Directory traversal patterns not allowed')
    .refine(str => !/%2e%2e/i.test(str), 'URL-encoded directory traversal not allowed')
    .refine(str => !/\.{2,}[\\/]/.test(str), 'Multiple dot traversal patterns not allowed')
    .refine(str => !/<script/i.test(str), 'Script tags not allowed')
    .refine(str => !/javascript:/i.test(str), 'JavaScript protocols not allowed')
    .refine(str => !/<iframe/i.test(str), 'Iframe tags not allowed')
    .refine(str => !/onerror=/i.test(str), 'Event handlers not allowed')
    .refine(str => !/onload=/i.test(str), 'Event handlers not allowed')
    .refine(str => !/eval\s*\(/i.test(str), 'Eval function not allowed')
    .refine(str => !/alert\s*\(/i.test(str), 'Alert function not allowed')
    .refine(str => !/(';|";).*alert/i.test(str), 'JavaScript injection patterns not allowed');
function sanitizeAndValidateString(input) {
    try {
        if (typeof input !== 'string')
            return null;
        return exports.SanitizedStringSchema.parse(input);
    }
    catch (error) {
        logger.warn('String sanitization failed', {
            inputType: typeof input,
            error: error instanceof zod_1.z.ZodError ? error.issues[0]?.message : 'Unknown error'
        });
        return null;
    }
}
exports.QueryParamSchema = zod_1.z.object({
    userId: exports.UUIDSchema,
    email: exports.EmailSchema.optional(),
    role: exports.UserRoleSchema.optional(),
    limit: zod_1.z.number().int().min(1).max(1000).optional(),
    offset: zod_1.z.number().int().min(0).optional()
});
function validateQueryParams(params) {
    try {
        return exports.QueryParamSchema.parse(params);
    }
    catch (error) {
        logger.error('Query parameter validation failed', {
            error: error instanceof zod_1.z.ZodError ? error.issues : error,
            paramsType: typeof params
        });
        return null;
    }
}
exports.JWTClaimsSchema = zod_1.z.object({
    sub: exports.UUIDSchema,
    email: exports.EmailSchema.optional(),
    role: exports.UserRoleSchema.optional(),
    iat: zod_1.z.number().optional(),
    exp: zod_1.z.number().optional()
});
function validateJWTClaims(claims) {
    try {
        return exports.JWTClaimsSchema.parse(claims);
    }
    catch (error) {
        logger.error('JWT claims validation failed', {
            error: error instanceof zod_1.z.ZodError ? error.issues : error,
            claimsType: typeof claims
        });
        return null;
    }
}
function performSecurityValidation(input, schema, context) {
    try {
        const data = schema.parse(input);
        logger.debug('Security validation passed', {
            context,
            inputType: typeof input
        });
        return {
            isValid: true,
            data
        };
    }
    catch (error) {
        const errors = error instanceof zod_1.z.ZodError
            ? error.issues.map(issue => issue.message)
            : ['Unknown validation error'];
        const securityFlags = {
            potentialInjection: typeof input === 'string' && (input.includes('DROP ') ||
                input.includes('DELETE ') ||
                input.includes('INSERT ') ||
                input.includes('UPDATE ') ||
                input.includes('SELECT ') ||
                input.includes('UNION ') ||
                input.includes('<script') ||
                input.includes('javascript:')),
            suspiciousPattern: typeof input === 'string' && (input.includes('..') ||
                input.includes('/*') ||
                input.includes('*/') ||
                input.includes('--') ||
                input.includes('\0')),
            invalidFormat: true
        };
        if (securityFlags.potentialInjection || securityFlags.suspiciousPattern) {
            logger.error('Security threat detected in input validation', {
                context,
                inputSample: typeof input === 'string' ? input.substring(0, 50) + '...' : typeof input,
                securityFlags,
                errors
            });
        }
        else {
            logger.warn('Input validation failed', {
                context,
                errors
            });
        }
        return {
            isValid: false,
            errors,
            securityFlags
        };
    }
}

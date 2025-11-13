"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.phoneSchema = exports.positiveNumberSchema = exports.nonNegativeNumberSchema = exports.urlSchema = exports.uuidSchema = exports.requiredDescription = exports.requiredTitle = exports.nonEmptyStringSchema = exports.requiredString = exports.emailSchema = void 0;
exports.isValidEmail = isValidEmail;
exports.isValidUrl = isValidUrl;
exports.isValidStripeSessionId = isValidStripeSessionId;
const zod_1 = require("zod");
const billing_1 = require("@repo/shared/constants/billing");
exports.emailSchema = zod_1.z.string().email('Please enter a valid email address');
exports.requiredString = zod_1.z.string().min(1, 'This field is required');
exports.nonEmptyStringSchema = zod_1.z.string().trim().min(1, 'This field cannot be empty');
exports.requiredTitle = zod_1.z.string().trim().min(1, 'Title is required').max(billing_1.VALIDATION_LIMITS.TITLE_MAX_LENGTH, `Title cannot exceed ${billing_1.VALIDATION_LIMITS.TITLE_MAX_LENGTH} characters`);
exports.requiredDescription = zod_1.z.string().trim().min(1, 'Description is required').max(billing_1.VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH, `Description cannot exceed ${billing_1.VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters`);
exports.uuidSchema = zod_1.z.string().uuid('Invalid UUID format');
exports.urlSchema = zod_1.z.string().url('Invalid URL format').refine((url) => isValidUrl(url), { message: 'URL must use http/https protocol' });
exports.nonNegativeNumberSchema = zod_1.z.number().min(0, 'Value must be non-negative');
exports.positiveNumberSchema = zod_1.z.number().positive('Value must be positive');
exports.phoneSchema = zod_1.z
    .string()
    .regex(/^[\d+()-\s]+$/, 'Phone number can only contain digits, +, (), -, and spaces')
    .min(10, 'Phone number must be at least 10 characters')
    .max(billing_1.VALIDATION_LIMITS.CONTACT_FORM_PHONE_MAX_LENGTH, `Phone number cannot exceed ${billing_1.VALIDATION_LIMITS.CONTACT_FORM_PHONE_MAX_LENGTH} characters`);
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}
function isValidUrl(url) {
    try {
        const parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return false;
        }
        if (process.env["NODE_ENV"] === 'production' &&
            (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')) {
            return false;
        }
        return true;
    }
    catch {
        return false;
    }
}
function isValidStripeSessionId(sessionId) {
    const sessionIdRegex = /^cs_[a-zA-Z0-9_-]{24,}$/;
    return sessionIdRegex.test(sessionId);
}
//# sourceMappingURL=common.js.map
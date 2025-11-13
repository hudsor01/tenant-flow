"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    firstName: zod_1.z
        .string()
        .trim()
        .min(1, 'First name is required')
        .max(50, 'First name must be 50 characters or less'),
    lastName: zod_1.z
        .string()
        .trim()
        .min(1, 'Last name is required')
        .max(50, 'Last name must be 50 characters or less'),
    email: zod_1.z.string().email('Valid email address is required'),
    phone: zod_1.z
        .string()
        .trim()
        .max(20, 'Phone number must be 20 characters or less')
        .optional(),
    company: zod_1.z
        .string()
        .trim()
        .max(100, 'Company name must be 100 characters or less')
        .optional(),
    timezone: zod_1.z.string().trim().optional(),
    bio: zod_1.z
        .string()
        .trim()
        .max(500, 'Bio must be 500 characters or less')
        .optional()
});
//# sourceMappingURL=profile.js.map
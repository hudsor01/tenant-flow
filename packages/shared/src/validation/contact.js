"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactFormSchema = void 0;
const zod_1 = require("zod");
exports.contactFormSchema = zod_1.z
    .object({
    name: zod_1.z
        .string()
        .trim()
        .min(1, 'Name is required')
        .max(100, 'Name must be 100 characters or less'),
    email: zod_1.z.string().trim().email('Valid email address is required'),
    subject: zod_1.z
        .string()
        .trim()
        .min(1, 'Subject is required')
        .max(200, 'Subject must be 200 characters or less'),
    message: zod_1.z
        .string()
        .trim()
        .min(10, 'Message must be at least 10 characters')
        .max(5000, 'Message must be 5000 characters or less'),
    type: zod_1.z.enum(['sales', 'support', 'general'], {
        message: 'Type must be one of: sales, support, general'
    }),
    phone: zod_1.z.string().optional(),
    company: zod_1.z.string().optional(),
    urgency: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']).optional()
})
    .transform(data => {
    const { phone, company, urgency, ...rest } = data;
    return {
        ...rest,
        ...(phone !== undefined && phone !== '' ? { phone } : {}),
        ...(company !== undefined && company !== '' ? { company } : {}),
        ...(urgency !== undefined ? { urgency } : {})
    };
});
//# sourceMappingURL=contact.js.map
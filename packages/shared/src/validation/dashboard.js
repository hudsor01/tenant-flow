"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardActivityResponseSchema = exports.activitySchema = exports.billingInsightsSchema = void 0;
const zod_1 = require("zod");
exports.billingInsightsSchema = zod_1.z.object({
    totalRevenue: zod_1.z.number().nonnegative(),
    churnRate: zod_1.z.number().min(0).max(1),
    mrr: zod_1.z.number().nonnegative()
});
exports.activitySchema = zod_1.z.object({
    id: zod_1.z.string(),
    activity_type: zod_1.z.enum(['lease', 'payment', 'maintenance', 'unit']),
    entity_id: zod_1.z.string(),
    property_id: zod_1.z.string().nullable(),
    tenant_id: zod_1.z.string().nullable(),
    unit_id: zod_1.z.string().nullable(),
    owner_id: zod_1.z.string().nullable(),
    status: zod_1.z.string().nullable(),
    priority: zod_1.z.string().nullable(),
    action: zod_1.z.string(),
    amount: zod_1.z.number().nullable(),
    activity_timestamp: zod_1.z.string(),
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
});
exports.dashboardActivityResponseSchema = zod_1.z.object({
    activities: zod_1.z.array(exports.activitySchema)
});
//# sourceMappingURL=dashboard.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.propertyStatsSchema = exports.activateTenantResultSchema = exports.userIdByStripeCustomerSchema = exports.createRpcResultSchema = exports.rpcErrorSchema = void 0;
const zod_1 = require("zod");
exports.rpcErrorSchema = zod_1.z
    .object({
    message: zod_1.z.string().optional()
})
    .nullable()
    .optional();
const createRpcResultSchema = (dataSchema) => zod_1.z.object({
    data: dataSchema.nullable(),
    error: exports.rpcErrorSchema
});
exports.createRpcResultSchema = createRpcResultSchema;
exports.userIdByStripeCustomerSchema = (0, exports.createRpcResultSchema)(zod_1.z.string().uuid());
exports.activateTenantResultSchema = zod_1.z.array(zod_1.z.object({
    id: zod_1.z.string().uuid(),
    activated: zod_1.z.boolean()
}));
exports.propertyStatsSchema = zod_1.z.object({
    total: zod_1.z.number().int().nonnegative(),
    occupied: zod_1.z.number().int().nonnegative(),
    vacant: zod_1.z.number().int().nonnegative(),
    occupancyRate: zod_1.z.number().min(0).max(100),
    totalMonthlyRent: zod_1.z.number().nonnegative(),
    averageRent: zod_1.z.number().nonnegative()
});
//# sourceMappingURL=database-rpc.schemas.js.map
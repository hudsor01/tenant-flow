"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BILLING_PLANS = void 0;
exports.getPlanById = getPlanById;
exports.getPriceId = getPriceId;
const shared_1 = require("@repo/shared");
class BillingPlansManager {
    get plans() {
        if (!this._plans) {
            this._plans = {
                [shared_1.PLAN_TYPE.FREETRIAL]: {
                    id: shared_1.PLAN_TYPE.FREETRIAL,
                    name: 'Free Trial',
                    price: 0,
                    propertyLimit: 2,
                    stripePriceId: null,
                    stripePriceIds: {
                        monthly: null,
                        annual: null
                    }
                },
                [shared_1.PLAN_TYPE.STARTER]: {
                    id: shared_1.PLAN_TYPE.STARTER,
                    name: 'Starter',
                    price: 19,
                    propertyLimit: 10,
                    get stripePriceId() { return process.env.STRIPE_STARTER_MONTHLY ?? null; },
                    stripePriceIds: {
                        get monthly() { return process.env.STRIPE_STARTER_MONTHLY ?? null; },
                        get annual() { return process.env.STRIPE_STARTER_ANNUAL ?? null; }
                    }
                },
                [shared_1.PLAN_TYPE.GROWTH]: {
                    id: shared_1.PLAN_TYPE.GROWTH,
                    name: 'Growth',
                    price: 49,
                    propertyLimit: 50,
                    get stripePriceId() { return process.env.STRIPE_GROWTH_MONTHLY ?? null; },
                    stripePriceIds: {
                        get monthly() { return process.env.STRIPE_GROWTH_MONTHLY ?? null; },
                        get annual() { return process.env.STRIPE_GROWTH_ANNUAL ?? null; }
                    }
                },
                [shared_1.PLAN_TYPE.TENANTFLOW_MAX]: {
                    id: shared_1.PLAN_TYPE.TENANTFLOW_MAX,
                    name: 'TenantFlow MAX',
                    price: 149,
                    propertyLimit: -1,
                    get stripePriceId() { return process.env.STRIPE_TENANTFLOW_MAX_MONTHLY ?? null; },
                    stripePriceIds: {
                        get monthly() { return process.env.STRIPE_TENANTFLOW_MAX_MONTHLY ?? null; },
                        get annual() { return process.env.STRIPE_TENANTFLOW_MAX_ANNUAL ?? null; }
                    }
                }
            };
        }
        return this._plans;
    }
}
const billingPlansManager = new BillingPlansManager();
exports.BILLING_PLANS = billingPlansManager.plans;
const planLookupCache = new Map();
function getPlanById(planId) {
    if (planLookupCache.has(planId)) {
        return planLookupCache.get(planId);
    }
    let result;
    switch (planId) {
        case shared_1.PLAN_TYPE.FREETRIAL:
            result = exports.BILLING_PLANS[shared_1.PLAN_TYPE.FREETRIAL];
            break;
        case shared_1.PLAN_TYPE.STARTER:
            result = exports.BILLING_PLANS[shared_1.PLAN_TYPE.STARTER];
            break;
        case shared_1.PLAN_TYPE.GROWTH:
            result = exports.BILLING_PLANS[shared_1.PLAN_TYPE.GROWTH];
            break;
        case shared_1.PLAN_TYPE.TENANTFLOW_MAX:
            result = exports.BILLING_PLANS[shared_1.PLAN_TYPE.TENANTFLOW_MAX];
            break;
        default:
            result = undefined;
    }
    planLookupCache.set(planId, result);
    return result;
}
function getPriceId(planId) {
    const plan = getPlanById(planId);
    return plan?.stripePriceId ?? undefined;
}
if (typeof setImmediate !== 'undefined') {
    setImmediate(() => {
        getPlanById(shared_1.PLAN_TYPE.STARTER);
        getPlanById(shared_1.PLAN_TYPE.GROWTH);
    });
}

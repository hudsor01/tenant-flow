"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALIDATION_LIMITS = exports.getDefaultPlan = exports.getPlanById = exports.PLANS = exports.getBillingPlans = exports.BILLING_PLANS = exports.PLAN_TYPE = void 0;
const error_messages_js_1 = require("./error-messages.js");
exports.PLAN_TYPE = {
    FREETRIAL: 'FREETRIAL',
    STARTER: 'STARTER',
    GROWTH: 'GROWTH',
    TENANTFLOW_MAX: 'TENANTFLOW_MAX'
};
exports.BILLING_PLANS = {
    [exports.PLAN_TYPE.FREETRIAL]: {
        id: exports.PLAN_TYPE.FREETRIAL,
        name: 'Free Trial',
        description: '14-day free trial with 2 properties',
        price: {
            monthly: 0,
            annual: 0
        },
        features: ['2 properties', 'Basic features', '14-day trial'],
        propertyLimit: 2,
        storageLimit: 1,
        apiCallLimit: 1000,
        priority: false
    },
    [exports.PLAN_TYPE.STARTER]: {
        id: exports.PLAN_TYPE.STARTER,
        name: 'Starter',
        description: 'Perfect for small property owners',
        price: {
            monthly: 19,
            annual: 190
        },
        features: ['10 properties', 'Standard features', 'Email support'],
        propertyLimit: 10,
        storageLimit: 5,
        apiCallLimit: 10000,
        priority: false
    },
    [exports.PLAN_TYPE.GROWTH]: {
        id: exports.PLAN_TYPE.GROWTH,
        name: 'Growth',
        description: 'For growing property managers',
        price: {
            monthly: 49,
            annual: 490
        },
        features: ['50 properties', 'Advanced features', 'Priority support'],
        propertyLimit: 50,
        storageLimit: 25,
        apiCallLimit: 50000,
        priority: true
    },
    [exports.PLAN_TYPE.TENANTFLOW_MAX]: {
        id: exports.PLAN_TYPE.TENANTFLOW_MAX,
        name: 'TenantFlow Max',
        description: 'For large property portfolios',
        price: {
            monthly: 99,
            annual: 990
        },
        features: ['200 properties', 'Enterprise features', '24/7 support'],
        propertyLimit: 200,
        storageLimit: 100,
        apiCallLimit: 200000,
        priority: true
    }
};
const getBillingPlans = () => exports.BILLING_PLANS;
exports.getBillingPlans = getBillingPlans;
exports.PLANS = exports.BILLING_PLANS;
const getPlanById = (planId) => {
    return exports.BILLING_PLANS[planId];
};
exports.getPlanById = getPlanById;
const getDefaultPlan = () => {
    const plan = exports.BILLING_PLANS[exports.PLAN_TYPE.FREETRIAL];
    if (!plan) {
        throw new Error(error_messages_js_1.SHARED_ERROR_MESSAGES.DEFAULT_PLAN_NOT_FOUND);
    }
    return plan;
};
exports.getDefaultPlan = getDefaultPlan;
exports.VALIDATION_LIMITS = {
    PROPERTY_NAME_MAX_LENGTH: 100,
    PROPERTY_DESCRIPTION_MAX_LENGTH: 2000,
    UNIT_NUMBER_MAX_LENGTH: 20,
    UNIT_BEDROOM_BATHROOM_MAX: 50,
    RENT_MAXIMUM_VALUE: 1000000,
    SQUARE_FOOTAGE_MAXIMUM: 1000000,
    SALE_PRICE_MAXIMUM: 100000000,
    PROPERTY_UNIT_MAX_BEDROOMS: 50,
    PROPERTY_UNIT_MAX_BATHROOMS: 50,
    UNIT_MAX_BEDROOMS: 20,
    UNIT_MAX_BATHROOMS: 20,
    UNIT_MAX_SQUARE_FEET: 50000,
    UNIT_RENT_MAXIMUM: 100000,
    API_QUERY_MAX_LIMIT: 100,
    API_QUERY_DEFAULT_LIMIT: 10,
    API_QUERY_DEFAULT_PAGE: 1,
    PASSWORD_MIN_LENGTH: 8,
    CONTACT_FORM_NAME_MAX_LENGTH: 100,
    CONTACT_FORM_EMAIL_MAX_LENGTH: 254,
    CONTACT_FORM_SUBJECT_MAX_LENGTH: 200,
    CONTACT_FORM_MESSAGE_MIN_LENGTH: 10,
    CONTACT_FORM_MESSAGE_MAX_LENGTH: 5000,
    CONTACT_FORM_PHONE_MAX_LENGTH: 20,
    TITLE_MAX_LENGTH: 200,
    DESCRIPTION_MAX_LENGTH: 2000
};
//# sourceMappingURL=billing.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionEventType = void 0;
var SubscriptionEventType;
(function (SubscriptionEventType) {
    SubscriptionEventType["PAYMENT_METHOD_REQUIRED"] = "subscription.payment_method_required";
    SubscriptionEventType["FEATURE_ACCESS_RESTRICT"] = "subscription.feature_access.restrict";
    SubscriptionEventType["FEATURE_ACCESS_RESTORE"] = "subscription.feature_access.restore";
    SubscriptionEventType["SUBSCRIPTION_CREATED"] = "subscription.created";
    SubscriptionEventType["SUBSCRIPTION_UPDATED"] = "subscription.updated";
    SubscriptionEventType["SUBSCRIPTION_CANCELED"] = "subscription.canceled";
    SubscriptionEventType["TRIAL_WILL_END"] = "subscription.trial_will_end";
    SubscriptionEventType["TRIAL_ENDED"] = "subscription.trial_ended";
    SubscriptionEventType["PAYMENT_FAILED"] = "subscription.payment_failed";
    SubscriptionEventType["PAYMENT_SUCCEEDED"] = "subscription.payment_succeeded";
})(SubscriptionEventType || (exports.SubscriptionEventType = SubscriptionEventType = {}));

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingEndpoint = exports.PremiumFeature = exports.RequireSubscriptionFeature = exports.AllowPausedSubscription = exports.RequireActiveSubscription = void 0;
const common_1 = require("@nestjs/common");
const RequireActiveSubscription = () => (0, common_1.SetMetadata)('subscriptionRequired', true);
exports.RequireActiveSubscription = RequireActiveSubscription;
const AllowPausedSubscription = () => (0, common_1.SetMetadata)('allowPausedSubscription', true);
exports.AllowPausedSubscription = AllowPausedSubscription;
const RequireSubscriptionFeature = (feature) => (0, common_1.SetMetadata)('requiredFeature', feature);
exports.RequireSubscriptionFeature = RequireSubscriptionFeature;
const PremiumFeature = () => (0, common_1.SetMetadata)('subscriptionRequired', true);
exports.PremiumFeature = PremiumFeature;
const BillingEndpoint = () => [
    (0, common_1.SetMetadata)('subscriptionRequired', true),
    (0, common_1.SetMetadata)('allowPausedSubscription', true)
];
exports.BillingEndpoint = BillingEndpoint;

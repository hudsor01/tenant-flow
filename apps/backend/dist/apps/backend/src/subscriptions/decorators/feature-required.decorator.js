"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FEATURES = exports.FeatureRequired = exports.FEATURE_REQUIRED_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.FEATURE_REQUIRED_KEY = 'feature_required';
const FeatureRequired = (feature) => (0, common_1.SetMetadata)(exports.FEATURE_REQUIRED_KEY, feature);
exports.FeatureRequired = FeatureRequired;
exports.FEATURES = {
    DATA_EXPORT: 'data_export',
    ADVANCED_ANALYTICS: 'advanced_analytics',
    BULK_OPERATIONS: 'bulk_operations',
    API_ACCESS: 'api_access',
    TEAM_COLLABORATION: 'team_collaboration',
    PREMIUM_INTEGRATIONS: 'premium_integrations'
};

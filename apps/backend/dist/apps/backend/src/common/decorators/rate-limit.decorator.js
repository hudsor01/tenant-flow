"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiRateLimits = exports.WebhookRateLimits = exports.AuthRateLimits = exports.RateLimit = exports.RATE_LIMIT_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.RATE_LIMIT_KEY = 'rateLimit';
const RateLimit = (options) => (0, common_1.SetMetadata)(exports.RATE_LIMIT_KEY, options);
exports.RateLimit = RateLimit;
exports.AuthRateLimits = {
    LOGIN: { ttl: 900, limit: 5 },
    REGISTER: { ttl: 3600, limit: 10 },
    PASSWORD_RESET: { ttl: 3600, limit: 3 },
    REFRESH_TOKEN: { ttl: 60, limit: 10 },
    GENERAL_AUTH: { ttl: 60, limit: 30 }
};
exports.WebhookRateLimits = {
    STRIPE_WEBHOOK: { ttl: 60, limit: 100 },
    SUPABASE_WEBHOOK: { ttl: 60, limit: 50 },
    GENERAL_WEBHOOK: { ttl: 60, limit: 30 }
};
exports.ApiRateLimits = {
    PUBLIC_API: { ttl: 60, limit: 100 },
    AUTHENTICATED_API: { ttl: 60, limit: 300 },
    ADMIN_API: { ttl: 60, limit: 1000 },
    FILE_UPLOAD: { ttl: 60, limit: 10 },
    SEARCH_API: { ttl: 60, limit: 50 }
};

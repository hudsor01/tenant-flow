"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSP_DOMAINS = void 0;
exports.generateCSPDirectives = generateCSPDirectives;
exports.cspDirectivesToString = cspDirectivesToString;
exports.getProductionCSP = getProductionCSP;
exports.getDevelopmentCSP = getDevelopmentCSP;
exports.getCSPString = getCSPString;
const cors_config_js_1 = require("./cors-config.js");
exports.CSP_DOMAINS = {
    API_DOMAINS: [...cors_config_js_1.APP_DOMAINS.BACKEND],
    STRIPE: [
        'https://js.stripe.com',
        'https://api.stripe.com',
        'https://checkout.stripe.com'
    ],
    SUPABASE: ['https://bshjmbshupiibfiewpxb.supabase.co'],
    POSTHOG: ['https://us.i.posthog.com', 'https://us-assets.i.posthog.com'],
    GOOGLE: [
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
        'https://maps.googleapis.com',
        'https://lh3.googleusercontent.com'
    ],
    VERCEL_DEV: ['https://vercel.live', 'https://*.vercel-scripts.com'],
    IMAGES: ['https://images.unsplash.com', 'data:', 'blob:']
};
function generateCSPDirectives(environment = 'production') {
    const isDev = environment === 'development';
    return {
        'default-src': ["'self'"],
        'script-src': [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            ...exports.CSP_DOMAINS.STRIPE,
            ...exports.CSP_DOMAINS.POSTHOG,
            ...exports.CSP_DOMAINS.GOOGLE,
            ...(isDev ? exports.CSP_DOMAINS.VERCEL_DEV : [])
        ],
        'style-src': [
            "'self'",
            "'unsafe-inline'",
            ...exports.CSP_DOMAINS.GOOGLE
        ],
        'font-src': [
            "'self'",
            'data:',
            ...exports.CSP_DOMAINS.GOOGLE
        ],
        'img-src': [
            "'self'",
            'https:',
            ...exports.CSP_DOMAINS.IMAGES,
            ...exports.CSP_DOMAINS.GOOGLE,
            ...exports.CSP_DOMAINS.SUPABASE
        ],
        'connect-src': [
            "'self'",
            ...exports.CSP_DOMAINS.API_DOMAINS,
            ...exports.CSP_DOMAINS.SUPABASE,
            ...exports.CSP_DOMAINS.STRIPE,
            ...exports.CSP_DOMAINS.POSTHOG
        ],
        'frame-src': ["'self'", ...exports.CSP_DOMAINS.STRIPE],
        'worker-src': ["'self'", 'blob:'],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': isDev ? ["'self'"] : ["'none'"],
        'upgrade-insecure-requests': true,
        'block-all-mixed-content': false
    };
}
function cspDirectivesToString(directives) {
    const parts = [];
    for (const [key, value] of Object.entries(directives)) {
        if (key === 'upgrade-insecure-requests' && value) {
            parts.push('upgrade-insecure-requests');
        }
        else if (key === 'block-all-mixed-content' && value) {
            parts.push('block-all-mixed-content');
        }
        else if (Array.isArray(value) && value.length > 0) {
            parts.push(`${key} ${value.join(' ')}`);
        }
    }
    return parts.join('; ');
}
function getProductionCSP() {
    return cspDirectivesToString(generateCSPDirectives('production'));
}
function getDevelopmentCSP() {
    return cspDirectivesToString(generateCSPDirectives('development'));
}
function getCSPString(environment) {
    const env = environment ||
        (process.env.NODE_ENV === 'development' ? 'development' : 'production');
    return cspDirectivesToString(generateCSPDirectives(env));
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_DOMAINS = void 0;
exports.getCORSOrigins = getCORSOrigins;
exports.getCORSOriginsForEnv = getCORSOriginsForEnv;
exports.getCORSConfig = getCORSConfig;
function getApplicationDomains() {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL;
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (isProduction) {
        const frontendList = [];
        const backendList = [];
        if (frontendUrl) {
            frontendList.push(frontendUrl, frontendUrl.replace('https://', 'https://www.'));
        }
        if (backendUrl) {
            backendList.push(backendUrl);
        }
        if (!frontendUrl || !backendUrl) {
            console.warn('Missing NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_API_BASE_URL during production build; falling back to localhost defaults for build.');
            frontendList.push('http://localhost:3000');
            backendList.push('http://localhost:4600');
        }
        return {
            FRONTEND: frontendList.filter(Boolean),
            BACKEND: backendList.filter(Boolean)
        };
    }
    const developmentOrigins = [];
    if (frontendUrl)
        developmentOrigins.push(frontendUrl);
    if (backendUrl)
        developmentOrigins.push(backendUrl);
    developmentOrigins.push('http://localhost:3000', 'http://localhost:4600');
    return {
        FRONTEND: developmentOrigins,
        BACKEND: developmentOrigins
    };
}
exports.APP_DOMAINS = getApplicationDomains();
function getCORSOrigins(environment = 'production') {
    if (environment === 'development') {
        return [...exports.APP_DOMAINS.FRONTEND, ...exports.APP_DOMAINS.BACKEND];
    }
    return [
        ...exports.APP_DOMAINS.FRONTEND,
        ...exports.APP_DOMAINS.BACKEND
    ];
}
function getCORSOriginsForEnv() {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    const env = isProduction ? 'production' : 'development';
    return getCORSOrigins(env);
}
function getCORSConfig() {
    return {
        origin: getCORSOriginsForEnv(),
        credentials: true,
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Origin',
            'X-Requested-With',
            'Content-Type',
            'Accept',
            'Authorization',
            'X-CSRF-Token',
            'X-XSRF-Token'
        ]
    };
}

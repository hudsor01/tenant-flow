(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push(["chunks/[root-of-the-server]__e41ebce4._.js", {

"[externals]/node:buffer [external] (node:buffer, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}}),
"[project]/apps/frontend/src/lib/logger.ts [middleware-edge] (ecmascript)": ((__turbopack_context__) => {
"use strict";

/**
 * Logger utility for frontend
 * Simple console wrapper with levels
 */ __turbopack_context__.s({
    "logger": ()=>logger
});
const logger = {
    debug: (message, ...args)=>{
        if ("TURBOPACK compile-time truthy", 1) {
            console.debug(`[DEBUG] ${message}`, ...args);
        }
    },
    info: (message, ...args)=>{
        console.info(`[INFO] ${message}`, ...args);
    },
    warn: (message, ...args)=>{
        console.warn(`[WARN] ${message}`, ...args);
    },
    error: (message, ...args)=>{
        console.error(`[ERROR] ${message}`, ...args);
    }
};
}),
"[project]/apps/frontend/src/lib/security/enhanced-security-headers.ts [middleware-edge] (ecmascript)": ((__turbopack_context__) => {
"use strict";

/**
 * Enhanced Security Headers with Nonce-Based CSP
 * Production-grade security with comprehensive protection
 */ __turbopack_context__.s({
    "applyEnhancedSecurityHeaders": ()=>applyEnhancedSecurityHeaders,
    "createSecureInlineScript": ()=>createSecureInlineScript,
    "createSecureScript": ()=>createSecureScript,
    "generateCSPNonce": ()=>generateCSPNonce,
    "getClientNonce": ()=>getClientNonce,
    "getOrCreateNonce": ()=>getOrCreateNonce,
    "handleCSPViolation": ()=>handleCSPViolation,
    "initializeCSPReporting": ()=>initializeCSPReporting,
    "useCSPNonce": ()=>useCSPNonce
});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/logger.ts [middleware-edge] (ecmascript)");
;
// Nonce storage for CSP
const nonceStore = new Map();
function generateCSPNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte)=>byte.toString(16).padStart(2, '0')).join('');
}
function getOrCreateNonce(sessionId) {
    const key = sessionId || 'global';
    const stored = nonceStore.get(key);
    if (stored && stored.expires > Date.now()) {
        return stored.nonce;
    }
    const nonce = generateCSPNonce();
    nonceStore.set(key, {
        nonce,
        expires: Date.now() + 60 * 60 * 1000
    });
    return nonce;
}
/**
 * Enhanced Security Configuration
 */ const ENHANCED_SECURITY_CONFIG = {
    // Content Security Policy with nonce support
    CSP: {
        'default-src': [
            "'self'"
        ],
        'script-src': [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            'https://js.stripe.com',
            'https://maps.googleapis.com',
            'https://us.i.posthog.com'
        ],
        'style-src': [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
            'https://cdn.jsdelivr.net'
        ],
        'img-src': [
            "'self'",
            'data:',
            'blob:',
            'https:',
            '*.supabase.co',
            '*.googleusercontent.com',
            'https://maps.googleapis.com',
            'https://maps.gstatic.com',
            'https://images.unsplash.com'
        ],
        'font-src': [
            "'self'",
            'data:',
            'https://fonts.gstatic.com',
            'https://cdn.jsdelivr.net'
        ],
        'connect-src': [
            "'self'",
            'https://api.tenantflow.app',
            'https://*.supabase.co',
            'https://js.stripe.com',
            'https://api.stripe.com',
            'https://us.i.posthog.com',
            'wss:'
        ],
        'frame-src': [
            "'self'",
            'https://js.stripe.com',
            'https://hooks.stripe.com'
        ],
        'object-src': [
            "'none'"
        ],
        'base-uri': [
            "'self'"
        ],
        'form-action': [
            "'self'"
        ],
        'frame-ancestors': [
            "'none'"
        ],
        'upgrade-insecure-requests': [],
        'block-all-mixed-content': []
    },
    // Enhanced Permissions Policy
    PERMISSIONS_POLICY: {
        camera: '()',
        microphone: '()',
        geolocation: '(self)',
        gyroscope: '()',
        magnetometer: '()',
        payment: '(self "https://js.stripe.com")',
        usb: '()',
        'interest-cohort': '()',
        'browsing-topics': '()',
        'attribution-reporting': '()',
        'trust-token-redemption': '()',
        fullscreen: '(self)',
        'picture-in-picture': '(self)',
        'accelerometer': '()',
        'ambient-light-sensor': '()',
        'autoplay': '(self)',
        'clipboard-read': '()',
        'clipboard-write': '(self)',
        'display-capture': '()',
        'document-domain': '()',
        'encrypted-media': '()',
        'execution-while-not-rendered': '()',
        'execution-while-out-of-viewport': '()',
        'gamepad': '()',
        'hid': '()',
        'idle-detection': '()',
        'local-fonts': '()',
        'midi': '()',
        'navigation-override': '()',
        'otp-credentials': '()',
        'publickey-credentials-create': '(self)',
        'publickey-credentials-get': '(self)',
        'screen-wake-lock': '()',
        'serial': '()',
        'speaker-selection': '()',
        'storage-access': '()',
        'web-share': '(self)',
        'window-management': '()',
        'xr-spatial-tracking': '()'
    },
    // Strict Transport Security
    HSTS: {
        maxAge: 63072000,
        includeSubDomains: true,
        preload: true
    },
    // Cross-Origin policies
    CROSS_ORIGIN: {
        embedderPolicy: 'require-corp',
        openerPolicy: 'same-origin',
        resourcePolicy: 'cross-origin'
    }
};
/**
 * Build CSP header with nonce replacement
 */ function buildEnhancedCSPHeader(isDevelopment, nonce) {
    const csp = {
        ...ENHANCED_SECURITY_CONFIG.CSP
    };
    // Replace nonce placeholder
    csp['script-src'] = csp['script-src'].map((src)=>src.replace('{{NONCE}}', nonce));
    csp['style-src'] = csp['style-src'].map((src)=>src.replace('{{NONCE}}', nonce));
    if (isDevelopment) {
        // Development-specific CSP adjustments for Next.js
        csp['connect-src'] = [
            ...csp['connect-src'],
            'ws://localhost:*',
            'ws://127.0.0.1:*',
            'http://localhost:*',
            'http://127.0.0.1:*',
            // Next.js dev server
            'http://localhost:3000',
            'http://localhost:3004'
        ];
        // Allow unsafe-eval for development builds (Next.js requires this)
        csp['script-src'] = [
            ...csp['script-src'],
            "'unsafe-eval'",
            "'unsafe-inline'"
        ];
        // Allow unsafe-inline for development styles (Next.js dev mode)
        csp['style-src'] = [
            ...csp['style-src'],
            "'unsafe-inline'"
        ];
        // More permissive object-src for development
        csp['object-src'] = [
            "'none'"
        ];
        // Allow data URLs for fonts in development
        csp['font-src'] = [
            ...csp['font-src'],
            "'unsafe-inline'"
        ];
    } else {
        // Production: Keep unsafe-inline for Next.js compatibility
        // Next.js requires these for proper functionality even in production
        // The framework adds its own security measures
        csp['script-src'] = csp['script-src'].filter((src)=>!src.includes('unsafe-eval') // Remove eval but keep unsafe-inline for Next.js
        );
    // Keep unsafe-inline for styles as Next.js requires it
    }
    // Build CSP string
    return Object.entries(csp).map(([directive, sources])=>{
        if (sources.length === 0) {
            return directive;
        }
        return `${directive} ${sources.join(' ')}`;
    }).join('; ');
}
/**
 * Build enhanced Permissions Policy header
 */ function buildEnhancedPermissionsPolicyHeader() {
    return Object.entries(ENHANCED_SECURITY_CONFIG.PERMISSIONS_POLICY).map(([feature, policy])=>`${feature}=${policy}`).join(', ');
}
function applyEnhancedSecurityHeaders(response, request, sessionId) {
    const isProduction = ("TURBOPACK compile-time value", "development") === 'production';
    const isDevelopment = ("TURBOPACK compile-time value", "development") === 'development';
    // Generate nonce for this request
    const nonce = getOrCreateNonce(sessionId);
    // Content Security Policy with nonce
    const cspHeader = buildEnhancedCSPHeader(isDevelopment, nonce);
    // Only apply CSP in production or when explicitly enabled in development
    if (isProduction || process.env.ENABLE_DEV_CSP === 'true') {
        response.headers.set('Content-Security-Policy', cspHeader);
    }
    // Store nonce in response header for client access
    response.headers.set('X-CSP-Nonce', nonce);
    // Report-Only CSP for testing new policies (removed - causes warnings without report-to)
    // Note: Report-only mode requires 'report-to' directive which needs endpoint setup
    // if (isDevelopment) {
    //   response.headers.set('Content-Security-Policy-Report-Only', cspHeader);
    // }
    // Strict Transport Security (HTTPS only)
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    // Enhanced security headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Enhanced Permissions Policy
    const permissionsPolicyHeader = buildEnhancedPermissionsPolicyHeader();
    response.headers.set('Permissions-Policy', permissionsPolicyHeader);
    // Cross-Origin policies
    response.headers.set('Cross-Origin-Embedder-Policy', ENHANCED_SECURITY_CONFIG.CROSS_ORIGIN.embedderPolicy);
    response.headers.set('Cross-Origin-Opener-Policy', ENHANCED_SECURITY_CONFIG.CROSS_ORIGIN.openerPolicy);
    response.headers.set('Cross-Origin-Resource-Policy', ENHANCED_SECURITY_CONFIG.CROSS_ORIGIN.resourcePolicy);
    // Additional security headers
    response.headers.set('X-Download-Options', 'noopen'); // IE security
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none'); // Adobe Flash/PDF
    response.headers.set('X-DNS-Prefetch-Control', 'on');
    // Certificate Transparency
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    // Remove server information
    response.headers.delete('Server');
    response.headers.delete('X-Powered-By');
    // Cache control based on route sensitivity
    if (isSensitiveRoute(request.nextUrl.pathname)) {
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        response.headers.set('Surrogate-Control', 'no-store');
    } else {
        response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=60');
    }
    // Security debugging in development
    if ("TURBOPACK compile-time truthy", 1) {
        response.headers.set('X-Security-Debug', 'enabled');
    // Removed X-CSP-Report-Only header as we're not using report-only mode
    }
    return response;
}
/**
 * Enhanced sensitive route detection
 */ function isSensitiveRoute(pathname) {
    const sensitivePatterns = [
        /^\/auth\//,
        /^\/admin\//,
        /^\/api\/.*\/(users|auth|admin)/,
        /^\/settings/,
        /^\/profile/,
        /financial|billing|payment/i,
        /tenant-dashboard/i,
        /landlord-portal/i,
        /properties\/.+/i,
        /tenants\/.+/i,
        /maintenance/i,
        /leases/i,
        /api\/.*\/(properties|tenants|maintenance|financial|leases)/i,
        /documents\/.*\.(pdf|doc|docx)/i
    ];
    return sensitivePatterns.some((pattern)=>pattern.test(pathname));
}
/**
 * Clean up expired nonces
 */ function cleanupExpiredNonces() {
    const now = Date.now();
    for (const [key, data] of nonceStore.entries()){
        if (data.expires < now) {
            nonceStore.delete(key);
        }
    }
}
// Start cleanup interval
setInterval(cleanupExpiredNonces, 10 * 60 * 1000); // Every 10 minutes
function getClientNonce() {
    if ("TURBOPACK compile-time truthy", 1) return null;
    //TURBOPACK unreachable
    ;
    // Try to get from meta tag first
    const metaNonce = undefined;
}
function useCSPNonce() {
    if ("TURBOPACK compile-time truthy", 1) {
        // useCSPNonce called on server-side. This hook is client-only.
        return null;
    }
    //TURBOPACK unreachable
    ;
}
function createSecureScript(src, nonce) {
    const script = document.createElement('script');
    script.src = src;
    if (nonce) {
        script.nonce = nonce;
    }
    return script;
}
function createSecureInlineScript(content, nonce) {
    const script = document.createElement('script');
    script.textContent = content;
    if (nonce) {
        script.nonce = nonce;
    }
    return script;
}
function handleCSPViolation(violationReport) {
    __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$logger$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["logger"].warn('[CSP VIOLATION]', {
        blockedURI: violationReport.blockedURI,
        documentURI: violationReport.documentURI,
        effectiveDirective: violationReport.effectiveDirective,
        originalPolicy: violationReport.originalPolicy,
        referrer: violationReport.referrer,
        violatedDirective: violationReport.violatedDirective,
        timestamp: new Date().toISOString()
    });
    // In production, send to monitoring service
    if (("TURBOPACK compile-time value", "development") === 'production') {
    // fetch('/api/csp-violations', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(violationReport)
    // }).catch(console.error);
    }
}
function initializeCSPReporting() {
    if ("TURBOPACK compile-time truthy", 1) return;
    //TURBOPACK unreachable
    ;
}
}),
"[project]/apps/frontend/src/middleware.ts [middleware-edge] (ecmascript)": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({
    "config": ()=>config,
    "middleware": ()=>middleware
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/spec-extension/response.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$security$2f$enhanced$2d$security$2d$headers$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/security/enhanced-security-headers.ts [middleware-edge] (ecmascript)");
;
;
function middleware(request) {
    // Create response
    const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$spec$2d$extension$2f$response$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    // Apply security headers
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$security$2f$enhanced$2d$security$2d$headers$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["applyEnhancedSecurityHeaders"])(response, request);
    return response;
}
const config = {
    matcher: [
        /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - api routes (API endpoints)
     * - favicon.ico (favicon file)
     * - public folder files
     * - files with extensions (css, js, json, xml, etc.)
     */ '/((?!api/|_next/static|_next/image|_next/webpack-hmr|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|json|xml|ico|woff|woff2|ttf|eot)$).*)'
    ]
};
}),
}]);

//# sourceMappingURL=%5Broot-of-the-server%5D__e41ebce4._.js.map
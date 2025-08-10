module.exports = {

"[externals]/stream [external] (stream, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}}),
"[externals]/http [external] (http, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}}),
"[externals]/url [external] (url, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}}),
"[externals]/punycode [external] (punycode, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("punycode", () => require("punycode"));

module.exports = mod;
}}),
"[externals]/https [external] (https, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}}),
"[externals]/zlib [external] (zlib, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}}),
"[project]/apps/frontend/src/lib/config.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

/**
 * Application configuration
 * Centralized configuration for the TenantFlow frontend
 */ __turbopack_context__.s({
    "config": ()=>config
});
const config = {
    api: {
        baseURL: ("TURBOPACK compile-time value", "https://api.tenantflow.app/api/v1") || 'https://api.tenantflow.app/api/v1',
        timeout: 30000
    },
    supabase: {
        url: ("TURBOPACK compile-time value", "https://bshjmbshupiibfiewpxb.supabase.co") || '',
        anonKey: ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaGptYnNodXBpaWJmaWV3cHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MDc1MDYsImV4cCI6MjA2Mzk4MzUwNn0.K9cR4SN_MtutRWPJsymtAtlHpEJFyfnQgtu8BjQRqko") || ''
    },
    stripe: {
        publishableKey: ("TURBOPACK compile-time value", "pk_live_51Rd0qyP3WCR53SdoTX2cuAbujIY3WaQSSpu1esdawYD3m96SLWyRRavIZpJkh9BDNdIr8DwYluWVoMQCMqLRUf6Y00jWRkMx8j") || ''
    },
    analytics: {
        posthogKey: ("TURBOPACK compile-time value", "phc_rSyH7L2ImIDIi4evbhKV2sozqmf5PWIZvGzFfrfuVHf") || '',
        posthogHost: ("TURBOPACK compile-time value", "https://us.i.posthog.com") || ''
    },
    app: {
        env: ("TURBOPACK compile-time value", "production") || 'development',
        version: ("TURBOPACK compile-time value", "1.0.0") || '1.0.0',
        name: 'TenantFlow'
    },
    features: {
        analytics: ("TURBOPACK compile-time value", "true") === 'true',
        errorReporting: ("TURBOPACK compile-time value", "true") === 'true'
    }
};
// Comprehensive environment validation
const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_POSTHOG_KEY',
    'NEXT_PUBLIC_POSTHOG_HOST'
];
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
}),
"[project]/apps/frontend/src/lib/supabase.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

/**
 * Supabase client configuration
 * Handles authentication and database connections
 */ __turbopack_context__.s({
    "auth": ()=>auth,
    "getSession": ()=>getSession,
    "getUser": ()=>getUser,
    "onAuthStateChange": ()=>onAuthStateChange,
    "supabase": ()=>supabase
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/module/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/config.ts [app-rsc] (ecmascript)");
;
;
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["config"].supabase.url, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["config"].supabase.anonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
    }
});
const auth = supabase.auth;
async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    return {
        session,
        error
    };
}
async function getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return {
        user,
        error
    };
}
function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
}
}),
"[externals]/node:fs [external] (node:fs, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("node:fs", () => require("node:fs"));

module.exports = mod;
}}),
"[externals]/node:readline [external] (node:readline, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("node:readline", () => require("node:readline"));

module.exports = mod;
}}),
"[project]/apps/frontend/src/lib/analytics/posthog-server.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"00f55bb2cd605bfce032ffb4f7b3e59bba20cb882d":"shutdownPostHog","60c917ae2b0150a3aa37e9921befdf89865200e333":"identifyUser","7013fbbc59ee8b15cc56e687f7e6e52b5f11159bd2":"trackServerSideEvent"},"",""] */ __turbopack_context__.s({
    "identifyUser": ()=>identifyUser,
    "shutdownPostHog": ()=>shutdownPostHog,
    "trackServerSideEvent": ()=>trackServerSideEvent
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$posthog$2d$node$2f$lib$2f$node$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/posthog-node/lib/node/index.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
// Initialize PostHog for server-side tracking
const posthog = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$posthog$2d$node$2f$lib$2f$node$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PostHog"](("TURBOPACK compile-time value", "phc_rSyH7L2ImIDIi4evbhKV2sozqmf5PWIZvGzFfrfuVHf"), {
    host: ("TURBOPACK compile-time value", "https://us.i.posthog.com") || 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0
});
async function trackServerSideEvent(eventName, userId, properties) {
    try {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        posthog.capture({
            distinctId: userId || 'anonymous',
            event: eventName,
            properties: {
                ...properties,
                $lib: 'posthog-node',
                $lib_version: '4.0.1',
                environment: ("TURBOPACK compile-time value", "development"),
                timestamp: new Date().toISOString()
            }
        });
        // Ensure event is sent immediately
        await posthog.flush();
    } catch (error) {
        console.error('Failed to track server-side event:', error);
    }
}
async function identifyUser(userId, properties) {
    try {
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        posthog.identify({
            distinctId: userId,
            properties: {
                ...properties,
                $set: properties
            }
        });
        await posthog.flush();
    } catch (error) {
        console.error('Failed to identify user server-side:', error);
    }
}
async function shutdownPostHog() {
    await posthog.shutdown();
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    trackServerSideEvent,
    identifyUser,
    shutdownPostHog
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(trackServerSideEvent, "7013fbbc59ee8b15cc56e687f7e6e52b5f11159bd2", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(identifyUser, "60c917ae2b0150a3aa37e9921befdf89865200e333", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(shutdownPostHog, "00f55bb2cd605bfce032ffb4f7b3e59bba20cb882d", null);
}),
"[externals]/jsdom [external] (jsdom, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("jsdom", () => require("jsdom"));

module.exports = mod;
}}),
"[project]/apps/frontend/src/lib/security/input-sanitization.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

/**
 * Enterprise Input Sanitization and XSS Prevention
 * Comprehensive protection against injection attacks
 */ __turbopack_context__.s({
    "createSanitizationMiddleware": ()=>createSanitizationMiddleware,
    "detectCommandInjection": ()=>detectCommandInjection,
    "detectPathTraversal": ()=>detectPathTraversal,
    "detectSQLInjection": ()=>detectSQLInjection,
    "detectXSS": ()=>detectXSS,
    "sanitizeFormData": ()=>sanitizeFormData,
    "sanitizeHTML": ()=>sanitizeHTML,
    "sanitizeText": ()=>sanitizeText,
    "sanitizeURL": ()=>sanitizeURL,
    "validateAndSanitizeInput": ()=>validateAndSanitizeInput
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$isomorphic$2d$dompurify$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/isomorphic-dompurify/index.js [app-rsc] (ecmascript)");
;
// Default configuration for different contexts
const SANITIZATION_CONFIGS = {
    // Strict: No HTML allowed at all
    strict: {
        allowedTags: [],
        allowedAttributes: {},
        allowedSchemes: [],
        forbiddenTags: [
            'script',
            'object',
            'embed',
            'iframe',
            'form',
            'input',
            'textarea'
        ],
        forbiddenAttributes: [
            'on*',
            'javascript:',
            'vbscript:',
            'data:'
        ]
    },
    // Basic: Only basic formatting
    basic: {
        allowedTags: [
            'b',
            'i',
            'em',
            'strong',
            'p',
            'br',
            'span'
        ],
        allowedAttributes: {
            '*': [
                'class'
            ]
        },
        allowedSchemes: [],
        forbiddenTags: [
            'script',
            'object',
            'embed',
            'iframe',
            'form',
            'input',
            'textarea',
            'style'
        ],
        forbiddenAttributes: [
            'on*',
            'javascript:',
            'vbscript:',
            'data:',
            'style'
        ]
    },
    // Rich: Rich text editing (controlled)
    rich: {
        allowedTags: [
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'p',
            'br',
            'span',
            'div',
            'b',
            'i',
            'u',
            'em',
            'strong',
            'ul',
            'ol',
            'li',
            'a',
            'img',
            'blockquote',
            'code',
            'pre'
        ],
        allowedAttributes: {
            'a': [
                'href',
                'title',
                'target'
            ],
            'img': [
                'src',
                'alt',
                'title',
                'width',
                'height'
            ],
            '*': [
                'class'
            ]
        },
        allowedSchemes: [
            'http',
            'https',
            'mailto'
        ],
        forbiddenTags: [
            'script',
            'object',
            'embed',
            'iframe',
            'form',
            'input',
            'textarea',
            'style'
        ],
        forbiddenAttributes: [
            'on*',
            'javascript:',
            'vbscript:',
            'data:'
        ]
    }
};
/**
 * Comprehensive XSS patterns for detection
 */ const XSS_PATTERNS = [
    // Script injection
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    // Data URLs with executable content
    /data:text\/html/gi,
    /data:text\/javascript/gi,
    /data:application\/javascript/gi,
    // Expression and CSS injection
    /expression\s*\(/gi,
    /behaviour\s*:/gi,
    /-moz-binding\s*:/gi,
    // Common XSS vectors
    /<iframe[\s\S]*?>/gi,
    /<object[\s\S]*?>/gi,
    /<embed[\s\S]*?>/gi,
    /<form[\s\S]*?>/gi,
    /<input[\s\S]*?>/gi,
    /<textarea[\s\S]*?>/gi,
    // SVG XSS vectors
    /<svg[\s\S]*?on\w+[\s\S]*?>/gi,
    // Meta refresh redirects
    /<meta[\s\S]*?http-equiv[\s\S]*?refresh/gi
];
/**
 * SQL Injection patterns for detection
 */ const SQL_INJECTION_PATTERNS = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
    /(\b(or|and)\b\s+\d+\s*=\s*\d+)/gi,
    /(['"])\s*;\s*(drop|delete|insert|update)/gi,
    /(\bor\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/gi,
    /(\/\*[\s\S]*?\*\/)/gi,
    /(--\s*[\r\n])/gi
];
/**
 * Path traversal patterns
 */ const PATH_TRAVERSAL_PATTERNS = [
    /\.\.[\\/]/g,
    /~[\\/]/g,
    /\%2e\%2e[\\/]/gi,
    /\%252e\%252e[\\/]/gi
];
/**
 * Command injection patterns
 */ const COMMAND_INJECTION_PATTERNS = [
    /[;&|`$()]/g,
    /\b(cat|ls|pwd|id|whoami|uname|wget|curl|nc|netcat)\b/gi
];
function sanitizeHTML(input, profile = 'basic') {
    if (typeof input !== 'string' || !input.trim()) {
        return '';
    }
    const config = SANITIZATION_CONFIGS[profile];
    // Configure DOMPurify
    const cleanConfig = {
        ALLOWED_TAGS: config.allowedTags,
        ALLOWED_ATTR: Object.keys(config.allowedAttributes).reduce((acc, tag)=>{
            return [
                ...acc,
                ...config.allowedAttributes[tag]
            ];
        }, []),
        ALLOWED_URI_REGEXP: config.allowedSchemes.length > 0 ? new RegExp(`^(?:${config.allowedSchemes.join('|')}):`, 'i') : /^$/,
        FORBID_TAGS: config.forbiddenTags,
        FORBID_ATTR: config.forbiddenAttributes,
        ALLOW_DATA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false,
        SANITIZE_DOM: true,
        KEEP_CONTENT: true
    };
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$isomorphic$2d$dompurify$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"].sanitize(input, cleanConfig);
}
function sanitizeText(input) {
    if (typeof input !== 'string') {
        return '';
    }
    return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;');
}
function sanitizeURL(url) {
    if (typeof url !== 'string' || !url.trim()) {
        return '';
    }
    const trimmedUrl = url.trim();
    // Block dangerous schemes
    const dangerousSchemes = /^(javascript|vbscript|data|file|ftp):/i;
    if (dangerousSchemes.test(trimmedUrl)) {
        return '';
    }
    // Only allow http, https, mailto, and relative URLs
    const allowedSchemes = /^(https?|mailto):/i;
    const isRelative = /^[\/\.\w-]/.test(trimmedUrl);
    if (!allowedSchemes.test(trimmedUrl) && !isRelative) {
        return '';
    }
    return encodeURI(decodeURI(trimmedUrl));
}
function detectXSS(input) {
    if (typeof input !== 'string') {
        return {
            isXSS: false,
            patterns: [],
            severity: 'low'
        };
    }
    const detectedPatterns = [];
    for (const pattern of XSS_PATTERNS){
        const matches = input.match(pattern);
        if (matches) {
            detectedPatterns.push(pattern.source);
        }
    }
    const severity = detectedPatterns.length > 2 ? 'high' : detectedPatterns.length > 0 ? 'medium' : 'low';
    return {
        isXSS: detectedPatterns.length > 0,
        patterns: detectedPatterns,
        severity
    };
}
function detectSQLInjection(input) {
    if (typeof input !== 'string') {
        return {
            isSQLI: false,
            patterns: [],
            severity: 'low'
        };
    }
    const detectedPatterns = [];
    for (const pattern of SQL_INJECTION_PATTERNS){
        const matches = input.match(pattern);
        if (matches) {
            detectedPatterns.push(pattern.source);
        }
    }
    const severity = detectedPatterns.length > 2 ? 'high' : detectedPatterns.length > 0 ? 'medium' : 'low';
    return {
        isSQLI: detectedPatterns.length > 0,
        patterns: detectedPatterns,
        severity
    };
}
function detectPathTraversal(input) {
    if (typeof input !== 'string') {
        return false;
    }
    return PATH_TRAVERSAL_PATTERNS.some((pattern)=>pattern.test(input));
}
function detectCommandInjection(input) {
    if (typeof input !== 'string') {
        return false;
    }
    return COMMAND_INJECTION_PATTERNS.some((pattern)=>pattern.test(input));
}
function validateAndSanitizeInput(input, options = {}) {
    const { type = 'text', maxLength = 10000, allowEmpty = false, htmlProfile = 'basic', strict = false } = options;
    const errors = [];
    const warnings = [];
    let sanitized = '';
    // Type validation
    if (typeof input !== 'string') {
        if (input === null || input === undefined) {
            if (!allowEmpty) {
                errors.push('Input is required');
            }
            return {
                valid: allowEmpty,
                sanitized: '',
                errors,
                warnings
            };
        } else {
            input = String(input);
        }
    }
    const stringInput = input;
    // Length validation
    if (stringInput.length > maxLength) {
        errors.push(`Input exceeds maximum length of ${maxLength} characters`);
        return {
            valid: false,
            sanitized: '',
            errors,
            warnings
        };
    }
    if (!allowEmpty && stringInput.trim().length === 0) {
        errors.push('Input cannot be empty');
        return {
            valid: false,
            sanitized: '',
            errors,
            warnings
        };
    }
    // Security checks
    const xssCheck = detectXSS(stringInput);
    const sqliCheck = detectSQLInjection(stringInput);
    const pathTraversalCheck = detectPathTraversal(stringInput);
    const commandInjectionCheck = detectCommandInjection(stringInput);
    if (strict) {
        if (xssCheck.isXSS) {
            errors.push('Potential XSS content detected');
        }
        if (sqliCheck.isSQLI) {
            errors.push('Potential SQL injection detected');
        }
        if (pathTraversalCheck) {
            errors.push('Path traversal attempt detected');
        }
        if (commandInjectionCheck) {
            errors.push('Command injection attempt detected');
        }
    } else {
        // Non-strict mode: warn but sanitize
        if (xssCheck.isXSS && xssCheck.severity === 'high') {
            warnings.push('Potentially malicious content was sanitized');
        }
        if (sqliCheck.isSQLI) {
            warnings.push('SQL-like patterns were detected and sanitized');
        }
    }
    // Type-specific sanitization
    switch(type){
        case 'html':
            sanitized = sanitizeHTML(stringInput, htmlProfile);
            break;
        case 'url':
            sanitized = sanitizeURL(stringInput);
            break;
        case 'email':
            // Basic email sanitization (additional validation should be done with schema)
            sanitized = sanitizeText(stringInput.toLowerCase().trim());
            break;
        case 'phone':
            // Remove all non-numeric characters except +, spaces, hyphens, parentheses
            sanitized = stringInput.replace(/[^\d\s\-\(\)\+]/g, '');
            break;
        case 'number':
            // Remove all non-numeric characters except decimal point and minus
            sanitized = stringInput.replace(/[^\d\.\-]/g, '');
            break;
        case 'text':
        default:
            sanitized = sanitizeText(stringInput);
            break;
    }
    return {
        valid: errors.length === 0,
        sanitized,
        errors,
        warnings
    };
}
function sanitizeFormData(formData, fieldConfigs = {}) {
    const sanitized = {};
    const errors = {};
    const warnings = {};
    let valid = true;
    for (const [key, value] of Object.entries(formData)){
        const config = fieldConfigs[key] || {};
        const result = validateAndSanitizeInput(value, config);
        if (!result.valid) {
            valid = false;
            errors[key] = result.errors;
        }
        if (result.warnings.length > 0) {
            warnings[key] = result.warnings;
        }
        sanitized[key] = result.sanitized;
    }
    return {
        valid,
        sanitized,
        errors,
        warnings
    };
}
function createSanitizationMiddleware(fieldConfigs) {
    return (req, res, next)=>{
        const contentType = req.headers.get('content-type') || '';
        if (contentType.includes('application/json') && req.body) {
            const result = sanitizeFormData(req.body, fieldConfigs);
            if (!result.valid) {
                res.status(400).json({
                    error: 'Invalid input data',
                    details: result.errors
                });
                return;
            }
            if (req.body) {
                req.body = result.sanitized;
            }
            if (Object.keys(result.warnings).length > 0) {
                res.setHeader('X-Input-Warnings', JSON.stringify(result.warnings));
            }
        }
        next();
    };
}
}),
"[project]/apps/frontend/src/lib/validation/schemas.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

/**
 * Form validation schemas using Zod with security enhancements
 * Integrated with security input sanitization system
 */ __turbopack_context__.s({
    "commonValidations": ()=>commonValidations,
    "createFormSchema": ()=>createFormSchema,
    "leaseFormSchema": ()=>leaseFormSchema,
    "leaseSchema": ()=>leaseSchema,
    "loginSchema": ()=>loginSchema,
    "maintenanceRequestSchema": ()=>maintenanceRequestSchema,
    "paymentFormSchema": ()=>paymentFormSchema,
    "profileUpdateSchema": ()=>profileUpdateSchema,
    "propertyFormSchema": ()=>propertyFormSchema,
    "propertySchema": ()=>propertySchema,
    "signupSchema": ()=>signupSchema,
    "tenantFormSchema": ()=>tenantFormSchema,
    "tenantSchema": ()=>tenantSchema,
    "unitFormSchema": ()=>unitFormSchema
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-rsc] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$security$2f$input$2d$sanitization$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/security/input-sanitization.ts [app-rsc] (ecmascript)");
;
;
const propertySchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Property name is required').max(100),
    address: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Address is required').max(200),
    city: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'City is required').max(100),
    state: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(2, 'State is required').max(2),
    zipCode: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(5, 'ZIP code is required').max(10),
    propertyType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'SINGLE_FAMILY',
        'APARTMENT',
        'CONDO',
        'TOWNHOUSE',
        'OTHER'
    ]),
    description: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional()
});
const tenantSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    firstName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'First name is required').max(50),
    lastName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Last name is required').max(50),
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email('Valid email is required'),
    phone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(10, 'Phone number is required'),
    dateOfBirth: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].date().optional(),
    emergencyContact: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
        phone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional()
    }).optional()
});
const leaseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    tenantId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid('Valid tenant ID is required'),
    propertyId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid('Valid property ID is required'),
    unitId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().optional(),
    startDate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].date(),
    endDate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].date(),
    monthlyRent: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().positive('Monthly rent must be positive'),
    securityDeposit: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().nonnegative('Security deposit cannot be negative'),
    leaseTerms: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional()
});
const commonValidations = {
    // Basic text fields
    requiredString: (fieldName)=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, `${fieldName} is required`),
    optionalString: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').transform((val)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$security$2f$input$2d$sanitization$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sanitizeText"])(val)).refine((val)=>{
        const validation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$security$2f$input$2d$sanitization$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["validateAndSanitizeInput"])(val, {
            type: 'text',
            strict: true
        });
        return validation.valid;
    }, 'Name contains invalid characters'),
    title: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
    description: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(10, 'Please provide a detailed description').max(1000, 'Description must be less than 1000 characters').transform((val)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$security$2f$input$2d$sanitization$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["sanitizeText"])(val)).refine((val)=>{
        const validation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$security$2f$input$2d$sanitization$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["validateAndSanitizeInput"])(val, {
            type: 'text',
            strict: true
        });
        return validation.valid;
    }, 'Description contains invalid or potentially dangerous content'),
    // Contact information
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Email is required').email('Please enter a valid email address').transform((val)=>val.toLowerCase().trim()).refine((val)=>{
        const validation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$security$2f$input$2d$sanitization$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["validateAndSanitizeInput"])(val, {
            type: 'email',
            strict: true
        });
        return validation.valid;
    }, 'Email contains invalid characters'),
    phone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Phone number is required').regex(/^\+?[\d\s\-()]+$/, 'Please enter a valid phone number'),
    // Address fields
    address: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Address is required'),
    city: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'City is required'),
    state: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'State is required'),
    zipCode: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'ZIP code is required').regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),
    // Numeric fields
    positiveNumber: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0, 'Must be a positive number'),
    currency: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0, 'Amount must be positive'),
    percentage: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).max(100, 'Percentage must be between 0 and 100'),
    // Property-specific fields
    propertyType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'SINGLE_FAMILY',
        'MULTI_FAMILY',
        'APARTMENT',
        'COMMERCIAL',
        'OTHER'
    ]),
    unitNumber: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Unit number is required').max(20, 'Unit number must be less than 20 characters'),
    bedrooms: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).max(10),
    bathrooms: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).max(10),
    squareFeet: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(100).max(10000).optional(),
    rent: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0).max(100000),
    // Status enums
    unitStatus: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'VACANT',
        'OCCUPIED',
        'MAINTENANCE',
        'UNAVAILABLE'
    ]),
    maintenancePriority: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'LOW',
        'MEDIUM',
        'HIGH',
        'URGENT'
    ]),
    maintenanceCategory: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'PLUMBING',
        'ELECTRICAL',
        'HVAC',
        'APPLIANCE',
        'GENERAL',
        'EMERGENCY'
    ]),
    // Date fields
    date: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].date(),
    optionalDate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].date().optional(),
    // File upload with security validation
    file: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].instanceof(File).optional().refine(async (file)=>{
        if (!file) return true;
        const { validateFile } = await __turbopack_context__.r("[project]/apps/frontend/src/lib/security/file-upload-security.ts [app-rsc] (ecmascript, async loader)")(__turbopack_context__.i);
        const result = await validateFile(file, 'documents');
        return result.valid;
    }, 'File failed security validation')
};
const createFormSchema = (shape)=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object(shape);
const propertyFormSchema = createFormSchema({
    name: commonValidations.name,
    description: commonValidations.description,
    address: commonValidations.address,
    city: commonValidations.city,
    state: commonValidations.state,
    zipCode: commonValidations.zipCode,
    propertyType: commonValidations.propertyType,
    numberOfUnits: commonValidations.positiveNumber
});
const unitFormSchema = createFormSchema({
    unitNumber: commonValidations.unitNumber,
    propertyId: commonValidations.requiredString('Property ID'),
    bedrooms: commonValidations.bedrooms,
    bathrooms: commonValidations.bathrooms,
    squareFeet: commonValidations.squareFeet,
    rent: commonValidations.rent,
    status: commonValidations.unitStatus
});
const maintenanceRequestSchema = createFormSchema({
    unitId: commonValidations.requiredString('Unit'),
    title: commonValidations.title,
    description: commonValidations.description,
    category: commonValidations.maintenanceCategory,
    priority: commonValidations.maintenancePriority
});
const tenantFormSchema = createFormSchema({
    name: commonValidations.name,
    email: commonValidations.email,
    phone: commonValidations.phone,
    emergencyContactName: commonValidations.name,
    emergencyContactPhone: commonValidations.phone
});
const paymentFormSchema = createFormSchema({
    amount: commonValidations.currency,
    dueDate: commonValidations.date,
    description: commonValidations.description
});
const leaseFormSchema = createFormSchema({
    tenantId: commonValidations.requiredString('Tenant'),
    unitId: commonValidations.requiredString('Unit'),
    startDate: commonValidations.date,
    endDate: commonValidations.date,
    monthlyRent: commonValidations.currency,
    securityDeposit: commonValidations.currency,
    terms: commonValidations.description
});
const loginSchema = createFormSchema({
    email: commonValidations.email,
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Password is required')
});
const signupSchema = createFormSchema({
    email: commonValidations.email,
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Please confirm your password'),
    firstName: commonValidations.name,
    lastName: commonValidations.name
}).refine((data)=>data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: [
        'confirmPassword'
    ]
});
const profileUpdateSchema = createFormSchema({
    firstName: commonValidations.name,
    lastName: commonValidations.name,
    phone: commonValidations.phone.optional(),
    address: commonValidations.address.optional(),
    city: commonValidations.city.optional(),
    state: commonValidations.state.optional(),
    zipCode: commonValidations.zipCode.optional()
});
}),
"[project]/apps/frontend/src/lib/actions/auth-actions.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"0050d7645596aebb8e3d6554e26d9a33bdf032a0bd":"getCurrentUser","00bb70007f6623d69d6022c651b1464c3980bc081a":"signInWithGitHub","00e910cadf0b232473915927567d3b5848de83eb3b":"signInWithGoogle","00ef4bd1908dd6b6594e03fefddfcf0b1ff7785d96":"requireAuth","00fa0b760d75df25ad2d603f356ae96344b3c04945":"logoutAction","605022e81855ee76fa9060513f75c44a32bd82a619":"loginAction","605a7a62105d87fb6a9d39a26e514bdc1b92743e51":"signupAction","60ac14ea594dede6a06caef4d99a4363766a425d17":"forgotPasswordAction","60f6e0201b58a5db560fbfb16596a74c685e3ff508":"updatePasswordAction"},"",""] */ __turbopack_context__.s({
    "forgotPasswordAction": ()=>forgotPasswordAction,
    "getCurrentUser": ()=>getCurrentUser,
    "loginAction": ()=>loginAction,
    "logoutAction": ()=>logoutAction,
    "requireAuth": ()=>requireAuth,
    "signInWithGitHub": ()=>signInWithGitHub,
    "signInWithGoogle": ()=>signInWithGoogle,
    "signupAction": ()=>signupAction,
    "updatePasswordAction": ()=>updatePasswordAction
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-rsc] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/supabase.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$analytics$2f$posthog$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/analytics/posthog-server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$validation$2f$schemas$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/validation/schemas.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
// Auth form schemas using consolidated validations
const LoginSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    email: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$validation$2f$schemas$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["commonValidations"].email,
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(6, 'Password must be at least 6 characters')
});
const SignupSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    email: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$validation$2f$schemas$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["commonValidations"].email,
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(8, 'Password must be at least 8 characters'),
    fullName: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$validation$2f$schemas$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["commonValidations"].name,
    companyName: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$validation$2f$schemas$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["commonValidations"].optionalString
}).refine((data)=>data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: [
        "confirmPassword"
    ]
});
const ResetPasswordSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    email: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$validation$2f$schemas$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["commonValidations"].email
});
const UpdatePasswordSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(8, 'Password must be at least 8 characters')
}).refine((data)=>data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: [
        "confirmPassword"
    ]
});
async function loginAction(prevState, formData) {
    const rawData = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    const result = LoginSchema.safeParse(rawData);
    if (!result.success) {
        return {
            errors: result.error.flatten().fieldErrors
        };
    }
    try {
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"].signInWithPassword({
            email: result.data.email,
            password: result.data.password
        });
        if (error) {
            // Track failed login attempt
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$analytics$2f$posthog$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["trackServerSideEvent"])('user_login_failed', undefined, {
                error_message: error.message,
                email_domain: result.data.email.split('@')[1],
                method: 'email'
            });
            return {
                errors: {
                    _form: [
                        error.message
                    ]
                }
            };
        }
        // Track successful login
        if (data.user) {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$analytics$2f$posthog$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["trackServerSideEvent"])('user_signed_in', data.user.id, {
                method: 'email',
                email: data.user.email,
                user_id: data.user.id,
                session_id: data.session?.access_token?.slice(-8)
            });
        }
        // Revalidate auth-related caches
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidateTag"])('user');
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidateTag"])('session');
        // Redirect to dashboard
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/dashboard');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        return {
            errors: {
                _form: [
                    message
                ]
            }
        };
    }
}
async function signupAction(prevState, formData) {
    const rawData = {
        email: formData.get('email'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword'),
        fullName: formData.get('fullName'),
        companyName: formData.get('companyName')
    };
    const result = SignupSchema.safeParse(rawData);
    if (!result.success) {
        return {
            errors: result.error.flatten().fieldErrors
        };
    }
    try {
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"].signUp({
            email: result.data.email,
            password: result.data.password,
            options: {
                data: {
                    full_name: result.data.fullName,
                    company_name: result.data.companyName
                }
            }
        });
        if (error) {
            // Track failed signup attempt
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$analytics$2f$posthog$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["trackServerSideEvent"])('user_signup_failed', undefined, {
                error_message: error.message,
                email_domain: result.data.email.split('@')[1],
                has_company_name: !!result.data.companyName
            });
            return {
                errors: {
                    _form: [
                        error.message
                    ]
                }
            };
        }
        // Track successful signup
        if (data.user) {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$analytics$2f$posthog$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["trackServerSideEvent"])('user_signed_up', data.user.id, {
                method: 'email',
                email: data.user.email,
                user_id: data.user.id,
                has_company_name: !!result.data.companyName,
                full_name: result.data.fullName,
                needs_email_verification: !data.user.email_confirmed_at
            });
        }
        return {
            success: true,
            message: 'Account created! Please check your email to verify your account.'
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Signup failed';
        return {
            errors: {
                _form: [
                    message
                ]
            }
        };
    }
}
async function logoutAction() {
    try {
        // Get current user for tracking before logout
        const { data: { user } } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
        await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"].signOut();
        // Track logout event
        if (user) {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$analytics$2f$posthog$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["trackServerSideEvent"])('user_signed_out', user.id, {
                user_id: user.id,
                email: user.email,
                logout_method: 'manual'
            });
        }
        // Clear all cached data
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidateTag"])('user');
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidateTag"])('session');
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidateTag"])('properties');
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidateTag"])('tenants');
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidateTag"])('leases');
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidateTag"])('maintenance');
        // Redirect to home page
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Logout error:', message);
        return {
            errors: {
                _form: [
                    message
                ]
            }
        };
    }
}
async function forgotPasswordAction(prevState, formData) {
    const rawData = {
        email: formData.get('email')
    };
    const result = ResetPasswordSchema.safeParse(rawData);
    if (!result.success) {
        return {
            errors: result.error.flatten().fieldErrors
        };
    }
    try {
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"].resetPasswordForEmail(result.data.email, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/update-password`
        });
        if (error) {
            return {
                errors: {
                    _form: [
                        error.message
                    ]
                }
            };
        }
        return {
            success: true,
            message: 'Password reset email sent! Check your inbox for instructions.'
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to send reset email';
        return {
            errors: {
                _form: [
                    message
                ]
            }
        };
    }
}
async function updatePasswordAction(prevState, formData) {
    const rawData = {
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword')
    };
    const result = UpdatePasswordSchema.safeParse(rawData);
    if (!result.success) {
        return {
            errors: result.error.flatten().fieldErrors
        };
    }
    try {
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"].updateUser({
            password: result.data.password
        });
        if (error) {
            return {
                errors: {
                    _form: [
                        error.message
                    ]
                }
            };
        }
        // Revalidate user data
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidateTag"])('user');
        return {
            success: true,
            message: 'Password updated successfully!'
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update password';
        return {
            errors: {
                _form: [
                    message
                ]
            }
        };
    }
}
async function getCurrentUser() {
    try {
        const { data: { user } } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
        if (!user) return null;
        return {
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email,
            avatar_url: user.user_metadata?.avatar_url
        };
    } catch (error) {
        console.error('Get current user error:', error);
        return null;
    }
}
async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/login');
    }
    return user;
}
async function signInWithGoogle() {
    // Construct the redirect URL, fallback to localhost for development
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ("TURBOPACK compile-time value", "https://tenantflow.app") || 'http://localhost:3000';
    const redirectTo = `${siteUrl}/auth/callback`;
    console.log('[OAuth Debug] Initiating Google sign-in with redirect to:', redirectTo);
    const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"].signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent'
            }
        }
    });
    if (error) {
        console.error('[OAuth Error] Google sign-in failed:', error);
        // Track failed OAuth attempt
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$analytics$2f$posthog$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["trackServerSideEvent"])('user_oauth_failed', undefined, {
            provider: 'google',
            error_message: error.message,
            method: 'oauth'
        });
        throw new Error('Unable to sign in with Google. Please try again or contact support if the issue persists.');
    }
    // Track OAuth initiation
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$analytics$2f$posthog$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["trackServerSideEvent"])('user_oauth_initiated', undefined, {
        provider: 'google',
        method: 'oauth',
        redirect_url: data.url
    });
    if (data.url) {
        console.log('[OAuth Debug] Redirecting to Google OAuth URL:', data.url);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])(data.url);
    } else {
        console.error('[OAuth Error] No redirect URL received from Supabase');
        throw new Error('Authentication service temporarily unavailable. Please try again in a few moments.');
    }
}
async function signInWithGitHub() {
    // Construct the redirect URL, fallback to localhost for development
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ("TURBOPACK compile-time value", "https://tenantflow.app") || 'http://localhost:3000';
    const redirectTo = `${siteUrl}/auth/callback`;
    console.log('[OAuth Debug] Initiating GitHub sign-in with redirect to:', redirectTo);
    const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"].signInWithOAuth({
        provider: 'github',
        options: {
            redirectTo
        }
    });
    if (error) {
        console.error('[OAuth Error] GitHub sign-in failed:', error);
        // Track failed OAuth attempt
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$analytics$2f$posthog$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["trackServerSideEvent"])('user_oauth_failed', undefined, {
            provider: 'github',
            error_message: error.message,
            method: 'oauth'
        });
        throw new Error('Unable to sign in with GitHub. Please try again or contact support if the issue persists.');
    }
    // Track OAuth initiation
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$analytics$2f$posthog$2d$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["trackServerSideEvent"])('user_oauth_initiated', undefined, {
        provider: 'github',
        method: 'oauth',
        redirect_url: data.url
    });
    if (data.url) {
        console.log('[OAuth Debug] Redirecting to GitHub OAuth URL:', data.url);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])(data.url);
    } else {
        console.error('[OAuth Error] No redirect URL received from Supabase');
        throw new Error('Authentication service temporarily unavailable. Please try again in a few moments.');
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    loginAction,
    signupAction,
    logoutAction,
    forgotPasswordAction,
    updatePasswordAction,
    getCurrentUser,
    requireAuth,
    signInWithGoogle,
    signInWithGitHub
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(loginAction, "605022e81855ee76fa9060513f75c44a32bd82a619", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(signupAction, "605a7a62105d87fb6a9d39a26e514bdc1b92743e51", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(logoutAction, "00fa0b760d75df25ad2d603f356ae96344b3c04945", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(forgotPasswordAction, "60ac14ea594dede6a06caef4d99a4363766a425d17", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updatePasswordAction, "60f6e0201b58a5db560fbfb16596a74c685e3ff508", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getCurrentUser, "0050d7645596aebb8e3d6554e26d9a33bdf032a0bd", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(requireAuth, "00ef4bd1908dd6b6594e03fefddfcf0b1ff7785d96", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(signInWithGoogle, "00e910cadf0b232473915927567d3b5848de83eb3b", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(signInWithGitHub, "00bb70007f6623d69d6022c651b1464c3980bc081a", null);
}),
"[project]/apps/frontend/.next-internal/server/app/(dashboard)/dashboard/page/actions.js { ACTIONS_MODULE0 => \"[project]/apps/frontend/src/lib/actions/auth-actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$auth$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/actions/auth-actions.ts [app-rsc] (ecmascript)");
;
}),
"[project]/apps/frontend/.next-internal/server/app/(dashboard)/dashboard/page/actions.js { ACTIONS_MODULE0 => \"[project]/apps/frontend/src/lib/actions/auth-actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <module evaluation>": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$auth$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/actions/auth-actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f2e$next$2d$internal$2f$server$2f$app$2f28$dashboard$292f$dashboard$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$auth$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/apps/frontend/.next-internal/server/app/(dashboard)/dashboard/page/actions.js { ACTIONS_MODULE0 => "[project]/apps/frontend/src/lib/actions/auth-actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
}),
"[project]/apps/frontend/.next-internal/server/app/(dashboard)/dashboard/page/actions.js { ACTIONS_MODULE0 => \"[project]/apps/frontend/src/lib/actions/auth-actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <exports>": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({
    "00fa0b760d75df25ad2d603f356ae96344b3c04945": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$auth$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["logoutAction"]
});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$auth$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/actions/auth-actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f2e$next$2d$internal$2f$server$2f$app$2f28$dashboard$292f$dashboard$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$auth$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/apps/frontend/.next-internal/server/app/(dashboard)/dashboard/page/actions.js { ACTIONS_MODULE0 => "[project]/apps/frontend/src/lib/actions/auth-actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
}),
"[project]/apps/frontend/.next-internal/server/app/(dashboard)/dashboard/page/actions.js { ACTIONS_MODULE0 => \"[project]/apps/frontend/src/lib/actions/auth-actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({
    "00fa0b760d75df25ad2d603f356ae96344b3c04945": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f2e$next$2d$internal$2f$server$2f$app$2f28$dashboard$292f$dashboard$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$auth$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$exports$3e$__["00fa0b760d75df25ad2d603f356ae96344b3c04945"]
});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f2e$next$2d$internal$2f$server$2f$app$2f28$dashboard$292f$dashboard$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$auth$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i('[project]/apps/frontend/.next-internal/server/app/(dashboard)/dashboard/page/actions.js { ACTIONS_MODULE0 => "[project]/apps/frontend/src/lib/actions/auth-actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <module evaluation>');
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f2e$next$2d$internal$2f$server$2f$app$2f28$dashboard$292f$dashboard$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$auth$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$exports$3e$__ = __turbopack_context__.i('[project]/apps/frontend/.next-internal/server/app/(dashboard)/dashboard/page/actions.js { ACTIONS_MODULE0 => "[project]/apps/frontend/src/lib/actions/auth-actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <exports>');
}),
"[project]/apps/frontend/src/app/favicon.ico.mjs { IMAGE => \"[project]/apps/frontend/src/app/favicon.ico (static in ecmascript)\" } [app-rsc] (structured image object, ecmascript, Next.js Server Component)": ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/apps/frontend/src/app/favicon.ico.mjs { IMAGE => \"[project]/apps/frontend/src/app/favicon.ico (static in ecmascript)\" } [app-rsc] (structured image object, ecmascript)"));
}),
"[project]/apps/frontend/src/app/opengraph-image--metadata.js [app-rsc] (ecmascript, Next.js Server Component)": ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/apps/frontend/src/app/opengraph-image--metadata.js [app-rsc] (ecmascript)"));
}),
"[project]/apps/frontend/src/app/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)": ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/apps/frontend/src/app/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/apps/frontend/src/app/error.tsx [app-rsc] (ecmascript, Next.js Server Component)": ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/apps/frontend/src/app/error.tsx [app-rsc] (ecmascript)"));
}),
"[project]/apps/frontend/src/app/not-found.tsx [app-rsc] (ecmascript, Next.js Server Component)": ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/apps/frontend/src/app/not-found.tsx [app-rsc] (ecmascript)"));
}),
"[project]/apps/frontend/src/app/(dashboard)/layout.tsx [app-rsc] (ecmascript, Next.js Server Component)": ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/apps/frontend/src/app/(dashboard)/layout.tsx [app-rsc] (ecmascript)"));
}),
"[project]/apps/frontend/src/app/(dashboard)/dashboard/page.tsx [app-rsc] (ecmascript, Next.js Server Component)": ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/apps/frontend/src/app/(dashboard)/dashboard/page.tsx [app-rsc] (ecmascript)"));
}),
"[project]/apps/frontend/src/app/(dashboard)/@modal/default.tsx [app-rsc] (ecmascript, Next.js Server Component)": ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/apps/frontend/src/app/(dashboard)/@modal/default.tsx [app-rsc] (ecmascript)"));
}),
"[project]/apps/frontend/src/app/(dashboard)/@sidebar/default.tsx [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({
    "default": ()=>SidebarDefault
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$dashboard$2f$dashboard$2d$sidebar$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx [app-rsc] (ecmascript)");
;
;
function SidebarDefault() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$dashboard$2f$dashboard$2d$sidebar$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Sidebar"], {}, void 0, false, {
        fileName: "[project]/apps/frontend/src/app/(dashboard)/@sidebar/default.tsx",
        lineNumber: 5,
        columnNumber: 10
    }, this);
}
}),
"[project]/apps/frontend/src/app/(dashboard)/@sidebar/default.tsx [app-rsc] (ecmascript, Next.js Server Component)": ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/apps/frontend/src/app/(dashboard)/@sidebar/default.tsx [app-rsc] (ecmascript)"));
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)": ((__turbopack_context__) => {

var { m: module, e: exports } = __turbopack_context__;
{
const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}}),

};

//# sourceMappingURL=%5Broot-of-the-server%5D__6563fed3._.js.map
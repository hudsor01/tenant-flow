(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push([typeof document === "object" ? document.currentScript : undefined, {

"[project]/apps/frontend/src/lib/framer-motion.ts [app-client] (ecmascript) <locals>": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
// Client-side framer-motion wrapper
__turbopack_context__.s({
    "buttonVariants": ()=>buttonVariants,
    "cardHoverVariants": ()=>cardHoverVariants,
    "createStaggeredItemVariants": ()=>createStaggeredItemVariants,
    "createStaggeredListVariants": ()=>createStaggeredListVariants,
    "default": ()=>__TURBOPACK__default__export__,
    "dropdownVariants": ()=>dropdownVariants,
    "fadeInVariants": ()=>fadeInVariants,
    "getReducedMotionVariants": ()=>getReducedMotionVariants,
    "modalOverlayVariants": ()=>modalOverlayVariants,
    "modalVariants": ()=>modalVariants,
    "motionPresets": ()=>motionPresets,
    "notificationVariants": ()=>notificationVariants,
    "pageTransitionVariants": ()=>pageTransitionVariants,
    "scaleInVariants": ()=>scaleInVariants,
    "sidebarVariants": ()=>sidebarVariants,
    "slideInVariants": ()=>slideInVariants,
    "slideUpVariants": ()=>slideUpVariants,
    "spinnerVariants": ()=>spinnerVariants,
    "staggerContainerVariants": ()=>staggerContainerVariants,
    "staggerItemVariants": ()=>staggerItemVariants,
    "tabContentVariants": ()=>tabContentVariants,
    "transitions": ()=>transitions
});
'use client';
;
;
const fadeInVariants = {
    hidden: {
        opacity: 0
    },
    visible: {
        opacity: 1
    }
};
const slideInVariants = {
    hidden: {
        x: -20,
        opacity: 0
    },
    visible: {
        x: 0,
        opacity: 1
    }
};
const slideUpVariants = {
    hidden: {
        y: 20,
        opacity: 0
    },
    visible: {
        y: 0,
        opacity: 1
    }
};
const scaleInVariants = {
    hidden: {
        scale: 0.95,
        opacity: 0
    },
    visible: {
        scale: 1,
        opacity: 1
    }
};
const staggerContainerVariants = {
    hidden: {
        opacity: 0
    },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};
const staggerItemVariants = {
    hidden: {
        y: 20,
        opacity: 0
    },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 24
        }
    }
};
const pageTransitionVariants = {
    initial: {
        opacity: 0,
        y: 20
    },
    in: {
        opacity: 1,
        y: 0
    },
    out: {
        opacity: 0,
        y: -20
    }
};
const modalVariants = {
    hidden: {
        opacity: 0,
        scale: 0.75
    },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 30
        }
    },
    exit: {
        opacity: 0,
        scale: 0.75,
        transition: {
            duration: 0.2
        }
    }
};
const modalOverlayVariants = {
    hidden: {
        opacity: 0
    },
    visible: {
        opacity: 1
    },
    exit: {
        opacity: 0
    }
};
const sidebarVariants = {
    open: {
        x: 0,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 30
        }
    },
    closed: {
        x: '-100%',
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 30
        }
    }
};
const cardHoverVariants = {
    rest: {
        scale: 1
    },
    hover: {
        scale: 1.02,
        transition: {
            duration: 0.2,
            type: 'tween',
            ease: 'easeInOut'
        }
    },
    tap: {
        scale: 0.98
    }
};
const buttonVariants = {
    rest: {
        scale: 1
    },
    hover: {
        scale: 1.05
    },
    tap: {
        scale: 0.95
    }
};
const spinnerVariants = {
    start: {
        rotate: 0
    },
    end: {
        rotate: 360,
        transition: {
            duration: 1,
            ease: 'linear',
            repeat: Infinity
        }
    }
};
const notificationVariants = {
    hidden: {
        x: 300,
        opacity: 0,
        scale: 0.8
    },
    visible: {
        x: 0,
        opacity: 1,
        scale: 1,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 30
        }
    },
    exit: {
        x: 300,
        opacity: 0,
        scale: 0.8,
        transition: {
            duration: 0.2
        }
    }
};
const dropdownVariants = {
    hidden: {
        opacity: 0,
        y: -10,
        scale: 0.95
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 30
        }
    },
    exit: {
        opacity: 0,
        y: -10,
        scale: 0.95,
        transition: {
            duration: 0.15
        }
    }
};
const tabContentVariants = {
    hidden: {
        opacity: 0,
        x: 10
    },
    visible: {
        opacity: 1,
        x: 0,
        transition: {
            duration: 0.3,
            ease: 'easeInOut'
        }
    },
    exit: {
        opacity: 0,
        x: -10,
        transition: {
            duration: 0.2
        }
    }
};
const transitions = {
    default: {
        type: 'spring',
        stiffness: 300,
        damping: 30
    },
    fast: {
        type: 'tween',
        duration: 0.2
    },
    slow: {
        type: 'tween',
        duration: 0.5
    },
    bounce: {
        type: 'spring',
        stiffness: 400,
        damping: 25
    }
};
const getReducedMotionVariants = function(variants) {
    let respectMotion = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : true;
    if (!respectMotion) return variants;
    // Check if user prefers reduced motion
    const prefersReducedMotion = ("TURBOPACK compile-time truthy", 1) ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : "TURBOPACK unreachable";
    if (!prefersReducedMotion) return variants;
    // Return simplified variants for reduced motion
    const reducedVariants = {};
    Object.keys(variants).forEach((key)=>{
        const variant = variants[key];
        if (typeof variant === 'object' && variant !== null) {
            reducedVariants[key] = {
                ...variant,
                transition: {
                    duration: 0.01
                }
            };
        } else {
            reducedVariants[key] = variant;
        }
    });
    return reducedVariants;
};
const createStaggeredListVariants = function() {
    let staggerDelay = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 0.1;
    return {
        hidden: {
            opacity: 0
        },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: staggerDelay
            }
        }
    };
};
const createStaggeredItemVariants = function() {
    let direction = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 'up';
    const directionMap = {
        up: {
            y: 20
        },
        down: {
            y: -20
        },
        left: {
            x: 20
        },
        right: {
            x: -20
        }
    };
    return {
        hidden: {
            opacity: 0,
            ...directionMap[direction]
        },
        visible: {
            opacity: 1,
            x: 0,
            y: 0,
            transition: {
                type: 'spring',
                stiffness: 300,
                damping: 24
            }
        }
    };
};
const motionPresets = {
    fadeIn: {
        variants: fadeInVariants,
        initial: 'hidden',
        animate: 'visible',
        exit: 'hidden'
    },
    slideIn: {
        variants: slideInVariants,
        initial: 'hidden',
        animate: 'visible',
        exit: 'hidden'
    },
    slideUp: {
        variants: slideUpVariants,
        initial: 'hidden',
        animate: 'visible',
        exit: 'hidden'
    },
    scaleIn: {
        variants: scaleInVariants,
        initial: 'hidden',
        animate: 'visible',
        exit: 'hidden'
    },
    staggerContainer: {
        variants: staggerContainerVariants,
        initial: 'hidden',
        animate: 'visible'
    },
    staggerItem: {
        variants: staggerItemVariants
    }
};
const framerMotionExports = {
    variants: {
        fadeIn: fadeInVariants,
        slideIn: slideInVariants,
        slideUp: slideUpVariants,
        scaleIn: scaleInVariants,
        staggerContainer: staggerContainerVariants,
        staggerItem: staggerItemVariants,
        pageTransition: pageTransitionVariants,
        modal: modalVariants,
        modalOverlay: modalOverlayVariants,
        sidebar: sidebarVariants,
        cardHover: cardHoverVariants,
        button: buttonVariants,
        spinner: spinnerVariants,
        notification: notificationVariants,
        dropdown: dropdownVariants,
        tabContent: tabContentVariants
    },
    transitions,
    presets: motionPresets,
    utils: {
        getReducedMotionVariants,
        createStaggeredListVariants,
        createStaggeredItemVariants
    }
};
const __TURBOPACK__default__export__ = framerMotionExports;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/framer-motion.ts [app-client] (ecmascript) <module evaluation>": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$framer$2d$motion$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/framer-motion.ts [app-client] (ecmascript) <locals>");
}),
"[project]/apps/frontend/src/lib/clients/env.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Environment variables for client-side usage
 * Validation is handled centrally in config.ts
 */ __turbopack_context__.s({
    "env": ()=>env,
    "supabaseAnonKey": ()=>supabaseAnonKey,
    "supabaseUrl": ()=>supabaseUrl
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
const env = {
    NEXT_PUBLIC_SUPABASE_URL: ("TURBOPACK compile-time value", "https://bshjmbshupiibfiewpxb.supabase.co"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaGptYnNodXBpaWJmaWV3cHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MDc1MDYsImV4cCI6MjA2Mzk4MzUwNn0.K9cR4SN_MtutRWPJsymtAtlHpEJFyfnQgtu8BjQRqko"),
    NEXT_PUBLIC_API_URL: ("TURBOPACK compile-time value", "https://api.tenantflow.app/api/v1"),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ("TURBOPACK compile-time value", "pk_live_51Rd0qyP3WCR53SdoTX2cuAbujIY3WaQSSpu1esdawYD3m96SLWyRRavIZpJkh9BDNdIr8DwYluWVoMQCMqLRUf6Y00jWRkMx8j"),
    NEXT_PUBLIC_POSTHOG_KEY: ("TURBOPACK compile-time value", "phc_rSyH7L2ImIDIi4evbhKV2sozqmf5PWIZvGzFfrfuVHf"),
    NEXT_PUBLIC_POSTHOG_HOST: ("TURBOPACK compile-time value", "https://us.i.posthog.com")
};
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/clients/supabase-client.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "supabase": ()=>supabase,
    "supabaseAnon": ()=>supabaseAnon
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/module/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$env$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/clients/env.ts [app-client] (ecmascript)");
;
;
let _supabase = null;
let _supabaseAnon = null;
const getSupabase = ()=>{
    if (_supabase) return _supabase;
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$env$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabaseUrl"] || !__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$env$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabaseAnonKey"]) {
        throw new Error('Supabase environment variables are not set.');
    }
    _supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$env$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabaseUrl"], __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$env$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabaseAnonKey"]);
    return _supabase;
};
const getSupabaseAnon = ()=>{
    if (_supabaseAnon) return _supabaseAnon;
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$env$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabaseUrl"] || !__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$env$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabaseAnonKey"]) {
        throw new Error('Supabase environment variables are not set for anon client.');
    }
    _supabaseAnon = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$env$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabaseUrl"], __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$env$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabaseAnonKey"], {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
    return _supabaseAnon;
};
const supabaseSingleton = {
    get client () {
        return getSupabase();
    }
};
const supabaseAnonSingleton = {
    get client () {
        return getSupabaseAnon();
    }
};
const supabase = supabaseSingleton.client;
const supabaseAnon = supabaseAnonSingleton.client;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/clients/supabase-safe.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": ()=>__TURBOPACK__default__export__,
    "supabaseSafe": ()=>supabaseSafe
});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/clients/supabase-client.ts [app-client] (ecmascript)");
;
/**
 * Safe Supabase client wrapper that throws meaningful errors when client is null
 * This prevents runtime null reference errors and makes missing env vars obvious
 */ class SupabaseSafeWrapper {
    get client() {
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
            throw new Error('Supabase client is not initialized. Please check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables are set.');
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"];
    }
    get anonClient() {
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabaseAnon"]) {
            throw new Error('Supabase anonymous client is not initialized. Please check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables are set.');
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabaseAnon"];
    }
    // Auth methods
    get auth() {
        return this.client.auth;
    }
    // Database methods
    from(table) {
        return this.client.from(table);
    }
    // Storage methods
    get storage() {
        return this.client.storage;
    }
    // Realtime methods
    channel(name) {
        return this.client.channel(name);
    }
    // Anonymous client access
    get anon() {
        return {
            from: (table)=>{
                return this.anonClient.from(table);
            },
            auth: this.anonClient.auth,
            storage: this.anonClient.storage
        };
    }
    // Check if client is available
    get isAvailable() {
        return __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"] !== null;
    }
    // Get raw client (with null check)
    getRawClient() {
        return this.client;
    }
    // Get raw anon client (with null check)
    getRawAnonClient() {
        return this.anonClient;
    }
}
const supabaseSafe = new SupabaseSafeWrapper();
const __TURBOPACK__default__export__ = supabaseSafe;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/clients/index.ts [app-client] (ecmascript) <locals>": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Centralized API clients for TenantFlow frontend
 */ __turbopack_context__.s({
    "queryClient": ()=>queryClient
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/queryClient.js [app-client] (ecmascript)");
// Supabase clients for authentication and database
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/clients/supabase-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$safe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/clients/supabase-safe.ts [app-client] (ecmascript)"); // NOTE: Generic HTTP client removed - use axios-client from /lib/api/ instead
;
const queryClient = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClient"]({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: (failureCount, error)=>{
                var _httpError_message, _httpError_message1;
                // Don't retry on 4xx errors
                const httpError = error;
                if ((httpError === null || httpError === void 0 ? void 0 : (_httpError_message = httpError.message) === null || _httpError_message === void 0 ? void 0 : _httpError_message.includes('40')) || (httpError === null || httpError === void 0 ? void 0 : (_httpError_message1 = httpError.message) === null || _httpError_message1 === void 0 ? void 0 : _httpError_message1.includes('Unauthorized'))) {
                    return false;
                }
                return failureCount < 3;
            },
            retryDelay: (attemptIndex)=>Math.min(1000 * 2 ** attemptIndex, 30000)
        },
        mutations: {
            retry: false
        }
    }
});
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/clients/index.ts [app-client] (ecmascript) <module evaluation>": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/clients/supabase-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$safe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/clients/supabase-safe.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/clients/index.ts [app-client] (ecmascript) <locals>");
}),
"[project]/apps/frontend/src/lib/toast-messages.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "toastMessages": ()=>toastMessages
});
const toastMessages = {
    auth: {
        signInSuccess: 'Successfully signed in!',
        signInError: 'Failed to sign in. Please check your credentials.',
        signOutSuccess: 'Successfully signed out!',
        signOutError: 'Failed to sign out. Please try again.',
        sessionExpired: 'Your session has expired. Please sign in again.',
        emailConfirmed: 'Email confirmed successfully!',
        passwordUpdated: 'Password updated successfully!',
        profileUpdated: 'Profile updated successfully!'
    },
    subscription: {
        created: 'Subscription created successfully!',
        updated: 'Subscription updated successfully!',
        cancelled: 'Subscription cancelled successfully!',
        error: 'Failed to process subscription. Please try again.'
    },
    general: {
        success: 'Operation completed successfully!',
        error: 'An error occurred. Please try again.',
        loading: 'Loading...',
        saved: 'Changes saved successfully!',
        deleted: 'Deleted successfully!',
        created: 'Created successfully!',
        updated: 'Updated successfully!'
    },
    property: {
        created: 'Property created successfully!',
        updated: 'Property updated successfully!',
        deleted: 'Property deleted successfully!',
        error: 'Failed to process property. Please try again.'
    },
    tenant: {
        created: 'Tenant created successfully!',
        updated: 'Tenant updated successfully!',
        deleted: 'Tenant deleted successfully!',
        error: 'Failed to process tenant. Please try again.'
    },
    maintenance: {
        created: 'Maintenance request created successfully!',
        updated: 'Maintenance request updated successfully!',
        deleted: 'Maintenance request deleted successfully!',
        error: 'Failed to process maintenance request. Please try again.'
    },
    lease: {
        created: 'Lease created successfully!',
        updated: 'Lease updated successfully!',
        deleted: 'Lease deleted successfully!',
        error: 'Failed to process lease. Please try again.'
    },
    unit: {
        success: 'Unit operation completed successfully!',
        error: 'Failed to process unit. Please try again.',
        created: 'Unit created successfully!',
        updated: 'Unit updated successfully!',
        deleted: 'Unit deleted successfully!'
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/debug-auth.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "debugSupabaseAuth": ()=>debugSupabaseAuth
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
const debugSupabaseAuth = {
    enabled: ("TURBOPACK compile-time value", "development") === 'development',
    log: (message, data)=>{
        if (debugSupabaseAuth.enabled) {
            console.log("[Supabase Auth] ".concat(message), data || '');
        }
    },
    error: (message, error)=>{
        if (debugSupabaseAuth.enabled) {
            console.error("[Supabase Auth Error] ".concat(message), error || '');
        }
    },
    warn: (message, data)=>{
        if (debugSupabaseAuth.enabled) {
            console.warn("[Supabase Auth Warning] ".concat(message), data || '');
        }
    },
    info: (message, data)=>{
        if (debugSupabaseAuth.enabled) {
            console.info("[Supabase Auth Info] ".concat(message), data || '');
        }
    },
    // Helper to log session state
    logSession: (session)=>{
        if (debugSupabaseAuth.enabled) {
            var _session_user, _session_user1;
            console.log('[Supabase Auth] Session State:', {
                hasSession: !!session,
                userId: session === null || session === void 0 ? void 0 : (_session_user = session.user) === null || _session_user === void 0 ? void 0 : _session_user.id,
                email: session === null || session === void 0 ? void 0 : (_session_user1 = session.user) === null || _session_user1 === void 0 ? void 0 : _session_user1.email,
                expiresAt: session === null || session === void 0 ? void 0 : session.expires_at
            });
        }
    },
    // Helper to log auth errors
    logError: (error)=>{
        if (debugSupabaseAuth.enabled) {
            const authError = error;
            console.error('[Supabase Auth] Auth Error:', {
                message: authError === null || authError === void 0 ? void 0 : authError.message,
                status: authError === null || authError === void 0 ? void 0 : authError.status,
                code: authError === null || authError === void 0 ? void 0 : authError.code,
                details: error
            });
        }
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/auth/supabase-auth-processor.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "SupabaseAuthProcessor": ()=>SupabaseAuthProcessor
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$framer$2d$motion$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/framer-motion.ts [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check-big.js [app-client] (ecmascript) <export default as CheckCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-x.js [app-client] (ecmascript) <export default as XCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/clients/index.ts [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/clients/supabase-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$toast$2d$messages$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/toast-messages.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$debug$2d$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/debug-auth.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
;
;
;
function SupabaseAuthProcessor() {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const queryClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"])();
    const [status, setStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        state: 'loading',
        message: 'Processing authentication...'
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SupabaseAuthProcessor.useEffect": ()=>{
            let mounted = true;
            const processAuthentication = {
                "SupabaseAuthProcessor.useEffect.processAuthentication": async ()=>{
                    // Log authentication processing start
                    __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$debug$2d$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["debugSupabaseAuth"].log('Starting authentication processing');
                    try {
                        if (!__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
                            throw new Error('Authentication service not available');
                        }
                        // Check URL hash first for email confirmation tokens
                        const hashParams = new URLSearchParams(window.location.hash.substring(1));
                        const accessToken = hashParams.get('access_token');
                        const refreshToken = hashParams.get('refresh_token');
                        const type = hashParams.get('type');
                        const error = hashParams.get('error');
                        const errorCode = hashParams.get('error_code');
                        const errorDescription = hashParams.get('error_description');
                        // Check if there's an error in the hash
                        if (error || errorCode) {
                            // Even if there's an error, check if we have a valid session
                            // This can happen when the email link expires but the user is already logged in
                            const { data: { session } } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
                            if (session === null || session === void 0 ? void 0 : session.user) {
                                // Invalidate auth queries to ensure fresh user data
                                await queryClient.invalidateQueries({
                                    queryKey: [
                                        'auth'
                                    ]
                                });
                                setStatus({
                                    state: 'success',
                                    message: 'Already authenticated!',
                                    details: 'Redirecting to dashboard...'
                                });
                                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Welcome back! You are already signed in.');
                                // Clear the error hash from URL
                                window.history.replaceState(null, '', window.location.pathname + window.location.search);
                                setTimeout({
                                    "SupabaseAuthProcessor.useEffect.processAuthentication": ()=>{
                                        void router.push('/dashboard');
                                    }
                                }["SupabaseAuthProcessor.useEffect.processAuthentication"], 500);
                                return;
                            }
                            // If we have an OTP expired error, show specific message
                            if (errorCode === 'otp_expired') {
                                setStatus({
                                    state: 'error',
                                    message: 'Email link expired',
                                    details: 'Please request a new confirmation email'
                                });
                                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error('Email confirmation link has expired. Please sign up again.');
                                setTimeout({
                                    "SupabaseAuthProcessor.useEffect.processAuthentication": ()=>{
                                        void router.push('/auth/login');
                                    }
                                }["SupabaseAuthProcessor.useEffect.processAuthentication"], 3000);
                                return;
                            }
                            // Other errors
                            throw new Error(errorDescription || error || 'Authentication failed');
                        }
                        if (accessToken && refreshToken) {
                            // Email confirmation tokens found
                            setStatus({
                                state: 'loading',
                                message: type === 'signup' ? 'Confirming your email...' : 'Completing sign in...',
                                details: 'Setting up your session'
                            });
                            const sessionStart = performance.now();
                            try {
                                // Add a timeout to setSession to prevent hanging
                                const setSessionPromise = __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.setSession({
                                    access_token: accessToken,
                                    refresh_token: refreshToken
                                });
                                const timeoutPromise = new Promise({
                                    "SupabaseAuthProcessor.useEffect.processAuthentication": (_, reject)=>setTimeout({
                                            "SupabaseAuthProcessor.useEffect.processAuthentication": ()=>reject(new Error('Session setup timeout'))
                                        }["SupabaseAuthProcessor.useEffect.processAuthentication"], 10000)
                                }["SupabaseAuthProcessor.useEffect.processAuthentication"]);
                                const { data, error } = await Promise.race([
                                    setSessionPromise,
                                    timeoutPromise
                                ]);
                                const setSessionTime = performance.now() - sessionStart;
                                if (setSessionTime > 5000) {
                                    console.warn('[Auth] Session setup is taking unusually long!', setSessionTime);
                                }
                                if (error) {
                                    console.error('[Auth] SetSession error:', error);
                                    throw error;
                                }
                                if ((data === null || data === void 0 ? void 0 : data.session) && mounted) {
                                    // Verify the session was actually stored
                                    const { data: { session: verifiedSession } } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
                                    console.log('[Auth] Verified session stored:', !!verifiedSession);
                                    // Invalidate auth queries to ensure fresh user data
                                    await queryClient.invalidateQueries({
                                        queryKey: [
                                            'auth'
                                        ]
                                    });
                                    setStatus({
                                        state: 'success',
                                        message: type === 'signup' ? 'Email confirmed!' : 'Authentication successful!',
                                        details: 'Welcome to TenantFlow!'
                                    });
                                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success(type === 'signup' ? __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$toast$2d$messages$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toastMessages"].auth.emailConfirmed : __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$toast$2d$messages$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toastMessages"].auth.signInSuccess);
                                    // Clear the hash from URL to prevent reprocessing
                                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                                    // Navigate to dashboard
                                    setTimeout({
                                        "SupabaseAuthProcessor.useEffect.processAuthentication": ()=>{
                                            void router.push('/dashboard');
                                        }
                                    }["SupabaseAuthProcessor.useEffect.processAuthentication"], 500);
                                    return;
                                } else {
                                    console.warn('[Auth] No session returned from setSession');
                                }
                            } catch (err) {
                                console.error('[Auth] Error setting session from tokens:', err);
                                // If setSession fails but we have valid tokens, try to proceed anyway
                                // The tokens in the URL are valid, Supabase client should pick them up
                                if (accessToken && refreshToken && type === 'signup') {
                                    setStatus({
                                        state: 'success',
                                        message: 'Email confirmed!',
                                        details: 'Redirecting to dashboard...'
                                    });
                                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Email confirmed! Welcome to TenantFlow!');
                                    // Clear the hash to prevent reprocessing
                                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                                    setTimeout({
                                        "SupabaseAuthProcessor.useEffect.processAuthentication": ()=>{
                                            void router.push('/dashboard');
                                        }
                                    }["SupabaseAuthProcessor.useEffect.processAuthentication"], 1000);
                                    return;
                                }
                                throw err;
                            }
                        }
                        // Check for OAuth code in URL params (OAuth callback)
                        const params = new URLSearchParams(window.location.search);
                        const code = params.get('code');
                        if (code) {
                            // We have an auth code, exchange it for session
                            setStatus({
                                state: 'loading',
                                message: 'Completing sign in...',
                                details: 'Exchanging authentication code'
                            });
                            try {
                                const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.exchangeCodeForSession(code);
                                if (error) throw error;
                                if (data.session && mounted) {
                                    // Invalidate auth queries to ensure fresh user data
                                    await queryClient.invalidateQueries({
                                        queryKey: [
                                            'auth'
                                        ]
                                    });
                                    setStatus({
                                        state: 'success',
                                        message: 'Authentication successful!',
                                        details: 'Welcome back!'
                                    });
                                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$toast$2d$messages$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toastMessages"].auth.signInSuccess);
                                    void router.push('/dashboard');
                                    return;
                                }
                            } catch (err) {
                                // Handle PKCE cross-browser error gracefully
                                if (err instanceof Error && err.message.includes('code verifier')) {
                                    console.error('[Auth] PKCE error - user likely clicked email link in different browser');
                                    setStatus({
                                        state: 'error',
                                        message: 'Authentication error',
                                        details: 'Please sign in again or use the same browser you signed up with'
                                    });
                                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error('Please use the same browser you signed up with');
                                    setTimeout({
                                        "SupabaseAuthProcessor.useEffect.processAuthentication": ()=>void router.push('/auth/login')
                                    }["SupabaseAuthProcessor.useEffect.processAuthentication"], 3000);
                                    return;
                                }
                                throw err;
                            }
                        }
                        // Check if this might be an email confirmation without tokens
                        // When Supabase has "Confirm email" enabled in auth settings, it redirects
                        // to the callback URL after email confirmation but WITHOUT auth tokens
                        const searchParams = new URLSearchParams(window.location.search);
                        const isEmailConfirmation = searchParams.has('type') && searchParams.get('type') === 'signup';
                        // Check for existing session
                        const { data: { session }, error: sessionError } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
                        if (sessionError) {
                            throw sessionError;
                        }
                        if (!mounted) return;
                        if (session === null || session === void 0 ? void 0 : session.user) {
                            // Invalidate auth queries to ensure fresh user data
                            await queryClient.invalidateQueries({
                                queryKey: [
                                    'auth'
                                ]
                            });
                            // Success! User is authenticated
                            setStatus({
                                state: 'success',
                                message: 'Authentication successful!',
                                details: 'Welcome back!'
                            });
                            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$toast$2d$messages$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toastMessages"].auth.signInSuccess);
                            void router.push('/dashboard');
                        } else if (isEmailConfirmation) {
                            // This is likely an email confirmation that succeeded but didn't include tokens
                            // Show success message and redirect to login with a helpful message
                            setStatus({
                                state: 'success',
                                message: 'Email confirmed successfully!',
                                details: 'Please sign in with your credentials'
                            });
                            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Email confirmed! Please sign in to continue.');
                            setTimeout({
                                "SupabaseAuthProcessor.useEffect.processAuthentication": ()=>{
                                    void router.push('/auth/login?emailConfirmed=true');
                                }
                            }["SupabaseAuthProcessor.useEffect.processAuthentication"], 2000);
                        } else {
                            // No session found - redirect to login
                            setStatus({
                                state: 'error',
                                message: 'Authentication required',
                                details: 'Please sign in to continue'
                            });
                            setTimeout({
                                "SupabaseAuthProcessor.useEffect.processAuthentication": ()=>{
                                    void router.push('/auth/login');
                                }
                            }["SupabaseAuthProcessor.useEffect.processAuthentication"], 2000);
                        }
                    } catch (error) {
                        if (!mounted) return;
                        console.error('Auth processing error:', error);
                        setStatus({
                            state: 'error',
                            message: 'Authentication error',
                            details: error instanceof Error ? error.message : 'Please try signing in again'
                        });
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error('Authentication failed');
                        setTimeout({
                            "SupabaseAuthProcessor.useEffect.processAuthentication": ()=>{
                                void router.push('/auth/login');
                            }
                        }["SupabaseAuthProcessor.useEffect.processAuthentication"], 2000);
                    }
                }
            }["SupabaseAuthProcessor.useEffect.processAuthentication"];
            // Start processing immediately
            void processAuthentication();
            // Add a timeout to prevent hanging
            const timeoutId = setTimeout({
                "SupabaseAuthProcessor.useEffect.timeoutId": ()=>{
                    if (mounted && status.state === 'loading') {
                        setStatus({
                            state: 'error',
                            message: 'Authentication timeout',
                            details: 'Taking too long, please try again'
                        });
                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error('Authentication timeout');
                        void router.push('/auth/login');
                    }
                }
            }["SupabaseAuthProcessor.useEffect.timeoutId"], 30000) // 30 second timeout - increased for slow connections
            ;
            // Cleanup
            return ({
                "SupabaseAuthProcessor.useEffect": ()=>{
                    mounted = false;
                    clearTimeout(timeoutId);
                }
            })["SupabaseAuthProcessor.useEffect"];
        }
    }["SupabaseAuthProcessor.useEffect"], [
        queryClient,
        status.state,
        router
    ]);
    const getIcon = ()=>{
        switch(status.state){
            case 'loading':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                    className: "h-12 w-12 animate-spin text-primary"
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/supabase-auth-processor.tsx",
                    lineNumber: 342,
                    columnNumber: 16
                }, this);
            case 'success':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"], {
                    className: "h-12 w-12 text-green-500"
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/supabase-auth-processor.tsx",
                    lineNumber: 344,
                    columnNumber: 16
                }, this);
            case 'error':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"], {
                    className: "h-12 w-12 text-red-500"
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/supabase-auth-processor.tsx",
                    lineNumber: 346,
                    columnNumber: 16
                }, this);
            default:
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                    className: "h-12 w-12 animate-spin text-primary"
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/supabase-auth-processor.tsx",
                    lineNumber: 348,
                    columnNumber: 16
                }, this);
        }
    };
    const getColorClasses = ()=>{
        switch(status.state){
            case 'loading':
                return 'border-primary/20 bg-primary/5';
            case 'success':
                return 'border-green-200 bg-green-50';
            case 'error':
                return 'border-red-200 bg-red-50';
            default:
                return 'border-gray-200 bg-gray-50';
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
            initial: {
                opacity: 0,
                scale: 0.95
            },
            animate: {
                opacity: 1,
                scale: 1
            },
            transition: {
                duration: 0.3
            },
            className: "w-full max-w-md rounded-2xl border-2 p-8 text-center shadow-xl backdrop-blur-sm ".concat(getColorClasses()),
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
                    initial: {
                        scale: 0
                    },
                    animate: {
                        scale: 1
                    },
                    transition: {
                        delay: 0.1,
                        type: 'spring',
                        stiffness: 200
                    },
                    className: "mb-6 flex justify-center",
                    children: getIcon()
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/supabase-auth-processor.tsx",
                    lineNumber: 373,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
                    initial: {
                        opacity: 0,
                        y: 20
                    },
                    animate: {
                        opacity: 1,
                        y: 0
                    },
                    transition: {
                        delay: 0.2
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                            className: "mb-2 text-2xl font-bold text-foreground",
                            children: status.message
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/auth/supabase-auth-processor.tsx",
                            lineNumber: 387,
                            columnNumber: 11
                        }, this),
                        status.details && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-muted-foreground",
                            children: status.details
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/auth/supabase-auth-processor.tsx",
                            lineNumber: 392,
                            columnNumber: 13
                        }, this),
                        status.state === 'loading' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
                            initial: {
                                opacity: 0
                            },
                            animate: {
                                opacity: 1
                            },
                            transition: {
                                delay: 0.4
                            },
                            className: "mt-4",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "h-1 w-full bg-gray-200 rounded-full overflow-hidden",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
                                    className: "h-full bg-primary rounded-full",
                                    initial: {
                                        width: 0
                                    },
                                    animate: {
                                        width: '100%'
                                    },
                                    transition: {
                                        duration: 2,
                                        ease: 'easeInOut'
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/auth/supabase-auth-processor.tsx",
                                    lineNumber: 405,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/supabase-auth-processor.tsx",
                                lineNumber: 404,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/auth/supabase-auth-processor.tsx",
                            lineNumber: 398,
                            columnNumber: 13
                        }, this),
                        status.state === 'error' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
                            initial: {
                                opacity: 0
                            },
                            animate: {
                                opacity: 1
                            },
                            transition: {
                                delay: 0.4
                            },
                            className: "mt-4",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>void router.push('/auth/login'),
                                className: "text-primary hover:text-primary/80 font-semibold underline transition-colors",
                                children: "Return to login"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/supabase-auth-processor.tsx",
                                lineNumber: 422,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/auth/supabase-auth-processor.tsx",
                            lineNumber: 416,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/frontend/src/components/auth/supabase-auth-processor.tsx",
                    lineNumber: 382,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/frontend/src/components/auth/supabase-auth-processor.tsx",
            lineNumber: 367,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/auth/supabase-auth-processor.tsx",
        lineNumber: 366,
        columnNumber: 5
    }, this);
}
_s(SupabaseAuthProcessor, "/auXaioWgvZMEdsEulIPYpGN9IM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"]
    ];
});
_c = SupabaseAuthProcessor;
var _c;
__turbopack_context__.k.register(_c, "SupabaseAuthProcessor");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/react-query/query-client.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * React Query Client Configuration
 * Centralized configuration for optimal caching and performance
 */ __turbopack_context__.s({
    "createQueryClient": ()=>createQueryClient,
    "getQueryClient": ()=>getQueryClient,
    "mutationKeys": ()=>mutationKeys,
    "queryKeys": ()=>queryKeys
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/query-core/build/modern/queryClient.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
;
;
/**
 * Global error handler for React Query
 */ function queryErrorHandler(error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    // Only show errors for user-initiated actions
    if (message !== 'Network error' && !message.includes('401')) {
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(message);
    }
}
function createQueryClient() {
    return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$query$2d$core$2f$build$2f$modern$2f$queryClient$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClient"]({
        defaultOptions: {
            queries: {
                // Data considered fresh for 5 minutes
                staleTime: 5 * 60 * 1000,
                // Keep cache for 10 minutes
                gcTime: 10 * 60 * 1000,
                // Retry failed requests 3 times with exponential backoff
                retry: (failureCount, error)=>{
                    if (failureCount >= 3) return false;
                    if (error instanceof Error) {
                        // Don't retry on 4xx errors except 408 (timeout) and 429 (rate limit)
                        if (error.message.includes('40') && !error.message.includes('408') && !error.message.includes('429')) {
                            return false;
                        }
                    }
                    return true;
                },
                // Exponential backoff
                retryDelay: (attemptIndex)=>Math.min(1000 * 2 ** attemptIndex, 30000),
                // Refetch on window focus in production only
                refetchOnWindowFocus: ("TURBOPACK compile-time value", "development") === 'production',
                // Don't refetch on reconnect by default
                refetchOnReconnect: 'always'
            },
            mutations: {
                // Use global error handler
                onError: queryErrorHandler,
                // Retry mutations once
                retry: 1,
                retryDelay: 1000
            }
        }
    });
}
const queryKeys = {
    all: [
        'tenantflow'
    ],
    // Auth
    auth: ()=>[
            ...queryKeys.all,
            'auth'
        ],
    session: ()=>[
            ...queryKeys.auth(),
            'session'
        ],
    user: ()=>[
            ...queryKeys.auth(),
            'user'
        ],
    // Properties
    properties: ()=>[
            ...queryKeys.all,
            'properties'
        ],
    propertyList: (filters)=>[
            ...queryKeys.properties(),
            'list',
            filters
        ],
    propertyDetail: (id)=>[
            ...queryKeys.properties(),
            'detail',
            id
        ],
    propertyStats: ()=>[
            ...queryKeys.properties(),
            'stats'
        ],
    // Tenants
    tenants: ()=>[
            ...queryKeys.all,
            'tenants'
        ],
    tenantList: (filters)=>[
            ...queryKeys.tenants(),
            'list',
            filters
        ],
    tenantDetail: (id)=>[
            ...queryKeys.tenants(),
            'detail',
            id
        ],
    // Leases
    leases: ()=>[
            ...queryKeys.all,
            'leases'
        ],
    leaseList: (filters)=>[
            ...queryKeys.leases(),
            'list',
            filters
        ],
    leaseDetail: (id)=>[
            ...queryKeys.leases(),
            'detail',
            id
        ],
    leasesByProperty: (propertyId)=>[
            ...queryKeys.leases(),
            'by-property',
            propertyId
        ],
    // Units
    units: ()=>[
            ...queryKeys.all,
            'units'
        ],
    unitList: (filters)=>[
            ...queryKeys.units(),
            'list',
            filters
        ],
    unitDetail: (id)=>[
            ...queryKeys.units(),
            'detail',
            id
        ],
    unitsByProperty: (propertyId)=>[
            ...queryKeys.units(),
            'by-property',
            propertyId
        ],
    // Maintenance
    maintenance: ()=>[
            ...queryKeys.all,
            'maintenance'
        ],
    maintenanceList: (filters)=>[
            ...queryKeys.maintenance(),
            'list',
            filters
        ],
    maintenanceDetail: (id)=>[
            ...queryKeys.maintenance(),
            'detail',
            id
        ],
    // Dashboard
    dashboard: ()=>[
            ...queryKeys.all,
            'dashboard'
        ],
    dashboardStats: ()=>[
            ...queryKeys.dashboard(),
            'stats'
        ],
    dashboardOverview: ()=>[
            ...queryKeys.dashboard(),
            'overview'
        ],
    dashboardActivity: ()=>[
            ...queryKeys.dashboard(),
            'activity'
        ],
    // Billing
    billing: ()=>[
            ...queryKeys.all,
            'billing'
        ],
    subscription: ()=>[
            ...queryKeys.billing(),
            'subscription'
        ],
    invoices: ()=>[
            ...queryKeys.billing(),
            'invoices'
        ],
    paymentMethods: ()=>[
            ...queryKeys.billing(),
            'payment-methods'
        ]
};
const mutationKeys = {
    // Properties
    createProperty: [
        'create-property'
    ],
    updateProperty: [
        'update-property'
    ],
    deleteProperty: [
        'delete-property'
    ],
    // Tenants
    createTenant: [
        'create-tenant'
    ],
    updateTenant: [
        'update-tenant'
    ],
    deleteTenant: [
        'delete-tenant'
    ],
    // Leases
    createLease: [
        'create-lease'
    ],
    updateLease: [
        'update-lease'
    ],
    deleteLease: [
        'delete-lease'
    ],
    // Units
    createUnit: [
        'create-unit'
    ],
    updateUnit: [
        'update-unit'
    ],
    deleteUnit: [
        'delete-unit'
    ],
    // Maintenance
    createMaintenanceRequest: [
        'create-maintenance'
    ],
    updateMaintenanceRequest: [
        'update-maintenance'
    ],
    deleteMaintenanceRequest: [
        'delete-maintenance'
    ],
    // Auth
    login: [
        'login'
    ],
    logout: [
        'logout'
    ],
    signup: [
        'signup'
    ],
    forgotPassword: [
        'forgot-password'
    ],
    resetPassword: [
        'reset-password'
    ],
    // Billing
    createCheckoutSession: [
        'create-checkout'
    ],
    cancelSubscription: [
        'cancel-subscription'
    ],
    updatePaymentMethod: [
        'update-payment-method'
    ]
};
// Export singleton instance for SSR
let browserQueryClient;
function getQueryClient() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    // Browser: reuse instance
    if (!browserQueryClient) {
        browserQueryClient = createQueryClient();
    }
    return browserQueryClient;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/providers/query-provider.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * React Query provider
 * Provides React Query context for data fetching
 */ __turbopack_context__.s({
    "QueryProvider": ()=>QueryProvider
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$react$2d$query$2f$query$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/react-query/query-client.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
function QueryProvider(param) {
    let { children } = param;
    _s();
    // Use the centralized QueryClient configuration
    const [queryClient] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "QueryProvider.useState": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$react$2d$query$2f$query$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getQueryClient"])()
    }["QueryProvider.useState"]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QueryClientProvider"], {
        client: queryClient,
        children: children
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/providers/query-provider.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, this);
}
_s(QueryProvider, "xWzZ3DtKXbYlVX/K0rEF3F2kgkk=");
_c = QueryProvider;
var _c;
__turbopack_context__.k.register(_c, "QueryProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
}]);

//# sourceMappingURL=apps_frontend_src_efb6628a._.js.map
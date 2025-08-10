(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push([typeof document === "object" ? document.currentScript : undefined, {

"[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "cn": ()=>cn
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn() {
    for(var _len = arguments.length, inputs = new Array(_len), _key = 0; _key < _len; _key++){
        inputs[_key] = arguments[_key];
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/variants.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Design System Variant Library
 * 
 * Centralized variant definitions using CVA (class-variance-authority)
 * for consistent styling across all components.
 * 
 * Architecture:
 * - Base variants for common UI patterns
 * - Extendable variants for custom components
 * - Type-safe variant props
 */ __turbopack_context__.s({
    "actionVariants": ()=>actionVariants,
    "badgeVariants": ()=>badgeVariants,
    "cardVariants": ()=>cardVariants,
    "containerVariants": ()=>containerVariants,
    "enhancedButtonVariants": ()=>enhancedButtonVariants,
    "formGroupVariants": ()=>formGroupVariants,
    "gridVariants": ()=>gridVariants,
    "sectionVariants": ()=>sectionVariants,
    "stackVariants": ()=>stackVariants,
    "statCardVariants": ()=>statCardVariants
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/class-variance-authority/dist/index.mjs [app-client] (ecmascript)");
;
const containerVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("w-full mx-auto px-4", {
    variants: {
        size: {
            sm: "max-w-sm",
            md: "max-w-md",
            lg: "max-w-lg",
            xl: "max-w-xl",
            "2xl": "max-w-2xl",
            "4xl": "max-w-4xl",
            "6xl": "max-w-6xl",
            "7xl": "max-w-7xl",
            full: "max-w-none"
        },
        padding: {
            none: "px-0",
            sm: "px-4",
            md: "px-4 sm:px-6",
            lg: "px-4 sm:px-6 lg:px-8",
            xl: "px-6 sm:px-8 lg:px-12"
        }
    },
    defaultVariants: {
        size: "7xl",
        padding: "lg"
    }
});
const sectionVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("w-full", {
    variants: {
        spacing: {
            none: "py-0",
            sm: "py-8 md:py-12",
            md: "py-12 md:py-16",
            lg: "py-16 md:py-20",
            xl: "py-20 md:py-24",
            "2xl": "py-24 md:py-32"
        },
        background: {
            transparent: "bg-transparent",
            muted: "bg-muted/30",
            card: "bg-card",
            gradient: "bg-gradient-subtle"
        }
    },
    defaultVariants: {
        spacing: "lg",
        background: "transparent"
    }
});
const cardVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("bg-card text-card-foreground rounded-xl border shadow-sm transition-all duration-300", {
    variants: {
        variant: {
            default: "border-border",
            elevated: "shadow-md hover:shadow-lg",
            interactive: "hover:shadow-md hover:border-primary/20 cursor-pointer",
            accent: "border-accent/20 bg-gradient-subtle",
            gradient: "border-0 bg-gradient-primary text-primary-foreground"
        },
        size: {
            sm: "p-4",
            md: "p-6",
            lg: "p-8",
            xl: "p-10"
        },
        spacing: {
            compact: "gap-3",
            comfortable: "gap-6",
            spacious: "gap-8"
        }
    },
    defaultVariants: {
        variant: "default",
        size: "md",
        spacing: "comfortable"
    }
});
const statCardVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("rounded-lg p-3 transition-colors", {
    variants: {
        variant: {
            primary: "bg-blue-50 text-blue-700",
            success: "bg-green-50 text-green-700",
            warning: "bg-orange-50 text-orange-700",
            error: "bg-red-50 text-red-700",
            accent: "bg-purple-50 text-purple-700",
            muted: "bg-muted text-muted-foreground"
        },
        size: {
            sm: "p-2",
            md: "p-3",
            lg: "p-4"
        }
    },
    defaultVariants: {
        variant: "muted",
        size: "md"
    }
});
const formGroupVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("space-y-2", {
    variants: {
        orientation: {
            vertical: "space-y-2",
            horizontal: "flex items-center space-y-0 space-x-4"
        },
        size: {
            sm: "space-y-1",
            md: "space-y-2",
            lg: "space-y-3"
        }
    },
    defaultVariants: {
        orientation: "vertical",
        size: "md"
    }
});
const gridVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("grid gap-4", {
    variants: {
        cols: {
            1: "grid-cols-1",
            2: "grid-cols-1 md:grid-cols-2",
            3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
            4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
            auto: "grid-cols-[repeat(auto-fit,minmax(250px,1fr))]"
        },
        gap: {
            sm: "gap-2",
            md: "gap-4",
            lg: "gap-6",
            xl: "gap-8"
        }
    },
    defaultVariants: {
        cols: 3,
        gap: "md"
    }
});
const stackVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("flex", {
    variants: {
        direction: {
            vertical: "flex-col",
            horizontal: "flex-row"
        },
        align: {
            start: "items-start",
            center: "items-center",
            end: "items-end",
            stretch: "items-stretch"
        },
        justify: {
            start: "justify-start",
            center: "justify-center",
            end: "justify-end",
            between: "justify-between",
            around: "justify-around"
        },
        spacing: {
            none: "gap-0",
            xs: "gap-1",
            sm: "gap-2",
            md: "gap-4",
            lg: "gap-6",
            xl: "gap-8",
            "2xl": "gap-12"
        },
        wrap: {
            true: "flex-wrap",
            false: "flex-nowrap"
        }
    },
    defaultVariants: {
        direction: "vertical",
        align: "stretch",
        justify: "start",
        spacing: "md",
        wrap: false
    }
});
const badgeVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors", {
    variants: {
        variant: {
            default: "bg-primary/10 text-primary border border-primary/20",
            secondary: "bg-secondary/10 text-secondary border border-secondary/20",
            success: "bg-green-50 text-green-700 border border-green-200",
            warning: "bg-orange-50 text-orange-700 border border-orange-200",
            error: "bg-red-50 text-red-700 border border-red-200",
            outline: "border border-border text-foreground",
            gradient: "bg-gradient-primary text-primary-foreground border-0"
        },
        size: {
            sm: "px-2 py-0.5 text-xs",
            md: "px-2.5 py-0.5 text-xs",
            lg: "px-3 py-1 text-sm"
        }
    },
    defaultVariants: {
        variant: "default",
        size: "md"
    }
});
const actionVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("flex items-center gap-2 transition-colors rounded-md", {
    variants: {
        variant: {
            default: "hover:bg-accent hover:text-accent-foreground",
            destructive: "text-red-600 hover:bg-red-50 hover:text-red-700",
            success: "text-green-600 hover:bg-green-50 hover:text-green-700"
        },
        size: {
            sm: "px-2 py-1.5 text-sm",
            md: "px-3 py-2 text-sm",
            lg: "px-4 py-2.5 text-base"
        }
    },
    defaultVariants: {
        variant: "default",
        size: "md"
    }
});
const enhancedButtonVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", {
    variants: {
        variant: {
            default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
            destructive: "bg-destructive text-white shadow-sm hover:bg-destructive/90",
            outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
            secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
            ghost: "hover:bg-accent hover:text-accent-foreground",
            link: "text-primary underline-offset-4 hover:underline",
            gradient: "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-sm hover:from-primary/90 hover:to-primary/80",
            cta: "bg-primary text-primary-foreground shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200",
            loading: "bg-primary/70 text-primary-foreground cursor-not-allowed opacity-70"
        },
        size: {
            default: "h-9 px-4 py-2 has-[>svg]:px-3",
            sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
            lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
            xl: "h-12 rounded-lg px-8 has-[>svg]:px-6 text-base",
            icon: "size-9",
            "icon-sm": "size-8",
            "icon-lg": "size-10"
        },
        fullWidth: {
            true: "w-full",
            false: ""
        }
    },
    defaultVariants: {
        variant: "default",
        size: "default",
        fullWidth: false
    }
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <locals>": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Button Components
 * 
 * Core button components with variants and patterns
 * used throughout the application.
 */ __turbopack_context__.s({
    "Button": ()=>Button,
    "ButtonGroup": ()=>ButtonGroup,
    "CTAButton": ()=>CTAButton,
    "EnhancedButton": ()=>Button,
    "FloatingActionButton": ()=>FloatingActionButton,
    "IconButton": ()=>IconButton,
    "LoadingButton": ()=>LoadingButton,
    "SplitButton": ()=>SplitButton
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-slot/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$variants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/variants.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
const Button = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"]((param, ref)=>{
    let { className, variant, size, fullWidth, asChild = false, loading = false, loadingText, leftIcon, rightIcon, animate = false, success = false, loadingVariant: _loadingVariant = 'spinner', children, disabled, onDrag, onDragStart, onDragEnd, onAnimationStart, onAnimationEnd, ...props } = param;
    const Comp = asChild ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Slot"] : "button";
    const isDisabled = disabled || loading;
    const buttonContent = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                className: "h-4 w-4 animate-spin"
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
                lineNumber: 63,
                columnNumber: 11
            }, ("TURBOPACK compile-time value", void 0)) : leftIcon && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "shrink-0",
                children: leftIcon
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
                lineNumber: 65,
                columnNumber: 23
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(loading && loadingText && "sr-only"),
                children: children
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
                lineNumber: 68,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            loading && loadingText && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: loadingText
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
                lineNumber: 73,
                columnNumber: 11
            }, ("TURBOPACK compile-time value", void 0)),
            !loading && rightIcon && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "shrink-0",
                children: rightIcon
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
                lineNumber: 77,
                columnNumber: 11
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true);
    // Enhanced animation logic incorporating success state
    if ((animate || success) && !asChild) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].button, {
            ref: ref,
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$variants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["enhancedButtonVariants"])({
                variant,
                size,
                fullWidth
            }), className),
            disabled: isDisabled,
            whileHover: !isDisabled ? {
                scale: 1.02
            } : undefined,
            whileTap: !isDisabled ? {
                scale: 0.98
            } : undefined,
            animate: success ? {
                backgroundColor: [
                    "var(--primary)",
                    "var(--success)",
                    "var(--primary)"
                ],
                transition: {
                    duration: 0.5
                }
            } : undefined,
            transition: {
                type: "spring",
                stiffness: 400,
                damping: 30,
                duration: animate ? 0.1 : undefined
            },
            ...props,
            children: buttonContent
        }, void 0, false, {
            fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
            lineNumber: 85,
            columnNumber: 9
        }, ("TURBOPACK compile-time value", void 0));
    }
    const buttonElement = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Comp, {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$variants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["enhancedButtonVariants"])({
            variant,
            size,
            fullWidth
        }), className),
        disabled: isDisabled,
        ...props,
        children: asChild ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "inline-flex items-center gap-2",
            children: buttonContent
        }, void 0, false, {
            fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
            lineNumber: 121,
            columnNumber: 20
        }, ("TURBOPACK compile-time value", void 0)) : buttonContent
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
        lineNumber: 112,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0));
    return buttonElement;
});
_c = Button;
Button.displayName = "Button";
function ButtonGroup(param) {
    let { children, className, orientation = 'horizontal', attach = false, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("inline-flex", orientation === 'horizontal' ? "flex-row" : "flex-col", attach ? orientation === 'horizontal' ? "[&>*:not(:first-child)]:ml-[-1px] [&>*:not(:first-child):not(:last-child)]:rounded-none [&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none" : "[&>*:not(:first-child)]:mt-[-1px] [&>*:not(:first-child):not(:last-child)]:rounded-none [&>*:first-child]:rounded-b-none [&>*:last-child]:rounded-t-none" : orientation === 'horizontal' ? "space-x-2" : "space-y-2", className),
        role: "group",
        ...props,
        children: children
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
        lineNumber: 149,
        columnNumber: 5
    }, this);
}
_c1 = ButtonGroup;
const IconButton = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c2 = (param, ref)=>{
    let { icon, label, className, rotate = false, animate = true, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Button, {
        ref: ref,
        className: className,
        "aria-label": label,
        title: props.tooltip || label,
        animate: animate,
        ...props,
        children: [
            rotate ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
                animate: {
                    rotate: 360
                },
                transition: {
                    duration: 0.5
                },
                children: icon
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
                lineNumber: 193,
                columnNumber: 11
            }, ("TURBOPACK compile-time value", void 0)) : icon,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "sr-only",
                children: label
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
                lineNumber: 202,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
        lineNumber: 184,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0));
});
_c3 = IconButton;
IconButton.displayName = "IconButton";
const CTAButton = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c4 = (param, ref)=>{
    let { priority = 'primary', glow = false, pulse = false, className, variant, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Button, {
        ref: ref,
        variant: variant || (priority === 'primary' ? 'cta' : 'outline'),
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(glow && "relative overflow-visible shadow-lg", glow && "before:absolute before:inset-[-2px] before:bg-gradient-to-r before:from-primary before:to-accent before:rounded-[inherit] before:opacity-60 before:blur-sm before:z-[-1]", pulse && "animate-pulse", className),
        animate: true,
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
        lineNumber: 229,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0));
});
_c5 = CTAButton;
CTAButton.displayName = "CTAButton";
const LoadingButton = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c6 = (param, ref)=>{
    let { loading, loadingVariant = 'spinner', children, className, ...props } = param;
    const loadingContent = {
        spinner: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
            animate: {
                rotate: 360
            },
            transition: {
                duration: 1,
                repeat: Infinity,
                ease: "linear"
            },
            className: "mr-2",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                className: "h-4 w-4"
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
                lineNumber: 269,
                columnNumber: 11
            }, ("TURBOPACK compile-time value", void 0))
        }, void 0, false, {
            fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
            lineNumber: 264,
            columnNumber: 9
        }, ("TURBOPACK compile-time value", void 0)),
        dots: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex space-x-1 mr-2",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
                    lineNumber: 274,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
                    lineNumber: 275,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-1 h-1 bg-current rounded-full animate-bounce"
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
                    lineNumber: 276,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
            lineNumber: 273,
            columnNumber: 9
        }, ("TURBOPACK compile-time value", void 0)),
        shimmer: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "h-4 w-16 bg-current/20 rounded animate-pulse mr-2"
        }, void 0, false, {
            fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
            lineNumber: 280,
            columnNumber: 9
        }, ("TURBOPACK compile-time value", void 0))
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Button, {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(loading && "cursor-not-allowed", className),
        disabled: loading,
        loading: loading,
        loadingVariant: loadingVariant,
        ...props,
        children: loading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                loadingContent[loadingVariant],
                typeof children === 'string' ? children : null
            ]
        }, void 0, true) : children
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
        lineNumber: 285,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0));
});
_c7 = LoadingButton;
LoadingButton.displayName = "LoadingButton";
function SplitButton(param) {
    let { mainAction, dropdownActions, variant = 'default', size = 'default', className, ...props } = param;
    _s();
    const [isOpen, setIsOpen] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative inline-flex",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Button, {
                variant: variant,
                size: size,
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-r-none border-r-0", className),
                onClick: mainAction.onClick,
                ...props,
                children: mainAction.label
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
                lineNumber: 339,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Button, {
                variant: variant,
                size: size,
                className: "rounded-l-none px-2",
                onClick: ()=>setIsOpen(!isOpen),
                ...props,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                    className: "w-4 h-4",
                    fill: "none",
                    stroke: "currentColor",
                    viewBox: "0 0 24 24",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        strokeWidth: 2,
                        d: "M19 9l-7 7-7-7"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
                        lineNumber: 357,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
                    lineNumber: 356,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
                lineNumber: 349,
                columnNumber: 7
            }, this),
            isOpen && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute top-full left-0 z-50 mt-1 w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg",
                children: dropdownActions.map((action, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors", "hover:bg-accent hover:text-accent-foreground", action.destructive && "text-red-600 hover:bg-red-50 hover:text-red-700"),
                        onClick: ()=>{
                            action.onClick();
                            setIsOpen(false);
                        },
                        children: [
                            action.icon && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "mr-2",
                                children: action.icon
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
                                lineNumber: 377,
                                columnNumber: 17
                            }, this),
                            action.label
                        ]
                    }, index, true, {
                        fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
                        lineNumber: 364,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
                lineNumber: 362,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
        lineNumber: 338,
        columnNumber: 5
    }, this);
}
_s(SplitButton, "+sus0Lb0ewKHdwiUhiTAJFoFyQ0=");
_c8 = SplitButton;
const FloatingActionButton = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c9 = (param, ref)=>{
    let { position = 'bottom-right', offset = '2rem', className, size = 'lg', variant = 'default', animate = true, onDrag, onDragStart, onDragEnd, onAnimationStart, onAnimationEnd, ...props } = param;
    const positions = {
        'bottom-right': "fixed bottom-[".concat(offset, "] right-[").concat(offset, "]"),
        'bottom-left': "fixed bottom-[".concat(offset, "] left-[").concat(offset, "]"),
        'top-right': "fixed top-[".concat(offset, "] right-[").concat(offset, "]"),
        'top-left': "fixed top-[".concat(offset, "] left-[").concat(offset, "]")
    };
    // Use motion.button directly for enhanced animations
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].button, {
        ref: ref,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$variants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["enhancedButtonVariants"])({
            variant,
            size,
            fullWidth: false
        }), positions[position], "z-50 rounded-full shadow-lg hover:shadow-xl transition-all duration-200", className),
        initial: {
            scale: 0,
            opacity: 0
        },
        animate: {
            scale: 1,
            opacity: 1
        },
        whileHover: animate ? {
            scale: 1.1
        } : undefined,
        whileTap: animate ? {
            scale: 0.9
        } : undefined,
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 30
        },
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/button.tsx",
        lineNumber: 421,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0));
});
_c10 = FloatingActionButton;
FloatingActionButton.displayName = "FloatingActionButton";
;
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c10;
__turbopack_context__.k.register(_c, "Button");
__turbopack_context__.k.register(_c1, "ButtonGroup");
__turbopack_context__.k.register(_c2, "IconButton$React.forwardRef");
__turbopack_context__.k.register(_c3, "IconButton");
__turbopack_context__.k.register(_c4, "CTAButton$React.forwardRef");
__turbopack_context__.k.register(_c5, "CTAButton");
__turbopack_context__.k.register(_c6, "LoadingButton$React.forwardRef");
__turbopack_context__.k.register(_c7, "LoadingButton");
__turbopack_context__.k.register(_c8, "SplitButton");
__turbopack_context__.k.register(_c9, "FloatingActionButton$React.forwardRef");
__turbopack_context__.k.register(_c10, "FloatingActionButton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <module evaluation>": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$variants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/variants.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <locals>");
}),
"[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <exports>": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({
    "Button": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Button"],
    "ButtonGroup": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ButtonGroup"],
    "CTAButton": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["CTAButton"],
    "EnhancedButton": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["EnhancedButton"],
    "FloatingActionButton": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["FloatingActionButton"],
    "IconButton": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["IconButton"],
    "LoadingButton": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["LoadingButton"],
    "SplitButton": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["SplitButton"],
    "buttonVariants": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$variants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["enhancedButtonVariants"]
});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$variants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/variants.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <locals>");
}),
"[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({
    "Button": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$exports$3e$__["Button"],
    "ButtonGroup": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$exports$3e$__["ButtonGroup"],
    "CTAButton": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$exports$3e$__["CTAButton"],
    "EnhancedButton": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$exports$3e$__["EnhancedButton"],
    "FloatingActionButton": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$exports$3e$__["FloatingActionButton"],
    "IconButton": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$exports$3e$__["IconButton"],
    "LoadingButton": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$exports$3e$__["LoadingButton"],
    "SplitButton": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$exports$3e$__["SplitButton"],
    "buttonVariants": ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$exports$3e$__["buttonVariants"]
});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$exports$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <exports>");
}),
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
"[project]/apps/frontend/src/components/auth/auth-layout-client.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "AuthLayoutClient": ()=>AuthLayoutClient
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$framer$2d$motion$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/framer-motion.ts [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-client] (ecmascript)");
'use client';
;
;
function AuthLayoutClient(param) {
    let { children, side } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
        initial: {
            opacity: 0,
            x: side === 'left' ? -20 : 20
        },
        animate: {
            opacity: 1,
            x: 0
        },
        transition: {
            duration: 0.6,
            ease: 'easeOut'
        },
        className: "w-full",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
            initial: {
                opacity: 0,
                y: 20
            },
            animate: {
                opacity: 1,
                y: 0
            },
            transition: {
                delay: 0.4
            },
            children: children
        }, void 0, false, {
            fileName: "[project]/apps/frontend/src/components/auth/auth-layout-client.tsx",
            lineNumber: 18,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/auth/auth-layout-client.tsx",
        lineNumber: 12,
        columnNumber: 5
    }, this);
}
_c = AuthLayoutClient;
var _c;
__turbopack_context__.k.register(_c, "AuthLayoutClient");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/error/not-found-actions.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "NotFoundActions": ()=>NotFoundActions
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-left.js [app-client] (ecmascript) <export default as ArrowLeft>");
'use client';
;
;
;
function NotFoundActions() {
    const handleGoBack = ()=>{
        if ("object" !== 'undefined' && window.history.length > 1) {
            window.history.back();
        } else {
            // Fallback to homepage if no history
            window.location.href = '/';
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Button"], {
        onClick: handleGoBack,
        variant: "outline",
        className: "w-full flex items-center justify-center gap-2",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__["ArrowLeft"], {
                className: "h-4 w-4"
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/error/not-found-actions.tsx",
                lineNumber: 26,
                columnNumber: 7
            }, this),
            "Go Back"
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/error/not-found-actions.tsx",
        lineNumber: 21,
        columnNumber: 5
    }, this);
}
_c = NotFoundActions;
var _c;
__turbopack_context__.k.register(_c, "NotFoundActions");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
}]);

//# sourceMappingURL=apps_frontend_src_115e29e0._.js.map
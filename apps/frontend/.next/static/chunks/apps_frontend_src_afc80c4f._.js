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
"[project]/apps/frontend/src/components/ui/card.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "Card": ()=>Card,
    "CardAction": ()=>CardAction,
    "CardContent": ()=>CardContent,
    "CardDescription": ()=>CardDescription,
    "CardFooter": ()=>CardFooter,
    "CardHeader": ()=>CardHeader,
    "CardTitle": ()=>CardTitle
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
;
;
function Card(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/card.tsx",
        lineNumber: 7,
        columnNumber: 5
    }, this);
}
_c = Card;
function CardHeader(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card-header",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/card.tsx",
        lineNumber: 20,
        columnNumber: 5
    }, this);
}
_c1 = CardHeader;
function CardTitle(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card-title",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("leading-none font-semibold", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/card.tsx",
        lineNumber: 33,
        columnNumber: 5
    }, this);
}
_c2 = CardTitle;
function CardDescription(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card-description",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-muted-foreground text-sm", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/card.tsx",
        lineNumber: 43,
        columnNumber: 5
    }, this);
}
_c3 = CardDescription;
function CardAction(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card-action",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/card.tsx",
        lineNumber: 53,
        columnNumber: 5
    }, this);
}
_c4 = CardAction;
function CardContent(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card-content",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-6", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/card.tsx",
        lineNumber: 66,
        columnNumber: 5
    }, this);
}
_c5 = CardContent;
function CardFooter(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "card-footer",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center px-6 [.border-t]:pt-6", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/card.tsx",
        lineNumber: 76,
        columnNumber: 5
    }, this);
}
_c6 = CardFooter;
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6;
__turbopack_context__.k.register(_c, "Card");
__turbopack_context__.k.register(_c1, "CardHeader");
__turbopack_context__.k.register(_c2, "CardTitle");
__turbopack_context__.k.register(_c3, "CardDescription");
__turbopack_context__.k.register(_c4, "CardAction");
__turbopack_context__.k.register(_c5, "CardContent");
__turbopack_context__.k.register(_c6, "CardFooter");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/hooks/use-accessibility.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "accessibilityPreferencesAtom": ()=>accessibilityPreferencesAtom,
    "focusTrapActiveAtom": ()=>focusTrapActiveAtom,
    "screenReaderActiveAtom": ()=>screenReaderActiveAtom,
    "useA11yId": ()=>useA11yId,
    "useAccessibility": ()=>useAccessibility,
    "useAnnounce": ()=>useAnnounce,
    "useFocusManagement": ()=>useFocusManagement,
    "useFocusRestore": ()=>useFocusRestore,
    "useKeyboardNavigation": ()=>useKeyboardNavigation,
    "useKeyboardUser": ()=>useKeyboardUser
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/vanilla.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/react.mjs [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature(), _s4 = __turbopack_context__.k.signature(), _s5 = __turbopack_context__.k.signature(), _s6 = __turbopack_context__.k.signature();
;
;
const accessibilityPreferencesAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])({
    reducedMotion: false,
    highContrast: false,
    fontSize: 'medium',
    announcements: true
});
const screenReaderActiveAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(false);
const focusTrapActiveAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(false);
function useAccessibility() {
    let options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    _s();
    const [preferences, setPreferences] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(accessibilityPreferencesAtom);
    const [screenReaderActive, setScreenReaderActive] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(screenReaderActiveAtom);
    const [focusTrapActive, setFocusTrapActive] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(focusTrapActiveAtom);
    const [isClient, setIsClient] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    // Initialize client-side only features
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useAccessibility.useEffect": ()=>{
            setIsClient(true);
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            // Detect reduced motion preference
            const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            const handleChange = {
                "useAccessibility.useEffect.handleChange": (e)=>{
                    setPreferences({
                        "useAccessibility.useEffect.handleChange": (prev)=>({
                                ...prev,
                                reducedMotion: e.matches
                            })
                    }["useAccessibility.useEffect.handleChange"]);
                }
            }["useAccessibility.useEffect.handleChange"];
            setPreferences({
                "useAccessibility.useEffect": (prev)=>({
                        ...prev,
                        reducedMotion: mediaQuery.matches
                    })
            }["useAccessibility.useEffect"]);
            mediaQuery.addEventListener('change', handleChange);
            // Detect high contrast preference
            const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
            const handleContrastChange = {
                "useAccessibility.useEffect.handleContrastChange": (e)=>{
                    setPreferences({
                        "useAccessibility.useEffect.handleContrastChange": (prev)=>({
                                ...prev,
                                highContrast: e.matches
                            })
                    }["useAccessibility.useEffect.handleContrastChange"]);
                }
            }["useAccessibility.useEffect.handleContrastChange"];
            setPreferences({
                "useAccessibility.useEffect": (prev)=>({
                        ...prev,
                        highContrast: highContrastQuery.matches
                    })
            }["useAccessibility.useEffect"]);
            highContrastQuery.addEventListener('change', handleContrastChange);
            // Simple screen reader detection
            const detectScreenReader = {
                "useAccessibility.useEffect.detectScreenReader": ()=>{
                    // Check for common screen reader indicators
                    const hasAriaLive = document.querySelector('[aria-live]');
                    const hasAriaLabel = document.querySelector('[aria-label]');
                    const hasScreenReaderText = document.querySelector('.sr-only, .screen-reader-text');
                    setScreenReaderActive(!!(hasAriaLive || hasAriaLabel || hasScreenReaderText));
                }
            }["useAccessibility.useEffect.detectScreenReader"];
            // Run detection after a short delay to allow DOM to populate
            setTimeout(detectScreenReader, 1000);
            return ({
                "useAccessibility.useEffect": ()=>{
                    mediaQuery.removeEventListener('change', handleChange);
                    highContrastQuery.removeEventListener('change', handleContrastChange);
                }
            })["useAccessibility.useEffect"];
        }
    }["useAccessibility.useEffect"], [
        setPreferences,
        setScreenReaderActive
    ]);
    // Announce function for screen readers
    const announce = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAccessibility.useCallback[announce]": function(message) {
            let priority = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 'polite';
            if (!isClient || !options.announceChanges) return;
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', priority);
            announcement.setAttribute('aria-atomic', 'true');
            announcement.setAttribute('class', 'sr-only');
            announcement.style.cssText = "\n      position: absolute !important;\n      width: 1px !important;\n      height: 1px !important;\n      padding: 0 !important;\n      margin: -1px !important;\n      overflow: hidden !important;\n      clip: rect(0, 0, 0, 0) !important;\n      border: 0 !important;\n    ";
            document.body.appendChild(announcement);
            // Add message after a brief delay to ensure it's announced
            setTimeout({
                "useAccessibility.useCallback[announce]": ()=>{
                    announcement.textContent = message;
                }
            }["useAccessibility.useCallback[announce]"], 100);
            // Clean up after announcement
            setTimeout({
                "useAccessibility.useCallback[announce]": ()=>{
                    document.body.removeChild(announcement);
                }
            }["useAccessibility.useCallback[announce]"], 5000);
        }
    }["useAccessibility.useCallback[announce]"], [
        isClient,
        options.announceChanges
    ]);
    // Focus trap management
    const enableFocusTrap = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAccessibility.useCallback[enableFocusTrap]": (container)=>{
            if (!container || !options.trapFocus) return;
            setFocusTrapActive(true);
            const focusableElements = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusableElements.length === 0) return;
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            const trapFocus = {
                "useAccessibility.useCallback[enableFocusTrap].trapFocus": (e)=>{
                    if (e.key !== 'Tab') return;
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            lastElement.focus();
                            e.preventDefault();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            firstElement.focus();
                            e.preventDefault();
                        }
                    }
                }
            }["useAccessibility.useCallback[enableFocusTrap].trapFocus"];
            container.addEventListener('keydown', trapFocus);
            firstElement.focus();
            return ({
                "useAccessibility.useCallback[enableFocusTrap]": ()=>{
                    container.removeEventListener('keydown', trapFocus);
                    setFocusTrapActive(false);
                }
            })["useAccessibility.useCallback[enableFocusTrap]"];
        }
    }["useAccessibility.useCallback[enableFocusTrap]"], [
        options.trapFocus,
        setFocusTrapActive
    ]);
    // Disable focus trap
    const disableFocusTrap = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAccessibility.useCallback[disableFocusTrap]": ()=>{
            setFocusTrapActive(false);
        }
    }["useAccessibility.useCallback[disableFocusTrap]"], [
        setFocusTrapActive
    ]);
    // Update font size
    const setFontSize = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAccessibility.useCallback[setFontSize]": (size)=>{
            setPreferences({
                "useAccessibility.useCallback[setFontSize]": (prev)=>({
                        ...prev,
                        fontSize: size
                    })
            }["useAccessibility.useCallback[setFontSize]"]);
            if (isClient) {
                document.documentElement.style.setProperty('--font-size-multiplier', size === 'small' ? '0.875' : size === 'large' ? '1.125' : '1');
            }
        }
    }["useAccessibility.useCallback[setFontSize]"], [
        setPreferences,
        isClient
    ]);
    // Toggle high contrast
    const toggleHighContrast = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAccessibility.useCallback[toggleHighContrast]": ()=>{
            setPreferences({
                "useAccessibility.useCallback[toggleHighContrast]": (prev)=>{
                    const newHighContrast = !prev.highContrast;
                    if (isClient) {
                        document.documentElement.classList.toggle('high-contrast', newHighContrast);
                    }
                    return {
                        ...prev,
                        highContrast: newHighContrast
                    };
                }
            }["useAccessibility.useCallback[toggleHighContrast]"]);
        }
    }["useAccessibility.useCallback[toggleHighContrast]"], [
        setPreferences,
        isClient
    ]);
    // Skip to content function
    const skipToContent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAccessibility.useCallback[skipToContent]": ()=>{
            const mainContent = document.querySelector('main, [role="main"], #main-content');
            if (mainContent instanceof HTMLElement) {
                mainContent.focus();
                announce('Skipped to main content');
            }
        }
    }["useAccessibility.useCallback[skipToContent]"], [
        announce
    ]);
    return {
        // State
        preferences,
        screenReaderActive,
        focusTrapActive,
        isClient,
        // Functions
        announce,
        enableFocusTrap,
        disableFocusTrap,
        setFontSize,
        toggleHighContrast,
        skipToContent,
        // Utilities
        respectsReducedMotion: options.respectReducedMotion && preferences.reducedMotion
    };
}
_s(useAccessibility, "WpdAhKKsIYxAIlopCMDeA5vABsg=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"]
    ];
});
function useKeyboardUser() {
    _s1();
    const [isKeyboardUser, setIsKeyboardUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useKeyboardUser.useEffect": ()=>{
            const handleKeyDown = {
                "useKeyboardUser.useEffect.handleKeyDown": (e)=>{
                    if (e.key === 'Tab') {
                        setIsKeyboardUser(true);
                        document.body.classList.add('keyboard-navigation');
                    }
                }
            }["useKeyboardUser.useEffect.handleKeyDown"];
            const handleMouseDown = {
                "useKeyboardUser.useEffect.handleMouseDown": ()=>{
                    setIsKeyboardUser(false);
                    document.body.classList.remove('keyboard-navigation');
                }
            }["useKeyboardUser.useEffect.handleMouseDown"];
            document.addEventListener('keydown', handleKeyDown);
            document.addEventListener('mousedown', handleMouseDown);
            return ({
                "useKeyboardUser.useEffect": ()=>{
                    document.removeEventListener('keydown', handleKeyDown);
                    document.removeEventListener('mousedown', handleMouseDown);
                }
            })["useKeyboardUser.useEffect"];
        }
    }["useKeyboardUser.useEffect"], []);
    return {
        isKeyboardUser
    };
}
_s1(useKeyboardUser, "JSPIsDS+2DIVnmCCHlLlBR+tl0A=");
function useKeyboardNavigation(items) {
    let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    _s2();
    const [currentIndex, setCurrentIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const { loop = false, orientation = 'vertical', onActivate } = options;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useKeyboardNavigation.useEffect": ()=>{
            const handleKeyDown = {
                "useKeyboardNavigation.useEffect.handleKeyDown": (e)=>{
                    const isNext = orientation === 'vertical' ? e.key === 'ArrowDown' : e.key === 'ArrowRight';
                    const isPrev = orientation === 'vertical' ? e.key === 'ArrowUp' : e.key === 'ArrowLeft';
                    if (isNext) {
                        e.preventDefault();
                        setCurrentIndex({
                            "useKeyboardNavigation.useEffect.handleKeyDown": (prev)=>{
                                const next = prev + 1;
                                if (next >= items.length) {
                                    return loop ? 0 : prev;
                                }
                                return next;
                            }
                        }["useKeyboardNavigation.useEffect.handleKeyDown"]);
                    } else if (isPrev) {
                        e.preventDefault();
                        setCurrentIndex({
                            "useKeyboardNavigation.useEffect.handleKeyDown": (prev)=>{
                                const next = prev - 1;
                                if (next < 0) {
                                    return loop ? items.length - 1 : prev;
                                }
                                return next;
                            }
                        }["useKeyboardNavigation.useEffect.handleKeyDown"]);
                    } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (onActivate && items[currentIndex]) {
                            onActivate(items[currentIndex], currentIndex);
                        }
                    }
                }
            }["useKeyboardNavigation.useEffect.handleKeyDown"];
            document.addEventListener('keydown', handleKeyDown);
            return ({
                "useKeyboardNavigation.useEffect": ()=>document.removeEventListener('keydown', handleKeyDown)
            })["useKeyboardNavigation.useEffect"];
        }
    }["useKeyboardNavigation.useEffect"], [
        items,
        currentIndex,
        loop,
        orientation,
        onActivate
    ]);
    return {
        currentIndex,
        setCurrentIndex
    };
}
_s2(useKeyboardNavigation, "tPjzCc9H5UuFdWNuAHYoD0K4UOk=");
function useFocusRestore() {
    _s3();
    const restoreFocus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useFocusRestore.useCallback[restoreFocus]": ()=>{
            const lastFocusedElement = document.activeElement;
            return ({
                "useFocusRestore.useCallback[restoreFocus]": ()=>{
                    if (lastFocusedElement && lastFocusedElement.focus) {
                        // Restore focus after a brief delay to ensure the element is still in DOM
                        setTimeout({
                            "useFocusRestore.useCallback[restoreFocus]": ()=>{
                                lastFocusedElement.focus();
                            }
                        }["useFocusRestore.useCallback[restoreFocus]"], 100);
                    }
                }
            })["useFocusRestore.useCallback[restoreFocus]"];
        }
    }["useFocusRestore.useCallback[restoreFocus]"], []);
    return {
        restoreFocus
    };
}
_s3(useFocusRestore, "nw96PjjdkybSrDWfw1R5BpPYo9E=");
function useA11yId() {
    let prefix = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 'a11y';
    _s4();
    const [id] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "useA11yId.useState": ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            return "".concat(prefix, "-").concat(Date.now(), "-").concat(Math.random().toString(36).substr(2, 9));
        }
    }["useA11yId.useState"]);
    return id;
}
_s4(useA11yId, "DvKszpl5dvC7I0Tob/YmGgaxmSQ=");
function useFocusManagement(isOpen) {
    let restoreFocus = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : true;
    _s5();
    const previousFocusRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const containerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useFocusManagement.useEffect": ()=>{
            if (isOpen) {
                // Store current focus
                previousFocusRef.current = document.activeElement;
                // Focus first focusable element in container
                if (containerRef.current) {
                    const focusable = containerRef.current.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                    focusable === null || focusable === void 0 ? void 0 : focusable.focus();
                }
            } else if (restoreFocus && previousFocusRef.current) {
                // Restore focus when closing
                previousFocusRef.current.focus();
                previousFocusRef.current = null;
            }
        }
    }["useFocusManagement.useEffect"], [
        isOpen,
        restoreFocus
    ]);
    return containerRef;
}
_s5(useFocusManagement, "vBJJw9Jba87FzD33ozC8009eaiA=");
function useAnnounce() {
    _s6();
    const announceRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useAnnounce.useEffect": ()=>{
            // Create live region for announcements
            const announcer = document.createElement('div');
            announcer.setAttribute('aria-live', 'polite');
            announcer.setAttribute('aria-atomic', 'true');
            announcer.setAttribute('role', 'status');
            announcer.style.position = 'absolute';
            announcer.style.left = '-10000px';
            announcer.style.width = '1px';
            announcer.style.height = '1px';
            announcer.style.overflow = 'hidden';
            document.body.appendChild(announcer);
            announceRef.current = announcer;
            return ({
                "useAnnounce.useEffect": ()=>{
                    if (announceRef.current && document.body.contains(announceRef.current)) {
                        document.body.removeChild(announceRef.current);
                    }
                }
            })["useAnnounce.useEffect"];
        }
    }["useAnnounce.useEffect"], []);
    const announce = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAnnounce.useCallback[announce]": function(message) {
            let priority = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 'polite';
            if (announceRef.current) {
                announceRef.current.setAttribute('aria-live', priority);
                announceRef.current.textContent = message;
                // Clear after announcement
                setTimeout({
                    "useAnnounce.useCallback[announce]": ()=>{
                        if (announceRef.current) {
                            announceRef.current.textContent = '';
                        }
                    }
                }["useAnnounce.useCallback[announce]"], 1000);
            }
        }
    }["useAnnounce.useCallback[announce]"], []);
    return announce;
}
_s6(useAnnounce, "WxfHz3lxJ5+s4MAyx44BtAzx5wA=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/input.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "Input": ()=>Input
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-client] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/eye.js [app-client] (ecmascript) <export default as Eye>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2d$off$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__EyeOff$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/eye-off.js [app-client] (ecmascript) <export default as EyeOff>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$accessibility$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-accessibility.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
const Input = /*#__PURE__*/ _s(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["forwardRef"](_c = _s((param, ref)=>{
    let { className, type, label, error, success, floatingLabel = false, showValidation = true, characterCount = false, maxLength, id, placeholder, value, onChange, onFocus, onBlur, 'aria-label': ariaLabel, 'aria-describedby': ariaDescribedBy, 'aria-required': ariaRequired, 'aria-invalid': ariaInvalid, ...props } = param;
    _s();
    const [isFocused, setIsFocused] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](false);
    const [showPassword, setShowPassword] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](false);
    const [internalValue, setInternalValue] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](value || "");
    const generatedId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$accessibility$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useA11yId"])('input');
    const actualId = id || generatedId;
    const errorId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$accessibility$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useA11yId"])('error');
    const successId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$accessibility$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useA11yId"])('success');
    const helpTextId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$accessibility$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useA11yId"])('help');
    // Track internal value for character count and floating label
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "Input.useEffect": ()=>{
            if (value !== undefined) {
                setInternalValue(value);
            }
        }
    }["Input.useEffect"], [
        value
    ]);
    const hasValue = String(internalValue).length > 0;
    const shouldFloat = floatingLabel && (isFocused || hasValue);
    const actualType = type === 'password' && showPassword ? 'text' : type;
    const isPasswordField = type === 'password';
    const hasError = !!error;
    const hasSuccess = !!success && !hasError;
    // Build aria-describedby attribute
    const describedByIds = [];
    if (ariaDescribedBy) describedByIds.push(ariaDescribedBy);
    if (hasError) describedByIds.push(errorId);
    if (hasSuccess && !hasError) describedByIds.push(successId);
    if (characterCount && maxLength) describedByIds.push(helpTextId);
    const describedBy = describedByIds.length > 0 ? describedByIds.join(' ') : undefined;
    const handleFocus = (e)=>{
        setIsFocused(true);
        onFocus === null || onFocus === void 0 ? void 0 : onFocus(e);
    };
    const handleBlur = (e)=>{
        setIsFocused(false);
        onBlur === null || onBlur === void 0 ? void 0 : onBlur(e);
    };
    const handleChange = (e)=>{
        const newValue = e.target.value;
        setInternalValue(newValue);
        onChange === null || onChange === void 0 ? void 0 : onChange(e);
    };
    const baseInputClasses = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", // Focus states with smooth transitions
    "focus:border-ring focus:ring-ring/50 focus:ring-[3px] focus:shadow-sm", // Validation states
    hasError && "border-destructive ring-destructive/20 dark:ring-destructive/40 animate-shake", hasSuccess && "border-green-500 ring-green-500/20 dark:ring-green-500/40", // Floating label adjustments
    floatingLabel && "pt-6 pb-1", // Password field padding adjustment
    isPasswordField && "pr-10", className);
    if (floatingLabel) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "relative",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    ref: ref,
                    id: actualId,
                    type: actualType,
                    value: internalValue,
                    onChange: handleChange,
                    onFocus: handleFocus,
                    onBlur: handleBlur,
                    className: baseInputClasses,
                    placeholder: isFocused ? placeholder : "",
                    maxLength: maxLength,
                    "aria-label": ariaLabel || (label && !floatingLabel ? label : undefined),
                    "aria-describedby": describedBy,
                    "aria-required": ariaRequired,
                    "aria-invalid": ariaInvalid !== null && ariaInvalid !== void 0 ? ariaInvalid : hasError,
                    ...props
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                    lineNumber: 111,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0)),
                label && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                    htmlFor: actualId,
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("absolute left-3 top-2 text-muted-foreground transition-all duration-200 pointer-events-none origin-left", shouldFloat && "top-1 text-xs scale-85 text-foreground", hasError && "text-destructive", hasSuccess && "text-green-600"),
                    style: {
                        transform: shouldFloat ? 'translateY(-0.5rem) scale(0.85)' : undefined
                    },
                    children: label
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                    lineNumber: 130,
                    columnNumber: 13
                }, ("TURBOPACK compile-time value", void 0)),
                isPasswordField && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                    type: "button",
                    onClick: ()=>setShowPassword(!showPassword),
                    className: "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
                    tabIndex: 0,
                    "aria-label": showPassword ? "Hide password" : "Show password",
                    "aria-pressed": showPassword,
                    "aria-controls": actualId,
                    children: showPassword ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2d$off$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__EyeOff$3e$__["EyeOff"], {
                        className: "w-4 h-4",
                        "aria-hidden": "true"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                        lineNumber: 158,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                        className: "w-4 h-4",
                        "aria-hidden": "true"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                        lineNumber: 160,
                        columnNumber: 17
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                    lineNumber: 148,
                    columnNumber: 13
                }, ("TURBOPACK compile-time value", void 0)),
                showValidation && !isPasswordField && (hasError || hasSuccess) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "absolute right-3 top-1/2 -translate-y-1/2",
                    children: [
                        hasError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                            className: "w-4 h-4 text-destructive animate-fade-in"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                            lineNumber: 169,
                            columnNumber: 17
                        }, ("TURBOPACK compile-time value", void 0)),
                        hasSuccess && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                            className: "w-4 h-4 text-green-500 animate-success"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                            lineNumber: 172,
                            columnNumber: 17
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                    lineNumber: 167,
                    columnNumber: 13
                }, ("TURBOPACK compile-time value", void 0)),
                characterCount && maxLength && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    id: helpTextId,
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("absolute right-2 top-full mt-1 text-xs text-muted-foreground transition-colors duration-200", String(internalValue).length > maxLength * 0.8 && "text-orange-500", String(internalValue).length >= maxLength && "text-destructive"),
                    "aria-live": "polite",
                    children: [
                        String(internalValue).length,
                        "/",
                        maxLength
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                    lineNumber: 179,
                    columnNumber: 13
                }, ("TURBOPACK compile-time value", void 0)),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                    mode: "wait",
                    children: (error || success) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mt-1 text-sm animate-fade-in",
                        children: [
                            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                id: errorId,
                                className: "text-destructive flex items-center gap-1",
                                role: "alert",
                                "aria-live": "assertive",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                                        className: "w-3 h-3",
                                        "aria-hidden": "true"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                                        lineNumber: 203,
                                        columnNumber: 21
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    error
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                                lineNumber: 197,
                                columnNumber: 19
                            }, ("TURBOPACK compile-time value", void 0)),
                            success && !error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                id: successId,
                                className: "text-green-600 flex items-center gap-1",
                                role: "status",
                                "aria-live": "polite",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                                        className: "w-3 h-3",
                                        "aria-hidden": "true"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                                        lineNumber: 214,
                                        columnNumber: 21
                                    }, ("TURBOPACK compile-time value", void 0)),
                                    success
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                                lineNumber: 208,
                                columnNumber: 19
                            }, ("TURBOPACK compile-time value", void 0))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                        lineNumber: 195,
                        columnNumber: 15
                    }, ("TURBOPACK compile-time value", void 0))
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                    lineNumber: 193,
                    columnNumber: 11
                }, ("TURBOPACK compile-time value", void 0))
            ]
        }, void 0, true, {
            fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
            lineNumber: 110,
            columnNumber: 9
        }, ("TURBOPACK compile-time value", void 0));
    }
    // Standard input without floating label
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "relative",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                ref: ref,
                id: actualId,
                type: actualType,
                value: internalValue,
                onChange: handleChange,
                onFocus: handleFocus,
                onBlur: handleBlur,
                className: baseInputClasses,
                placeholder: placeholder,
                maxLength: maxLength,
                "aria-label": ariaLabel || label,
                "aria-describedby": describedBy,
                "aria-required": ariaRequired,
                "aria-invalid": ariaInvalid !== null && ariaInvalid !== void 0 ? ariaInvalid : hasError,
                ...props
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                lineNumber: 228,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0)),
            isPasswordField && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                onClick: ()=>setShowPassword(!showPassword),
                className: "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
                tabIndex: 0,
                "aria-label": showPassword ? "Hide password" : "Show password",
                "aria-pressed": showPassword,
                "aria-controls": actualId,
                children: showPassword ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2d$off$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__EyeOff$3e$__["EyeOff"], {
                    className: "w-4 h-4",
                    "aria-hidden": "true"
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                    lineNumber: 258,
                    columnNumber: 15
                }, ("TURBOPACK compile-time value", void 0)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                    className: "w-4 h-4",
                    "aria-hidden": "true"
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                    lineNumber: 260,
                    columnNumber: 15
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                lineNumber: 248,
                columnNumber: 11
            }, ("TURBOPACK compile-time value", void 0)),
            showValidation && !isPasswordField && (hasError || hasSuccess) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute right-3 top-1/2 -translate-y-1/2",
                children: [
                    hasError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                        className: "w-4 h-4 text-destructive animate-fade-in"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                        lineNumber: 269,
                        columnNumber: 15
                    }, ("TURBOPACK compile-time value", void 0)),
                    hasSuccess && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                        className: "w-4 h-4 text-green-500 animate-success"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                        lineNumber: 272,
                        columnNumber: 15
                    }, ("TURBOPACK compile-time value", void 0))
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                lineNumber: 267,
                columnNumber: 11
            }, ("TURBOPACK compile-time value", void 0)),
            characterCount && maxLength && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                id: helpTextId,
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("absolute right-2 top-full mt-1 text-xs text-muted-foreground transition-colors duration-200", String(internalValue).length > maxLength * 0.8 && "text-orange-500", String(internalValue).length >= maxLength && "text-destructive"),
                "aria-live": "polite",
                children: [
                    String(internalValue).length,
                    "/",
                    maxLength
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                lineNumber: 279,
                columnNumber: 11
            }, ("TURBOPACK compile-time value", void 0)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                mode: "wait",
                children: (error || success) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "mt-1 text-sm animate-fade-in",
                    children: [
                        error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            id: errorId,
                            className: "text-destructive flex items-center gap-1",
                            role: "alert",
                            "aria-live": "assertive",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                                    className: "w-3 h-3",
                                    "aria-hidden": "true"
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                                    lineNumber: 303,
                                    columnNumber: 19
                                }, ("TURBOPACK compile-time value", void 0)),
                                error
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                            lineNumber: 297,
                            columnNumber: 17
                        }, ("TURBOPACK compile-time value", void 0)),
                        success && !error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            id: successId,
                            className: "text-green-600 flex items-center gap-1",
                            role: "status",
                            "aria-live": "polite",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                                    className: "w-3 h-3",
                                    "aria-hidden": "true"
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                                    lineNumber: 314,
                                    columnNumber: 19
                                }, ("TURBOPACK compile-time value", void 0)),
                                success
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                            lineNumber: 308,
                            columnNumber: 17
                        }, ("TURBOPACK compile-time value", void 0))
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                    lineNumber: 295,
                    columnNumber: 13
                }, ("TURBOPACK compile-time value", void 0))
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
                lineNumber: 293,
                columnNumber: 9
            }, ("TURBOPACK compile-time value", void 0))
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/ui/input.tsx",
        lineNumber: 227,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0));
}, "rzAEeZHwkHgww1ciHP4orfLrhH8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$accessibility$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useA11yId"],
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$accessibility$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useA11yId"],
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$accessibility$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useA11yId"],
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$accessibility$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useA11yId"]
    ];
})), "rzAEeZHwkHgww1ciHP4orfLrhH8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$accessibility$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useA11yId"],
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$accessibility$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useA11yId"],
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$accessibility$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useA11yId"],
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$accessibility$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useA11yId"]
    ];
});
_c1 = Input;
Input.displayName = "Input";
;
var _c, _c1;
__turbopack_context__.k.register(_c, "Input$React.forwardRef");
__turbopack_context__.k.register(_c1, "Input");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/label.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "Label": ()=>Label
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$label$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-label/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
"use client";
;
;
;
function Label(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$label$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Root"], {
        "data-slot": "label",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/label.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
_c = Label;
;
var _c;
__turbopack_context__.k.register(_c, "Label");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/checkbox.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "Checkbox": ()=>Checkbox
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$checkbox$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-checkbox/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as CheckIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
"use client";
;
;
;
;
function Checkbox(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$checkbox$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Root"], {
        "data-slot": "checkbox",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50", className),
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$checkbox$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Indicator"], {
            "data-slot": "checkbox-indicator",
            className: "flex items-center justify-center text-current transition-none",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckIcon$3e$__["CheckIcon"], {
                className: "size-3.5"
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/checkbox.tsx",
                lineNumber: 26,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/apps/frontend/src/components/ui/checkbox.tsx",
            lineNumber: 22,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/checkbox.tsx",
        lineNumber: 14,
        columnNumber: 5
    }, this);
}
_c = Checkbox;
;
var _c;
__turbopack_context__.k.register(_c, "Checkbox");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/actions/data:af964d [app-client] (ecmascript) <text/javascript>": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/* __next_internal_action_entry_do_not_use__ [{"605022e81855ee76fa9060513f75c44a32bd82a619":"loginAction"},"apps/frontend/src/lib/actions/auth-actions.ts",""] */ __turbopack_context__.s({
    "loginAction": ()=>loginAction
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var loginAction = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("605022e81855ee76fa9060513f75c44a32bd82a619", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "loginAction"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYXV0aC1hY3Rpb25zLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJztcblxuaW1wb3J0IHsgcmV2YWxpZGF0ZVRhZyB9IGZyb20gJ25leHQvY2FjaGUnO1xuaW1wb3J0IHsgcmVkaXJlY3QgfSBmcm9tICduZXh0L25hdmlnYXRpb24nO1xuaW1wb3J0IHsgeiB9IGZyb20gJ3pvZCc7XG5pbXBvcnQgeyBhdXRoLCBzdXBhYmFzZSB9IGZyb20gJ0AvbGliL3N1cGFiYXNlJztcbmltcG9ydCB0eXBlIHsgQXV0aFVzZXIgfSBmcm9tICdAL2xpYi9zdXBhYmFzZSc7XG5pbXBvcnQgeyB0cmFja1NlcnZlclNpZGVFdmVudCB9IGZyb20gJ0AvbGliL2FuYWx5dGljcy9wb3N0aG9nLXNlcnZlcic7XG5pbXBvcnQgeyBjb21tb25WYWxpZGF0aW9ucyB9IGZyb20gJ0AvbGliL3ZhbGlkYXRpb24vc2NoZW1hcyc7XG5cbi8vIEF1dGggZm9ybSBzY2hlbWFzIHVzaW5nIGNvbnNvbGlkYXRlZCB2YWxpZGF0aW9uc1xuY29uc3QgTG9naW5TY2hlbWEgPSB6Lm9iamVjdCh7XG4gIGVtYWlsOiBjb21tb25WYWxpZGF0aW9ucy5lbWFpbCxcbiAgcGFzc3dvcmQ6IHouc3RyaW5nKCkubWluKDYsICdQYXNzd29yZCBtdXN0IGJlIGF0IGxlYXN0IDYgY2hhcmFjdGVycycpLFxufSk7XG5cbmNvbnN0IFNpZ251cFNjaGVtYSA9IHoub2JqZWN0KHtcbiAgZW1haWw6IGNvbW1vblZhbGlkYXRpb25zLmVtYWlsLFxuICBwYXNzd29yZDogei5zdHJpbmcoKS5taW4oOCwgJ1Bhc3N3b3JkIG11c3QgYmUgYXQgbGVhc3QgOCBjaGFyYWN0ZXJzJyksXG4gIGNvbmZpcm1QYXNzd29yZDogei5zdHJpbmcoKS5taW4oOCwgJ1Bhc3N3b3JkIG11c3QgYmUgYXQgbGVhc3QgOCBjaGFyYWN0ZXJzJyksXG4gIGZ1bGxOYW1lOiBjb21tb25WYWxpZGF0aW9ucy5uYW1lLFxuICBjb21wYW55TmFtZTogY29tbW9uVmFsaWRhdGlvbnMub3B0aW9uYWxTdHJpbmcsXG59KS5yZWZpbmUoKGRhdGEpID0+IGRhdGEucGFzc3dvcmQgPT09IGRhdGEuY29uZmlybVBhc3N3b3JkLCB7XG4gIG1lc3NhZ2U6IFwiUGFzc3dvcmRzIGRvbid0IG1hdGNoXCIsXG4gIHBhdGg6IFtcImNvbmZpcm1QYXNzd29yZFwiXSxcbn0pO1xuXG5jb25zdCBSZXNldFBhc3N3b3JkU2NoZW1hID0gei5vYmplY3Qoe1xuICBlbWFpbDogY29tbW9uVmFsaWRhdGlvbnMuZW1haWwsXG59KTtcblxuY29uc3QgVXBkYXRlUGFzc3dvcmRTY2hlbWEgPSB6Lm9iamVjdCh7XG4gIHBhc3N3b3JkOiB6LnN0cmluZygpLm1pbig4LCAnUGFzc3dvcmQgbXVzdCBiZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnMnKSxcbiAgY29uZmlybVBhc3N3b3JkOiB6LnN0cmluZygpLm1pbig4LCAnUGFzc3dvcmQgbXVzdCBiZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnMnKSxcbn0pLnJlZmluZSgoZGF0YSkgPT4gZGF0YS5wYXNzd29yZCA9PT0gZGF0YS5jb25maXJtUGFzc3dvcmQsIHtcbiAgbWVzc2FnZTogXCJQYXNzd29yZHMgZG9uJ3QgbWF0Y2hcIixcbiAgcGF0aDogW1wiY29uZmlybVBhc3N3b3JkXCJdLFxufSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXV0aEZvcm1TdGF0ZSB7XG4gIGVycm9ycz86IHtcbiAgICBlbWFpbD86IHN0cmluZ1tdO1xuICAgIHBhc3N3b3JkPzogc3RyaW5nW107XG4gICAgY29uZmlybVBhc3N3b3JkPzogc3RyaW5nW107XG4gICAgZnVsbE5hbWU/OiBzdHJpbmdbXTtcbiAgICBjb21wYW55TmFtZT86IHN0cmluZ1tdO1xuICAgIF9mb3JtPzogc3RyaW5nW107XG4gIH07XG4gIHN1Y2Nlc3M/OiBib29sZWFuO1xuICBtZXNzYWdlPzogc3RyaW5nO1xuICBkYXRhPzoge1xuICAgIHVzZXI/OiB7XG4gICAgICBpZDogc3RyaW5nO1xuICAgICAgZW1haWw6IHN0cmluZztcbiAgICAgIG5hbWU/OiBzdHJpbmc7XG4gICAgfTtcbiAgICBzZXNzaW9uPzoge1xuICAgICAgYWNjZXNzX3Rva2VuOiBzdHJpbmc7XG4gICAgICByZWZyZXNoX3Rva2VuOiBzdHJpbmc7XG4gICAgfTtcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvZ2luQWN0aW9uKFxuICBwcmV2U3RhdGU6IEF1dGhGb3JtU3RhdGUsXG4gIGZvcm1EYXRhOiBGb3JtRGF0YVxuKTogUHJvbWlzZTxBdXRoRm9ybVN0YXRlPiB7XG4gIGNvbnN0IHJhd0RhdGEgPSB7XG4gICAgZW1haWw6IGZvcm1EYXRhLmdldCgnZW1haWwnKSxcbiAgICBwYXNzd29yZDogZm9ybURhdGEuZ2V0KCdwYXNzd29yZCcpLFxuICB9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IExvZ2luU2NoZW1hLnNhZmVQYXJzZShyYXdEYXRhKTtcblxuICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogcmVzdWx0LmVycm9yLmZsYXR0ZW4oKS5maWVsZEVycm9ycyxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhdXRoLnNpZ25JbldpdGhQYXNzd29yZCh7XG4gICAgICBlbWFpbDogcmVzdWx0LmRhdGEuZW1haWwsXG4gICAgICBwYXNzd29yZDogcmVzdWx0LmRhdGEucGFzc3dvcmQsXG4gICAgfSk7XG5cbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIC8vIFRyYWNrIGZhaWxlZCBsb2dpbiBhdHRlbXB0XG4gICAgICBhd2FpdCB0cmFja1NlcnZlclNpZGVFdmVudCgndXNlcl9sb2dpbl9mYWlsZWQnLCB1bmRlZmluZWQsIHtcbiAgICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgZW1haWxfZG9tYWluOiByZXN1bHQuZGF0YS5lbWFpbC5zcGxpdCgnQCcpWzFdLFxuICAgICAgICBtZXRob2Q6ICdlbWFpbCcsXG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZXJyb3JzOiB7XG4gICAgICAgICAgX2Zvcm06IFtlcnJvci5tZXNzYWdlXSxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gVHJhY2sgc3VjY2Vzc2Z1bCBsb2dpblxuICAgIGlmIChkYXRhLnVzZXIpIHtcbiAgICAgIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX3NpZ25lZF9pbicsIGRhdGEudXNlci5pZCwge1xuICAgICAgICBtZXRob2Q6ICdlbWFpbCcsXG4gICAgICAgIGVtYWlsOiBkYXRhLnVzZXIuZW1haWwsXG4gICAgICAgIHVzZXJfaWQ6IGRhdGEudXNlci5pZCxcbiAgICAgICAgc2Vzc2lvbl9pZDogZGF0YS5zZXNzaW9uPy5hY2Nlc3NfdG9rZW4/LnNsaWNlKC04KSwgLy8gTGFzdCA4IGNoYXJzIGZvciBpZGVudGlmaWNhdGlvblxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gUmV2YWxpZGF0ZSBhdXRoLXJlbGF0ZWQgY2FjaGVzXG4gICAgcmV2YWxpZGF0ZVRhZygndXNlcicpO1xuICAgIHJldmFsaWRhdGVUYWcoJ3Nlc3Npb24nKTtcbiAgICBcbiAgICAvLyBSZWRpcmVjdCB0byBkYXNoYm9hcmRcbiAgICByZWRpcmVjdCgnL2Rhc2hib2FyZCcpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdMb2dpbiBmYWlsZWQnO1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgX2Zvcm06IFttZXNzYWdlXSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2lnbnVwQWN0aW9uKFxuICBwcmV2U3RhdGU6IEF1dGhGb3JtU3RhdGUsXG4gIGZvcm1EYXRhOiBGb3JtRGF0YVxuKTogUHJvbWlzZTxBdXRoRm9ybVN0YXRlPiB7XG4gIGNvbnN0IHJhd0RhdGEgPSB7XG4gICAgZW1haWw6IGZvcm1EYXRhLmdldCgnZW1haWwnKSxcbiAgICBwYXNzd29yZDogZm9ybURhdGEuZ2V0KCdwYXNzd29yZCcpLFxuICAgIGNvbmZpcm1QYXNzd29yZDogZm9ybURhdGEuZ2V0KCdjb25maXJtUGFzc3dvcmQnKSxcbiAgICBmdWxsTmFtZTogZm9ybURhdGEuZ2V0KCdmdWxsTmFtZScpLFxuICAgIGNvbXBhbnlOYW1lOiBmb3JtRGF0YS5nZXQoJ2NvbXBhbnlOYW1lJyksXG4gIH07XG5cbiAgY29uc3QgcmVzdWx0ID0gU2lnbnVwU2NoZW1hLnNhZmVQYXJzZShyYXdEYXRhKTtcblxuICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogcmVzdWx0LmVycm9yLmZsYXR0ZW4oKS5maWVsZEVycm9ycyxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhdXRoLnNpZ25VcCh7XG4gICAgICBlbWFpbDogcmVzdWx0LmRhdGEuZW1haWwsXG4gICAgICBwYXNzd29yZDogcmVzdWx0LmRhdGEucGFzc3dvcmQsXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBmdWxsX25hbWU6IHJlc3VsdC5kYXRhLmZ1bGxOYW1lLFxuICAgICAgICAgIGNvbXBhbnlfbmFtZTogcmVzdWx0LmRhdGEuY29tcGFueU5hbWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICAvLyBUcmFjayBmYWlsZWQgc2lnbnVwIGF0dGVtcHRcbiAgICAgIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX3NpZ251cF9mYWlsZWQnLCB1bmRlZmluZWQsIHtcbiAgICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgZW1haWxfZG9tYWluOiByZXN1bHQuZGF0YS5lbWFpbC5zcGxpdCgnQCcpWzFdLFxuICAgICAgICBoYXNfY29tcGFueV9uYW1lOiAhIXJlc3VsdC5kYXRhLmNvbXBhbnlOYW1lLFxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGVycm9yczoge1xuICAgICAgICAgIF9mb3JtOiBbZXJyb3IubWVzc2FnZV0sXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFRyYWNrIHN1Y2Nlc3NmdWwgc2lnbnVwXG4gICAgaWYgKGRhdGEudXNlcikge1xuICAgICAgYXdhaXQgdHJhY2tTZXJ2ZXJTaWRlRXZlbnQoJ3VzZXJfc2lnbmVkX3VwJywgZGF0YS51c2VyLmlkLCB7XG4gICAgICAgIG1ldGhvZDogJ2VtYWlsJyxcbiAgICAgICAgZW1haWw6IGRhdGEudXNlci5lbWFpbCxcbiAgICAgICAgdXNlcl9pZDogZGF0YS51c2VyLmlkLFxuICAgICAgICBoYXNfY29tcGFueV9uYW1lOiAhIXJlc3VsdC5kYXRhLmNvbXBhbnlOYW1lLFxuICAgICAgICBmdWxsX25hbWU6IHJlc3VsdC5kYXRhLmZ1bGxOYW1lLFxuICAgICAgICBuZWVkc19lbWFpbF92ZXJpZmljYXRpb246ICFkYXRhLnVzZXIuZW1haWxfY29uZmlybWVkX2F0LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBtZXNzYWdlOiAnQWNjb3VudCBjcmVhdGVkISBQbGVhc2UgY2hlY2sgeW91ciBlbWFpbCB0byB2ZXJpZnkgeW91ciBhY2NvdW50LicsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnU2lnbnVwIGZhaWxlZCc7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczoge1xuICAgICAgICBfZm9ybTogW21lc3NhZ2VdLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2dvdXRBY3Rpb24oKTogUHJvbWlzZTxBdXRoRm9ybVN0YXRlPiB7XG4gIHRyeSB7XG4gICAgLy8gR2V0IGN1cnJlbnQgdXNlciBmb3IgdHJhY2tpbmcgYmVmb3JlIGxvZ291dFxuICAgIGNvbnN0IHsgZGF0YTogeyB1c2VyIH0gfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIFxuICAgIGF3YWl0IGF1dGguc2lnbk91dCgpO1xuICAgIFxuICAgIC8vIFRyYWNrIGxvZ291dCBldmVudFxuICAgIGlmICh1c2VyKSB7XG4gICAgICBhd2FpdCB0cmFja1NlcnZlclNpZGVFdmVudCgndXNlcl9zaWduZWRfb3V0JywgdXNlci5pZCwge1xuICAgICAgICB1c2VyX2lkOiB1c2VyLmlkLFxuICAgICAgICBlbWFpbDogdXNlci5lbWFpbCxcbiAgICAgICAgbG9nb3V0X21ldGhvZDogJ21hbnVhbCcsXG4gICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2xlYXIgYWxsIGNhY2hlZCBkYXRhXG4gICAgcmV2YWxpZGF0ZVRhZygndXNlcicpO1xuICAgIHJldmFsaWRhdGVUYWcoJ3Nlc3Npb24nKTtcbiAgICByZXZhbGlkYXRlVGFnKCdwcm9wZXJ0aWVzJyk7XG4gICAgcmV2YWxpZGF0ZVRhZygndGVuYW50cycpO1xuICAgIHJldmFsaWRhdGVUYWcoJ2xlYXNlcycpO1xuICAgIHJldmFsaWRhdGVUYWcoJ21haW50ZW5hbmNlJyk7XG4gICAgXG4gICAgLy8gUmVkaXJlY3QgdG8gaG9tZSBwYWdlXG4gICAgcmVkaXJlY3QoJy8nKTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcic7XG4gICAgY29uc29sZS5lcnJvcignTG9nb3V0IGVycm9yOicsIG1lc3NhZ2UpO1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgX2Zvcm06IFttZXNzYWdlXSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZm9yZ290UGFzc3dvcmRBY3Rpb24oXG4gIHByZXZTdGF0ZTogQXV0aEZvcm1TdGF0ZSxcbiAgZm9ybURhdGE6IEZvcm1EYXRhXG4pOiBQcm9taXNlPEF1dGhGb3JtU3RhdGU+IHtcbiAgY29uc3QgcmF3RGF0YSA9IHtcbiAgICBlbWFpbDogZm9ybURhdGEuZ2V0KCdlbWFpbCcpLFxuICB9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IFJlc2V0UGFzc3dvcmRTY2hlbWEuc2FmZVBhcnNlKHJhd0RhdGEpO1xuXG4gIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZXJyb3JzOiByZXN1bHQuZXJyb3IuZmxhdHRlbigpLmZpZWxkRXJyb3JzLFxuICAgIH07XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IGF1dGgucmVzZXRQYXNzd29yZEZvckVtYWlsKHJlc3VsdC5kYXRhLmVtYWlsLCB7XG4gICAgICByZWRpcmVjdFRvOiBgJHtwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TSVRFX1VSTH0vYXV0aC91cGRhdGUtcGFzc3dvcmRgLFxuICAgIH0pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcnM6IHtcbiAgICAgICAgICBfZm9ybTogW2Vycm9yLm1lc3NhZ2VdLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIG1lc3NhZ2U6ICdQYXNzd29yZCByZXNldCBlbWFpbCBzZW50ISBDaGVjayB5b3VyIGluYm94IGZvciBpbnN0cnVjdGlvbnMuJyxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdGYWlsZWQgdG8gc2VuZCByZXNldCBlbWFpbCc7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczoge1xuICAgICAgICBfZm9ybTogW21lc3NhZ2VdLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGRhdGVQYXNzd29yZEFjdGlvbihcbiAgcHJldlN0YXRlOiBBdXRoRm9ybVN0YXRlLFxuICBmb3JtRGF0YTogRm9ybURhdGFcbik6IFByb21pc2U8QXV0aEZvcm1TdGF0ZT4ge1xuICBjb25zdCByYXdEYXRhID0ge1xuICAgIHBhc3N3b3JkOiBmb3JtRGF0YS5nZXQoJ3Bhc3N3b3JkJyksXG4gICAgY29uZmlybVBhc3N3b3JkOiBmb3JtRGF0YS5nZXQoJ2NvbmZpcm1QYXNzd29yZCcpLFxuICB9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IFVwZGF0ZVBhc3N3b3JkU2NoZW1hLnNhZmVQYXJzZShyYXdEYXRhKTtcblxuICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogcmVzdWx0LmVycm9yLmZsYXR0ZW4oKS5maWVsZEVycm9ycyxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBhdXRoLnVwZGF0ZVVzZXIoe1xuICAgICAgcGFzc3dvcmQ6IHJlc3VsdC5kYXRhLnBhc3N3b3JkLFxuICAgIH0pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcnM6IHtcbiAgICAgICAgICBfZm9ybTogW2Vycm9yLm1lc3NhZ2VdLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBSZXZhbGlkYXRlIHVzZXIgZGF0YVxuICAgIHJldmFsaWRhdGVUYWcoJ3VzZXInKTtcbiAgICBcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIG1lc3NhZ2U6ICdQYXNzd29yZCB1cGRhdGVkIHN1Y2Nlc3NmdWxseSEnLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ0ZhaWxlZCB0byB1cGRhdGUgcGFzc3dvcmQnO1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgX2Zvcm06IFttZXNzYWdlXSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG4vLyBTZXJ2ZXItc2lkZSBhdXRoIGhlbHBlcnNcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDdXJyZW50VXNlcigpOiBQcm9taXNlPEF1dGhVc2VyIHwgbnVsbD4ge1xuICB0cnkge1xuICAgIGNvbnN0IHsgZGF0YTogeyB1c2VyIH0gfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIFxuICAgIGlmICghdXNlcikgcmV0dXJuIG51bGw7XG5cbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHVzZXIuaWQsXG4gICAgICBlbWFpbDogdXNlci5lbWFpbCEsXG4gICAgICBuYW1lOiB1c2VyLnVzZXJfbWV0YWRhdGE/LmZ1bGxfbmFtZSB8fCB1c2VyLmVtYWlsISxcbiAgICAgIGF2YXRhcl91cmw6IHVzZXIudXNlcl9tZXRhZGF0YT8uYXZhdGFyX3VybCxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBjdXJyZW50IHVzZXIgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXF1aXJlQXV0aCgpOiBQcm9taXNlPEF1dGhVc2VyPiB7XG4gIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRDdXJyZW50VXNlcigpO1xuICBcbiAgaWYgKCF1c2VyKSB7XG4gICAgcmVkaXJlY3QoJy9sb2dpbicpO1xuICB9XG4gIFxuICByZXR1cm4gdXNlcjtcbn1cblxuLy8gT0F1dGggYWN0aW9uc1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNpZ25JbldpdGhHb29nbGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gIC8vIENvbnN0cnVjdCB0aGUgcmVkaXJlY3QgVVJMLCBmYWxsYmFjayB0byBsb2NhbGhvc3QgZm9yIGRldmVsb3BtZW50XG4gIGNvbnN0IHNpdGVVcmwgPSBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TSVRFX1VSTCB8fCBcbiAgICAgICAgICAgICAgICAgIHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX0FQUF9VUkwgfHwgXG4gICAgICAgICAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDozMDAwJztcbiAgY29uc3QgcmVkaXJlY3RUbyA9IGAke3NpdGVVcmx9L2F1dGgvY2FsbGJhY2tgO1xuICBcbiAgY29uc29sZS5sb2coJ1tPQXV0aCBEZWJ1Z10gSW5pdGlhdGluZyBHb29nbGUgc2lnbi1pbiB3aXRoIHJlZGlyZWN0IHRvOicsIHJlZGlyZWN0VG8pO1xuICBcbiAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYXV0aC5zaWduSW5XaXRoT0F1dGgoe1xuICAgIHByb3ZpZGVyOiAnZ29vZ2xlJyxcbiAgICBvcHRpb25zOiB7XG4gICAgICByZWRpcmVjdFRvLFxuICAgICAgcXVlcnlQYXJhbXM6IHtcbiAgICAgICAgYWNjZXNzX3R5cGU6ICdvZmZsaW5lJyxcbiAgICAgICAgcHJvbXB0OiAnY29uc2VudCcsXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuXG4gIGlmIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tPQXV0aCBFcnJvcl0gR29vZ2xlIHNpZ24taW4gZmFpbGVkOicsIGVycm9yKTtcbiAgICAvLyBUcmFjayBmYWlsZWQgT0F1dGggYXR0ZW1wdFxuICAgIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX29hdXRoX2ZhaWxlZCcsIHVuZGVmaW5lZCwge1xuICAgICAgcHJvdmlkZXI6ICdnb29nbGUnLFxuICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgIG1ldGhvZDogJ29hdXRoJyxcbiAgICB9KTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBzaWduIGluIHdpdGggR29vZ2xlLiBQbGVhc2UgdHJ5IGFnYWluIG9yIGNvbnRhY3Qgc3VwcG9ydCBpZiB0aGUgaXNzdWUgcGVyc2lzdHMuJyk7XG4gIH1cblxuICAvLyBUcmFjayBPQXV0aCBpbml0aWF0aW9uXG4gIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX29hdXRoX2luaXRpYXRlZCcsIHVuZGVmaW5lZCwge1xuICAgIHByb3ZpZGVyOiAnZ29vZ2xlJyxcbiAgICBtZXRob2Q6ICdvYXV0aCcsXG4gICAgcmVkaXJlY3RfdXJsOiBkYXRhLnVybCxcbiAgfSk7XG5cbiAgaWYgKGRhdGEudXJsKSB7XG4gICAgY29uc29sZS5sb2coJ1tPQXV0aCBEZWJ1Z10gUmVkaXJlY3RpbmcgdG8gR29vZ2xlIE9BdXRoIFVSTDonLCBkYXRhLnVybCk7XG4gICAgcmVkaXJlY3QoZGF0YS51cmwpO1xuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tPQXV0aCBFcnJvcl0gTm8gcmVkaXJlY3QgVVJMIHJlY2VpdmVkIGZyb20gU3VwYWJhc2UnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0F1dGhlbnRpY2F0aW9uIHNlcnZpY2UgdGVtcG9yYXJpbHkgdW5hdmFpbGFibGUuIFBsZWFzZSB0cnkgYWdhaW4gaW4gYSBmZXcgbW9tZW50cy4nKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2lnbkluV2l0aEdpdEh1YigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgLy8gQ29uc3RydWN0IHRoZSByZWRpcmVjdCBVUkwsIGZhbGxiYWNrIHRvIGxvY2FsaG9zdCBmb3IgZGV2ZWxvcG1lbnRcbiAgY29uc3Qgc2l0ZVVybCA9IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NJVEVfVVJMIHx8IFxuICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfQVBQX1VSTCB8fCBcbiAgICAgICAgICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAnO1xuICBjb25zdCByZWRpcmVjdFRvID0gYCR7c2l0ZVVybH0vYXV0aC9jYWxsYmFja2A7XG4gIFxuICBjb25zb2xlLmxvZygnW09BdXRoIERlYnVnXSBJbml0aWF0aW5nIEdpdEh1YiBzaWduLWluIHdpdGggcmVkaXJlY3QgdG86JywgcmVkaXJlY3RUbyk7XG4gIFxuICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhdXRoLnNpZ25JbldpdGhPQXV0aCh7XG4gICAgcHJvdmlkZXI6ICdnaXRodWInLFxuICAgIG9wdGlvbnM6IHtcbiAgICAgIHJlZGlyZWN0VG8sXG4gICAgfSxcbiAgfSk7XG5cbiAgaWYgKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignW09BdXRoIEVycm9yXSBHaXRIdWIgc2lnbi1pbiBmYWlsZWQ6JywgZXJyb3IpO1xuICAgIC8vIFRyYWNrIGZhaWxlZCBPQXV0aCBhdHRlbXB0XG4gICAgYXdhaXQgdHJhY2tTZXJ2ZXJTaWRlRXZlbnQoJ3VzZXJfb2F1dGhfZmFpbGVkJywgdW5kZWZpbmVkLCB7XG4gICAgICBwcm92aWRlcjogJ2dpdGh1YicsXG4gICAgICBlcnJvcl9tZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgbWV0aG9kOiAnb2F1dGgnLFxuICAgIH0pO1xuICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIHNpZ24gaW4gd2l0aCBHaXRIdWIuIFBsZWFzZSB0cnkgYWdhaW4gb3IgY29udGFjdCBzdXBwb3J0IGlmIHRoZSBpc3N1ZSBwZXJzaXN0cy4nKTtcbiAgfVxuXG4gIC8vIFRyYWNrIE9BdXRoIGluaXRpYXRpb25cbiAgYXdhaXQgdHJhY2tTZXJ2ZXJTaWRlRXZlbnQoJ3VzZXJfb2F1dGhfaW5pdGlhdGVkJywgdW5kZWZpbmVkLCB7XG4gICAgcHJvdmlkZXI6ICdnaXRodWInLFxuICAgIG1ldGhvZDogJ29hdXRoJyxcbiAgICByZWRpcmVjdF91cmw6IGRhdGEudXJsLFxuICB9KTtcblxuICBpZiAoZGF0YS51cmwpIHtcbiAgICBjb25zb2xlLmxvZygnW09BdXRoIERlYnVnXSBSZWRpcmVjdGluZyB0byBHaXRIdWIgT0F1dGggVVJMOicsIGRhdGEudXJsKTtcbiAgICByZWRpcmVjdChkYXRhLnVybCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc29sZS5lcnJvcignW09BdXRoIEVycm9yXSBObyByZWRpcmVjdCBVUkwgcmVjZWl2ZWQgZnJvbSBTdXBhYmFzZScpO1xuICAgIHRocm93IG5ldyBFcnJvcignQXV0aGVudGljYXRpb24gc2VydmljZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZS4gUGxlYXNlIHRyeSBhZ2FpbiBpbiBhIGZldyBtb21lbnRzLicpO1xuICB9XG59Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJrVEErRHNCIn0=
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/actions/data:bdfb83 [app-client] (ecmascript) <text/javascript>": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/* __next_internal_action_entry_do_not_use__ [{"605a7a62105d87fb6a9d39a26e514bdc1b92743e51":"signupAction"},"apps/frontend/src/lib/actions/auth-actions.ts",""] */ __turbopack_context__.s({
    "signupAction": ()=>signupAction
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var signupAction = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("605a7a62105d87fb6a9d39a26e514bdc1b92743e51", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "signupAction"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYXV0aC1hY3Rpb25zLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJztcblxuaW1wb3J0IHsgcmV2YWxpZGF0ZVRhZyB9IGZyb20gJ25leHQvY2FjaGUnO1xuaW1wb3J0IHsgcmVkaXJlY3QgfSBmcm9tICduZXh0L25hdmlnYXRpb24nO1xuaW1wb3J0IHsgeiB9IGZyb20gJ3pvZCc7XG5pbXBvcnQgeyBhdXRoLCBzdXBhYmFzZSB9IGZyb20gJ0AvbGliL3N1cGFiYXNlJztcbmltcG9ydCB0eXBlIHsgQXV0aFVzZXIgfSBmcm9tICdAL2xpYi9zdXBhYmFzZSc7XG5pbXBvcnQgeyB0cmFja1NlcnZlclNpZGVFdmVudCB9IGZyb20gJ0AvbGliL2FuYWx5dGljcy9wb3N0aG9nLXNlcnZlcic7XG5pbXBvcnQgeyBjb21tb25WYWxpZGF0aW9ucyB9IGZyb20gJ0AvbGliL3ZhbGlkYXRpb24vc2NoZW1hcyc7XG5cbi8vIEF1dGggZm9ybSBzY2hlbWFzIHVzaW5nIGNvbnNvbGlkYXRlZCB2YWxpZGF0aW9uc1xuY29uc3QgTG9naW5TY2hlbWEgPSB6Lm9iamVjdCh7XG4gIGVtYWlsOiBjb21tb25WYWxpZGF0aW9ucy5lbWFpbCxcbiAgcGFzc3dvcmQ6IHouc3RyaW5nKCkubWluKDYsICdQYXNzd29yZCBtdXN0IGJlIGF0IGxlYXN0IDYgY2hhcmFjdGVycycpLFxufSk7XG5cbmNvbnN0IFNpZ251cFNjaGVtYSA9IHoub2JqZWN0KHtcbiAgZW1haWw6IGNvbW1vblZhbGlkYXRpb25zLmVtYWlsLFxuICBwYXNzd29yZDogei5zdHJpbmcoKS5taW4oOCwgJ1Bhc3N3b3JkIG11c3QgYmUgYXQgbGVhc3QgOCBjaGFyYWN0ZXJzJyksXG4gIGNvbmZpcm1QYXNzd29yZDogei5zdHJpbmcoKS5taW4oOCwgJ1Bhc3N3b3JkIG11c3QgYmUgYXQgbGVhc3QgOCBjaGFyYWN0ZXJzJyksXG4gIGZ1bGxOYW1lOiBjb21tb25WYWxpZGF0aW9ucy5uYW1lLFxuICBjb21wYW55TmFtZTogY29tbW9uVmFsaWRhdGlvbnMub3B0aW9uYWxTdHJpbmcsXG59KS5yZWZpbmUoKGRhdGEpID0+IGRhdGEucGFzc3dvcmQgPT09IGRhdGEuY29uZmlybVBhc3N3b3JkLCB7XG4gIG1lc3NhZ2U6IFwiUGFzc3dvcmRzIGRvbid0IG1hdGNoXCIsXG4gIHBhdGg6IFtcImNvbmZpcm1QYXNzd29yZFwiXSxcbn0pO1xuXG5jb25zdCBSZXNldFBhc3N3b3JkU2NoZW1hID0gei5vYmplY3Qoe1xuICBlbWFpbDogY29tbW9uVmFsaWRhdGlvbnMuZW1haWwsXG59KTtcblxuY29uc3QgVXBkYXRlUGFzc3dvcmRTY2hlbWEgPSB6Lm9iamVjdCh7XG4gIHBhc3N3b3JkOiB6LnN0cmluZygpLm1pbig4LCAnUGFzc3dvcmQgbXVzdCBiZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnMnKSxcbiAgY29uZmlybVBhc3N3b3JkOiB6LnN0cmluZygpLm1pbig4LCAnUGFzc3dvcmQgbXVzdCBiZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnMnKSxcbn0pLnJlZmluZSgoZGF0YSkgPT4gZGF0YS5wYXNzd29yZCA9PT0gZGF0YS5jb25maXJtUGFzc3dvcmQsIHtcbiAgbWVzc2FnZTogXCJQYXNzd29yZHMgZG9uJ3QgbWF0Y2hcIixcbiAgcGF0aDogW1wiY29uZmlybVBhc3N3b3JkXCJdLFxufSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXV0aEZvcm1TdGF0ZSB7XG4gIGVycm9ycz86IHtcbiAgICBlbWFpbD86IHN0cmluZ1tdO1xuICAgIHBhc3N3b3JkPzogc3RyaW5nW107XG4gICAgY29uZmlybVBhc3N3b3JkPzogc3RyaW5nW107XG4gICAgZnVsbE5hbWU/OiBzdHJpbmdbXTtcbiAgICBjb21wYW55TmFtZT86IHN0cmluZ1tdO1xuICAgIF9mb3JtPzogc3RyaW5nW107XG4gIH07XG4gIHN1Y2Nlc3M/OiBib29sZWFuO1xuICBtZXNzYWdlPzogc3RyaW5nO1xuICBkYXRhPzoge1xuICAgIHVzZXI/OiB7XG4gICAgICBpZDogc3RyaW5nO1xuICAgICAgZW1haWw6IHN0cmluZztcbiAgICAgIG5hbWU/OiBzdHJpbmc7XG4gICAgfTtcbiAgICBzZXNzaW9uPzoge1xuICAgICAgYWNjZXNzX3Rva2VuOiBzdHJpbmc7XG4gICAgICByZWZyZXNoX3Rva2VuOiBzdHJpbmc7XG4gICAgfTtcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvZ2luQWN0aW9uKFxuICBwcmV2U3RhdGU6IEF1dGhGb3JtU3RhdGUsXG4gIGZvcm1EYXRhOiBGb3JtRGF0YVxuKTogUHJvbWlzZTxBdXRoRm9ybVN0YXRlPiB7XG4gIGNvbnN0IHJhd0RhdGEgPSB7XG4gICAgZW1haWw6IGZvcm1EYXRhLmdldCgnZW1haWwnKSxcbiAgICBwYXNzd29yZDogZm9ybURhdGEuZ2V0KCdwYXNzd29yZCcpLFxuICB9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IExvZ2luU2NoZW1hLnNhZmVQYXJzZShyYXdEYXRhKTtcblxuICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogcmVzdWx0LmVycm9yLmZsYXR0ZW4oKS5maWVsZEVycm9ycyxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhdXRoLnNpZ25JbldpdGhQYXNzd29yZCh7XG4gICAgICBlbWFpbDogcmVzdWx0LmRhdGEuZW1haWwsXG4gICAgICBwYXNzd29yZDogcmVzdWx0LmRhdGEucGFzc3dvcmQsXG4gICAgfSk7XG5cbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIC8vIFRyYWNrIGZhaWxlZCBsb2dpbiBhdHRlbXB0XG4gICAgICBhd2FpdCB0cmFja1NlcnZlclNpZGVFdmVudCgndXNlcl9sb2dpbl9mYWlsZWQnLCB1bmRlZmluZWQsIHtcbiAgICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgZW1haWxfZG9tYWluOiByZXN1bHQuZGF0YS5lbWFpbC5zcGxpdCgnQCcpWzFdLFxuICAgICAgICBtZXRob2Q6ICdlbWFpbCcsXG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZXJyb3JzOiB7XG4gICAgICAgICAgX2Zvcm06IFtlcnJvci5tZXNzYWdlXSxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gVHJhY2sgc3VjY2Vzc2Z1bCBsb2dpblxuICAgIGlmIChkYXRhLnVzZXIpIHtcbiAgICAgIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX3NpZ25lZF9pbicsIGRhdGEudXNlci5pZCwge1xuICAgICAgICBtZXRob2Q6ICdlbWFpbCcsXG4gICAgICAgIGVtYWlsOiBkYXRhLnVzZXIuZW1haWwsXG4gICAgICAgIHVzZXJfaWQ6IGRhdGEudXNlci5pZCxcbiAgICAgICAgc2Vzc2lvbl9pZDogZGF0YS5zZXNzaW9uPy5hY2Nlc3NfdG9rZW4/LnNsaWNlKC04KSwgLy8gTGFzdCA4IGNoYXJzIGZvciBpZGVudGlmaWNhdGlvblxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gUmV2YWxpZGF0ZSBhdXRoLXJlbGF0ZWQgY2FjaGVzXG4gICAgcmV2YWxpZGF0ZVRhZygndXNlcicpO1xuICAgIHJldmFsaWRhdGVUYWcoJ3Nlc3Npb24nKTtcbiAgICBcbiAgICAvLyBSZWRpcmVjdCB0byBkYXNoYm9hcmRcbiAgICByZWRpcmVjdCgnL2Rhc2hib2FyZCcpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdMb2dpbiBmYWlsZWQnO1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgX2Zvcm06IFttZXNzYWdlXSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2lnbnVwQWN0aW9uKFxuICBwcmV2U3RhdGU6IEF1dGhGb3JtU3RhdGUsXG4gIGZvcm1EYXRhOiBGb3JtRGF0YVxuKTogUHJvbWlzZTxBdXRoRm9ybVN0YXRlPiB7XG4gIGNvbnN0IHJhd0RhdGEgPSB7XG4gICAgZW1haWw6IGZvcm1EYXRhLmdldCgnZW1haWwnKSxcbiAgICBwYXNzd29yZDogZm9ybURhdGEuZ2V0KCdwYXNzd29yZCcpLFxuICAgIGNvbmZpcm1QYXNzd29yZDogZm9ybURhdGEuZ2V0KCdjb25maXJtUGFzc3dvcmQnKSxcbiAgICBmdWxsTmFtZTogZm9ybURhdGEuZ2V0KCdmdWxsTmFtZScpLFxuICAgIGNvbXBhbnlOYW1lOiBmb3JtRGF0YS5nZXQoJ2NvbXBhbnlOYW1lJyksXG4gIH07XG5cbiAgY29uc3QgcmVzdWx0ID0gU2lnbnVwU2NoZW1hLnNhZmVQYXJzZShyYXdEYXRhKTtcblxuICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogcmVzdWx0LmVycm9yLmZsYXR0ZW4oKS5maWVsZEVycm9ycyxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhdXRoLnNpZ25VcCh7XG4gICAgICBlbWFpbDogcmVzdWx0LmRhdGEuZW1haWwsXG4gICAgICBwYXNzd29yZDogcmVzdWx0LmRhdGEucGFzc3dvcmQsXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBmdWxsX25hbWU6IHJlc3VsdC5kYXRhLmZ1bGxOYW1lLFxuICAgICAgICAgIGNvbXBhbnlfbmFtZTogcmVzdWx0LmRhdGEuY29tcGFueU5hbWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICAvLyBUcmFjayBmYWlsZWQgc2lnbnVwIGF0dGVtcHRcbiAgICAgIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX3NpZ251cF9mYWlsZWQnLCB1bmRlZmluZWQsIHtcbiAgICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgZW1haWxfZG9tYWluOiByZXN1bHQuZGF0YS5lbWFpbC5zcGxpdCgnQCcpWzFdLFxuICAgICAgICBoYXNfY29tcGFueV9uYW1lOiAhIXJlc3VsdC5kYXRhLmNvbXBhbnlOYW1lLFxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGVycm9yczoge1xuICAgICAgICAgIF9mb3JtOiBbZXJyb3IubWVzc2FnZV0sXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFRyYWNrIHN1Y2Nlc3NmdWwgc2lnbnVwXG4gICAgaWYgKGRhdGEudXNlcikge1xuICAgICAgYXdhaXQgdHJhY2tTZXJ2ZXJTaWRlRXZlbnQoJ3VzZXJfc2lnbmVkX3VwJywgZGF0YS51c2VyLmlkLCB7XG4gICAgICAgIG1ldGhvZDogJ2VtYWlsJyxcbiAgICAgICAgZW1haWw6IGRhdGEudXNlci5lbWFpbCxcbiAgICAgICAgdXNlcl9pZDogZGF0YS51c2VyLmlkLFxuICAgICAgICBoYXNfY29tcGFueV9uYW1lOiAhIXJlc3VsdC5kYXRhLmNvbXBhbnlOYW1lLFxuICAgICAgICBmdWxsX25hbWU6IHJlc3VsdC5kYXRhLmZ1bGxOYW1lLFxuICAgICAgICBuZWVkc19lbWFpbF92ZXJpZmljYXRpb246ICFkYXRhLnVzZXIuZW1haWxfY29uZmlybWVkX2F0LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBtZXNzYWdlOiAnQWNjb3VudCBjcmVhdGVkISBQbGVhc2UgY2hlY2sgeW91ciBlbWFpbCB0byB2ZXJpZnkgeW91ciBhY2NvdW50LicsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnU2lnbnVwIGZhaWxlZCc7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczoge1xuICAgICAgICBfZm9ybTogW21lc3NhZ2VdLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2dvdXRBY3Rpb24oKTogUHJvbWlzZTxBdXRoRm9ybVN0YXRlPiB7XG4gIHRyeSB7XG4gICAgLy8gR2V0IGN1cnJlbnQgdXNlciBmb3IgdHJhY2tpbmcgYmVmb3JlIGxvZ291dFxuICAgIGNvbnN0IHsgZGF0YTogeyB1c2VyIH0gfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIFxuICAgIGF3YWl0IGF1dGguc2lnbk91dCgpO1xuICAgIFxuICAgIC8vIFRyYWNrIGxvZ291dCBldmVudFxuICAgIGlmICh1c2VyKSB7XG4gICAgICBhd2FpdCB0cmFja1NlcnZlclNpZGVFdmVudCgndXNlcl9zaWduZWRfb3V0JywgdXNlci5pZCwge1xuICAgICAgICB1c2VyX2lkOiB1c2VyLmlkLFxuICAgICAgICBlbWFpbDogdXNlci5lbWFpbCxcbiAgICAgICAgbG9nb3V0X21ldGhvZDogJ21hbnVhbCcsXG4gICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2xlYXIgYWxsIGNhY2hlZCBkYXRhXG4gICAgcmV2YWxpZGF0ZVRhZygndXNlcicpO1xuICAgIHJldmFsaWRhdGVUYWcoJ3Nlc3Npb24nKTtcbiAgICByZXZhbGlkYXRlVGFnKCdwcm9wZXJ0aWVzJyk7XG4gICAgcmV2YWxpZGF0ZVRhZygndGVuYW50cycpO1xuICAgIHJldmFsaWRhdGVUYWcoJ2xlYXNlcycpO1xuICAgIHJldmFsaWRhdGVUYWcoJ21haW50ZW5hbmNlJyk7XG4gICAgXG4gICAgLy8gUmVkaXJlY3QgdG8gaG9tZSBwYWdlXG4gICAgcmVkaXJlY3QoJy8nKTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcic7XG4gICAgY29uc29sZS5lcnJvcignTG9nb3V0IGVycm9yOicsIG1lc3NhZ2UpO1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgX2Zvcm06IFttZXNzYWdlXSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZm9yZ290UGFzc3dvcmRBY3Rpb24oXG4gIHByZXZTdGF0ZTogQXV0aEZvcm1TdGF0ZSxcbiAgZm9ybURhdGE6IEZvcm1EYXRhXG4pOiBQcm9taXNlPEF1dGhGb3JtU3RhdGU+IHtcbiAgY29uc3QgcmF3RGF0YSA9IHtcbiAgICBlbWFpbDogZm9ybURhdGEuZ2V0KCdlbWFpbCcpLFxuICB9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IFJlc2V0UGFzc3dvcmRTY2hlbWEuc2FmZVBhcnNlKHJhd0RhdGEpO1xuXG4gIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZXJyb3JzOiByZXN1bHQuZXJyb3IuZmxhdHRlbigpLmZpZWxkRXJyb3JzLFxuICAgIH07XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IGF1dGgucmVzZXRQYXNzd29yZEZvckVtYWlsKHJlc3VsdC5kYXRhLmVtYWlsLCB7XG4gICAgICByZWRpcmVjdFRvOiBgJHtwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TSVRFX1VSTH0vYXV0aC91cGRhdGUtcGFzc3dvcmRgLFxuICAgIH0pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcnM6IHtcbiAgICAgICAgICBfZm9ybTogW2Vycm9yLm1lc3NhZ2VdLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIG1lc3NhZ2U6ICdQYXNzd29yZCByZXNldCBlbWFpbCBzZW50ISBDaGVjayB5b3VyIGluYm94IGZvciBpbnN0cnVjdGlvbnMuJyxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdGYWlsZWQgdG8gc2VuZCByZXNldCBlbWFpbCc7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczoge1xuICAgICAgICBfZm9ybTogW21lc3NhZ2VdLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGRhdGVQYXNzd29yZEFjdGlvbihcbiAgcHJldlN0YXRlOiBBdXRoRm9ybVN0YXRlLFxuICBmb3JtRGF0YTogRm9ybURhdGFcbik6IFByb21pc2U8QXV0aEZvcm1TdGF0ZT4ge1xuICBjb25zdCByYXdEYXRhID0ge1xuICAgIHBhc3N3b3JkOiBmb3JtRGF0YS5nZXQoJ3Bhc3N3b3JkJyksXG4gICAgY29uZmlybVBhc3N3b3JkOiBmb3JtRGF0YS5nZXQoJ2NvbmZpcm1QYXNzd29yZCcpLFxuICB9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IFVwZGF0ZVBhc3N3b3JkU2NoZW1hLnNhZmVQYXJzZShyYXdEYXRhKTtcblxuICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogcmVzdWx0LmVycm9yLmZsYXR0ZW4oKS5maWVsZEVycm9ycyxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBhdXRoLnVwZGF0ZVVzZXIoe1xuICAgICAgcGFzc3dvcmQ6IHJlc3VsdC5kYXRhLnBhc3N3b3JkLFxuICAgIH0pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcnM6IHtcbiAgICAgICAgICBfZm9ybTogW2Vycm9yLm1lc3NhZ2VdLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBSZXZhbGlkYXRlIHVzZXIgZGF0YVxuICAgIHJldmFsaWRhdGVUYWcoJ3VzZXInKTtcbiAgICBcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIG1lc3NhZ2U6ICdQYXNzd29yZCB1cGRhdGVkIHN1Y2Nlc3NmdWxseSEnLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ0ZhaWxlZCB0byB1cGRhdGUgcGFzc3dvcmQnO1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgX2Zvcm06IFttZXNzYWdlXSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG4vLyBTZXJ2ZXItc2lkZSBhdXRoIGhlbHBlcnNcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDdXJyZW50VXNlcigpOiBQcm9taXNlPEF1dGhVc2VyIHwgbnVsbD4ge1xuICB0cnkge1xuICAgIGNvbnN0IHsgZGF0YTogeyB1c2VyIH0gfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIFxuICAgIGlmICghdXNlcikgcmV0dXJuIG51bGw7XG5cbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHVzZXIuaWQsXG4gICAgICBlbWFpbDogdXNlci5lbWFpbCEsXG4gICAgICBuYW1lOiB1c2VyLnVzZXJfbWV0YWRhdGE/LmZ1bGxfbmFtZSB8fCB1c2VyLmVtYWlsISxcbiAgICAgIGF2YXRhcl91cmw6IHVzZXIudXNlcl9tZXRhZGF0YT8uYXZhdGFyX3VybCxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBjdXJyZW50IHVzZXIgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXF1aXJlQXV0aCgpOiBQcm9taXNlPEF1dGhVc2VyPiB7XG4gIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRDdXJyZW50VXNlcigpO1xuICBcbiAgaWYgKCF1c2VyKSB7XG4gICAgcmVkaXJlY3QoJy9sb2dpbicpO1xuICB9XG4gIFxuICByZXR1cm4gdXNlcjtcbn1cblxuLy8gT0F1dGggYWN0aW9uc1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNpZ25JbldpdGhHb29nbGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gIC8vIENvbnN0cnVjdCB0aGUgcmVkaXJlY3QgVVJMLCBmYWxsYmFjayB0byBsb2NhbGhvc3QgZm9yIGRldmVsb3BtZW50XG4gIGNvbnN0IHNpdGVVcmwgPSBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TSVRFX1VSTCB8fCBcbiAgICAgICAgICAgICAgICAgIHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX0FQUF9VUkwgfHwgXG4gICAgICAgICAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDozMDAwJztcbiAgY29uc3QgcmVkaXJlY3RUbyA9IGAke3NpdGVVcmx9L2F1dGgvY2FsbGJhY2tgO1xuICBcbiAgY29uc29sZS5sb2coJ1tPQXV0aCBEZWJ1Z10gSW5pdGlhdGluZyBHb29nbGUgc2lnbi1pbiB3aXRoIHJlZGlyZWN0IHRvOicsIHJlZGlyZWN0VG8pO1xuICBcbiAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYXV0aC5zaWduSW5XaXRoT0F1dGgoe1xuICAgIHByb3ZpZGVyOiAnZ29vZ2xlJyxcbiAgICBvcHRpb25zOiB7XG4gICAgICByZWRpcmVjdFRvLFxuICAgICAgcXVlcnlQYXJhbXM6IHtcbiAgICAgICAgYWNjZXNzX3R5cGU6ICdvZmZsaW5lJyxcbiAgICAgICAgcHJvbXB0OiAnY29uc2VudCcsXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuXG4gIGlmIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tPQXV0aCBFcnJvcl0gR29vZ2xlIHNpZ24taW4gZmFpbGVkOicsIGVycm9yKTtcbiAgICAvLyBUcmFjayBmYWlsZWQgT0F1dGggYXR0ZW1wdFxuICAgIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX29hdXRoX2ZhaWxlZCcsIHVuZGVmaW5lZCwge1xuICAgICAgcHJvdmlkZXI6ICdnb29nbGUnLFxuICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgIG1ldGhvZDogJ29hdXRoJyxcbiAgICB9KTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBzaWduIGluIHdpdGggR29vZ2xlLiBQbGVhc2UgdHJ5IGFnYWluIG9yIGNvbnRhY3Qgc3VwcG9ydCBpZiB0aGUgaXNzdWUgcGVyc2lzdHMuJyk7XG4gIH1cblxuICAvLyBUcmFjayBPQXV0aCBpbml0aWF0aW9uXG4gIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX29hdXRoX2luaXRpYXRlZCcsIHVuZGVmaW5lZCwge1xuICAgIHByb3ZpZGVyOiAnZ29vZ2xlJyxcbiAgICBtZXRob2Q6ICdvYXV0aCcsXG4gICAgcmVkaXJlY3RfdXJsOiBkYXRhLnVybCxcbiAgfSk7XG5cbiAgaWYgKGRhdGEudXJsKSB7XG4gICAgY29uc29sZS5sb2coJ1tPQXV0aCBEZWJ1Z10gUmVkaXJlY3RpbmcgdG8gR29vZ2xlIE9BdXRoIFVSTDonLCBkYXRhLnVybCk7XG4gICAgcmVkaXJlY3QoZGF0YS51cmwpO1xuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tPQXV0aCBFcnJvcl0gTm8gcmVkaXJlY3QgVVJMIHJlY2VpdmVkIGZyb20gU3VwYWJhc2UnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0F1dGhlbnRpY2F0aW9uIHNlcnZpY2UgdGVtcG9yYXJpbHkgdW5hdmFpbGFibGUuIFBsZWFzZSB0cnkgYWdhaW4gaW4gYSBmZXcgbW9tZW50cy4nKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2lnbkluV2l0aEdpdEh1YigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgLy8gQ29uc3RydWN0IHRoZSByZWRpcmVjdCBVUkwsIGZhbGxiYWNrIHRvIGxvY2FsaG9zdCBmb3IgZGV2ZWxvcG1lbnRcbiAgY29uc3Qgc2l0ZVVybCA9IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NJVEVfVVJMIHx8IFxuICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfQVBQX1VSTCB8fCBcbiAgICAgICAgICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAnO1xuICBjb25zdCByZWRpcmVjdFRvID0gYCR7c2l0ZVVybH0vYXV0aC9jYWxsYmFja2A7XG4gIFxuICBjb25zb2xlLmxvZygnW09BdXRoIERlYnVnXSBJbml0aWF0aW5nIEdpdEh1YiBzaWduLWluIHdpdGggcmVkaXJlY3QgdG86JywgcmVkaXJlY3RUbyk7XG4gIFxuICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhdXRoLnNpZ25JbldpdGhPQXV0aCh7XG4gICAgcHJvdmlkZXI6ICdnaXRodWInLFxuICAgIG9wdGlvbnM6IHtcbiAgICAgIHJlZGlyZWN0VG8sXG4gICAgfSxcbiAgfSk7XG5cbiAgaWYgKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignW09BdXRoIEVycm9yXSBHaXRIdWIgc2lnbi1pbiBmYWlsZWQ6JywgZXJyb3IpO1xuICAgIC8vIFRyYWNrIGZhaWxlZCBPQXV0aCBhdHRlbXB0XG4gICAgYXdhaXQgdHJhY2tTZXJ2ZXJTaWRlRXZlbnQoJ3VzZXJfb2F1dGhfZmFpbGVkJywgdW5kZWZpbmVkLCB7XG4gICAgICBwcm92aWRlcjogJ2dpdGh1YicsXG4gICAgICBlcnJvcl9tZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgbWV0aG9kOiAnb2F1dGgnLFxuICAgIH0pO1xuICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIHNpZ24gaW4gd2l0aCBHaXRIdWIuIFBsZWFzZSB0cnkgYWdhaW4gb3IgY29udGFjdCBzdXBwb3J0IGlmIHRoZSBpc3N1ZSBwZXJzaXN0cy4nKTtcbiAgfVxuXG4gIC8vIFRyYWNrIE9BdXRoIGluaXRpYXRpb25cbiAgYXdhaXQgdHJhY2tTZXJ2ZXJTaWRlRXZlbnQoJ3VzZXJfb2F1dGhfaW5pdGlhdGVkJywgdW5kZWZpbmVkLCB7XG4gICAgcHJvdmlkZXI6ICdnaXRodWInLFxuICAgIG1ldGhvZDogJ29hdXRoJyxcbiAgICByZWRpcmVjdF91cmw6IGRhdGEudXJsLFxuICB9KTtcblxuICBpZiAoZGF0YS51cmwpIHtcbiAgICBjb25zb2xlLmxvZygnW09BdXRoIERlYnVnXSBSZWRpcmVjdGluZyB0byBHaXRIdWIgT0F1dGggVVJMOicsIGRhdGEudXJsKTtcbiAgICByZWRpcmVjdChkYXRhLnVybCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc29sZS5lcnJvcignW09BdXRoIEVycm9yXSBObyByZWRpcmVjdCBVUkwgcmVjZWl2ZWQgZnJvbSBTdXBhYmFzZScpO1xuICAgIHRocm93IG5ldyBFcnJvcignQXV0aGVudGljYXRpb24gc2VydmljZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZS4gUGxlYXNlIHRyeSBhZ2FpbiBpbiBhIGZldyBtb21lbnRzLicpO1xuICB9XG59Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJtVEErSHNCIn0=
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/actions/data:020aab [app-client] (ecmascript) <text/javascript>": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/* __next_internal_action_entry_do_not_use__ [{"60ac14ea594dede6a06caef4d99a4363766a425d17":"forgotPasswordAction"},"apps/frontend/src/lib/actions/auth-actions.ts",""] */ __turbopack_context__.s({
    "forgotPasswordAction": ()=>forgotPasswordAction
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var forgotPasswordAction = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("60ac14ea594dede6a06caef4d99a4363766a425d17", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "forgotPasswordAction"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYXV0aC1hY3Rpb25zLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJztcblxuaW1wb3J0IHsgcmV2YWxpZGF0ZVRhZyB9IGZyb20gJ25leHQvY2FjaGUnO1xuaW1wb3J0IHsgcmVkaXJlY3QgfSBmcm9tICduZXh0L25hdmlnYXRpb24nO1xuaW1wb3J0IHsgeiB9IGZyb20gJ3pvZCc7XG5pbXBvcnQgeyBhdXRoLCBzdXBhYmFzZSB9IGZyb20gJ0AvbGliL3N1cGFiYXNlJztcbmltcG9ydCB0eXBlIHsgQXV0aFVzZXIgfSBmcm9tICdAL2xpYi9zdXBhYmFzZSc7XG5pbXBvcnQgeyB0cmFja1NlcnZlclNpZGVFdmVudCB9IGZyb20gJ0AvbGliL2FuYWx5dGljcy9wb3N0aG9nLXNlcnZlcic7XG5pbXBvcnQgeyBjb21tb25WYWxpZGF0aW9ucyB9IGZyb20gJ0AvbGliL3ZhbGlkYXRpb24vc2NoZW1hcyc7XG5cbi8vIEF1dGggZm9ybSBzY2hlbWFzIHVzaW5nIGNvbnNvbGlkYXRlZCB2YWxpZGF0aW9uc1xuY29uc3QgTG9naW5TY2hlbWEgPSB6Lm9iamVjdCh7XG4gIGVtYWlsOiBjb21tb25WYWxpZGF0aW9ucy5lbWFpbCxcbiAgcGFzc3dvcmQ6IHouc3RyaW5nKCkubWluKDYsICdQYXNzd29yZCBtdXN0IGJlIGF0IGxlYXN0IDYgY2hhcmFjdGVycycpLFxufSk7XG5cbmNvbnN0IFNpZ251cFNjaGVtYSA9IHoub2JqZWN0KHtcbiAgZW1haWw6IGNvbW1vblZhbGlkYXRpb25zLmVtYWlsLFxuICBwYXNzd29yZDogei5zdHJpbmcoKS5taW4oOCwgJ1Bhc3N3b3JkIG11c3QgYmUgYXQgbGVhc3QgOCBjaGFyYWN0ZXJzJyksXG4gIGNvbmZpcm1QYXNzd29yZDogei5zdHJpbmcoKS5taW4oOCwgJ1Bhc3N3b3JkIG11c3QgYmUgYXQgbGVhc3QgOCBjaGFyYWN0ZXJzJyksXG4gIGZ1bGxOYW1lOiBjb21tb25WYWxpZGF0aW9ucy5uYW1lLFxuICBjb21wYW55TmFtZTogY29tbW9uVmFsaWRhdGlvbnMub3B0aW9uYWxTdHJpbmcsXG59KS5yZWZpbmUoKGRhdGEpID0+IGRhdGEucGFzc3dvcmQgPT09IGRhdGEuY29uZmlybVBhc3N3b3JkLCB7XG4gIG1lc3NhZ2U6IFwiUGFzc3dvcmRzIGRvbid0IG1hdGNoXCIsXG4gIHBhdGg6IFtcImNvbmZpcm1QYXNzd29yZFwiXSxcbn0pO1xuXG5jb25zdCBSZXNldFBhc3N3b3JkU2NoZW1hID0gei5vYmplY3Qoe1xuICBlbWFpbDogY29tbW9uVmFsaWRhdGlvbnMuZW1haWwsXG59KTtcblxuY29uc3QgVXBkYXRlUGFzc3dvcmRTY2hlbWEgPSB6Lm9iamVjdCh7XG4gIHBhc3N3b3JkOiB6LnN0cmluZygpLm1pbig4LCAnUGFzc3dvcmQgbXVzdCBiZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnMnKSxcbiAgY29uZmlybVBhc3N3b3JkOiB6LnN0cmluZygpLm1pbig4LCAnUGFzc3dvcmQgbXVzdCBiZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnMnKSxcbn0pLnJlZmluZSgoZGF0YSkgPT4gZGF0YS5wYXNzd29yZCA9PT0gZGF0YS5jb25maXJtUGFzc3dvcmQsIHtcbiAgbWVzc2FnZTogXCJQYXNzd29yZHMgZG9uJ3QgbWF0Y2hcIixcbiAgcGF0aDogW1wiY29uZmlybVBhc3N3b3JkXCJdLFxufSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXV0aEZvcm1TdGF0ZSB7XG4gIGVycm9ycz86IHtcbiAgICBlbWFpbD86IHN0cmluZ1tdO1xuICAgIHBhc3N3b3JkPzogc3RyaW5nW107XG4gICAgY29uZmlybVBhc3N3b3JkPzogc3RyaW5nW107XG4gICAgZnVsbE5hbWU/OiBzdHJpbmdbXTtcbiAgICBjb21wYW55TmFtZT86IHN0cmluZ1tdO1xuICAgIF9mb3JtPzogc3RyaW5nW107XG4gIH07XG4gIHN1Y2Nlc3M/OiBib29sZWFuO1xuICBtZXNzYWdlPzogc3RyaW5nO1xuICBkYXRhPzoge1xuICAgIHVzZXI/OiB7XG4gICAgICBpZDogc3RyaW5nO1xuICAgICAgZW1haWw6IHN0cmluZztcbiAgICAgIG5hbWU/OiBzdHJpbmc7XG4gICAgfTtcbiAgICBzZXNzaW9uPzoge1xuICAgICAgYWNjZXNzX3Rva2VuOiBzdHJpbmc7XG4gICAgICByZWZyZXNoX3Rva2VuOiBzdHJpbmc7XG4gICAgfTtcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvZ2luQWN0aW9uKFxuICBwcmV2U3RhdGU6IEF1dGhGb3JtU3RhdGUsXG4gIGZvcm1EYXRhOiBGb3JtRGF0YVxuKTogUHJvbWlzZTxBdXRoRm9ybVN0YXRlPiB7XG4gIGNvbnN0IHJhd0RhdGEgPSB7XG4gICAgZW1haWw6IGZvcm1EYXRhLmdldCgnZW1haWwnKSxcbiAgICBwYXNzd29yZDogZm9ybURhdGEuZ2V0KCdwYXNzd29yZCcpLFxuICB9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IExvZ2luU2NoZW1hLnNhZmVQYXJzZShyYXdEYXRhKTtcblxuICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogcmVzdWx0LmVycm9yLmZsYXR0ZW4oKS5maWVsZEVycm9ycyxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhdXRoLnNpZ25JbldpdGhQYXNzd29yZCh7XG4gICAgICBlbWFpbDogcmVzdWx0LmRhdGEuZW1haWwsXG4gICAgICBwYXNzd29yZDogcmVzdWx0LmRhdGEucGFzc3dvcmQsXG4gICAgfSk7XG5cbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIC8vIFRyYWNrIGZhaWxlZCBsb2dpbiBhdHRlbXB0XG4gICAgICBhd2FpdCB0cmFja1NlcnZlclNpZGVFdmVudCgndXNlcl9sb2dpbl9mYWlsZWQnLCB1bmRlZmluZWQsIHtcbiAgICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgZW1haWxfZG9tYWluOiByZXN1bHQuZGF0YS5lbWFpbC5zcGxpdCgnQCcpWzFdLFxuICAgICAgICBtZXRob2Q6ICdlbWFpbCcsXG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZXJyb3JzOiB7XG4gICAgICAgICAgX2Zvcm06IFtlcnJvci5tZXNzYWdlXSxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gVHJhY2sgc3VjY2Vzc2Z1bCBsb2dpblxuICAgIGlmIChkYXRhLnVzZXIpIHtcbiAgICAgIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX3NpZ25lZF9pbicsIGRhdGEudXNlci5pZCwge1xuICAgICAgICBtZXRob2Q6ICdlbWFpbCcsXG4gICAgICAgIGVtYWlsOiBkYXRhLnVzZXIuZW1haWwsXG4gICAgICAgIHVzZXJfaWQ6IGRhdGEudXNlci5pZCxcbiAgICAgICAgc2Vzc2lvbl9pZDogZGF0YS5zZXNzaW9uPy5hY2Nlc3NfdG9rZW4/LnNsaWNlKC04KSwgLy8gTGFzdCA4IGNoYXJzIGZvciBpZGVudGlmaWNhdGlvblxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gUmV2YWxpZGF0ZSBhdXRoLXJlbGF0ZWQgY2FjaGVzXG4gICAgcmV2YWxpZGF0ZVRhZygndXNlcicpO1xuICAgIHJldmFsaWRhdGVUYWcoJ3Nlc3Npb24nKTtcbiAgICBcbiAgICAvLyBSZWRpcmVjdCB0byBkYXNoYm9hcmRcbiAgICByZWRpcmVjdCgnL2Rhc2hib2FyZCcpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdMb2dpbiBmYWlsZWQnO1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgX2Zvcm06IFttZXNzYWdlXSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2lnbnVwQWN0aW9uKFxuICBwcmV2U3RhdGU6IEF1dGhGb3JtU3RhdGUsXG4gIGZvcm1EYXRhOiBGb3JtRGF0YVxuKTogUHJvbWlzZTxBdXRoRm9ybVN0YXRlPiB7XG4gIGNvbnN0IHJhd0RhdGEgPSB7XG4gICAgZW1haWw6IGZvcm1EYXRhLmdldCgnZW1haWwnKSxcbiAgICBwYXNzd29yZDogZm9ybURhdGEuZ2V0KCdwYXNzd29yZCcpLFxuICAgIGNvbmZpcm1QYXNzd29yZDogZm9ybURhdGEuZ2V0KCdjb25maXJtUGFzc3dvcmQnKSxcbiAgICBmdWxsTmFtZTogZm9ybURhdGEuZ2V0KCdmdWxsTmFtZScpLFxuICAgIGNvbXBhbnlOYW1lOiBmb3JtRGF0YS5nZXQoJ2NvbXBhbnlOYW1lJyksXG4gIH07XG5cbiAgY29uc3QgcmVzdWx0ID0gU2lnbnVwU2NoZW1hLnNhZmVQYXJzZShyYXdEYXRhKTtcblxuICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogcmVzdWx0LmVycm9yLmZsYXR0ZW4oKS5maWVsZEVycm9ycyxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhdXRoLnNpZ25VcCh7XG4gICAgICBlbWFpbDogcmVzdWx0LmRhdGEuZW1haWwsXG4gICAgICBwYXNzd29yZDogcmVzdWx0LmRhdGEucGFzc3dvcmQsXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBmdWxsX25hbWU6IHJlc3VsdC5kYXRhLmZ1bGxOYW1lLFxuICAgICAgICAgIGNvbXBhbnlfbmFtZTogcmVzdWx0LmRhdGEuY29tcGFueU5hbWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICAvLyBUcmFjayBmYWlsZWQgc2lnbnVwIGF0dGVtcHRcbiAgICAgIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX3NpZ251cF9mYWlsZWQnLCB1bmRlZmluZWQsIHtcbiAgICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgZW1haWxfZG9tYWluOiByZXN1bHQuZGF0YS5lbWFpbC5zcGxpdCgnQCcpWzFdLFxuICAgICAgICBoYXNfY29tcGFueV9uYW1lOiAhIXJlc3VsdC5kYXRhLmNvbXBhbnlOYW1lLFxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGVycm9yczoge1xuICAgICAgICAgIF9mb3JtOiBbZXJyb3IubWVzc2FnZV0sXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFRyYWNrIHN1Y2Nlc3NmdWwgc2lnbnVwXG4gICAgaWYgKGRhdGEudXNlcikge1xuICAgICAgYXdhaXQgdHJhY2tTZXJ2ZXJTaWRlRXZlbnQoJ3VzZXJfc2lnbmVkX3VwJywgZGF0YS51c2VyLmlkLCB7XG4gICAgICAgIG1ldGhvZDogJ2VtYWlsJyxcbiAgICAgICAgZW1haWw6IGRhdGEudXNlci5lbWFpbCxcbiAgICAgICAgdXNlcl9pZDogZGF0YS51c2VyLmlkLFxuICAgICAgICBoYXNfY29tcGFueV9uYW1lOiAhIXJlc3VsdC5kYXRhLmNvbXBhbnlOYW1lLFxuICAgICAgICBmdWxsX25hbWU6IHJlc3VsdC5kYXRhLmZ1bGxOYW1lLFxuICAgICAgICBuZWVkc19lbWFpbF92ZXJpZmljYXRpb246ICFkYXRhLnVzZXIuZW1haWxfY29uZmlybWVkX2F0LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBtZXNzYWdlOiAnQWNjb3VudCBjcmVhdGVkISBQbGVhc2UgY2hlY2sgeW91ciBlbWFpbCB0byB2ZXJpZnkgeW91ciBhY2NvdW50LicsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnU2lnbnVwIGZhaWxlZCc7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczoge1xuICAgICAgICBfZm9ybTogW21lc3NhZ2VdLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2dvdXRBY3Rpb24oKTogUHJvbWlzZTxBdXRoRm9ybVN0YXRlPiB7XG4gIHRyeSB7XG4gICAgLy8gR2V0IGN1cnJlbnQgdXNlciBmb3IgdHJhY2tpbmcgYmVmb3JlIGxvZ291dFxuICAgIGNvbnN0IHsgZGF0YTogeyB1c2VyIH0gfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIFxuICAgIGF3YWl0IGF1dGguc2lnbk91dCgpO1xuICAgIFxuICAgIC8vIFRyYWNrIGxvZ291dCBldmVudFxuICAgIGlmICh1c2VyKSB7XG4gICAgICBhd2FpdCB0cmFja1NlcnZlclNpZGVFdmVudCgndXNlcl9zaWduZWRfb3V0JywgdXNlci5pZCwge1xuICAgICAgICB1c2VyX2lkOiB1c2VyLmlkLFxuICAgICAgICBlbWFpbDogdXNlci5lbWFpbCxcbiAgICAgICAgbG9nb3V0X21ldGhvZDogJ21hbnVhbCcsXG4gICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2xlYXIgYWxsIGNhY2hlZCBkYXRhXG4gICAgcmV2YWxpZGF0ZVRhZygndXNlcicpO1xuICAgIHJldmFsaWRhdGVUYWcoJ3Nlc3Npb24nKTtcbiAgICByZXZhbGlkYXRlVGFnKCdwcm9wZXJ0aWVzJyk7XG4gICAgcmV2YWxpZGF0ZVRhZygndGVuYW50cycpO1xuICAgIHJldmFsaWRhdGVUYWcoJ2xlYXNlcycpO1xuICAgIHJldmFsaWRhdGVUYWcoJ21haW50ZW5hbmNlJyk7XG4gICAgXG4gICAgLy8gUmVkaXJlY3QgdG8gaG9tZSBwYWdlXG4gICAgcmVkaXJlY3QoJy8nKTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcic7XG4gICAgY29uc29sZS5lcnJvcignTG9nb3V0IGVycm9yOicsIG1lc3NhZ2UpO1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgX2Zvcm06IFttZXNzYWdlXSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZm9yZ290UGFzc3dvcmRBY3Rpb24oXG4gIHByZXZTdGF0ZTogQXV0aEZvcm1TdGF0ZSxcbiAgZm9ybURhdGE6IEZvcm1EYXRhXG4pOiBQcm9taXNlPEF1dGhGb3JtU3RhdGU+IHtcbiAgY29uc3QgcmF3RGF0YSA9IHtcbiAgICBlbWFpbDogZm9ybURhdGEuZ2V0KCdlbWFpbCcpLFxuICB9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IFJlc2V0UGFzc3dvcmRTY2hlbWEuc2FmZVBhcnNlKHJhd0RhdGEpO1xuXG4gIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZXJyb3JzOiByZXN1bHQuZXJyb3IuZmxhdHRlbigpLmZpZWxkRXJyb3JzLFxuICAgIH07XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IGF1dGgucmVzZXRQYXNzd29yZEZvckVtYWlsKHJlc3VsdC5kYXRhLmVtYWlsLCB7XG4gICAgICByZWRpcmVjdFRvOiBgJHtwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TSVRFX1VSTH0vYXV0aC91cGRhdGUtcGFzc3dvcmRgLFxuICAgIH0pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcnM6IHtcbiAgICAgICAgICBfZm9ybTogW2Vycm9yLm1lc3NhZ2VdLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIG1lc3NhZ2U6ICdQYXNzd29yZCByZXNldCBlbWFpbCBzZW50ISBDaGVjayB5b3VyIGluYm94IGZvciBpbnN0cnVjdGlvbnMuJyxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdGYWlsZWQgdG8gc2VuZCByZXNldCBlbWFpbCc7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczoge1xuICAgICAgICBfZm9ybTogW21lc3NhZ2VdLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGRhdGVQYXNzd29yZEFjdGlvbihcbiAgcHJldlN0YXRlOiBBdXRoRm9ybVN0YXRlLFxuICBmb3JtRGF0YTogRm9ybURhdGFcbik6IFByb21pc2U8QXV0aEZvcm1TdGF0ZT4ge1xuICBjb25zdCByYXdEYXRhID0ge1xuICAgIHBhc3N3b3JkOiBmb3JtRGF0YS5nZXQoJ3Bhc3N3b3JkJyksXG4gICAgY29uZmlybVBhc3N3b3JkOiBmb3JtRGF0YS5nZXQoJ2NvbmZpcm1QYXNzd29yZCcpLFxuICB9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IFVwZGF0ZVBhc3N3b3JkU2NoZW1hLnNhZmVQYXJzZShyYXdEYXRhKTtcblxuICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogcmVzdWx0LmVycm9yLmZsYXR0ZW4oKS5maWVsZEVycm9ycyxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBhdXRoLnVwZGF0ZVVzZXIoe1xuICAgICAgcGFzc3dvcmQ6IHJlc3VsdC5kYXRhLnBhc3N3b3JkLFxuICAgIH0pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcnM6IHtcbiAgICAgICAgICBfZm9ybTogW2Vycm9yLm1lc3NhZ2VdLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBSZXZhbGlkYXRlIHVzZXIgZGF0YVxuICAgIHJldmFsaWRhdGVUYWcoJ3VzZXInKTtcbiAgICBcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIG1lc3NhZ2U6ICdQYXNzd29yZCB1cGRhdGVkIHN1Y2Nlc3NmdWxseSEnLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ0ZhaWxlZCB0byB1cGRhdGUgcGFzc3dvcmQnO1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgX2Zvcm06IFttZXNzYWdlXSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG4vLyBTZXJ2ZXItc2lkZSBhdXRoIGhlbHBlcnNcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDdXJyZW50VXNlcigpOiBQcm9taXNlPEF1dGhVc2VyIHwgbnVsbD4ge1xuICB0cnkge1xuICAgIGNvbnN0IHsgZGF0YTogeyB1c2VyIH0gfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIFxuICAgIGlmICghdXNlcikgcmV0dXJuIG51bGw7XG5cbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHVzZXIuaWQsXG4gICAgICBlbWFpbDogdXNlci5lbWFpbCEsXG4gICAgICBuYW1lOiB1c2VyLnVzZXJfbWV0YWRhdGE/LmZ1bGxfbmFtZSB8fCB1c2VyLmVtYWlsISxcbiAgICAgIGF2YXRhcl91cmw6IHVzZXIudXNlcl9tZXRhZGF0YT8uYXZhdGFyX3VybCxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBjdXJyZW50IHVzZXIgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXF1aXJlQXV0aCgpOiBQcm9taXNlPEF1dGhVc2VyPiB7XG4gIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRDdXJyZW50VXNlcigpO1xuICBcbiAgaWYgKCF1c2VyKSB7XG4gICAgcmVkaXJlY3QoJy9sb2dpbicpO1xuICB9XG4gIFxuICByZXR1cm4gdXNlcjtcbn1cblxuLy8gT0F1dGggYWN0aW9uc1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNpZ25JbldpdGhHb29nbGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gIC8vIENvbnN0cnVjdCB0aGUgcmVkaXJlY3QgVVJMLCBmYWxsYmFjayB0byBsb2NhbGhvc3QgZm9yIGRldmVsb3BtZW50XG4gIGNvbnN0IHNpdGVVcmwgPSBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TSVRFX1VSTCB8fCBcbiAgICAgICAgICAgICAgICAgIHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX0FQUF9VUkwgfHwgXG4gICAgICAgICAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDozMDAwJztcbiAgY29uc3QgcmVkaXJlY3RUbyA9IGAke3NpdGVVcmx9L2F1dGgvY2FsbGJhY2tgO1xuICBcbiAgY29uc29sZS5sb2coJ1tPQXV0aCBEZWJ1Z10gSW5pdGlhdGluZyBHb29nbGUgc2lnbi1pbiB3aXRoIHJlZGlyZWN0IHRvOicsIHJlZGlyZWN0VG8pO1xuICBcbiAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYXV0aC5zaWduSW5XaXRoT0F1dGgoe1xuICAgIHByb3ZpZGVyOiAnZ29vZ2xlJyxcbiAgICBvcHRpb25zOiB7XG4gICAgICByZWRpcmVjdFRvLFxuICAgICAgcXVlcnlQYXJhbXM6IHtcbiAgICAgICAgYWNjZXNzX3R5cGU6ICdvZmZsaW5lJyxcbiAgICAgICAgcHJvbXB0OiAnY29uc2VudCcsXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuXG4gIGlmIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tPQXV0aCBFcnJvcl0gR29vZ2xlIHNpZ24taW4gZmFpbGVkOicsIGVycm9yKTtcbiAgICAvLyBUcmFjayBmYWlsZWQgT0F1dGggYXR0ZW1wdFxuICAgIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX29hdXRoX2ZhaWxlZCcsIHVuZGVmaW5lZCwge1xuICAgICAgcHJvdmlkZXI6ICdnb29nbGUnLFxuICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgIG1ldGhvZDogJ29hdXRoJyxcbiAgICB9KTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBzaWduIGluIHdpdGggR29vZ2xlLiBQbGVhc2UgdHJ5IGFnYWluIG9yIGNvbnRhY3Qgc3VwcG9ydCBpZiB0aGUgaXNzdWUgcGVyc2lzdHMuJyk7XG4gIH1cblxuICAvLyBUcmFjayBPQXV0aCBpbml0aWF0aW9uXG4gIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX29hdXRoX2luaXRpYXRlZCcsIHVuZGVmaW5lZCwge1xuICAgIHByb3ZpZGVyOiAnZ29vZ2xlJyxcbiAgICBtZXRob2Q6ICdvYXV0aCcsXG4gICAgcmVkaXJlY3RfdXJsOiBkYXRhLnVybCxcbiAgfSk7XG5cbiAgaWYgKGRhdGEudXJsKSB7XG4gICAgY29uc29sZS5sb2coJ1tPQXV0aCBEZWJ1Z10gUmVkaXJlY3RpbmcgdG8gR29vZ2xlIE9BdXRoIFVSTDonLCBkYXRhLnVybCk7XG4gICAgcmVkaXJlY3QoZGF0YS51cmwpO1xuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tPQXV0aCBFcnJvcl0gTm8gcmVkaXJlY3QgVVJMIHJlY2VpdmVkIGZyb20gU3VwYWJhc2UnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0F1dGhlbnRpY2F0aW9uIHNlcnZpY2UgdGVtcG9yYXJpbHkgdW5hdmFpbGFibGUuIFBsZWFzZSB0cnkgYWdhaW4gaW4gYSBmZXcgbW9tZW50cy4nKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2lnbkluV2l0aEdpdEh1YigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgLy8gQ29uc3RydWN0IHRoZSByZWRpcmVjdCBVUkwsIGZhbGxiYWNrIHRvIGxvY2FsaG9zdCBmb3IgZGV2ZWxvcG1lbnRcbiAgY29uc3Qgc2l0ZVVybCA9IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NJVEVfVVJMIHx8IFxuICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfQVBQX1VSTCB8fCBcbiAgICAgICAgICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAnO1xuICBjb25zdCByZWRpcmVjdFRvID0gYCR7c2l0ZVVybH0vYXV0aC9jYWxsYmFja2A7XG4gIFxuICBjb25zb2xlLmxvZygnW09BdXRoIERlYnVnXSBJbml0aWF0aW5nIEdpdEh1YiBzaWduLWluIHdpdGggcmVkaXJlY3QgdG86JywgcmVkaXJlY3RUbyk7XG4gIFxuICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhdXRoLnNpZ25JbldpdGhPQXV0aCh7XG4gICAgcHJvdmlkZXI6ICdnaXRodWInLFxuICAgIG9wdGlvbnM6IHtcbiAgICAgIHJlZGlyZWN0VG8sXG4gICAgfSxcbiAgfSk7XG5cbiAgaWYgKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignW09BdXRoIEVycm9yXSBHaXRIdWIgc2lnbi1pbiBmYWlsZWQ6JywgZXJyb3IpO1xuICAgIC8vIFRyYWNrIGZhaWxlZCBPQXV0aCBhdHRlbXB0XG4gICAgYXdhaXQgdHJhY2tTZXJ2ZXJTaWRlRXZlbnQoJ3VzZXJfb2F1dGhfZmFpbGVkJywgdW5kZWZpbmVkLCB7XG4gICAgICBwcm92aWRlcjogJ2dpdGh1YicsXG4gICAgICBlcnJvcl9tZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgbWV0aG9kOiAnb2F1dGgnLFxuICAgIH0pO1xuICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIHNpZ24gaW4gd2l0aCBHaXRIdWIuIFBsZWFzZSB0cnkgYWdhaW4gb3IgY29udGFjdCBzdXBwb3J0IGlmIHRoZSBpc3N1ZSBwZXJzaXN0cy4nKTtcbiAgfVxuXG4gIC8vIFRyYWNrIE9BdXRoIGluaXRpYXRpb25cbiAgYXdhaXQgdHJhY2tTZXJ2ZXJTaWRlRXZlbnQoJ3VzZXJfb2F1dGhfaW5pdGlhdGVkJywgdW5kZWZpbmVkLCB7XG4gICAgcHJvdmlkZXI6ICdnaXRodWInLFxuICAgIG1ldGhvZDogJ29hdXRoJyxcbiAgICByZWRpcmVjdF91cmw6IGRhdGEudXJsLFxuICB9KTtcblxuICBpZiAoZGF0YS51cmwpIHtcbiAgICBjb25zb2xlLmxvZygnW09BdXRoIERlYnVnXSBSZWRpcmVjdGluZyB0byBHaXRIdWIgT0F1dGggVVJMOicsIGRhdGEudXJsKTtcbiAgICByZWRpcmVjdChkYXRhLnVybCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc29sZS5lcnJvcignW09BdXRoIEVycm9yXSBObyByZWRpcmVjdCBVUkwgcmVjZWl2ZWQgZnJvbSBTdXBhYmFzZScpO1xuICAgIHRocm93IG5ldyBFcnJvcignQXV0aGVudGljYXRpb24gc2VydmljZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZS4gUGxlYXNlIHRyeSBhZ2FpbiBpbiBhIGZldyBtb21lbnRzLicpO1xuICB9XG59Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiIyVEE2T3NCIn0=
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/actions/data:c11f6c [app-client] (ecmascript) <text/javascript>": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/* __next_internal_action_entry_do_not_use__ [{"00e910cadf0b232473915927567d3b5848de83eb3b":"signInWithGoogle"},"apps/frontend/src/lib/actions/auth-actions.ts",""] */ __turbopack_context__.s({
    "signInWithGoogle": ()=>signInWithGoogle
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var signInWithGoogle = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("00e910cadf0b232473915927567d3b5848de83eb3b", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "signInWithGoogle"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYXV0aC1hY3Rpb25zLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJztcblxuaW1wb3J0IHsgcmV2YWxpZGF0ZVRhZyB9IGZyb20gJ25leHQvY2FjaGUnO1xuaW1wb3J0IHsgcmVkaXJlY3QgfSBmcm9tICduZXh0L25hdmlnYXRpb24nO1xuaW1wb3J0IHsgeiB9IGZyb20gJ3pvZCc7XG5pbXBvcnQgeyBhdXRoLCBzdXBhYmFzZSB9IGZyb20gJ0AvbGliL3N1cGFiYXNlJztcbmltcG9ydCB0eXBlIHsgQXV0aFVzZXIgfSBmcm9tICdAL2xpYi9zdXBhYmFzZSc7XG5pbXBvcnQgeyB0cmFja1NlcnZlclNpZGVFdmVudCB9IGZyb20gJ0AvbGliL2FuYWx5dGljcy9wb3N0aG9nLXNlcnZlcic7XG5pbXBvcnQgeyBjb21tb25WYWxpZGF0aW9ucyB9IGZyb20gJ0AvbGliL3ZhbGlkYXRpb24vc2NoZW1hcyc7XG5cbi8vIEF1dGggZm9ybSBzY2hlbWFzIHVzaW5nIGNvbnNvbGlkYXRlZCB2YWxpZGF0aW9uc1xuY29uc3QgTG9naW5TY2hlbWEgPSB6Lm9iamVjdCh7XG4gIGVtYWlsOiBjb21tb25WYWxpZGF0aW9ucy5lbWFpbCxcbiAgcGFzc3dvcmQ6IHouc3RyaW5nKCkubWluKDYsICdQYXNzd29yZCBtdXN0IGJlIGF0IGxlYXN0IDYgY2hhcmFjdGVycycpLFxufSk7XG5cbmNvbnN0IFNpZ251cFNjaGVtYSA9IHoub2JqZWN0KHtcbiAgZW1haWw6IGNvbW1vblZhbGlkYXRpb25zLmVtYWlsLFxuICBwYXNzd29yZDogei5zdHJpbmcoKS5taW4oOCwgJ1Bhc3N3b3JkIG11c3QgYmUgYXQgbGVhc3QgOCBjaGFyYWN0ZXJzJyksXG4gIGNvbmZpcm1QYXNzd29yZDogei5zdHJpbmcoKS5taW4oOCwgJ1Bhc3N3b3JkIG11c3QgYmUgYXQgbGVhc3QgOCBjaGFyYWN0ZXJzJyksXG4gIGZ1bGxOYW1lOiBjb21tb25WYWxpZGF0aW9ucy5uYW1lLFxuICBjb21wYW55TmFtZTogY29tbW9uVmFsaWRhdGlvbnMub3B0aW9uYWxTdHJpbmcsXG59KS5yZWZpbmUoKGRhdGEpID0+IGRhdGEucGFzc3dvcmQgPT09IGRhdGEuY29uZmlybVBhc3N3b3JkLCB7XG4gIG1lc3NhZ2U6IFwiUGFzc3dvcmRzIGRvbid0IG1hdGNoXCIsXG4gIHBhdGg6IFtcImNvbmZpcm1QYXNzd29yZFwiXSxcbn0pO1xuXG5jb25zdCBSZXNldFBhc3N3b3JkU2NoZW1hID0gei5vYmplY3Qoe1xuICBlbWFpbDogY29tbW9uVmFsaWRhdGlvbnMuZW1haWwsXG59KTtcblxuY29uc3QgVXBkYXRlUGFzc3dvcmRTY2hlbWEgPSB6Lm9iamVjdCh7XG4gIHBhc3N3b3JkOiB6LnN0cmluZygpLm1pbig4LCAnUGFzc3dvcmQgbXVzdCBiZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnMnKSxcbiAgY29uZmlybVBhc3N3b3JkOiB6LnN0cmluZygpLm1pbig4LCAnUGFzc3dvcmQgbXVzdCBiZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnMnKSxcbn0pLnJlZmluZSgoZGF0YSkgPT4gZGF0YS5wYXNzd29yZCA9PT0gZGF0YS5jb25maXJtUGFzc3dvcmQsIHtcbiAgbWVzc2FnZTogXCJQYXNzd29yZHMgZG9uJ3QgbWF0Y2hcIixcbiAgcGF0aDogW1wiY29uZmlybVBhc3N3b3JkXCJdLFxufSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXV0aEZvcm1TdGF0ZSB7XG4gIGVycm9ycz86IHtcbiAgICBlbWFpbD86IHN0cmluZ1tdO1xuICAgIHBhc3N3b3JkPzogc3RyaW5nW107XG4gICAgY29uZmlybVBhc3N3b3JkPzogc3RyaW5nW107XG4gICAgZnVsbE5hbWU/OiBzdHJpbmdbXTtcbiAgICBjb21wYW55TmFtZT86IHN0cmluZ1tdO1xuICAgIF9mb3JtPzogc3RyaW5nW107XG4gIH07XG4gIHN1Y2Nlc3M/OiBib29sZWFuO1xuICBtZXNzYWdlPzogc3RyaW5nO1xuICBkYXRhPzoge1xuICAgIHVzZXI/OiB7XG4gICAgICBpZDogc3RyaW5nO1xuICAgICAgZW1haWw6IHN0cmluZztcbiAgICAgIG5hbWU/OiBzdHJpbmc7XG4gICAgfTtcbiAgICBzZXNzaW9uPzoge1xuICAgICAgYWNjZXNzX3Rva2VuOiBzdHJpbmc7XG4gICAgICByZWZyZXNoX3Rva2VuOiBzdHJpbmc7XG4gICAgfTtcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvZ2luQWN0aW9uKFxuICBwcmV2U3RhdGU6IEF1dGhGb3JtU3RhdGUsXG4gIGZvcm1EYXRhOiBGb3JtRGF0YVxuKTogUHJvbWlzZTxBdXRoRm9ybVN0YXRlPiB7XG4gIGNvbnN0IHJhd0RhdGEgPSB7XG4gICAgZW1haWw6IGZvcm1EYXRhLmdldCgnZW1haWwnKSxcbiAgICBwYXNzd29yZDogZm9ybURhdGEuZ2V0KCdwYXNzd29yZCcpLFxuICB9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IExvZ2luU2NoZW1hLnNhZmVQYXJzZShyYXdEYXRhKTtcblxuICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogcmVzdWx0LmVycm9yLmZsYXR0ZW4oKS5maWVsZEVycm9ycyxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhdXRoLnNpZ25JbldpdGhQYXNzd29yZCh7XG4gICAgICBlbWFpbDogcmVzdWx0LmRhdGEuZW1haWwsXG4gICAgICBwYXNzd29yZDogcmVzdWx0LmRhdGEucGFzc3dvcmQsXG4gICAgfSk7XG5cbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIC8vIFRyYWNrIGZhaWxlZCBsb2dpbiBhdHRlbXB0XG4gICAgICBhd2FpdCB0cmFja1NlcnZlclNpZGVFdmVudCgndXNlcl9sb2dpbl9mYWlsZWQnLCB1bmRlZmluZWQsIHtcbiAgICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgZW1haWxfZG9tYWluOiByZXN1bHQuZGF0YS5lbWFpbC5zcGxpdCgnQCcpWzFdLFxuICAgICAgICBtZXRob2Q6ICdlbWFpbCcsXG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZXJyb3JzOiB7XG4gICAgICAgICAgX2Zvcm06IFtlcnJvci5tZXNzYWdlXSxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gVHJhY2sgc3VjY2Vzc2Z1bCBsb2dpblxuICAgIGlmIChkYXRhLnVzZXIpIHtcbiAgICAgIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX3NpZ25lZF9pbicsIGRhdGEudXNlci5pZCwge1xuICAgICAgICBtZXRob2Q6ICdlbWFpbCcsXG4gICAgICAgIGVtYWlsOiBkYXRhLnVzZXIuZW1haWwsXG4gICAgICAgIHVzZXJfaWQ6IGRhdGEudXNlci5pZCxcbiAgICAgICAgc2Vzc2lvbl9pZDogZGF0YS5zZXNzaW9uPy5hY2Nlc3NfdG9rZW4/LnNsaWNlKC04KSwgLy8gTGFzdCA4IGNoYXJzIGZvciBpZGVudGlmaWNhdGlvblxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gUmV2YWxpZGF0ZSBhdXRoLXJlbGF0ZWQgY2FjaGVzXG4gICAgcmV2YWxpZGF0ZVRhZygndXNlcicpO1xuICAgIHJldmFsaWRhdGVUYWcoJ3Nlc3Npb24nKTtcbiAgICBcbiAgICAvLyBSZWRpcmVjdCB0byBkYXNoYm9hcmRcbiAgICByZWRpcmVjdCgnL2Rhc2hib2FyZCcpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdMb2dpbiBmYWlsZWQnO1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgX2Zvcm06IFttZXNzYWdlXSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2lnbnVwQWN0aW9uKFxuICBwcmV2U3RhdGU6IEF1dGhGb3JtU3RhdGUsXG4gIGZvcm1EYXRhOiBGb3JtRGF0YVxuKTogUHJvbWlzZTxBdXRoRm9ybVN0YXRlPiB7XG4gIGNvbnN0IHJhd0RhdGEgPSB7XG4gICAgZW1haWw6IGZvcm1EYXRhLmdldCgnZW1haWwnKSxcbiAgICBwYXNzd29yZDogZm9ybURhdGEuZ2V0KCdwYXNzd29yZCcpLFxuICAgIGNvbmZpcm1QYXNzd29yZDogZm9ybURhdGEuZ2V0KCdjb25maXJtUGFzc3dvcmQnKSxcbiAgICBmdWxsTmFtZTogZm9ybURhdGEuZ2V0KCdmdWxsTmFtZScpLFxuICAgIGNvbXBhbnlOYW1lOiBmb3JtRGF0YS5nZXQoJ2NvbXBhbnlOYW1lJyksXG4gIH07XG5cbiAgY29uc3QgcmVzdWx0ID0gU2lnbnVwU2NoZW1hLnNhZmVQYXJzZShyYXdEYXRhKTtcblxuICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogcmVzdWx0LmVycm9yLmZsYXR0ZW4oKS5maWVsZEVycm9ycyxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhdXRoLnNpZ25VcCh7XG4gICAgICBlbWFpbDogcmVzdWx0LmRhdGEuZW1haWwsXG4gICAgICBwYXNzd29yZDogcmVzdWx0LmRhdGEucGFzc3dvcmQsXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBmdWxsX25hbWU6IHJlc3VsdC5kYXRhLmZ1bGxOYW1lLFxuICAgICAgICAgIGNvbXBhbnlfbmFtZTogcmVzdWx0LmRhdGEuY29tcGFueU5hbWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICAvLyBUcmFjayBmYWlsZWQgc2lnbnVwIGF0dGVtcHRcbiAgICAgIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX3NpZ251cF9mYWlsZWQnLCB1bmRlZmluZWQsIHtcbiAgICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgZW1haWxfZG9tYWluOiByZXN1bHQuZGF0YS5lbWFpbC5zcGxpdCgnQCcpWzFdLFxuICAgICAgICBoYXNfY29tcGFueV9uYW1lOiAhIXJlc3VsdC5kYXRhLmNvbXBhbnlOYW1lLFxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGVycm9yczoge1xuICAgICAgICAgIF9mb3JtOiBbZXJyb3IubWVzc2FnZV0sXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFRyYWNrIHN1Y2Nlc3NmdWwgc2lnbnVwXG4gICAgaWYgKGRhdGEudXNlcikge1xuICAgICAgYXdhaXQgdHJhY2tTZXJ2ZXJTaWRlRXZlbnQoJ3VzZXJfc2lnbmVkX3VwJywgZGF0YS51c2VyLmlkLCB7XG4gICAgICAgIG1ldGhvZDogJ2VtYWlsJyxcbiAgICAgICAgZW1haWw6IGRhdGEudXNlci5lbWFpbCxcbiAgICAgICAgdXNlcl9pZDogZGF0YS51c2VyLmlkLFxuICAgICAgICBoYXNfY29tcGFueV9uYW1lOiAhIXJlc3VsdC5kYXRhLmNvbXBhbnlOYW1lLFxuICAgICAgICBmdWxsX25hbWU6IHJlc3VsdC5kYXRhLmZ1bGxOYW1lLFxuICAgICAgICBuZWVkc19lbWFpbF92ZXJpZmljYXRpb246ICFkYXRhLnVzZXIuZW1haWxfY29uZmlybWVkX2F0LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBtZXNzYWdlOiAnQWNjb3VudCBjcmVhdGVkISBQbGVhc2UgY2hlY2sgeW91ciBlbWFpbCB0byB2ZXJpZnkgeW91ciBhY2NvdW50LicsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnU2lnbnVwIGZhaWxlZCc7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczoge1xuICAgICAgICBfZm9ybTogW21lc3NhZ2VdLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2dvdXRBY3Rpb24oKTogUHJvbWlzZTxBdXRoRm9ybVN0YXRlPiB7XG4gIHRyeSB7XG4gICAgLy8gR2V0IGN1cnJlbnQgdXNlciBmb3IgdHJhY2tpbmcgYmVmb3JlIGxvZ291dFxuICAgIGNvbnN0IHsgZGF0YTogeyB1c2VyIH0gfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIFxuICAgIGF3YWl0IGF1dGguc2lnbk91dCgpO1xuICAgIFxuICAgIC8vIFRyYWNrIGxvZ291dCBldmVudFxuICAgIGlmICh1c2VyKSB7XG4gICAgICBhd2FpdCB0cmFja1NlcnZlclNpZGVFdmVudCgndXNlcl9zaWduZWRfb3V0JywgdXNlci5pZCwge1xuICAgICAgICB1c2VyX2lkOiB1c2VyLmlkLFxuICAgICAgICBlbWFpbDogdXNlci5lbWFpbCxcbiAgICAgICAgbG9nb3V0X21ldGhvZDogJ21hbnVhbCcsXG4gICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2xlYXIgYWxsIGNhY2hlZCBkYXRhXG4gICAgcmV2YWxpZGF0ZVRhZygndXNlcicpO1xuICAgIHJldmFsaWRhdGVUYWcoJ3Nlc3Npb24nKTtcbiAgICByZXZhbGlkYXRlVGFnKCdwcm9wZXJ0aWVzJyk7XG4gICAgcmV2YWxpZGF0ZVRhZygndGVuYW50cycpO1xuICAgIHJldmFsaWRhdGVUYWcoJ2xlYXNlcycpO1xuICAgIHJldmFsaWRhdGVUYWcoJ21haW50ZW5hbmNlJyk7XG4gICAgXG4gICAgLy8gUmVkaXJlY3QgdG8gaG9tZSBwYWdlXG4gICAgcmVkaXJlY3QoJy8nKTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcic7XG4gICAgY29uc29sZS5lcnJvcignTG9nb3V0IGVycm9yOicsIG1lc3NhZ2UpO1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgX2Zvcm06IFttZXNzYWdlXSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZm9yZ290UGFzc3dvcmRBY3Rpb24oXG4gIHByZXZTdGF0ZTogQXV0aEZvcm1TdGF0ZSxcbiAgZm9ybURhdGE6IEZvcm1EYXRhXG4pOiBQcm9taXNlPEF1dGhGb3JtU3RhdGU+IHtcbiAgY29uc3QgcmF3RGF0YSA9IHtcbiAgICBlbWFpbDogZm9ybURhdGEuZ2V0KCdlbWFpbCcpLFxuICB9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IFJlc2V0UGFzc3dvcmRTY2hlbWEuc2FmZVBhcnNlKHJhd0RhdGEpO1xuXG4gIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZXJyb3JzOiByZXN1bHQuZXJyb3IuZmxhdHRlbigpLmZpZWxkRXJyb3JzLFxuICAgIH07XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IGF1dGgucmVzZXRQYXNzd29yZEZvckVtYWlsKHJlc3VsdC5kYXRhLmVtYWlsLCB7XG4gICAgICByZWRpcmVjdFRvOiBgJHtwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TSVRFX1VSTH0vYXV0aC91cGRhdGUtcGFzc3dvcmRgLFxuICAgIH0pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcnM6IHtcbiAgICAgICAgICBfZm9ybTogW2Vycm9yLm1lc3NhZ2VdLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIG1lc3NhZ2U6ICdQYXNzd29yZCByZXNldCBlbWFpbCBzZW50ISBDaGVjayB5b3VyIGluYm94IGZvciBpbnN0cnVjdGlvbnMuJyxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdGYWlsZWQgdG8gc2VuZCByZXNldCBlbWFpbCc7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczoge1xuICAgICAgICBfZm9ybTogW21lc3NhZ2VdLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGRhdGVQYXNzd29yZEFjdGlvbihcbiAgcHJldlN0YXRlOiBBdXRoRm9ybVN0YXRlLFxuICBmb3JtRGF0YTogRm9ybURhdGFcbik6IFByb21pc2U8QXV0aEZvcm1TdGF0ZT4ge1xuICBjb25zdCByYXdEYXRhID0ge1xuICAgIHBhc3N3b3JkOiBmb3JtRGF0YS5nZXQoJ3Bhc3N3b3JkJyksXG4gICAgY29uZmlybVBhc3N3b3JkOiBmb3JtRGF0YS5nZXQoJ2NvbmZpcm1QYXNzd29yZCcpLFxuICB9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IFVwZGF0ZVBhc3N3b3JkU2NoZW1hLnNhZmVQYXJzZShyYXdEYXRhKTtcblxuICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogcmVzdWx0LmVycm9yLmZsYXR0ZW4oKS5maWVsZEVycm9ycyxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBhdXRoLnVwZGF0ZVVzZXIoe1xuICAgICAgcGFzc3dvcmQ6IHJlc3VsdC5kYXRhLnBhc3N3b3JkLFxuICAgIH0pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcnM6IHtcbiAgICAgICAgICBfZm9ybTogW2Vycm9yLm1lc3NhZ2VdLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBSZXZhbGlkYXRlIHVzZXIgZGF0YVxuICAgIHJldmFsaWRhdGVUYWcoJ3VzZXInKTtcbiAgICBcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIG1lc3NhZ2U6ICdQYXNzd29yZCB1cGRhdGVkIHN1Y2Nlc3NmdWxseSEnLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ0ZhaWxlZCB0byB1cGRhdGUgcGFzc3dvcmQnO1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgX2Zvcm06IFttZXNzYWdlXSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG4vLyBTZXJ2ZXItc2lkZSBhdXRoIGhlbHBlcnNcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDdXJyZW50VXNlcigpOiBQcm9taXNlPEF1dGhVc2VyIHwgbnVsbD4ge1xuICB0cnkge1xuICAgIGNvbnN0IHsgZGF0YTogeyB1c2VyIH0gfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIFxuICAgIGlmICghdXNlcikgcmV0dXJuIG51bGw7XG5cbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHVzZXIuaWQsXG4gICAgICBlbWFpbDogdXNlci5lbWFpbCEsXG4gICAgICBuYW1lOiB1c2VyLnVzZXJfbWV0YWRhdGE/LmZ1bGxfbmFtZSB8fCB1c2VyLmVtYWlsISxcbiAgICAgIGF2YXRhcl91cmw6IHVzZXIudXNlcl9tZXRhZGF0YT8uYXZhdGFyX3VybCxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBjdXJyZW50IHVzZXIgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXF1aXJlQXV0aCgpOiBQcm9taXNlPEF1dGhVc2VyPiB7XG4gIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRDdXJyZW50VXNlcigpO1xuICBcbiAgaWYgKCF1c2VyKSB7XG4gICAgcmVkaXJlY3QoJy9sb2dpbicpO1xuICB9XG4gIFxuICByZXR1cm4gdXNlcjtcbn1cblxuLy8gT0F1dGggYWN0aW9uc1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNpZ25JbldpdGhHb29nbGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gIC8vIENvbnN0cnVjdCB0aGUgcmVkaXJlY3QgVVJMLCBmYWxsYmFjayB0byBsb2NhbGhvc3QgZm9yIGRldmVsb3BtZW50XG4gIGNvbnN0IHNpdGVVcmwgPSBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TSVRFX1VSTCB8fCBcbiAgICAgICAgICAgICAgICAgIHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX0FQUF9VUkwgfHwgXG4gICAgICAgICAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDozMDAwJztcbiAgY29uc3QgcmVkaXJlY3RUbyA9IGAke3NpdGVVcmx9L2F1dGgvY2FsbGJhY2tgO1xuICBcbiAgY29uc29sZS5sb2coJ1tPQXV0aCBEZWJ1Z10gSW5pdGlhdGluZyBHb29nbGUgc2lnbi1pbiB3aXRoIHJlZGlyZWN0IHRvOicsIHJlZGlyZWN0VG8pO1xuICBcbiAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYXV0aC5zaWduSW5XaXRoT0F1dGgoe1xuICAgIHByb3ZpZGVyOiAnZ29vZ2xlJyxcbiAgICBvcHRpb25zOiB7XG4gICAgICByZWRpcmVjdFRvLFxuICAgICAgcXVlcnlQYXJhbXM6IHtcbiAgICAgICAgYWNjZXNzX3R5cGU6ICdvZmZsaW5lJyxcbiAgICAgICAgcHJvbXB0OiAnY29uc2VudCcsXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuXG4gIGlmIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tPQXV0aCBFcnJvcl0gR29vZ2xlIHNpZ24taW4gZmFpbGVkOicsIGVycm9yKTtcbiAgICAvLyBUcmFjayBmYWlsZWQgT0F1dGggYXR0ZW1wdFxuICAgIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX29hdXRoX2ZhaWxlZCcsIHVuZGVmaW5lZCwge1xuICAgICAgcHJvdmlkZXI6ICdnb29nbGUnLFxuICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgIG1ldGhvZDogJ29hdXRoJyxcbiAgICB9KTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBzaWduIGluIHdpdGggR29vZ2xlLiBQbGVhc2UgdHJ5IGFnYWluIG9yIGNvbnRhY3Qgc3VwcG9ydCBpZiB0aGUgaXNzdWUgcGVyc2lzdHMuJyk7XG4gIH1cblxuICAvLyBUcmFjayBPQXV0aCBpbml0aWF0aW9uXG4gIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX29hdXRoX2luaXRpYXRlZCcsIHVuZGVmaW5lZCwge1xuICAgIHByb3ZpZGVyOiAnZ29vZ2xlJyxcbiAgICBtZXRob2Q6ICdvYXV0aCcsXG4gICAgcmVkaXJlY3RfdXJsOiBkYXRhLnVybCxcbiAgfSk7XG5cbiAgaWYgKGRhdGEudXJsKSB7XG4gICAgY29uc29sZS5sb2coJ1tPQXV0aCBEZWJ1Z10gUmVkaXJlY3RpbmcgdG8gR29vZ2xlIE9BdXRoIFVSTDonLCBkYXRhLnVybCk7XG4gICAgcmVkaXJlY3QoZGF0YS51cmwpO1xuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tPQXV0aCBFcnJvcl0gTm8gcmVkaXJlY3QgVVJMIHJlY2VpdmVkIGZyb20gU3VwYWJhc2UnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0F1dGhlbnRpY2F0aW9uIHNlcnZpY2UgdGVtcG9yYXJpbHkgdW5hdmFpbGFibGUuIFBsZWFzZSB0cnkgYWdhaW4gaW4gYSBmZXcgbW9tZW50cy4nKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2lnbkluV2l0aEdpdEh1YigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgLy8gQ29uc3RydWN0IHRoZSByZWRpcmVjdCBVUkwsIGZhbGxiYWNrIHRvIGxvY2FsaG9zdCBmb3IgZGV2ZWxvcG1lbnRcbiAgY29uc3Qgc2l0ZVVybCA9IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NJVEVfVVJMIHx8IFxuICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfQVBQX1VSTCB8fCBcbiAgICAgICAgICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAnO1xuICBjb25zdCByZWRpcmVjdFRvID0gYCR7c2l0ZVVybH0vYXV0aC9jYWxsYmFja2A7XG4gIFxuICBjb25zb2xlLmxvZygnW09BdXRoIERlYnVnXSBJbml0aWF0aW5nIEdpdEh1YiBzaWduLWluIHdpdGggcmVkaXJlY3QgdG86JywgcmVkaXJlY3RUbyk7XG4gIFxuICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhdXRoLnNpZ25JbldpdGhPQXV0aCh7XG4gICAgcHJvdmlkZXI6ICdnaXRodWInLFxuICAgIG9wdGlvbnM6IHtcbiAgICAgIHJlZGlyZWN0VG8sXG4gICAgfSxcbiAgfSk7XG5cbiAgaWYgKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignW09BdXRoIEVycm9yXSBHaXRIdWIgc2lnbi1pbiBmYWlsZWQ6JywgZXJyb3IpO1xuICAgIC8vIFRyYWNrIGZhaWxlZCBPQXV0aCBhdHRlbXB0XG4gICAgYXdhaXQgdHJhY2tTZXJ2ZXJTaWRlRXZlbnQoJ3VzZXJfb2F1dGhfZmFpbGVkJywgdW5kZWZpbmVkLCB7XG4gICAgICBwcm92aWRlcjogJ2dpdGh1YicsXG4gICAgICBlcnJvcl9tZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgbWV0aG9kOiAnb2F1dGgnLFxuICAgIH0pO1xuICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIHNpZ24gaW4gd2l0aCBHaXRIdWIuIFBsZWFzZSB0cnkgYWdhaW4gb3IgY29udGFjdCBzdXBwb3J0IGlmIHRoZSBpc3N1ZSBwZXJzaXN0cy4nKTtcbiAgfVxuXG4gIC8vIFRyYWNrIE9BdXRoIGluaXRpYXRpb25cbiAgYXdhaXQgdHJhY2tTZXJ2ZXJTaWRlRXZlbnQoJ3VzZXJfb2F1dGhfaW5pdGlhdGVkJywgdW5kZWZpbmVkLCB7XG4gICAgcHJvdmlkZXI6ICdnaXRodWInLFxuICAgIG1ldGhvZDogJ29hdXRoJyxcbiAgICByZWRpcmVjdF91cmw6IGRhdGEudXJsLFxuICB9KTtcblxuICBpZiAoZGF0YS51cmwpIHtcbiAgICBjb25zb2xlLmxvZygnW09BdXRoIERlYnVnXSBSZWRpcmVjdGluZyB0byBHaXRIdWIgT0F1dGggVVJMOicsIGRhdGEudXJsKTtcbiAgICByZWRpcmVjdChkYXRhLnVybCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc29sZS5lcnJvcignW09BdXRoIEVycm9yXSBObyByZWRpcmVjdCBVUkwgcmVjZWl2ZWQgZnJvbSBTdXBhYmFzZScpO1xuICAgIHRocm93IG5ldyBFcnJvcignQXV0aGVudGljYXRpb24gc2VydmljZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZS4gUGxlYXNlIHRyeSBhZ2FpbiBpbiBhIGZldyBtb21lbnRzLicpO1xuICB9XG59Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJ1VEFxV3NCIn0=
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/actions/data:4c430d [app-client] (ecmascript) <text/javascript>": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/* __next_internal_action_entry_do_not_use__ [{"00bb70007f6623d69d6022c651b1464c3980bc081a":"signInWithGitHub"},"apps/frontend/src/lib/actions/auth-actions.ts",""] */ __turbopack_context__.s({
    "signInWithGitHub": ()=>signInWithGitHub
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var signInWithGitHub = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("00bb70007f6623d69d6022c651b1464c3980bc081a", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "signInWithGitHub"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYXV0aC1hY3Rpb25zLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJztcblxuaW1wb3J0IHsgcmV2YWxpZGF0ZVRhZyB9IGZyb20gJ25leHQvY2FjaGUnO1xuaW1wb3J0IHsgcmVkaXJlY3QgfSBmcm9tICduZXh0L25hdmlnYXRpb24nO1xuaW1wb3J0IHsgeiB9IGZyb20gJ3pvZCc7XG5pbXBvcnQgeyBhdXRoLCBzdXBhYmFzZSB9IGZyb20gJ0AvbGliL3N1cGFiYXNlJztcbmltcG9ydCB0eXBlIHsgQXV0aFVzZXIgfSBmcm9tICdAL2xpYi9zdXBhYmFzZSc7XG5pbXBvcnQgeyB0cmFja1NlcnZlclNpZGVFdmVudCB9IGZyb20gJ0AvbGliL2FuYWx5dGljcy9wb3N0aG9nLXNlcnZlcic7XG5pbXBvcnQgeyBjb21tb25WYWxpZGF0aW9ucyB9IGZyb20gJ0AvbGliL3ZhbGlkYXRpb24vc2NoZW1hcyc7XG5cbi8vIEF1dGggZm9ybSBzY2hlbWFzIHVzaW5nIGNvbnNvbGlkYXRlZCB2YWxpZGF0aW9uc1xuY29uc3QgTG9naW5TY2hlbWEgPSB6Lm9iamVjdCh7XG4gIGVtYWlsOiBjb21tb25WYWxpZGF0aW9ucy5lbWFpbCxcbiAgcGFzc3dvcmQ6IHouc3RyaW5nKCkubWluKDYsICdQYXNzd29yZCBtdXN0IGJlIGF0IGxlYXN0IDYgY2hhcmFjdGVycycpLFxufSk7XG5cbmNvbnN0IFNpZ251cFNjaGVtYSA9IHoub2JqZWN0KHtcbiAgZW1haWw6IGNvbW1vblZhbGlkYXRpb25zLmVtYWlsLFxuICBwYXNzd29yZDogei5zdHJpbmcoKS5taW4oOCwgJ1Bhc3N3b3JkIG11c3QgYmUgYXQgbGVhc3QgOCBjaGFyYWN0ZXJzJyksXG4gIGNvbmZpcm1QYXNzd29yZDogei5zdHJpbmcoKS5taW4oOCwgJ1Bhc3N3b3JkIG11c3QgYmUgYXQgbGVhc3QgOCBjaGFyYWN0ZXJzJyksXG4gIGZ1bGxOYW1lOiBjb21tb25WYWxpZGF0aW9ucy5uYW1lLFxuICBjb21wYW55TmFtZTogY29tbW9uVmFsaWRhdGlvbnMub3B0aW9uYWxTdHJpbmcsXG59KS5yZWZpbmUoKGRhdGEpID0+IGRhdGEucGFzc3dvcmQgPT09IGRhdGEuY29uZmlybVBhc3N3b3JkLCB7XG4gIG1lc3NhZ2U6IFwiUGFzc3dvcmRzIGRvbid0IG1hdGNoXCIsXG4gIHBhdGg6IFtcImNvbmZpcm1QYXNzd29yZFwiXSxcbn0pO1xuXG5jb25zdCBSZXNldFBhc3N3b3JkU2NoZW1hID0gei5vYmplY3Qoe1xuICBlbWFpbDogY29tbW9uVmFsaWRhdGlvbnMuZW1haWwsXG59KTtcblxuY29uc3QgVXBkYXRlUGFzc3dvcmRTY2hlbWEgPSB6Lm9iamVjdCh7XG4gIHBhc3N3b3JkOiB6LnN0cmluZygpLm1pbig4LCAnUGFzc3dvcmQgbXVzdCBiZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnMnKSxcbiAgY29uZmlybVBhc3N3b3JkOiB6LnN0cmluZygpLm1pbig4LCAnUGFzc3dvcmQgbXVzdCBiZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnMnKSxcbn0pLnJlZmluZSgoZGF0YSkgPT4gZGF0YS5wYXNzd29yZCA9PT0gZGF0YS5jb25maXJtUGFzc3dvcmQsIHtcbiAgbWVzc2FnZTogXCJQYXNzd29yZHMgZG9uJ3QgbWF0Y2hcIixcbiAgcGF0aDogW1wiY29uZmlybVBhc3N3b3JkXCJdLFxufSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXV0aEZvcm1TdGF0ZSB7XG4gIGVycm9ycz86IHtcbiAgICBlbWFpbD86IHN0cmluZ1tdO1xuICAgIHBhc3N3b3JkPzogc3RyaW5nW107XG4gICAgY29uZmlybVBhc3N3b3JkPzogc3RyaW5nW107XG4gICAgZnVsbE5hbWU/OiBzdHJpbmdbXTtcbiAgICBjb21wYW55TmFtZT86IHN0cmluZ1tdO1xuICAgIF9mb3JtPzogc3RyaW5nW107XG4gIH07XG4gIHN1Y2Nlc3M/OiBib29sZWFuO1xuICBtZXNzYWdlPzogc3RyaW5nO1xuICBkYXRhPzoge1xuICAgIHVzZXI/OiB7XG4gICAgICBpZDogc3RyaW5nO1xuICAgICAgZW1haWw6IHN0cmluZztcbiAgICAgIG5hbWU/OiBzdHJpbmc7XG4gICAgfTtcbiAgICBzZXNzaW9uPzoge1xuICAgICAgYWNjZXNzX3Rva2VuOiBzdHJpbmc7XG4gICAgICByZWZyZXNoX3Rva2VuOiBzdHJpbmc7XG4gICAgfTtcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvZ2luQWN0aW9uKFxuICBwcmV2U3RhdGU6IEF1dGhGb3JtU3RhdGUsXG4gIGZvcm1EYXRhOiBGb3JtRGF0YVxuKTogUHJvbWlzZTxBdXRoRm9ybVN0YXRlPiB7XG4gIGNvbnN0IHJhd0RhdGEgPSB7XG4gICAgZW1haWw6IGZvcm1EYXRhLmdldCgnZW1haWwnKSxcbiAgICBwYXNzd29yZDogZm9ybURhdGEuZ2V0KCdwYXNzd29yZCcpLFxuICB9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IExvZ2luU2NoZW1hLnNhZmVQYXJzZShyYXdEYXRhKTtcblxuICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogcmVzdWx0LmVycm9yLmZsYXR0ZW4oKS5maWVsZEVycm9ycyxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhdXRoLnNpZ25JbldpdGhQYXNzd29yZCh7XG4gICAgICBlbWFpbDogcmVzdWx0LmRhdGEuZW1haWwsXG4gICAgICBwYXNzd29yZDogcmVzdWx0LmRhdGEucGFzc3dvcmQsXG4gICAgfSk7XG5cbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIC8vIFRyYWNrIGZhaWxlZCBsb2dpbiBhdHRlbXB0XG4gICAgICBhd2FpdCB0cmFja1NlcnZlclNpZGVFdmVudCgndXNlcl9sb2dpbl9mYWlsZWQnLCB1bmRlZmluZWQsIHtcbiAgICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgZW1haWxfZG9tYWluOiByZXN1bHQuZGF0YS5lbWFpbC5zcGxpdCgnQCcpWzFdLFxuICAgICAgICBtZXRob2Q6ICdlbWFpbCcsXG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZXJyb3JzOiB7XG4gICAgICAgICAgX2Zvcm06IFtlcnJvci5tZXNzYWdlXSxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gVHJhY2sgc3VjY2Vzc2Z1bCBsb2dpblxuICAgIGlmIChkYXRhLnVzZXIpIHtcbiAgICAgIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX3NpZ25lZF9pbicsIGRhdGEudXNlci5pZCwge1xuICAgICAgICBtZXRob2Q6ICdlbWFpbCcsXG4gICAgICAgIGVtYWlsOiBkYXRhLnVzZXIuZW1haWwsXG4gICAgICAgIHVzZXJfaWQ6IGRhdGEudXNlci5pZCxcbiAgICAgICAgc2Vzc2lvbl9pZDogZGF0YS5zZXNzaW9uPy5hY2Nlc3NfdG9rZW4/LnNsaWNlKC04KSwgLy8gTGFzdCA4IGNoYXJzIGZvciBpZGVudGlmaWNhdGlvblxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gUmV2YWxpZGF0ZSBhdXRoLXJlbGF0ZWQgY2FjaGVzXG4gICAgcmV2YWxpZGF0ZVRhZygndXNlcicpO1xuICAgIHJldmFsaWRhdGVUYWcoJ3Nlc3Npb24nKTtcbiAgICBcbiAgICAvLyBSZWRpcmVjdCB0byBkYXNoYm9hcmRcbiAgICByZWRpcmVjdCgnL2Rhc2hib2FyZCcpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdMb2dpbiBmYWlsZWQnO1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgX2Zvcm06IFttZXNzYWdlXSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2lnbnVwQWN0aW9uKFxuICBwcmV2U3RhdGU6IEF1dGhGb3JtU3RhdGUsXG4gIGZvcm1EYXRhOiBGb3JtRGF0YVxuKTogUHJvbWlzZTxBdXRoRm9ybVN0YXRlPiB7XG4gIGNvbnN0IHJhd0RhdGEgPSB7XG4gICAgZW1haWw6IGZvcm1EYXRhLmdldCgnZW1haWwnKSxcbiAgICBwYXNzd29yZDogZm9ybURhdGEuZ2V0KCdwYXNzd29yZCcpLFxuICAgIGNvbmZpcm1QYXNzd29yZDogZm9ybURhdGEuZ2V0KCdjb25maXJtUGFzc3dvcmQnKSxcbiAgICBmdWxsTmFtZTogZm9ybURhdGEuZ2V0KCdmdWxsTmFtZScpLFxuICAgIGNvbXBhbnlOYW1lOiBmb3JtRGF0YS5nZXQoJ2NvbXBhbnlOYW1lJyksXG4gIH07XG5cbiAgY29uc3QgcmVzdWx0ID0gU2lnbnVwU2NoZW1hLnNhZmVQYXJzZShyYXdEYXRhKTtcblxuICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogcmVzdWx0LmVycm9yLmZsYXR0ZW4oKS5maWVsZEVycm9ycyxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhdXRoLnNpZ25VcCh7XG4gICAgICBlbWFpbDogcmVzdWx0LmRhdGEuZW1haWwsXG4gICAgICBwYXNzd29yZDogcmVzdWx0LmRhdGEucGFzc3dvcmQsXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBmdWxsX25hbWU6IHJlc3VsdC5kYXRhLmZ1bGxOYW1lLFxuICAgICAgICAgIGNvbXBhbnlfbmFtZTogcmVzdWx0LmRhdGEuY29tcGFueU5hbWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICAvLyBUcmFjayBmYWlsZWQgc2lnbnVwIGF0dGVtcHRcbiAgICAgIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX3NpZ251cF9mYWlsZWQnLCB1bmRlZmluZWQsIHtcbiAgICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgZW1haWxfZG9tYWluOiByZXN1bHQuZGF0YS5lbWFpbC5zcGxpdCgnQCcpWzFdLFxuICAgICAgICBoYXNfY29tcGFueV9uYW1lOiAhIXJlc3VsdC5kYXRhLmNvbXBhbnlOYW1lLFxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGVycm9yczoge1xuICAgICAgICAgIF9mb3JtOiBbZXJyb3IubWVzc2FnZV0sXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFRyYWNrIHN1Y2Nlc3NmdWwgc2lnbnVwXG4gICAgaWYgKGRhdGEudXNlcikge1xuICAgICAgYXdhaXQgdHJhY2tTZXJ2ZXJTaWRlRXZlbnQoJ3VzZXJfc2lnbmVkX3VwJywgZGF0YS51c2VyLmlkLCB7XG4gICAgICAgIG1ldGhvZDogJ2VtYWlsJyxcbiAgICAgICAgZW1haWw6IGRhdGEudXNlci5lbWFpbCxcbiAgICAgICAgdXNlcl9pZDogZGF0YS51c2VyLmlkLFxuICAgICAgICBoYXNfY29tcGFueV9uYW1lOiAhIXJlc3VsdC5kYXRhLmNvbXBhbnlOYW1lLFxuICAgICAgICBmdWxsX25hbWU6IHJlc3VsdC5kYXRhLmZ1bGxOYW1lLFxuICAgICAgICBuZWVkc19lbWFpbF92ZXJpZmljYXRpb246ICFkYXRhLnVzZXIuZW1haWxfY29uZmlybWVkX2F0LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBtZXNzYWdlOiAnQWNjb3VudCBjcmVhdGVkISBQbGVhc2UgY2hlY2sgeW91ciBlbWFpbCB0byB2ZXJpZnkgeW91ciBhY2NvdW50LicsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnU2lnbnVwIGZhaWxlZCc7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczoge1xuICAgICAgICBfZm9ybTogW21lc3NhZ2VdLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2dvdXRBY3Rpb24oKTogUHJvbWlzZTxBdXRoRm9ybVN0YXRlPiB7XG4gIHRyeSB7XG4gICAgLy8gR2V0IGN1cnJlbnQgdXNlciBmb3IgdHJhY2tpbmcgYmVmb3JlIGxvZ291dFxuICAgIGNvbnN0IHsgZGF0YTogeyB1c2VyIH0gfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIFxuICAgIGF3YWl0IGF1dGguc2lnbk91dCgpO1xuICAgIFxuICAgIC8vIFRyYWNrIGxvZ291dCBldmVudFxuICAgIGlmICh1c2VyKSB7XG4gICAgICBhd2FpdCB0cmFja1NlcnZlclNpZGVFdmVudCgndXNlcl9zaWduZWRfb3V0JywgdXNlci5pZCwge1xuICAgICAgICB1c2VyX2lkOiB1c2VyLmlkLFxuICAgICAgICBlbWFpbDogdXNlci5lbWFpbCxcbiAgICAgICAgbG9nb3V0X21ldGhvZDogJ21hbnVhbCcsXG4gICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2xlYXIgYWxsIGNhY2hlZCBkYXRhXG4gICAgcmV2YWxpZGF0ZVRhZygndXNlcicpO1xuICAgIHJldmFsaWRhdGVUYWcoJ3Nlc3Npb24nKTtcbiAgICByZXZhbGlkYXRlVGFnKCdwcm9wZXJ0aWVzJyk7XG4gICAgcmV2YWxpZGF0ZVRhZygndGVuYW50cycpO1xuICAgIHJldmFsaWRhdGVUYWcoJ2xlYXNlcycpO1xuICAgIHJldmFsaWRhdGVUYWcoJ21haW50ZW5hbmNlJyk7XG4gICAgXG4gICAgLy8gUmVkaXJlY3QgdG8gaG9tZSBwYWdlXG4gICAgcmVkaXJlY3QoJy8nKTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcic7XG4gICAgY29uc29sZS5lcnJvcignTG9nb3V0IGVycm9yOicsIG1lc3NhZ2UpO1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgX2Zvcm06IFttZXNzYWdlXSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZm9yZ290UGFzc3dvcmRBY3Rpb24oXG4gIHByZXZTdGF0ZTogQXV0aEZvcm1TdGF0ZSxcbiAgZm9ybURhdGE6IEZvcm1EYXRhXG4pOiBQcm9taXNlPEF1dGhGb3JtU3RhdGU+IHtcbiAgY29uc3QgcmF3RGF0YSA9IHtcbiAgICBlbWFpbDogZm9ybURhdGEuZ2V0KCdlbWFpbCcpLFxuICB9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IFJlc2V0UGFzc3dvcmRTY2hlbWEuc2FmZVBhcnNlKHJhd0RhdGEpO1xuXG4gIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZXJyb3JzOiByZXN1bHQuZXJyb3IuZmxhdHRlbigpLmZpZWxkRXJyb3JzLFxuICAgIH07XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IGF1dGgucmVzZXRQYXNzd29yZEZvckVtYWlsKHJlc3VsdC5kYXRhLmVtYWlsLCB7XG4gICAgICByZWRpcmVjdFRvOiBgJHtwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TSVRFX1VSTH0vYXV0aC91cGRhdGUtcGFzc3dvcmRgLFxuICAgIH0pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcnM6IHtcbiAgICAgICAgICBfZm9ybTogW2Vycm9yLm1lc3NhZ2VdLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIG1lc3NhZ2U6ICdQYXNzd29yZCByZXNldCBlbWFpbCBzZW50ISBDaGVjayB5b3VyIGluYm94IGZvciBpbnN0cnVjdGlvbnMuJyxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdGYWlsZWQgdG8gc2VuZCByZXNldCBlbWFpbCc7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczoge1xuICAgICAgICBfZm9ybTogW21lc3NhZ2VdLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGRhdGVQYXNzd29yZEFjdGlvbihcbiAgcHJldlN0YXRlOiBBdXRoRm9ybVN0YXRlLFxuICBmb3JtRGF0YTogRm9ybURhdGFcbik6IFByb21pc2U8QXV0aEZvcm1TdGF0ZT4ge1xuICBjb25zdCByYXdEYXRhID0ge1xuICAgIHBhc3N3b3JkOiBmb3JtRGF0YS5nZXQoJ3Bhc3N3b3JkJyksXG4gICAgY29uZmlybVBhc3N3b3JkOiBmb3JtRGF0YS5nZXQoJ2NvbmZpcm1QYXNzd29yZCcpLFxuICB9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IFVwZGF0ZVBhc3N3b3JkU2NoZW1hLnNhZmVQYXJzZShyYXdEYXRhKTtcblxuICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogcmVzdWx0LmVycm9yLmZsYXR0ZW4oKS5maWVsZEVycm9ycyxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBhdXRoLnVwZGF0ZVVzZXIoe1xuICAgICAgcGFzc3dvcmQ6IHJlc3VsdC5kYXRhLnBhc3N3b3JkLFxuICAgIH0pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcnM6IHtcbiAgICAgICAgICBfZm9ybTogW2Vycm9yLm1lc3NhZ2VdLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBSZXZhbGlkYXRlIHVzZXIgZGF0YVxuICAgIHJldmFsaWRhdGVUYWcoJ3VzZXInKTtcbiAgICBcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIG1lc3NhZ2U6ICdQYXNzd29yZCB1cGRhdGVkIHN1Y2Nlc3NmdWxseSEnLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ0ZhaWxlZCB0byB1cGRhdGUgcGFzc3dvcmQnO1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgX2Zvcm06IFttZXNzYWdlXSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG4vLyBTZXJ2ZXItc2lkZSBhdXRoIGhlbHBlcnNcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDdXJyZW50VXNlcigpOiBQcm9taXNlPEF1dGhVc2VyIHwgbnVsbD4ge1xuICB0cnkge1xuICAgIGNvbnN0IHsgZGF0YTogeyB1c2VyIH0gfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIFxuICAgIGlmICghdXNlcikgcmV0dXJuIG51bGw7XG5cbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHVzZXIuaWQsXG4gICAgICBlbWFpbDogdXNlci5lbWFpbCEsXG4gICAgICBuYW1lOiB1c2VyLnVzZXJfbWV0YWRhdGE/LmZ1bGxfbmFtZSB8fCB1c2VyLmVtYWlsISxcbiAgICAgIGF2YXRhcl91cmw6IHVzZXIudXNlcl9tZXRhZGF0YT8uYXZhdGFyX3VybCxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBjdXJyZW50IHVzZXIgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXF1aXJlQXV0aCgpOiBQcm9taXNlPEF1dGhVc2VyPiB7XG4gIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRDdXJyZW50VXNlcigpO1xuICBcbiAgaWYgKCF1c2VyKSB7XG4gICAgcmVkaXJlY3QoJy9sb2dpbicpO1xuICB9XG4gIFxuICByZXR1cm4gdXNlcjtcbn1cblxuLy8gT0F1dGggYWN0aW9uc1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNpZ25JbldpdGhHb29nbGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gIC8vIENvbnN0cnVjdCB0aGUgcmVkaXJlY3QgVVJMLCBmYWxsYmFjayB0byBsb2NhbGhvc3QgZm9yIGRldmVsb3BtZW50XG4gIGNvbnN0IHNpdGVVcmwgPSBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TSVRFX1VSTCB8fCBcbiAgICAgICAgICAgICAgICAgIHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX0FQUF9VUkwgfHwgXG4gICAgICAgICAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDozMDAwJztcbiAgY29uc3QgcmVkaXJlY3RUbyA9IGAke3NpdGVVcmx9L2F1dGgvY2FsbGJhY2tgO1xuICBcbiAgY29uc29sZS5sb2coJ1tPQXV0aCBEZWJ1Z10gSW5pdGlhdGluZyBHb29nbGUgc2lnbi1pbiB3aXRoIHJlZGlyZWN0IHRvOicsIHJlZGlyZWN0VG8pO1xuICBcbiAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYXV0aC5zaWduSW5XaXRoT0F1dGgoe1xuICAgIHByb3ZpZGVyOiAnZ29vZ2xlJyxcbiAgICBvcHRpb25zOiB7XG4gICAgICByZWRpcmVjdFRvLFxuICAgICAgcXVlcnlQYXJhbXM6IHtcbiAgICAgICAgYWNjZXNzX3R5cGU6ICdvZmZsaW5lJyxcbiAgICAgICAgcHJvbXB0OiAnY29uc2VudCcsXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuXG4gIGlmIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tPQXV0aCBFcnJvcl0gR29vZ2xlIHNpZ24taW4gZmFpbGVkOicsIGVycm9yKTtcbiAgICAvLyBUcmFjayBmYWlsZWQgT0F1dGggYXR0ZW1wdFxuICAgIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX29hdXRoX2ZhaWxlZCcsIHVuZGVmaW5lZCwge1xuICAgICAgcHJvdmlkZXI6ICdnb29nbGUnLFxuICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgIG1ldGhvZDogJ29hdXRoJyxcbiAgICB9KTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBzaWduIGluIHdpdGggR29vZ2xlLiBQbGVhc2UgdHJ5IGFnYWluIG9yIGNvbnRhY3Qgc3VwcG9ydCBpZiB0aGUgaXNzdWUgcGVyc2lzdHMuJyk7XG4gIH1cblxuICAvLyBUcmFjayBPQXV0aCBpbml0aWF0aW9uXG4gIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX29hdXRoX2luaXRpYXRlZCcsIHVuZGVmaW5lZCwge1xuICAgIHByb3ZpZGVyOiAnZ29vZ2xlJyxcbiAgICBtZXRob2Q6ICdvYXV0aCcsXG4gICAgcmVkaXJlY3RfdXJsOiBkYXRhLnVybCxcbiAgfSk7XG5cbiAgaWYgKGRhdGEudXJsKSB7XG4gICAgY29uc29sZS5sb2coJ1tPQXV0aCBEZWJ1Z10gUmVkaXJlY3RpbmcgdG8gR29vZ2xlIE9BdXRoIFVSTDonLCBkYXRhLnVybCk7XG4gICAgcmVkaXJlY3QoZGF0YS51cmwpO1xuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tPQXV0aCBFcnJvcl0gTm8gcmVkaXJlY3QgVVJMIHJlY2VpdmVkIGZyb20gU3VwYWJhc2UnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0F1dGhlbnRpY2F0aW9uIHNlcnZpY2UgdGVtcG9yYXJpbHkgdW5hdmFpbGFibGUuIFBsZWFzZSB0cnkgYWdhaW4gaW4gYSBmZXcgbW9tZW50cy4nKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2lnbkluV2l0aEdpdEh1YigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgLy8gQ29uc3RydWN0IHRoZSByZWRpcmVjdCBVUkwsIGZhbGxiYWNrIHRvIGxvY2FsaG9zdCBmb3IgZGV2ZWxvcG1lbnRcbiAgY29uc3Qgc2l0ZVVybCA9IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NJVEVfVVJMIHx8IFxuICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfQVBQX1VSTCB8fCBcbiAgICAgICAgICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAnO1xuICBjb25zdCByZWRpcmVjdFRvID0gYCR7c2l0ZVVybH0vYXV0aC9jYWxsYmFja2A7XG4gIFxuICBjb25zb2xlLmxvZygnW09BdXRoIERlYnVnXSBJbml0aWF0aW5nIEdpdEh1YiBzaWduLWluIHdpdGggcmVkaXJlY3QgdG86JywgcmVkaXJlY3RUbyk7XG4gIFxuICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhdXRoLnNpZ25JbldpdGhPQXV0aCh7XG4gICAgcHJvdmlkZXI6ICdnaXRodWInLFxuICAgIG9wdGlvbnM6IHtcbiAgICAgIHJlZGlyZWN0VG8sXG4gICAgfSxcbiAgfSk7XG5cbiAgaWYgKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignW09BdXRoIEVycm9yXSBHaXRIdWIgc2lnbi1pbiBmYWlsZWQ6JywgZXJyb3IpO1xuICAgIC8vIFRyYWNrIGZhaWxlZCBPQXV0aCBhdHRlbXB0XG4gICAgYXdhaXQgdHJhY2tTZXJ2ZXJTaWRlRXZlbnQoJ3VzZXJfb2F1dGhfZmFpbGVkJywgdW5kZWZpbmVkLCB7XG4gICAgICBwcm92aWRlcjogJ2dpdGh1YicsXG4gICAgICBlcnJvcl9tZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgbWV0aG9kOiAnb2F1dGgnLFxuICAgIH0pO1xuICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIHNpZ24gaW4gd2l0aCBHaXRIdWIuIFBsZWFzZSB0cnkgYWdhaW4gb3IgY29udGFjdCBzdXBwb3J0IGlmIHRoZSBpc3N1ZSBwZXJzaXN0cy4nKTtcbiAgfVxuXG4gIC8vIFRyYWNrIE9BdXRoIGluaXRpYXRpb25cbiAgYXdhaXQgdHJhY2tTZXJ2ZXJTaWRlRXZlbnQoJ3VzZXJfb2F1dGhfaW5pdGlhdGVkJywgdW5kZWZpbmVkLCB7XG4gICAgcHJvdmlkZXI6ICdnaXRodWInLFxuICAgIG1ldGhvZDogJ29hdXRoJyxcbiAgICByZWRpcmVjdF91cmw6IGRhdGEudXJsLFxuICB9KTtcblxuICBpZiAoZGF0YS51cmwpIHtcbiAgICBjb25zb2xlLmxvZygnW09BdXRoIERlYnVnXSBSZWRpcmVjdGluZyB0byBHaXRIdWIgT0F1dGggVVJMOicsIGRhdGEudXJsKTtcbiAgICByZWRpcmVjdChkYXRhLnVybCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc29sZS5lcnJvcignW09BdXRoIEVycm9yXSBObyByZWRpcmVjdCBVUkwgcmVjZWl2ZWQgZnJvbSBTdXBhYmFzZScpO1xuICAgIHRocm93IG5ldyBFcnJvcignQXV0aGVudGljYXRpb24gc2VydmljZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZS4gUGxlYXNlIHRyeSBhZ2FpbiBpbiBhIGZldyBtb21lbnRzLicpO1xuICB9XG59Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJ1VEFvWnNCIn0=
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/auth/oauth-providers.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "OAuthProviders": ()=>OAuthProviders
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$data$3a$c11f6c__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/actions/data:c11f6c [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$data$3a$4c430d__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/actions/data:4c430d [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
function OAuthProviders(param) {
    let { disabled = false } = param;
    _s();
    const [isGoogleLoading, setIsGoogleLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isGitHubLoading, setIsGitHubLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const handleGoogleLogin = async ()=>{
        if (disabled || isGoogleLoading) return;
        setIsGoogleLoading(true);
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$data$3a$c11f6c__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["signInWithGoogle"])();
        // Server action will redirect, no need for additional handling
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to sign in with Google';
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(message);
            setIsGoogleLoading(false);
        }
    };
    const handleGitHubLogin = async ()=>{
        if (disabled || isGitHubLoading) return;
        setIsGitHubLoading(true);
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$data$3a$4c430d__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["signInWithGitHub"])();
        // Server action will redirect, no need for additional handling
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to sign in with GitHub';
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(message);
            setIsGitHubLoading(false);
        }
    };
    const isLoading = isGoogleLoading || isGitHubLoading;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Button"], {
                type: "button",
                variant: "outline",
                className: "w-full h-12 text-sm font-medium hover:bg-gray-50 transition-colors",
                onClick: handleGoogleLogin,
                disabled: disabled || isLoading,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                        className: "mr-2 h-5 w-5",
                        viewBox: "0 0 24 24",
                        xmlns: "http://www.w3.org/2000/svg",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z",
                                fill: "#4285F4"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/oauth-providers.tsx",
                                lineNumber: 60,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z",
                                fill: "#34A853"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/oauth-providers.tsx",
                                lineNumber: 64,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z",
                                fill: "#FBBC05"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/oauth-providers.tsx",
                                lineNumber: 68,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z",
                                fill: "#EA4335"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/oauth-providers.tsx",
                                lineNumber: 72,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/frontend/src/components/auth/oauth-providers.tsx",
                        lineNumber: 55,
                        columnNumber: 9
                    }, this),
                    isGoogleLoading ? 'Connecting...' : 'Continue with Google'
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/auth/oauth-providers.tsx",
                lineNumber: 48,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Button"], {
                type: "button",
                variant: "outline",
                className: "w-full h-12 text-sm font-medium hover:bg-gray-50 transition-colors",
                onClick: handleGitHubLogin,
                disabled: disabled || isLoading,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
                        className: "mr-2 h-5 w-5",
                        fill: "currentColor",
                        viewBox: "0 0 20 20",
                        "aria-hidden": "true",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            fillRule: "evenodd",
                            d: "M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z",
                            clipRule: "evenodd"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/auth/oauth-providers.tsx",
                            lineNumber: 93,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/oauth-providers.tsx",
                        lineNumber: 87,
                        columnNumber: 9
                    }, this),
                    isGitHubLoading ? 'Connecting...' : 'Continue with GitHub'
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/auth/oauth-providers.tsx",
                lineNumber: 80,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/auth/oauth-providers.tsx",
        lineNumber: 47,
        columnNumber: 5
    }, this);
}
_s(OAuthProviders, "CH8+2szd+FdsdJCkq3Ai4SAiiig=");
_c = OAuthProviders;
var _c;
__turbopack_context__.k.register(_c, "OAuthProviders");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/auth/auth-error.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "AuthError": ()=>AuthError
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-client] (ecmascript) <export default as AlertCircle>");
;
;
function AuthError(param) {
    let { message, type = 'error' } = param;
    const bgClass = type === 'error' ? 'bg-destructive/10' : 'bg-yellow-50';
    const borderClass = type === 'error' ? 'border-destructive/20' : 'border-yellow-200';
    const textClass = type === 'error' ? 'text-destructive' : 'text-yellow-800';
    const iconClass = type === 'error' ? 'text-destructive' : 'text-yellow-600';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "".concat(bgClass, " ").concat(borderClass, " border rounded-md p-3"),
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center gap-2",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                    className: "h-4 w-4 ".concat(iconClass)
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/auth-error.tsx",
                    lineNumber: 17,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-sm ".concat(textClass),
                    children: message
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/auth-error.tsx",
                    lineNumber: 18,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/frontend/src/components/auth/auth-error.tsx",
            lineNumber: 16,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/auth/auth-error.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
_c = AuthError;
var _c;
__turbopack_context__.k.register(_c, "AuthError");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/auth/auth-form-factory.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Auth Form Factory - Refactored
 * 
 * Unified authentication form factory providing consistent UX across
 * login, signup, and forgot password forms.
 * 
 * Features:
 * - Consistent form structure and styling
 * - Centralized validation and error handling
 * - Built-in loading states and transitions
 * - Accessibility compliance
 * - OAuth integration support
 */ __turbopack_context__.s({
    "AuthFormFactory": ()=>AuthFormFactory
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check-big.js [app-client] (ecmascript) <export default as CheckCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-client] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/mail.js [app-client] (ecmascript) <export default as Mail>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/lock.js [app-client] (ecmascript) <export default as Lock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/eye.js [app-client] (ecmascript) <export default as Eye>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2d$off$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__EyeOff$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/eye-off.js [app-client] (ecmascript) <export default as EyeOff>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user.js [app-client] (ecmascript) <export default as User>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/shield.js [app-client] (ecmascript) <export default as Shield>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/zap.js [app-client] (ecmascript) <export default as Zap>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/users.js [app-client] (ecmascript) <export default as Users>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-left.js [app-client] (ecmascript) <export default as ArrowLeft>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$question$2d$mark$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__HelpCircle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-question-mark.js [app-client] (ecmascript) <export default as HelpCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/card.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/label.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$checkbox$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/checkbox.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$data$3a$af964d__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/actions/data:af964d [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$data$3a$bdfb83__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/actions/data:bdfb83 [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$data$3a$020aab__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/actions/data:020aab [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$auth$2f$oauth$2d$providers$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/auth/oauth-providers.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$auth$2f$auth$2d$error$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/auth/auth-error.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
;
;
;
;
;
// ============================================================================
// VALIDATION HELPERS
// ============================================================================
const _commonValidations = {
    required: (value, field)=>{
        return !(value === null || value === void 0 ? void 0 : value.trim()) ? "".concat(field, " is required") : undefined;
    },
    email: (value)=>{
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return value && !emailRegex.test(value) ? 'Please enter a valid email address' : undefined;
    },
    password: (value)=>{
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/(?=.*[a-z])(?=.*[A-Z])/.test(value)) {
            return 'Password must contain at least one uppercase and one lowercase letter';
        }
        if (!/(?=.*\d)/.test(value)) {
            return 'Password must contain at least one number';
        }
        return undefined;
    },
    confirmPassword: (password, confirmPassword)=>{
        if (!confirmPassword) return 'Please confirm your password';
        return password !== confirmPassword ? 'Passwords do not match' : undefined;
    },
    fullName: (value)=>{
        if (!(value === null || value === void 0 ? void 0 : value.trim())) return 'Full name is required';
        if (value.trim().length < 2) return 'Full name must be at least 2 characters';
        if (!/^[a-zA-Z\s]+$/.test(value.trim())) {
            return 'Full name can only contain letters and spaces';
        }
        return undefined;
    }
};
function FormField(param) {
    let { label, name, type = 'text', placeholder, required = false, error, disabled = false, className, icon: Icon } = param;
    _s();
    const [showPassword, setShowPassword] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const inputType = type === 'password' && showPassword ? 'text' : type;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-2",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                htmlFor: name,
                className: "text-sm font-medium",
                children: label
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                lineNumber: 123,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative",
                children: [
                    Icon && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                        className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 128,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                        id: name,
                        name: name,
                        type: inputType,
                        placeholder: placeholder,
                        required: required,
                        disabled: disabled,
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("h-12 text-base transition-all", Icon && "pl-10", type === 'password' && "pr-10", "focus:ring-2 focus:ring-primary/20", error && "border-destructive focus:ring-destructive/20", className),
                        "aria-invalid": error ? true : false,
                        "aria-describedby": error ? "".concat(name, "-error") : undefined
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 130,
                        columnNumber: 9
                    }, this),
                    type === 'password' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        onClick: ()=>setShowPassword(!showPassword),
                        className: "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",
                        disabled: disabled,
                        children: showPassword ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2d$off$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__EyeOff$3e$__["EyeOff"], {
                            className: "h-4 w-4"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                            lineNumber: 156,
                            columnNumber: 15
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                            className: "h-4 w-4"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                            lineNumber: 158,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 149,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                lineNumber: 126,
                columnNumber: 7
            }, this),
            error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                id: "".concat(name, "-error"),
                className: "text-sm text-destructive flex items-center gap-1 mt-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                        className: "h-3 w-3"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 165,
                        columnNumber: 11
                    }, this),
                    error
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                lineNumber: 164,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
        lineNumber: 122,
        columnNumber: 5
    }, this);
}
_s(FormField, "daguiRHWMFkqPgCh/ppD7CF5VuQ=");
_c = FormField;
// ============================================================================
// LOGIN FORM
// ============================================================================
function LoginFormFields(param) {
    let { state, isPending, redirectTo } = param;
    var _state_errors_email, _state_errors, _state_errors1, _state_errors2, _state_errors3, _state_errors4;
    _s1();
    const [rememberMe, setRememberMe] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            (redirectTo === null || redirectTo === void 0 ? void 0 : redirectTo.includes('emailConfirmed=true')) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"], {
                        className: "h-5 w-5 text-green-600"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 193,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-green-800",
                        children: "Email confirmed successfully! Please sign in to continue."
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 194,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                lineNumber: 192,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-5",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FormField, {
                        label: "Email address",
                        name: "email",
                        type: "email",
                        placeholder: "name@example.com",
                        required: true,
                        disabled: isPending,
                        error: (_state_errors = state.errors) === null || _state_errors === void 0 ? void 0 : (_state_errors_email = _state_errors.email) === null || _state_errors_email === void 0 ? void 0 : _state_errors_email[0],
                        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__["Mail"]
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 201,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                        htmlFor: "password",
                                        className: "text-sm font-medium",
                                        children: "Password"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                        lineNumber: 214,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        href: "/auth/forgot-password",
                                        className: "text-sm text-primary hover:text-primary/80 transition-colors",
                                        children: "Forgot password?"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                        lineNumber: 217,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                lineNumber: 213,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__["Lock"], {
                                        className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                        lineNumber: 225,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                        id: "password",
                                        name: "password",
                                        type: "password",
                                        placeholder: "Enter your password",
                                        required: true,
                                        disabled: isPending,
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("h-12 pl-10 pr-10 text-base transition-all", "focus:ring-2 focus:ring-primary/20", ((_state_errors1 = state.errors) === null || _state_errors1 === void 0 ? void 0 : _state_errors1.password) && "border-destructive focus:ring-destructive/20"),
                                        "aria-invalid": ((_state_errors2 = state.errors) === null || _state_errors2 === void 0 ? void 0 : _state_errors2.password) ? true : false,
                                        "aria-describedby": ((_state_errors3 = state.errors) === null || _state_errors3 === void 0 ? void 0 : _state_errors3.password) ? 'password-error' : undefined
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                        lineNumber: 226,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                lineNumber: 224,
                                columnNumber: 11
                            }, this),
                            ((_state_errors4 = state.errors) === null || _state_errors4 === void 0 ? void 0 : _state_errors4.password) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                id: "password-error",
                                className: "text-sm text-destructive flex items-center gap-1 mt-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                                        className: "h-3 w-3"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                        lineNumber: 244,
                                        columnNumber: 15
                                    }, this),
                                    state.errors.password[0]
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                lineNumber: 243,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 212,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center space-x-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$checkbox$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Checkbox"], {
                                id: "remember",
                                name: "rememberMe",
                                checked: rememberMe,
                                onCheckedChange: (checked)=>setRememberMe(checked),
                                disabled: isPending,
                                className: "h-4 w-4 rounded border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                lineNumber: 251,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                                htmlFor: "remember",
                                className: "text-sm font-normal text-gray-700 cursor-pointer select-none hover:text-gray-900",
                                children: "Remember me for 30 days"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                lineNumber: 259,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 250,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                        type: "hidden",
                        name: "redirectTo",
                        value: redirectTo
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 267,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                lineNumber: 200,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
_s1(LoginFormFields, "kKHdUR4WyhATZOzUGif6ikw3y64=");
_c1 = LoginFormFields;
// ============================================================================
// SIGNUP FORM
// ============================================================================
function SignupFormFields(param) {
    let { state, isPending, redirectTo } = param;
    var _state_errors_fullName, _state_errors, _state_errors_email, _state_errors1, _state_errors_password, _state_errors2, _state_errors_confirmPassword, _state_errors3;
    _s2();
    const [acceptTerms, setAcceptTerms] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-5",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FormField, {
                    label: "Full Name",
                    name: "fullName",
                    type: "text",
                    placeholder: "John Doe",
                    required: true,
                    disabled: isPending,
                    error: (_state_errors = state.errors) === null || _state_errors === void 0 ? void 0 : (_state_errors_fullName = _state_errors.fullName) === null || _state_errors_fullName === void 0 ? void 0 : _state_errors_fullName[0],
                    icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__["User"]
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                    lineNumber: 291,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FormField, {
                    label: "Email Address",
                    name: "email",
                    type: "email",
                    placeholder: "name@example.com",
                    required: true,
                    disabled: isPending,
                    error: (_state_errors1 = state.errors) === null || _state_errors1 === void 0 ? void 0 : (_state_errors_email = _state_errors1.email) === null || _state_errors_email === void 0 ? void 0 : _state_errors_email[0],
                    icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__["Mail"]
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                    lineNumber: 302,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FormField, {
                            label: "Password",
                            name: "password",
                            type: "password",
                            placeholder: "Create a secure password",
                            required: true,
                            disabled: isPending,
                            error: (_state_errors2 = state.errors) === null || _state_errors2 === void 0 ? void 0 : (_state_errors_password = _state_errors2.password) === null || _state_errors_password === void 0 ? void 0 : _state_errors_password[0],
                            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__["Lock"]
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                            lineNumber: 314,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "text-xs text-muted-foreground",
                            children: "Must be at least 8 characters with a mix of letters and numbers"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                            lineNumber: 324,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                    lineNumber: 313,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FormField, {
                    label: "Confirm Password",
                    name: "confirmPassword",
                    type: "password",
                    placeholder: "Confirm your password",
                    required: true,
                    disabled: isPending,
                    error: (_state_errors3 = state.errors) === null || _state_errors3 === void 0 ? void 0 : (_state_errors_confirmPassword = _state_errors3.confirmPassword) === null || _state_errors_confirmPassword === void 0 ? void 0 : _state_errors_confirmPassword[0],
                    icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__["Lock"]
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                    lineNumber: 329,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-start space-x-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$checkbox$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Checkbox"], {
                            id: "terms",
                            checked: acceptTerms,
                            onCheckedChange: (checked)=>setAcceptTerms(checked),
                            disabled: isPending,
                            className: "mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                            lineNumber: 342,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$label$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
                            htmlFor: "terms",
                            className: "text-sm font-normal cursor-pointer select-none leading-relaxed",
                            children: [
                                "I agree to the",
                                ' ',
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/terms",
                                    className: "text-primary hover:text-primary/80 underline",
                                    children: "Terms of Service"
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                    lineNumber: 354,
                                    columnNumber: 13
                                }, this),
                                ' ',
                                "and",
                                ' ',
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/privacy",
                                    className: "text-primary hover:text-primary/80 underline",
                                    children: "Privacy Policy"
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                    lineNumber: 358,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                            lineNumber: 349,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                    lineNumber: 341,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "hidden",
                    name: "redirectTo",
                    value: redirectTo
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                    lineNumber: 364,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "hidden",
                    name: "acceptTerms",
                    value: acceptTerms.toString()
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                    lineNumber: 365,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
            lineNumber: 290,
            columnNumber: 7
        }, this)
    }, void 0, false);
}
_s2(SignupFormFields, "OSO70lHNpAWKcsJ2BrYMH+o7u+o=");
_c2 = SignupFormFields;
// ============================================================================
// FORGOT PASSWORD FORM
// ============================================================================
function ForgotPasswordFormFields(param) {
    let { state, isPending } = param;
    var _state_errors_email, _state_errors;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-5",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(FormField, {
                label: "Email address",
                name: "email",
                type: "email",
                placeholder: "name@example.com",
                required: true,
                disabled: isPending,
                error: (_state_errors = state.errors) === null || _state_errors === void 0 ? void 0 : (_state_errors_email = _state_errors.email) === null || _state_errors_email === void 0 ? void 0 : _state_errors_email[0],
                icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__["Mail"]
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                lineNumber: 384,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-3 text-sm text-muted-foreground",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "flex items-start gap-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$question$2d$mark$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__HelpCircle$3e$__["HelpCircle"], {
                            className: "h-4 w-4 mt-0.5 flex-shrink-0"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                            lineNumber: 398,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "We'll send you an email with instructions to reset your password."
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                            lineNumber: 399,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                    lineNumber: 397,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                lineNumber: 396,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
        lineNumber: 383,
        columnNumber: 5
    }, this);
}
_c3 = ForgotPasswordFormFields;
// ============================================================================
// SUCCESS STATES
// ============================================================================
function SignupSuccess(param) {
    let { state } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
        className: "border-0 shadow-2xl bg-white/95 backdrop-blur-sm",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                className: "space-y-2 pb-8 text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"], {
                            className: "h-8 w-8 text-green-600"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                            lineNumber: 415,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 414,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                        className: "text-3xl font-bold",
                        children: "Check Your Email"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 417,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardDescription"], {
                        className: "text-base text-muted-foreground",
                        children: "We've sent you a verification link"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 418,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                lineNumber: 413,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                className: "space-y-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-4 bg-green-50 border border-green-200 rounded-lg",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm text-green-800 text-center",
                            children: state.message || 'Please check your inbox and click the verification link to complete your registration.'
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                            lineNumber: 424,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 423,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center text-sm",
                        children: [
                            "Already have an account?",
                            ' ',
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: "/auth/login",
                                className: "text-primary font-medium hover:text-primary/80 transition-colors",
                                children: "Sign in"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                lineNumber: 431,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 429,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                lineNumber: 422,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
        lineNumber: 412,
        columnNumber: 5
    }, this);
}
_c4 = SignupSuccess;
function ForgotPasswordSuccess(param) {
    let { state } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
        className: "border-0 shadow-2xl bg-white/95 backdrop-blur-sm",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                className: "space-y-2 pb-8 text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"], {
                            className: "h-8 w-8 text-green-600"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                            lineNumber: 448,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 447,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                        className: "text-3xl font-bold",
                        children: "Check Your Email"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 450,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardDescription"], {
                        className: "text-base text-muted-foreground",
                        children: "We've sent reset instructions to your inbox"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 451,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                lineNumber: 446,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                className: "space-y-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-4 bg-green-50 border border-green-200 rounded-lg",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-sm text-green-800 text-center",
                            children: state.message || 'Please check your email and follow the instructions to reset your password. The link will expire in 24 hours.'
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                            lineNumber: 457,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 456,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-3 text-sm text-muted-foreground",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "flex items-start gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$question$2d$mark$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__HelpCircle$3e$__["HelpCircle"], {
                                    className: "h-4 w-4 mt-0.5 flex-shrink-0"
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                    lineNumber: 464,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    children: "Didn't receive the email? Check your spam folder or try again in a few minutes."
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                    lineNumber: 465,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                            lineNumber: 463,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 462,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "text-center text-sm",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: "/auth/login",
                            className: "inline-flex items-center text-primary font-medium hover:text-primary/80 transition-colors",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__["ArrowLeft"], {
                                    className: "mr-1 h-4 w-4"
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                    lineNumber: 474,
                                    columnNumber: 13
                                }, this),
                                "Back to Sign In"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                            lineNumber: 470,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 469,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                lineNumber: 455,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
        lineNumber: 445,
        columnNumber: 5
    }, this);
}
_c5 = ForgotPasswordSuccess;
function AuthFormFactory(param) {
    let { config, onSuccess } = param;
    var _state_errors;
    _s3();
    const initialState = {
        errors: {}
    };
    // Select the appropriate action based on form type
    const formAction = {
        login: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$data$3a$af964d__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["loginAction"],
        signup: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$data$3a$bdfb83__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["signupAction"],
        'forgot-password': __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$data$3a$020aab__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["forgotPasswordAction"]
    }[config.type];
    const [state, action] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useActionState"])(formAction, initialState);
    const [isPending, startTransition] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTransition"])();
    // Handle success callback
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].useEffect({
        "AuthFormFactory.useEffect": ()=>{
            if (state.success && onSuccess) {
                onSuccess(state);
            }
        }
    }["AuthFormFactory.useEffect"], [
        state,
        onSuccess
    ]);
    const handleSubmit = (formData)=>{
        startTransition(()=>{
            action(formData);
        });
    };
    // Show success state for signup and forgot password
    if (state.success) {
        if (config.type === 'signup') {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col gap-6 w-full max-w-md mx-auto",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SignupSuccess, {
                    state: state
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                    lineNumber: 518,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                lineNumber: 517,
                columnNumber: 9
            }, this);
        }
        if (config.type === 'forgot-password') {
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col gap-6 w-full max-w-md mx-auto",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ForgotPasswordSuccess, {
                    state: state
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                    lineNumber: 526,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                lineNumber: 525,
                columnNumber: 9
            }, this);
        }
    }
    // Render form fields based on type
    const renderFormFields = ()=>{
        switch(config.type){
            case 'login':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(LoginFormFields, {
                    state: state,
                    isPending: isPending,
                    redirectTo: config.redirectTo
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                    lineNumber: 536,
                    columnNumber: 16
                }, this);
            case 'signup':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SignupFormFields, {
                    state: state,
                    isPending: isPending,
                    redirectTo: config.redirectTo
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                    lineNumber: 538,
                    columnNumber: 16
                }, this);
            case 'forgot-password':
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ForgotPasswordFormFields, {
                    state: state,
                    isPending: isPending
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                    lineNumber: 540,
                    columnNumber: 16
                }, this);
            default:
                return null;
        }
    };
    const showTrustBadges = config.type === 'signup';
    const showOAuth = config.type !== 'forgot-password';
    const showBackLink = config.type === 'forgot-password';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex flex-col gap-6 w-full max-w-md mx-auto",
        children: [
            showTrustBadges && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-center gap-6 text-xs text-muted-foreground",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                                className: "h-3 w-3"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                lineNumber: 556,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Secure"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                lineNumber: 557,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 555,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__["Zap"], {
                                className: "h-3 w-3"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                lineNumber: 560,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "Quick Setup"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                lineNumber: 561,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 559,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"], {
                                className: "h-3 w-3"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                lineNumber: 564,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                children: "10,000+ Users"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                lineNumber: 565,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 563,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                lineNumber: 554,
                columnNumber: 9
            }, this),
            config.type === 'forgot-password' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-center gap-2 text-xs text-muted-foreground",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Shield$3e$__["Shield"], {
                        className: "h-3 w-3"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 573,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        children: "Secure password reset"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 574,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                lineNumber: 572,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                className: "border-0 shadow-2xl bg-white/95 backdrop-blur-sm",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                        className: "space-y-2 pb-8",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                                className: "text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent",
                                children: config.title
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                lineNumber: 580,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardDescription"], {
                                className: "text-base text-muted-foreground",
                                children: config.description
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                lineNumber: 583,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 579,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                        className: "space-y-6",
                        children: [
                            config.error && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$auth$2f$auth$2d$error$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuthError"], {
                                message: config.error
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                lineNumber: 589,
                                columnNumber: 28
                            }, this),
                            ((_state_errors = state.errors) === null || _state_errors === void 0 ? void 0 : _state_errors._form) && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-destructive/10 border border-destructive/20 rounded-md p-3",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                                            className: "h-4 w-4 text-destructive"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                            lineNumber: 595,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-destructive text-sm",
                                            children: state.errors._form[0]
                                        }, void 0, false, {
                                            fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                            lineNumber: 596,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                    lineNumber: 594,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                lineNumber: 593,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
                                action: handleSubmit,
                                className: "space-y-5",
                                children: [
                                    renderFormFields(),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Button"], {
                                        type: "submit",
                                        className: "w-full h-12 text-base font-medium transition-all hover:shadow-lg",
                                        disabled: isPending,
                                        children: isPending ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                    className: "mr-2 h-4 w-4 animate-spin"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                                    lineNumber: 614,
                                                    columnNumber: 19
                                                }, this),
                                                config.loadingLabel
                                            ]
                                        }, void 0, true) : config.submitLabel
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                        lineNumber: 607,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                lineNumber: 604,
                                columnNumber: 11
                            }, this),
                            showOAuth && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "relative flex items-center",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex-grow border-t border-gray-300"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                                lineNumber: 628,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "flex-shrink mx-4 text-xs text-muted-foreground uppercase tracking-wider",
                                                children: "Or continue with"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                                lineNumber: 629,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex-grow border-t border-gray-300"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                                lineNumber: 632,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                        lineNumber: 627,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$auth$2f$oauth$2d$providers$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["OAuthProviders"], {
                                        disabled: isPending
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                        lineNumber: 636,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "text-center text-sm",
                                children: [
                                    config.type === 'login' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                        children: [
                                            "Don't have an account?",
                                            ' ',
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                href: "/auth/signup",
                                                className: "text-primary font-medium hover:underline",
                                                children: "Sign up"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                                lineNumber: 645,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true),
                                    config.type === 'signup' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                        children: [
                                            "Already have an account?",
                                            ' ',
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                href: "/auth/login",
                                                className: "text-primary font-medium hover:underline",
                                                children: "Sign in"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                                lineNumber: 656,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true),
                                    showBackLink && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        href: "/auth/login",
                                        className: "inline-flex items-center text-primary font-medium hover:text-primary/80 transition-colors",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowLeft$3e$__["ArrowLeft"], {
                                                className: "mr-1 h-4 w-4"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                                lineNumber: 669,
                                                columnNumber: 17
                                            }, this),
                                            "Back to Sign In"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                        lineNumber: 665,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                                lineNumber: 641,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                        lineNumber: 587,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
                lineNumber: 578,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/auth/auth-form-factory.tsx",
        lineNumber: 551,
        columnNumber: 5
    }, this);
}
_s3(AuthFormFactory, "+BfY0Mu5MbVWz9vkM0xYdtuSUg4=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useActionState"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTransition"]
    ];
});
_c6 = AuthFormFactory;
var _c, _c1, _c2, _c3, _c4, _c5, _c6;
__turbopack_context__.k.register(_c, "FormField");
__turbopack_context__.k.register(_c1, "LoginFormFields");
__turbopack_context__.k.register(_c2, "SignupFormFields");
__turbopack_context__.k.register(_c3, "ForgotPasswordFormFields");
__turbopack_context__.k.register(_c4, "SignupSuccess");
__turbopack_context__.k.register(_c5, "ForgotPasswordSuccess");
__turbopack_context__.k.register(_c6, "AuthFormFactory");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/auth/signup-form.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Signup Form - Refactored
 * 
 * Modern signup form using AuthFormFactory for consistent UX.
 * Eliminates duplication and provides standardized form handling.
 * 
 * Features:
 * - AuthFormFactory integration
 * - Type-safe form handling with validation
 * - Built-in success state handling
 * - OAuth integration
 * - Terms acceptance
 * - Trust indicators
 */ __turbopack_context__.s({
    "SignupFormRefactored": ()=>SignupFormRefactored,
    "default": ()=>__TURBOPACK__default__export__
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$auth$2f$auth$2d$form$2d$factory$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/auth/auth-form-factory.tsx [app-client] (ecmascript)");
"use client";
;
;
function SignupFormRefactored(param) {
    let { redirectTo, error, onSuccess } = param;
    const config = {
        type: 'signup',
        title: 'Create your account',
        description: 'Start your 14-day free trial • No credit card required',
        submitLabel: 'Create Free Account',
        loadingLabel: 'Creating account...',
        redirectTo,
        error
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$auth$2f$auth$2d$form$2d$factory$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuthFormFactory"], {
        config: config,
        onSuccess: onSuccess
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/auth/signup-form.tsx",
        lineNumber: 43,
        columnNumber: 10
    }, this);
}
_c = SignupFormRefactored;
const __TURBOPACK__default__export__ = SignupFormRefactored;
var _c;
__turbopack_context__.k.register(_c, "SignupFormRefactored");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/auth/auth-redirect.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "AuthRedirect": ()=>AuthRedirect
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function AuthRedirect(param) {
    let { to } = param;
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthRedirect.useEffect": ()=>{
            router.push(to);
        }
    }["AuthRedirect.useEffect"], [
        router,
        to
    ]);
    // Show minimal loading state while redirecting
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen flex items-center justify-center",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "text-center",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/auth-redirect.tsx",
                    lineNumber: 21,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "mt-2 text-sm text-muted-foreground",
                    children: "Redirecting..."
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/auth/auth-redirect.tsx",
                    lineNumber: 22,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/frontend/src/components/auth/auth-redirect.tsx",
            lineNumber: 20,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/auth/auth-redirect.tsx",
        lineNumber: 19,
        columnNumber: 5
    }, this);
}
_s(AuthRedirect, "vQduR7x+OPXj6PSmJyFnf+hU7bg=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
_c = AuthRedirect;
var _c;
__turbopack_context__.k.register(_c, "AuthRedirect");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
}]);

//# sourceMappingURL=apps_frontend_src_afc80c4f._.js.map
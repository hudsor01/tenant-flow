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
"[project]/apps/frontend/src/components/ui/avatar.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "Avatar": ()=>Avatar,
    "AvatarFallback": ()=>AvatarFallback,
    "AvatarImage": ()=>AvatarImage
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$avatar$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-avatar/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
"use client";
;
;
;
function Avatar(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$avatar$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Root"], {
        "data-slot": "avatar",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("relative flex size-8 shrink-0 overflow-hidden rounded-full", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/avatar.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
_c = Avatar;
function AvatarImage(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$avatar$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Image"], {
        "data-slot": "avatar-image",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("aspect-square size-full", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/avatar.tsx",
        lineNumber: 29,
        columnNumber: 5
    }, this);
}
_c1 = AvatarImage;
function AvatarFallback(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$avatar$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fallback"], {
        "data-slot": "avatar-fallback",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("bg-muted flex size-full items-center justify-center rounded-full", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/avatar.tsx",
        lineNumber: 42,
        columnNumber: 5
    }, this);
}
_c2 = AvatarFallback;
;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "Avatar");
__turbopack_context__.k.register(_c1, "AvatarImage");
__turbopack_context__.k.register(_c2, "AvatarFallback");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/dropdown-menu.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "DropdownMenu": ()=>DropdownMenu,
    "DropdownMenuCheckboxItem": ()=>DropdownMenuCheckboxItem,
    "DropdownMenuContent": ()=>DropdownMenuContent,
    "DropdownMenuGroup": ()=>DropdownMenuGroup,
    "DropdownMenuItem": ()=>DropdownMenuItem,
    "DropdownMenuLabel": ()=>DropdownMenuLabel,
    "DropdownMenuPortal": ()=>DropdownMenuPortal,
    "DropdownMenuRadioGroup": ()=>DropdownMenuRadioGroup,
    "DropdownMenuRadioItem": ()=>DropdownMenuRadioItem,
    "DropdownMenuSeparator": ()=>DropdownMenuSeparator,
    "DropdownMenuShortcut": ()=>DropdownMenuShortcut,
    "DropdownMenuSub": ()=>DropdownMenuSub,
    "DropdownMenuSubContent": ()=>DropdownMenuSubContent,
    "DropdownMenuSubTrigger": ()=>DropdownMenuSubTrigger,
    "DropdownMenuTrigger": ()=>DropdownMenuTrigger
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-dropdown-menu/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as CheckIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRightIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-right.js [app-client] (ecmascript) <export default as ChevronRightIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CircleIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle.js [app-client] (ecmascript) <export default as CircleIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
"use client";
;
;
;
;
function DropdownMenu(param) {
    let { ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Root"], {
        "data-slot": "dropdown-menu",
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
        lineNumber: 12,
        columnNumber: 10
    }, this);
}
_c = DropdownMenu;
function DropdownMenuPortal(param) {
    let { ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Portal"], {
        "data-slot": "dropdown-menu-portal",
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
        lineNumber: 19,
        columnNumber: 5
    }, this);
}
_c1 = DropdownMenuPortal;
function DropdownMenuTrigger(param) {
    let { ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Trigger"], {
        "data-slot": "dropdown-menu-trigger",
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
        lineNumber: 27,
        columnNumber: 5
    }, this);
}
_c2 = DropdownMenuTrigger;
function DropdownMenuContent(param) {
    let { className, sideOffset = 4, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Portal"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Content"], {
            "data-slot": "dropdown-menu-content",
            sideOffset: sideOffset,
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md", className),
            ...props
        }, void 0, false, {
            fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
            lineNumber: 41,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
        lineNumber: 40,
        columnNumber: 5
    }, this);
}
_c3 = DropdownMenuContent;
function DropdownMenuGroup(param) {
    let { ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Group"], {
        "data-slot": "dropdown-menu-group",
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
        lineNumber: 58,
        columnNumber: 5
    }, this);
}
_c4 = DropdownMenuGroup;
function DropdownMenuItem(param) {
    let { className, inset, variant = "default", ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Item"], {
        "data-slot": "dropdown-menu-item",
        "data-inset": inset,
        "data-variant": variant,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
        lineNumber: 72,
        columnNumber: 5
    }, this);
}
_c5 = DropdownMenuItem;
function DropdownMenuCheckboxItem(param) {
    let { className, children, checked, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CheckboxItem"], {
        "data-slot": "dropdown-menu-checkbox-item",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className),
        checked: checked,
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ItemIndicator"], {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckIcon$3e$__["CheckIcon"], {
                        className: "size-4"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
                        lineNumber: 103,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
                    lineNumber: 102,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
                lineNumber: 101,
                columnNumber: 7
            }, this),
            children
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
        lineNumber: 92,
        columnNumber: 5
    }, this);
}
_c6 = DropdownMenuCheckboxItem;
function DropdownMenuRadioGroup(param) {
    let { ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RadioGroup"], {
        "data-slot": "dropdown-menu-radio-group",
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
        lineNumber: 115,
        columnNumber: 5
    }, this);
}
_c7 = DropdownMenuRadioGroup;
function DropdownMenuRadioItem(param) {
    let { className, children, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RadioItem"], {
        "data-slot": "dropdown-menu-radio-item",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className),
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ItemIndicator"], {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CircleIcon$3e$__["CircleIcon"], {
                        className: "size-2 fill-current"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
                        lineNumber: 138,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
                    lineNumber: 137,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
                lineNumber: 136,
                columnNumber: 7
            }, this),
            children
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
        lineNumber: 128,
        columnNumber: 5
    }, this);
}
_c8 = DropdownMenuRadioItem;
function DropdownMenuLabel(param) {
    let { className, inset, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Label"], {
        "data-slot": "dropdown-menu-label",
        "data-inset": inset,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
        lineNumber: 154,
        columnNumber: 5
    }, this);
}
_c9 = DropdownMenuLabel;
function DropdownMenuSeparator(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Separator"], {
        "data-slot": "dropdown-menu-separator",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("bg-border -mx-1 my-1 h-px", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
        lineNumber: 171,
        columnNumber: 5
    }, this);
}
_c10 = DropdownMenuSeparator;
function DropdownMenuShortcut(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        "data-slot": "dropdown-menu-shortcut",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-muted-foreground ml-auto text-xs tracking-widest", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
        lineNumber: 184,
        columnNumber: 5
    }, this);
}
_c11 = DropdownMenuShortcut;
function DropdownMenuSub(param) {
    let { ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Sub"], {
        "data-slot": "dropdown-menu-sub",
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
        lineNumber: 198,
        columnNumber: 10
    }, this);
}
_c12 = DropdownMenuSub;
function DropdownMenuSubTrigger(param) {
    let { className, inset, children, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SubTrigger"], {
        "data-slot": "dropdown-menu-sub-trigger",
        "data-inset": inset,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8", className),
        ...props,
        children: [
            children,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronRightIcon$3e$__["ChevronRightIcon"], {
                className: "ml-auto size-4"
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
                lineNumber: 220,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
        lineNumber: 210,
        columnNumber: 5
    }, this);
}
_c13 = DropdownMenuSubTrigger;
function DropdownMenuSubContent(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dropdown$2d$menu$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SubContent"], {
        "data-slot": "dropdown-menu-sub-content",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/dropdown-menu.tsx",
        lineNumber: 230,
        columnNumber: 5
    }, this);
}
_c14 = DropdownMenuSubContent;
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c10, _c11, _c12, _c13, _c14;
__turbopack_context__.k.register(_c, "DropdownMenu");
__turbopack_context__.k.register(_c1, "DropdownMenuPortal");
__turbopack_context__.k.register(_c2, "DropdownMenuTrigger");
__turbopack_context__.k.register(_c3, "DropdownMenuContent");
__turbopack_context__.k.register(_c4, "DropdownMenuGroup");
__turbopack_context__.k.register(_c5, "DropdownMenuItem");
__turbopack_context__.k.register(_c6, "DropdownMenuCheckboxItem");
__turbopack_context__.k.register(_c7, "DropdownMenuRadioGroup");
__turbopack_context__.k.register(_c8, "DropdownMenuRadioItem");
__turbopack_context__.k.register(_c9, "DropdownMenuLabel");
__turbopack_context__.k.register(_c10, "DropdownMenuSeparator");
__turbopack_context__.k.register(_c11, "DropdownMenuShortcut");
__turbopack_context__.k.register(_c12, "DropdownMenuSub");
__turbopack_context__.k.register(_c13, "DropdownMenuSubTrigger");
__turbopack_context__.k.register(_c14, "DropdownMenuSubContent");
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
"[project]/apps/frontend/src/atoms/core/user.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "authErrorAtom": ()=>authErrorAtom,
    "authLoadingAtom": ()=>authLoadingAtom,
    "clearAuthAtom": ()=>clearAuthAtom,
    "hasStripeAccountAtom": ()=>hasStripeAccountAtom,
    "isAuthenticatedAtom": ()=>isAuthenticatedAtom,
    "isSessionActiveAtom": ()=>isSessionActiveAtom,
    "lastActivityAtom": ()=>lastActivityAtom,
    "organizationAtom": ()=>organizationAtom,
    "sessionExpiryAtom": ()=>sessionExpiryAtom,
    "setUserAtom": ()=>setUserAtom,
    "subscriptionStatusAtom": ()=>subscriptionStatusAtom,
    "updateLastActivityAtom": ()=>updateLastActivityAtom,
    "updateUserAtom": ()=>updateUserAtom,
    "userAtom": ()=>userAtom,
    "userPermissionsAtom": ()=>userPermissionsAtom,
    "userRoleAtom": ()=>userRoleAtom
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/vanilla.mjs [app-client] (ecmascript)");
;
const userAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null);
const isAuthenticatedAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>get(userAtom) !== null);
const authLoadingAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(true);
const sessionExpiryAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null);
const lastActivityAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(Date.now());
const organizationAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    const user = get(userAtom);
    return {
        id: (user === null || user === void 0 ? void 0 : user.organizationId) || null,
        name: (user === null || user === void 0 ? void 0 : user.organizationId) || null
    };
});
const authErrorAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null);
const isSessionActiveAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    const user = get(userAtom);
    const lastActivity = get(lastActivityAtom);
    const sessionExpiry = get(sessionExpiryAtom);
    const now = Date.now();
    if (!user) return false;
    // Check if session is expired
    if (sessionExpiry && now > sessionExpiry) {
        return false;
    }
    // Check for inactivity timeout (30 minutes)
    const SESSION_TIMEOUT = 30 * 60 * 1000;
    if (now - lastActivity > SESSION_TIMEOUT) {
        return false;
    }
    return true;
});
const userRoleAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    var _get;
    return ((_get = get(userAtom)) === null || _get === void 0 ? void 0 : _get.role) || null;
});
const hasStripeAccountAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    var _get;
    return !!((_get = get(userAtom)) === null || _get === void 0 ? void 0 : _get.stripeCustomerId);
});
const userPermissionsAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    const user = get(userAtom);
    if (!user) return [];
    // Basic permissions based on role
    switch(user.role){
        case 'OWNER':
            return [
                'read',
                'write',
                'delete',
                'admin'
            ];
        case 'MANAGER':
            return [
                'read',
                'write',
                'delete'
            ];
        case 'TENANT':
            return [
                'read'
            ];
        default:
            return [
                'read'
            ];
    }
});
const subscriptionStatusAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    const user = get(userAtom);
    if (!user) return 'inactive';
    // Return subscription status from user profile
    return user.stripeCustomerId ? 'active' : 'inactive';
});
const setUserAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, user)=>{
    set(userAtom, user);
    set(lastActivityAtom, Date.now());
    set(authErrorAtom, null);
    set(authLoadingAtom, false);
});
const updateUserAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, updates)=>{
    const currentUser = get(userAtom);
    if (currentUser) {
        set(userAtom, {
            ...currentUser,
            ...updates
        });
        set(lastActivityAtom, Date.now());
    }
});
const clearAuthAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set)=>{
    set(userAtom, null);
    set(sessionExpiryAtom, null);
    set(authErrorAtom, null);
    set(authLoadingAtom, false);
});
const updateLastActivityAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set)=>{
    set(lastActivityAtom, Date.now());
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/atoms/core/effects.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "analyticsQueueAtom": ()=>analyticsQueueAtom,
    "analyticsQueueSizeAtom": ()=>analyticsQueueSizeAtom,
    "clearAnalyticsQueueAtom": ()=>clearAnalyticsQueueAtom,
    "clearNotificationQueueAtom": ()=>clearNotificationQueueAtom,
    "notificationQueueAtom": ()=>notificationQueueAtom,
    "removeNotificationFromQueueAtom": ()=>removeNotificationFromQueueAtom,
    "trackErrorAtom": ()=>trackErrorAtom,
    "trackPropertyActionAtom": ()=>trackPropertyActionAtom,
    "unreadNotificationsCountAtom": ()=>unreadNotificationsCountAtom
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/vanilla.mjs [app-client] (ecmascript)");
;
const analyticsQueueAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])([]);
const notificationQueueAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])([]);
const trackPropertyActionAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, action)=>{
    // Track the analytics event
    const event = {
        event: "property_".concat(action.type),
        properties: {
            propertyId: action.property.id,
            propertyType: action.property.propertyType,
            city: action.property.city
        },
        timestamp: Date.now()
    };
    // Add to analytics queue
    const currentQueue = get(analyticsQueueAtom);
    set(analyticsQueueAtom, [
        ...currentQueue,
        event
    ]);
    // Show notification for user actions
    if (action.type !== 'view') {
        const notification = {
            type: action.type === 'delete' ? 'info' : 'success',
            message: "Property ".concat(action.type === 'create' ? 'created' : action.type === 'update' ? 'updated' : 'deleted', " successfully"),
            duration: 3000
        };
        const currentNotifications = get(notificationQueueAtom);
        set(notificationQueueAtom, [
            ...currentNotifications,
            notification
        ]);
    }
});
const trackErrorAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, error)=>{
    const errorEvent = {
        event: 'error_occurred',
        properties: {
            message: error.message,
            stack: error.stack,
            context: error.context,
            url: ("TURBOPACK compile-time truthy", 1) ? window.location.href : "TURBOPACK unreachable"
        },
        timestamp: Date.now()
    };
    // Add to analytics queue
    const currentQueue = get(analyticsQueueAtom);
    set(analyticsQueueAtom, [
        ...currentQueue,
        errorEvent
    ]);
    // Show error notification
    const notification = {
        type: 'error',
        message: error.message,
        duration: 5000
    };
    const currentNotifications = get(notificationQueueAtom);
    set(notificationQueueAtom, [
        ...currentNotifications,
        notification
    ]);
});
const clearAnalyticsQueueAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set)=>{
    set(analyticsQueueAtom, []);
});
const clearNotificationQueueAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set)=>{
    set(notificationQueueAtom, []);
});
const removeNotificationFromQueueAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, index)=>{
    const currentQueue = get(notificationQueueAtom);
    set(notificationQueueAtom, currentQueue.filter((_, i)=>i !== index));
});
const unreadNotificationsCountAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    const notifications = get(notificationQueueAtom);
    return notifications.length;
});
const analyticsQueueSizeAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    const queue = get(analyticsQueueAtom);
    return queue.length;
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/atoms/ui/theme.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "featureFlagsAtom": ()=>featureFlagsAtom,
    "isOnlineAtom": ()=>isOnlineAtom,
    "sidebarOpenAtom": ()=>sidebarOpenAtom,
    "themeAtom": ()=>themeAtom,
    "toggleFeatureAtom": ()=>toggleFeatureAtom,
    "toggleSidebarAtom": ()=>toggleSidebarAtom
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/vanilla.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/vanilla/utils.mjs [app-client] (ecmascript)");
;
;
const themeAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atomWithStorage"])('tenantflow-theme', 'system');
const sidebarOpenAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atomWithStorage"])('tenantflow-sidebar-open', true);
const isOnlineAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(true);
const featureFlagsAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atomWithStorage"])('tenantflow-feature-flags', {
    darkMode: true,
    betaFeatures: false,
    analyticsEnabled: true
});
const toggleSidebarAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set)=>{
    const currentState = get(sidebarOpenAtom);
    set(sidebarOpenAtom, !currentState);
});
const toggleFeatureAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, feature)=>{
    const currentFeatures = get(featureFlagsAtom);
    set(featureFlagsAtom, {
        ...currentFeatures,
        [feature]: !currentFeatures[feature]
    });
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/atoms/ui/notifications.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "addNotificationAtom": ()=>addNotificationAtom,
    "clearNotificationsAtom": ()=>clearNotificationsAtom,
    "notificationsAtom": ()=>notificationsAtom,
    "removeNotificationAtom": ()=>removeNotificationAtom,
    "unreadNotificationsAtom": ()=>unreadNotificationsAtom
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/vanilla.mjs [app-client] (ecmascript)");
;
const notificationsAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])([]);
// Generate unique ID for notifications
const generateId = ()=>Math.random().toString(36).substring(2) + Date.now().toString(36);
const addNotificationAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, notification)=>{
    const newNotification = {
        ...notification,
        id: generateId(),
        timestamp: Date.now()
    };
    const currentNotifications = get(notificationsAtom);
    set(notificationsAtom, [
        ...currentNotifications,
        newNotification
    ]);
    // Auto-remove after 5 seconds for success/info notifications
    if (notification.type === 'success' || notification.type === 'info') {
        setTimeout(()=>{
            const updatedNotifications = get(notificationsAtom);
            set(notificationsAtom, updatedNotifications.filter((n)=>n.id !== newNotification.id));
        }, 5000);
    }
});
const removeNotificationAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, id)=>{
    const currentNotifications = get(notificationsAtom);
    set(notificationsAtom, currentNotifications.filter((n)=>n.id !== id));
});
const clearNotificationsAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set)=>{
    set(notificationsAtom, []);
});
const unreadNotificationsAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>get(notificationsAtom).filter((n)=>n.type === 'error' || n.type === 'warning'));
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/atoms/ui/modals.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "closeAllModalsAtom": ()=>closeAllModalsAtom,
    "closeModalAtom": ()=>closeModalAtom,
    "isModalOpenAtom": ()=>isModalOpenAtom,
    "modalsAtom": ()=>modalsAtom,
    "openModalAtom": ()=>openModalAtom
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/vanilla.mjs [app-client] (ecmascript)");
;
const initialModalState = {
    propertyForm: false,
    unitForm: false,
    leaseForm: false,
    maintenanceForm: false,
    editProperty: false,
    editUnit: false,
    editLease: false,
    editMaintenance: false,
    inviteTenant: false,
    subscriptionCheckout: false,
    subscriptionSuccess: false
};
const modalsAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(initialModalState);
const openModalAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, modal)=>{
    const currentModals = get(modalsAtom);
    set(modalsAtom, {
        ...currentModals,
        [modal]: true
    });
});
const closeModalAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, modal)=>{
    const currentModals = get(modalsAtom);
    set(modalsAtom, {
        ...currentModals,
        [modal]: false
    });
});
const closeAllModalsAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set)=>{
    set(modalsAtom, initialModalState);
});
const isModalOpenAtom = (modalName)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>get(modalsAtom)[modalName]);
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/atoms/ui/forms.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "clearPropertyFormErrorsAtom": ()=>clearPropertyFormErrorsAtom,
    "populatePropertyFormAtom": ()=>populatePropertyFormAtom,
    "populateTenantFormAtom": ()=>populateTenantFormAtom,
    "propertyFormAtom": ()=>propertyFormAtom,
    "propertyFormValidAtom": ()=>propertyFormValidAtom,
    "resetPropertyFormAtom": ()=>resetPropertyFormAtom,
    "resetTenantFormAtom": ()=>resetTenantFormAtom,
    "setPropertyFormErrorAtom": ()=>setPropertyFormErrorAtom,
    "setPropertyFormFieldAtom": ()=>setPropertyFormFieldAtom,
    "setTenantFormFieldAtom": ()=>setTenantFormFieldAtom,
    "tenantFormAtom": ()=>tenantFormAtom,
    "tenantFormValidAtom": ()=>tenantFormValidAtom
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2d$immer$2f$dist$2f$atomWithImmer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai-immer/dist/atomWithImmer.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/vanilla/utils.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/vanilla.mjs [app-client] (ecmascript)");
;
;
;
const propertyFormAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2d$immer$2f$dist$2f$atomWithImmer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atomWithImmer"])({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    propertyType: 'SINGLE_FAMILY',
    units: [],
    isEditing: false,
    validationErrors: {},
    isDirty: false
});
const tenantFormAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2d$immer$2f$dist$2f$atomWithImmer$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atomWithImmer"])({
    name: '',
    email: '',
    phone: '',
    emergencyContact: '',
    propertyId: '',
    unitId: '',
    leaseStartDate: '',
    leaseEndDate: '',
    monthlyRent: 0,
    securityDeposit: 0,
    isEditing: false,
    validationErrors: {},
    isDirty: false
});
const resetPropertyFormAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atomWithReset"])(propertyFormAtom);
const resetTenantFormAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atomWithReset"])(tenantFormAtom);
const propertyFormValidAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    var _form_name, _form_address;
    const form = get(propertyFormAtom);
    return Object.keys(form.validationErrors).length === 0 && ((_form_name = form.name) === null || _form_name === void 0 ? void 0 : _form_name.trim()) && ((_form_address = form.address) === null || _form_address === void 0 ? void 0 : _form_address.trim());
});
const tenantFormValidAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    var _form_name, _form_email;
    const form = get(tenantFormAtom);
    return Object.keys(form.validationErrors).length === 0 && ((_form_name = form.name) === null || _form_name === void 0 ? void 0 : _form_name.trim()) && ((_form_email = form.email) === null || _form_email === void 0 ? void 0 : _form_email.trim());
});
const setPropertyFormFieldAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, field, value)=>{
    set(propertyFormAtom, (draft)=>{
        ;
        draft[field] = value;
        draft.isDirty = true;
        // Clear validation error for this field
        if (draft.validationErrors[field]) {
            delete draft.validationErrors[field];
        }
    });
});
const setPropertyFormErrorAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, field, error)=>{
    set(propertyFormAtom, (draft)=>{
        draft.validationErrors[field] = error;
    });
});
const clearPropertyFormErrorsAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set)=>{
    set(propertyFormAtom, (draft)=>{
        draft.validationErrors = {};
    });
});
const setTenantFormFieldAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, field, value)=>{
    set(tenantFormAtom, (draft)=>{
        // Use type assertion for the draft assignment
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            draft[field] = value;
        }
        draft.isDirty = true;
        // Clear validation error for this field
        if (draft.validationErrors[field]) {
            delete draft.validationErrors[field];
        }
    });
});
const populatePropertyFormAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, propertyData)=>{
    set(propertyFormAtom, (draft)=>{
        Object.assign(draft, propertyData);
        draft.isEditing = true;
        draft.isDirty = false;
        draft.validationErrors = {};
    });
});
const populateTenantFormAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, tenantData)=>{
    set(tenantFormAtom, (draft)=>{
        Object.assign(draft, tenantData);
        draft.isEditing = true;
        draft.isDirty = false;
        draft.validationErrors = {};
    });
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/config.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Application configuration
 * Centralized configuration for the TenantFlow frontend
 */ __turbopack_context__.s({
    "config": ()=>config
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
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
if ("TURBOPACK compile-time truthy", 1) {
    for (const envVar of requiredEnvVars){
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env[envVar]) {
            console.warn("Missing required environment variable: ".concat(envVar));
        }
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/supabase.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/module/index.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/config.ts [app-client] (ecmascript)");
;
;
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["config"].supabase.url, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["config"].supabase.anonKey, {
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/api-client.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Simplified API Client for TenantFlow Backend
 * Basic implementation for build compatibility
 */ __turbopack_context__.s({
    "apiClient": ()=>apiClient,
    "default": ()=>__TURBOPACK__default__export__
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/node_modules/@swc/helpers/esm/_define_property.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/axios/lib/axios.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/config.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/supabase.ts [app-client] (ecmascript)");
;
;
;
;
class ApiClient {
    setupInterceptors() {
        // Request interceptor for authentication
        this.client.interceptors.request.use(async (config)=>{
            try {
                const { session } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSession"])();
                if (session === null || session === void 0 ? void 0 : session.access_token) {
                    config.headers.Authorization = "Bearer ".concat(session.access_token);
                }
            } catch (error) {
                console.warn('[API] Failed to add authentication:', error);
            }
            return config;
        }, (error)=>{
            // Ensure the rejection reason is always an Error
            if (error instanceof Error) {
                return Promise.reject(error);
            }
            return Promise.reject(new Error(typeof error === 'string' ? error : JSON.stringify(error)));
        });
        // Response interceptor for error handling
        this.client.interceptors.response.use((response)=>response, async (error)=>{
            var _error_response;
            if (((_error_response = error.response) === null || _error_response === void 0 ? void 0 : _error_response.status) === 401) {
                // Handle authentication errors
                console.warn('[API] Authentication error - redirecting to login');
                window.location.href = '/login';
            }
            return Promise.reject(error);
        });
    }
    async makeRequest(method, url, data, config) {
        try {
            var _response_data;
            // Create AbortController for request cancellation
            const controller = new AbortController();
            const response = await this.client.request({
                method,
                url,
                data,
                ...config,
                signal: (config === null || config === void 0 ? void 0 : config.signal) || controller.signal
            });
            return {
                data: response.data,
                success: response.status >= 200 && response.status < 300,
                message: (_response_data = response.data) === null || _response_data === void 0 ? void 0 : _response_data.message,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            var _axiosError_response;
            const axiosError = error;
            const responseData = (_axiosError_response = axiosError.response) === null || _axiosError_response === void 0 ? void 0 : _axiosError_response.data;
            const apiError = {
                message: (responseData === null || responseData === void 0 ? void 0 : responseData.message) || axiosError.message || 'Request failed',
                code: (responseData === null || responseData === void 0 ? void 0 : responseData.code) || axiosError.code,
                details: (responseData === null || responseData === void 0 ? void 0 : responseData.details) || responseData,
                timestamp: new Date().toISOString()
            };
            throw apiError;
        }
    }
    // HTTP Methods
    async get(url, config) {
        return this.makeRequest('GET', url, undefined, config);
    }
    async post(url, data, config) {
        return this.makeRequest('POST', url, data, config);
    }
    async put(url, data, config) {
        return this.makeRequest('PUT', url, data, config);
    }
    async patch(url, data, config) {
        return this.makeRequest('PATCH', url, data, config);
    }
    async delete(url, config) {
        return this.makeRequest('DELETE', url, undefined, config);
    }
    // Health check method
    async healthCheck() {
        return this.get('/health');
    }
    // Helper method to create cancellable requests
    createCancellableRequest() {
        const controller = new AbortController();
        return {
            signal: controller.signal,
            cancel: ()=>controller.abort()
        };
    }
    constructor(){
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "client", void 0);
        this.client = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].create({
            baseURL: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["config"].api.baseURL,
            timeout: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["config"].api.timeout || 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            withCredentials: true,
            validateStatus: (status)=>status < 500
        });
        this.setupInterceptors();
    }
}
const apiClient = new ApiClient();
const __TURBOPACK__default__export__ = apiClient;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/api/endpoints.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * API Endpoints Configuration
 * Complete API client with all endpoints from the NestJS backend
 */ __turbopack_context__.s({
    "api": ()=>api
});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/api-client.ts [app-client] (ecmascript)");
;
const api = {
    // Auth endpoints
    auth: {
        login: (data)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/auth/login', data),
        logout: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/auth/logout'),
        me: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/auth/me'),
        updateProfile: (data)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].put('/auth/profile', data),
        refreshToken: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/auth/refresh')
    },
    // Properties endpoints
    properties: {
        list: (params)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/properties', {
                params
            }),
        get: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/properties/".concat(id)),
        create: (data)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/properties', data),
        update: (id, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].put("/properties/".concat(id), data),
        delete: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete("/properties/".concat(id)),
        stats: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/properties/stats'),
        uploadImage: (id, formData)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post("/properties/".concat(id, "/upload-image"), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }),
        // Property units
        getUnits: (propertyId)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/properties/".concat(propertyId, "/units")),
        // Property tenants
        getTenants: (propertyId)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/properties/".concat(propertyId, "/tenants")),
        // Property leases
        getLeases: (propertyId)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/properties/".concat(propertyId, "/leases")),
        // Property maintenance
        getMaintenance: (propertyId)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/properties/".concat(propertyId, "/maintenance"))
    },
    // Tenants endpoints
    tenants: {
        list: (params)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/tenants', {
                params
            }),
        get: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/tenants/".concat(id)),
        create: (data)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/tenants', data),
        update: (id, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].put("/tenants/".concat(id), data),
        delete: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete("/tenants/".concat(id)),
        stats: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/tenants/stats'),
        uploadDocument: (id, formData)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post("/tenants/".concat(id, "/documents"), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }),
        // Tenant-specific data
        getLeases: (tenantId)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/tenants/".concat(tenantId, "/leases")),
        getPayments: (tenantId)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/tenants/".concat(tenantId, "/payments")),
        getMaintenance: (tenantId)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/tenants/".concat(tenantId, "/maintenance")),
        getDocuments: (tenantId)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/tenants/".concat(tenantId, "/documents")),
        // Tenant portal specific
        inviteTenant: (id, email)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post("/tenants/".concat(id, "/invite"), {
                email
            })
    },
    // Units endpoints
    units: {
        list: (params)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/units', {
                params
            }),
        get: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/units/".concat(id)),
        create: (data)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/units', data),
        update: (id, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].put("/units/".concat(id), data),
        delete: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete("/units/".concat(id)),
        // Unit availability
        updateAvailability: (id, isAvailable)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].patch("/units/".concat(id, "/availability"), {
                isAvailable
            })
    },
    // Leases endpoints
    leases: {
        list: (params)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/leases', {
                params
            }),
        get: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/leases/".concat(id)),
        create: (data)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/leases', data),
        update: (id, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].put("/leases/".concat(id), data),
        delete: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete("/leases/".concat(id)),
        // Lease documents
        generatePDF: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post("/leases/".concat(id, "/generate-pdf")),
        uploadDocument: (id, formData)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post("/leases/".concat(id, "/documents"), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }),
        // Lease lifecycle
        activate: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post("/leases/".concat(id, "/activate")),
        terminate: (id, reason)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post("/leases/".concat(id, "/terminate"), {
                reason
            }),
        renew: (id, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post("/leases/".concat(id, "/renew"), data)
    },
    // Maintenance endpoints
    maintenance: {
        list: (params)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/maintenance', {
                params
            }),
        get: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/maintenance/".concat(id)),
        create: (data)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/maintenance', data),
        update: (id, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].put("/maintenance/".concat(id), data),
        delete: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete("/maintenance/".concat(id)),
        // Status updates
        updateStatus: (id, status)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].patch("/maintenance/".concat(id, "/status"), {
                status
            }),
        assignVendor: (id, vendorId)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post("/maintenance/".concat(id, "/assign"), {
                vendorId
            }),
        // Comments and attachments
        addComment: (id, comment)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post("/maintenance/".concat(id, "/comments"), {
                comment
            }),
        uploadImage: (id, formData)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post("/maintenance/".concat(id, "/images"), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
    },
    // Billing/Stripe endpoints
    billing: {
        // Subscriptions
        createCheckoutSession: (data)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/billing/create-checkout-session', data),
        createPortalSession: (data)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/billing/create-portal-session', data),
        getSubscription: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/billing/subscription'),
        updateSubscription: (params)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].put('/billing/subscription', params),
        cancelSubscription: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete('/billing/subscription'),
        // Payments
        getPaymentMethods: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/billing/payment-methods'),
        addPaymentMethod: (paymentMethodId)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/billing/payment-methods', {
                paymentMethodId
            }),
        setDefaultPaymentMethod: (paymentMethodId)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].put('/billing/payment-methods/default', {
                paymentMethodId
            }),
        // Invoices
        getInvoices: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/billing/invoices'),
        downloadInvoice: (invoiceId)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/billing/invoices/".concat(invoiceId, "/download")),
        // Usage
        getUsage: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/billing/usage')
    },
    // User Management
    users: {
        list: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/users'),
        get: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/users/".concat(id)),
        update: (id, data)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].put("/users/".concat(id), data),
        delete: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete("/users/".concat(id)),
        // User roles and permissions
        updateRole: (id, role)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].patch("/users/".concat(id, "/role"), {
                role
            }),
        getPermissions: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/users/".concat(id, "/permissions"))
    },
    // Organization Management
    organization: {
        get: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/organization'),
        update: (data)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].put('/organization', data),
        getMembers: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/organization/members'),
        inviteMember: (email, role)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/organization/invite', {
                email,
                role
            }),
        removeMember: (userId)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete("/organization/members/".concat(userId)),
        // Settings
        getSettings: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/organization/settings'),
        updateSettings: (settings)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].put('/organization/settings', settings)
    },
    // Reports and Analytics
    reports: {
        // Financial reports
        getRentRoll: (params)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/reports/rent-roll', {
                params
            }),
        getIncomeStatement: (params)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/reports/income-statement', {
                params
            }),
        getCashFlow: (params)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/reports/cash-flow', {
                params
            }),
        // Occupancy reports
        getOccupancyRate: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/reports/occupancy-rate'),
        getVacancyReport: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/reports/vacancy'),
        // Maintenance reports
        getMaintenanceCosts: (params)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/reports/maintenance-costs', {
                params
            }),
        getMaintenanceByProperty: (propertyId)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/reports/maintenance/property/".concat(propertyId))
    },
    // Notifications
    notifications: {
        list: (params)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/notifications', {
                params
            }),
        markAsRead: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].patch("/notifications/".concat(id, "/read")),
        markAllAsRead: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].patch('/notifications/read-all'),
        delete: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete("/notifications/".concat(id)),
        // Preferences
        getPreferences: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/notifications/preferences'),
        updatePreferences: (preferences)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].put('/notifications/preferences', preferences)
    },
    // Documents
    documents: {
        list: (params)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/documents', {
                params
            }),
        get: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/documents/".concat(id)),
        upload: (formData)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/documents', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }),
        delete: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete("/documents/".concat(id)),
        download: (id)=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/documents/".concat(id, "/download"))
    },
    // Dashboard
    dashboard: {
        getOverview: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/dashboard/overview'),
        getRecentActivity: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/dashboard/activity'),
        getUpcomingTasks: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/dashboard/tasks'),
        getAlerts: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/dashboard/alerts')
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/api/properties.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Properties API
 * Handles property CRUD operations with NestJS backend
 */ __turbopack_context__.s({
    "PropertiesApi": ()=>PropertiesApi
});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/api/endpoints.ts [app-client] (ecmascript)");
;
class PropertiesApi {
    /**
   * Get all properties for the current user
   */ static async getProperties(params) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].properties.list(params);
        return response.data.data || response.data;
    }
    /**
   * Get property statistics
   */ static async getPropertyStats() {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].properties.stats();
        return response.data;
    }
    /**
   * Get a specific property by ID
   */ static async getProperty(id) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].properties.get(id);
        return response.data;
    }
    /**
   * Create a new property
   */ static async createProperty(data) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].properties.create(data);
        return response.data;
    }
    /**
   * Update an existing property
   */ static async updateProperty(id, data) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].properties.update(id, data);
        return response.data;
    }
    /**
   * Delete a property
   */ static async deleteProperty(id) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].properties.delete(id);
        return response.data;
    }
    /**
   * Upload property image
   */ static async uploadPropertyImage(id, file) {
        const formData = new FormData();
        formData.append('image', file);
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].properties.uploadImage(id, formData);
        return response.data;
    }
    /**
   * Get property units
   */ static async getPropertyUnits(propertyId) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].properties.getUnits(propertyId);
        return response.data;
    }
    /**
   * Get property tenants
   */ static async getPropertyTenants(propertyId) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].properties.getTenants(propertyId);
        return response.data;
    }
    /**
   * Get property leases
   */ static async getPropertyLeases(propertyId) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].properties.getLeases(propertyId);
        return response.data;
    }
    /**
   * Get property maintenance requests
   */ static async getPropertyMaintenance(propertyId) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].properties.getMaintenance(propertyId);
        return response.data;
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/atoms/business/properties.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "cityOptionsAtom": ()=>cityOptionsAtom,
    "clearPropertyFiltersAtom": ()=>clearPropertyFiltersAtom,
    "filteredPropertiesAtom": ()=>filteredPropertiesAtom,
    "propertiesAtom": ()=>propertiesAtom,
    "propertiesByCityAtom": ()=>propertiesByCityAtom,
    "propertiesQueryAtom": ()=>propertiesQueryAtom,
    "propertyFiltersAtom": ()=>propertyFiltersAtom,
    "propertyStatsQueryAtom": ()=>propertyStatsQueryAtom,
    "selectPropertyAtom": ()=>selectPropertyAtom,
    "selectedPropertyAtom": ()=>selectedPropertyAtom,
    "setPropertyFiltersAtom": ()=>setPropertyFiltersAtom,
    "totalPropertiesCountAtom": ()=>totalPropertiesCountAtom,
    "typeOptionsAtom": ()=>typeOptionsAtom,
    "vacantUnitsCountAtom": ()=>vacantUnitsCountAtom
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/vanilla.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2d$tanstack$2d$query$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/jotai-tanstack-query/dist/index.mjs [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/vanilla/utils.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/api/properties.ts [app-client] (ecmascript)");
;
;
;
;
const selectedPropertyAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null);
const propertyFiltersAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2f$utils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atomWithReset"])({});
const propertiesQueryAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2d$tanstack$2d$query$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["atomWithQuery"])(()=>({
        queryKey: [
            'properties'
        ],
        queryFn: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PropertiesApi"].getProperties()
    }));
const propertyStatsQueryAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2d$tanstack$2d$query$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["atomWithQuery"])(()=>({
        queryKey: [
            'property-stats'
        ],
        queryFn: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PropertiesApi"].getPropertyStats()
    }));
const propertiesAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    const query = get(propertiesQueryAtom);
    return query.data || [];
});
const totalPropertiesCountAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    const properties = get(propertiesAtom);
    return properties.length;
});
const cityOptionsAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    const properties = get(propertiesAtom);
    return [
        ...new Set(properties.map((p)=>p.city).filter((city)=>Boolean(city)))
    ];
});
const typeOptionsAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])([
    'SINGLE_FAMILY',
    'APARTMENT',
    'CONDO',
    'TOWNHOUSE',
    'OTHER'
]);
const filteredPropertiesAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    const properties = get(propertiesAtom);
    const filters = get(propertyFiltersAtom);
    return properties.filter((property)=>{
        if (filters.city && property.city !== filters.city) return false;
        if (filters.propertyType && property.propertyType !== filters.propertyType) return false;
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            return property.name.toLowerCase().includes(query) || property.address.toLowerCase().includes(query);
        }
        return true;
    });
});
const propertiesByCityAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    const properties = get(propertiesAtom);
    return properties.reduce((acc, property)=>{
        const city = property.city || 'Unknown';
        if (!acc[city]) {
            acc[city] = [];
        }
        acc[city].push(property);
        return acc;
    }, {});
});
const vacantUnitsCountAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    const properties = get(propertiesAtom);
    // Count total vacant units across all properties
    return properties.reduce((total, property)=>{
        var _property_units;
        // Assuming units is an array of units with status
        const vacantUnits = ((_property_units = property.units) === null || _property_units === void 0 ? void 0 : _property_units.filter((unit)=>unit.status === 'VACANT').length) || 0;
        return total + vacantUnits;
    }, 0);
});
const setPropertyFiltersAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, filters)=>{
    const currentFilters = get(propertyFiltersAtom);
    set(propertyFiltersAtom, {
        ...currentFilters,
        ...filters
    });
});
const clearPropertyFiltersAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, _arg)=>{
    // Use the built-in reset functionality from atomWithReset
    set(propertyFiltersAtom, (_prev)=>({}));
});
const selectPropertyAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, property)=>{
    set(selectedPropertyAtom, property);
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/api/tenants.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Tenants API
 * Handles tenant CRUD operations with NestJS backend
 */ __turbopack_context__.s({
    "TenantsApi": ()=>TenantsApi
});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/api/endpoints.ts [app-client] (ecmascript)");
;
class TenantsApi {
    /**
   * Get all tenants for the current user
   */ static async getTenants(params) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].tenants.list(params);
        return response.data.data || response.data;
    }
    /**
   * Get tenant statistics
   */ static async getTenantStats() {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].tenants.stats();
        return response.data;
    }
    /**
   * Get a specific tenant by ID
   */ static async getTenant(id) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].tenants.get(id);
        return response.data;
    }
    /**
   * Create a new tenant
   */ static async createTenant(data) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].tenants.create(data);
        return response.data;
    }
    /**
   * Update an existing tenant
   */ static async updateTenant(id, data) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].tenants.update(id, data);
        return response.data;
    }
    /**
   * Delete a tenant
   */ static async deleteTenant(id) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].tenants.delete(id);
        return response.data;
    }
    /**
   * Upload tenant document
   */ static async uploadDocument(id, file, documentType) {
        const formData = new FormData();
        formData.append('document', file);
        formData.append('type', documentType);
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].tenants.uploadDocument(id, formData);
        return response.data;
    }
    /**
   * Get tenant leases
   */ static async getTenantLeases(tenantId) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].tenants.getLeases(tenantId);
        return response.data;
    }
    /**
   * Get tenant payments
   */ static async getTenantPayments(tenantId) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].tenants.getPayments(tenantId);
        return response.data;
    }
    /**
   * Get tenant maintenance requests
   */ static async getTenantMaintenance(tenantId) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].tenants.getMaintenance(tenantId);
        return response.data;
    }
    /**
   * Get tenant documents
   */ static async getTenantDocuments(tenantId) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].tenants.getDocuments(tenantId);
        return response.data;
    }
    /**
   * Invite tenant to portal
   */ static async inviteTenant(id, email) {
        const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$endpoints$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["api"].tenants.inviteTenant(id, email);
        return response.data;
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/atoms/business/tenants.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "activeTenentsAtom": ()=>activeTenentsAtom,
    "addTenantAtom": ()=>addTenantAtom,
    "clearTenantFiltersAtom": ()=>clearTenantFiltersAtom,
    "deleteTenantAtom": ()=>deleteTenantAtom,
    "filteredTenantsAtom": ()=>filteredTenantsAtom,
    "selectTenantAtom": ()=>selectTenantAtom,
    "selectedTenantAtom": ()=>selectedTenantAtom,
    "setTenantFiltersAtom": ()=>setTenantFiltersAtom,
    "setTenantsAtom": ()=>setTenantsAtom,
    "setTenantsErrorAtom": ()=>setTenantsErrorAtom,
    "setTenantsLoadingAtom": ()=>setTenantsLoadingAtom,
    "tenantFiltersAtom": ()=>tenantFiltersAtom,
    "tenantsAtom": ()=>tenantsAtom,
    "tenantsByPropertyAtom": ()=>tenantsByPropertyAtom,
    "tenantsByStatusAtom": ()=>tenantsByStatusAtom,
    "tenantsErrorAtom": ()=>tenantsErrorAtom,
    "tenantsFetchingAtom": ()=>tenantsFetchingAtom,
    "tenantsLoadingAtom": ()=>tenantsLoadingAtom,
    "tenantsQueryAtom": ()=>tenantsQueryAtom,
    "totalTenantsCountAtom": ()=>totalTenantsCountAtom,
    "updateTenantAtom": ()=>updateTenantAtom
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/vanilla.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2d$tanstack$2d$query$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/jotai-tanstack-query/dist/index.mjs [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/api/tenants.ts [app-client] (ecmascript)");
;
;
;
const tenantsAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])([]);
const selectedTenantAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null);
const tenantFiltersAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])({});
const tenantsLoadingAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(false);
const tenantsFetchingAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(false);
const tenantsErrorAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null);
const tenantsQueryAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2d$tanstack$2d$query$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["atomWithQuery"])(()=>({
        queryKey: [
            'tenants'
        ],
        queryFn: ()=>__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TenantsApi"].getTenants()
    }));
const totalTenantsCountAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(0);
const filteredTenantsAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    const tenants = get(tenantsAtom);
    const filters = get(tenantFiltersAtom);
    return tenants.filter((tenant)=>{
        if (filters.status && tenant.invitationStatus !== filters.status) return false;
        // TODO: Add propertyId relation to Tenant interface if needed
        // if (filters.propertyId && tenant.propertyId !== filters.propertyId) return false
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            const fullName = tenant.name.toLowerCase();
            return fullName.includes(query) || tenant.email.toLowerCase().includes(query);
        }
        return true;
    });
});
const activeTenentsAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>get(tenantsAtom).filter((tenant)=>tenant.invitationStatus === 'ACCEPTED'));
const tenantsByPropertyAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(()=>{
    // TODO: Add propertyId relation to Tenant interface if needed
    // const tenants = get(tenantsAtom)
    // return tenants.reduce((acc, tenant) => {
    //   const propertyId = tenant.propertyId
    //   if (propertyId) {
    //     if (!acc[propertyId]) {
    //       acc[propertyId] = []
    //     }
    //     acc[propertyId].push(tenant)
    //   }
    //   return acc
    // }, {} as Record<string, Tenant[]>)
    return {};
});
const tenantsByStatusAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    const tenants = get(tenantsAtom);
    return tenants.reduce((acc, tenant)=>{
        const status = tenant.invitationStatus;
        if (!acc[status]) {
            acc[status] = 0;
        }
        acc[status]++;
        return acc;
    }, {});
});
const setTenantsAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, tenants)=>{
    set(tenantsAtom, tenants);
    set(totalTenantsCountAtom, tenants.length);
});
const addTenantAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, tenant)=>{
    const currentTenants = get(tenantsAtom);
    set(tenantsAtom, [
        tenant,
        ...currentTenants
    ]);
    set(totalTenantsCountAtom, currentTenants.length + 1);
});
const updateTenantAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, updatedTenant)=>{
    const currentTenants = get(tenantsAtom);
    const updatedTenants = currentTenants.map((tenant)=>tenant.id === updatedTenant.id ? {
            ...tenant,
            ...updatedTenant
        } : tenant);
    set(tenantsAtom, updatedTenants);
    // Update selected tenant if it matches
    const selectedTenant = get(selectedTenantAtom);
    if ((selectedTenant === null || selectedTenant === void 0 ? void 0 : selectedTenant.id) === updatedTenant.id) {
        set(selectedTenantAtom, {
            ...selectedTenant,
            ...updatedTenant
        });
    }
});
const deleteTenantAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, tenantId)=>{
    const currentTenants = get(tenantsAtom);
    const filteredTenants = currentTenants.filter((t)=>t.id !== tenantId);
    set(tenantsAtom, filteredTenants);
    set(totalTenantsCountAtom, filteredTenants.length);
    // Clear selected tenant if it was deleted
    const selectedTenant = get(selectedTenantAtom);
    if ((selectedTenant === null || selectedTenant === void 0 ? void 0 : selectedTenant.id) === tenantId) {
        set(selectedTenantAtom, null);
    }
});
const setTenantFiltersAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, filters)=>{
    const currentFilters = get(tenantFiltersAtom);
    set(tenantFiltersAtom, {
        ...currentFilters,
        ...filters
    });
});
const clearTenantFiltersAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set)=>{
    set(tenantFiltersAtom, {});
});
const selectTenantAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, tenant)=>{
    set(selectedTenantAtom, tenant);
});
const setTenantsLoadingAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, loading)=>{
    set(tenantsLoadingAtom, loading);
});
const setTenantsErrorAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, set, error)=>{
    set(tenantsErrorAtom, error);
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/atoms/server/queries.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "propertyQueryAtom": ()=>propertyQueryAtom,
    "queryKeys": ()=>queryKeys,
    "serverPropertiesQueryAtom": ()=>serverPropertiesQueryAtom,
    "serverTenantsQueryAtom": ()=>serverTenantsQueryAtom,
    "tenantQueryAtom": ()=>tenantQueryAtom
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2d$tanstack$2d$query$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/jotai-tanstack-query/dist/index.mjs [app-client] (ecmascript) <locals>");
;
// Example API functions (these would be implemented based on your API)
const fetchProperties = async ()=>{
    // This would be your actual API call
    const response = await fetch('/api/properties');
    if (!response.ok) throw new Error('Failed to fetch properties');
    return response.json();
};
const fetchTenants = async ()=>{
    // This would be your actual API call
    const response = await fetch('/api/tenants');
    if (!response.ok) throw new Error('Failed to fetch tenants');
    return response.json();
};
const fetchPropertyById = async (id)=>{
    const response = await fetch("/api/properties/".concat(id));
    if (!response.ok) throw new Error('Failed to fetch property');
    return response.json();
};
const fetchTenantById = async (id)=>{
    const response = await fetch("/api/tenants/".concat(id));
    if (!response.ok) throw new Error('Failed to fetch tenant');
    return response.json();
};
const serverPropertiesQueryAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2d$tanstack$2d$query$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["atomWithQuery"])(()=>({
        queryKey: [
            'properties'
        ],
        queryFn: fetchProperties,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000
    }));
const serverTenantsQueryAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2d$tanstack$2d$query$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["atomWithQuery"])(()=>({
        queryKey: [
            'tenants'
        ],
        queryFn: fetchTenants,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000
    }));
const propertyQueryAtom = (id)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2d$tanstack$2d$query$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["atomWithQuery"])(()=>({
            queryKey: [
                'properties',
                id
            ],
            queryFn: ()=>fetchPropertyById(id),
            enabled: !!id,
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000
        }));
const tenantQueryAtom = (id)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2d$tanstack$2d$query$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["atomWithQuery"])(()=>({
            queryKey: [
                'tenants',
                id
            ],
            queryFn: ()=>fetchTenantById(id),
            enabled: !!id,
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000
        }));
const queryKeys = {
    properties: {
        all: [
            'properties'
        ],
        lists: ()=>[
                ...queryKeys.properties.all,
                'list'
            ],
        list: (filters)=>[
                ...queryKeys.properties.lists(),
                {
                    filters
                }
            ],
        details: ()=>[
                ...queryKeys.properties.all,
                'detail'
            ],
        detail: (id)=>[
                ...queryKeys.properties.details(),
                id
            ]
    },
    tenants: {
        all: [
            'tenants'
        ],
        lists: ()=>[
                ...queryKeys.tenants.all,
                'list'
            ],
        list: (filters)=>[
                ...queryKeys.tenants.lists(),
                {
                    filters
                }
            ],
        details: ()=>[
                ...queryKeys.tenants.all,
                'detail'
            ],
        detail: (id)=>[
                ...queryKeys.tenants.details(),
                id
            ]
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/atoms/server/mutations.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "createPropertyMutationAtom": ()=>createPropertyMutationAtom,
    "deletePropertyMutationAtom": ()=>deletePropertyMutationAtom,
    "propertyActionAtom": ()=>propertyActionAtom,
    "propertyMutationErrorAtom": ()=>propertyMutationErrorAtom,
    "propertyMutationLoadingAtom": ()=>propertyMutationLoadingAtom,
    "resetPropertyMutationStatesAtom": ()=>resetPropertyMutationStatesAtom,
    "updatePropertyMutationAtom": ()=>updatePropertyMutationAtom,
    "usePropertiesMutationsAtom": ()=>usePropertiesMutationsAtom
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/vanilla.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2d$tanstack$2d$query$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/jotai-tanstack-query/dist/index.mjs [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/api/properties.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/business/properties.ts [app-client] (ecmascript)");
;
;
;
;
const createPropertyMutationAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2d$tanstack$2d$query$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["atomWithMutation"])(()=>({
        mutationFn: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PropertiesApi"].createProperty,
        onSuccess: ()=>{
        // This will be handled by React Query cache invalidation
        },
        onError: (error)=>{
            console.error('Failed to create property:', error);
        }
    }));
const updatePropertyMutationAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2d$tanstack$2d$query$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["atomWithMutation"])(()=>({
        mutationFn: (param)=>{
            let { id, data } = param;
            return __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PropertiesApi"].updateProperty(id, data);
        },
        onSuccess: ()=>{
        // Cache will be invalidated automatically
        },
        onError: (error)=>{
            console.error('Failed to update property:', error);
        }
    }));
const deletePropertyMutationAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2d$tanstack$2d$query$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["atomWithMutation"])(()=>({
        mutationFn: (id)=>{
            return __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PropertiesApi"].deleteProperty(id);
        },
        onSuccess: ()=>{
        // Cache invalidation handled by React Query
        },
        onError: (error)=>{
            console.error('Failed to delete property:', error);
        }
    }));
const propertyActionAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, async (get, set, action)=>{
    try {
        switch(action.type){
            case 'create':
                {
                    var _propertiesQuery_refetch;
                    const createMutation = get(createPropertyMutationAtom);
                    const result = await createMutation.mutateAsync(action.data);
                    // Refetch properties list
                    const propertiesQuery = get(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["propertiesQueryAtom"]);
                    (_propertiesQuery_refetch = propertiesQuery.refetch) === null || _propertiesQuery_refetch === void 0 ? void 0 : _propertiesQuery_refetch.call(propertiesQuery);
                    return {
                        success: true,
                        data: result
                    };
                }
            case 'update':
                {
                    var _propertiesQuery_refetch1;
                    const updateMutation = get(updatePropertyMutationAtom);
                    const result = await updateMutation.mutateAsync({
                        id: action.id,
                        data: action.data
                    });
                    // Refetch properties list
                    const propertiesQuery = get(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["propertiesQueryAtom"]);
                    (_propertiesQuery_refetch1 = propertiesQuery.refetch) === null || _propertiesQuery_refetch1 === void 0 ? void 0 : _propertiesQuery_refetch1.call(propertiesQuery);
                    return {
                        success: true,
                        data: result
                    };
                }
            case 'delete':
                {
                    var _propertiesQuery_refetch2;
                    const deleteMutation = get(deletePropertyMutationAtom);
                    await deleteMutation.mutateAsync(action.id);
                    // Refetch properties list
                    const propertiesQuery = get(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["propertiesQueryAtom"]);
                    (_propertiesQuery_refetch2 = propertiesQuery.refetch) === null || _propertiesQuery_refetch2 === void 0 ? void 0 : _propertiesQuery_refetch2.call(propertiesQuery);
                    return {
                        success: true
                    };
                }
            default:
                throw new Error('Invalid property action type');
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
});
const propertyMutationLoadingAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    const createMutation = get(createPropertyMutationAtom);
    const updateMutation = get(updatePropertyMutationAtom);
    const deleteMutation = get(deletePropertyMutationAtom);
    return {
        creating: createMutation.isPending,
        updating: updateMutation.isPending,
        deleting: deleteMutation.isPending,
        isAnyLoading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
    };
});
const propertyMutationErrorAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    const createMutation = get(createPropertyMutationAtom);
    const updateMutation = get(updatePropertyMutationAtom);
    const deleteMutation = get(deletePropertyMutationAtom);
    return {
        createError: createMutation.error ? String(createMutation.error) : null,
        updateError: updateMutation.error ? String(updateMutation.error) : null,
        deleteError: deleteMutation.error ? String(deleteMutation.error) : null,
        hasAnyError: !!(createMutation.error || updateMutation.error || deleteMutation.error)
    };
});
const resetPropertyMutationStatesAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null, (get, _set)=>{
    const createMutation = get(createPropertyMutationAtom);
    const updateMutation = get(updatePropertyMutationAtom);
    const deleteMutation = get(deletePropertyMutationAtom);
    createMutation.reset();
    updateMutation.reset();
    deleteMutation.reset();
});
const usePropertiesMutationsAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])((get)=>{
    const createMutation = get(createPropertyMutationAtom);
    const updateMutation = get(updatePropertyMutationAtom);
    const deleteMutation = get(deletePropertyMutationAtom);
    const loadingStates = get(propertyMutationLoadingAtom);
    const errorStates = get(propertyMutationErrorAtom);
    return {
        // Mutation functions
        createProperty: createMutation.mutateAsync,
        updateProperty: updateMutation.mutateAsync,
        deleteProperty: deleteMutation.mutateAsync,
        // Loading states
        ...loadingStates,
        // Error states
        ...errorStates,
        // Reset functions
        resetCreate: createMutation.reset,
        resetUpdate: updateMutation.reset,
        resetDelete: deleteMutation.reset
    };
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/atoms/server/index.ts [app-client] (ecmascript) <locals>": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$server$2f$queries$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/server/queries.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$server$2f$mutations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/server/mutations.ts [app-client] (ecmascript)");
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/atoms/server/index.ts [app-client] (ecmascript) <module evaluation>": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$server$2f$queries$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/server/queries.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$server$2f$mutations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/server/mutations.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$server$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/server/index.ts [app-client] (ecmascript) <locals>");
}),
"[project]/apps/frontend/src/atoms/index.ts [app-client] (ecmascript) <locals>": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
// Core atoms
__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/core/user.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$effects$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/core/effects.ts [app-client] (ecmascript)");
// UI atoms
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$theme$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/ui/theme.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$notifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/ui/notifications.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$modals$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/ui/modals.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$forms$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/ui/forms.ts [app-client] (ecmascript)");
// Business atoms
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/business/properties.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/business/tenants.ts [app-client] (ecmascript)");
// Server state atoms
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$server$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/server/index.ts [app-client] (ecmascript) <module evaluation>");
;
;
;
;
;
;
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/atoms/index.ts [app-client] (ecmascript) <module evaluation>": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/core/user.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$effects$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/core/effects.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$theme$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/ui/theme.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$notifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/ui/notifications.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$modals$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/ui/modals.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$forms$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/ui/forms.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/business/properties.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/business/tenants.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$server$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/server/index.ts [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/index.ts [app-client] (ecmascript) <locals>");
}),
"[project]/apps/frontend/src/hooks/use-atoms.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "useActiveTenants": ()=>useActiveTenants,
    "useAuth": ()=>useAuth,
    "useAuthLoading": ()=>useAuthLoading,
    "useFilteredProperties": ()=>useFilteredProperties,
    "useFilteredTenants": ()=>useFilteredTenants,
    "useIsAuthenticated": ()=>useIsAuthenticated,
    "useModal": ()=>useModal,
    "useModals": ()=>useModals,
    "useNotifications": ()=>useNotifications,
    "useOrganization": ()=>useOrganization,
    "useProperties": ()=>useProperties,
    "usePropertyFilters": ()=>usePropertyFilters,
    "useSelectedProperty": ()=>useSelectedProperty,
    "useSelectedTenant": ()=>useSelectedTenant,
    "useTenantFilters": ()=>useTenantFilters,
    "useTenants": ()=>useTenants,
    "useTheme": ()=>useTheme,
    "useUser": ()=>useUser
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/react.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/index.ts [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/core/user.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$theme$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/ui/theme.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$notifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/ui/notifications.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$modals$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/ui/modals.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/business/properties.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$server$2f$mutations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/server/mutations.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/business/tenants.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature(), _s4 = __turbopack_context__.k.signature(), _s5 = __turbopack_context__.k.signature(), _s6 = __turbopack_context__.k.signature(), _s7 = __turbopack_context__.k.signature(), _s8 = __turbopack_context__.k.signature(), _s9 = __turbopack_context__.k.signature(), _s10 = __turbopack_context__.k.signature(), _s11 = __turbopack_context__.k.signature(), _s12 = __turbopack_context__.k.signature(), _s13 = __turbopack_context__.k.signature(), _s14 = __turbopack_context__.k.signature(), _s15 = __turbopack_context__.k.signature(), _s16 = __turbopack_context__.k.signature(), _s17 = __turbopack_context__.k.signature();
'use client';
;
;
function useAuth() {
    _s();
    const user = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["userAtom"]);
    const isAuthenticated = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isAuthenticatedAtom"]);
    const isLoading = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authLoadingAtom"]);
    const organization = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["organizationAtom"]);
    const isSessionActive = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isSessionActiveAtom"]);
    const permissions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["userPermissionsAtom"]);
    const role = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["userRoleAtom"]);
    const subscription = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subscriptionStatusAtom"]);
    const setUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setUserAtom"]);
    const updateUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateUserAtom"]);
    const clearAuth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearAuthAtom"]);
    const updateActivity = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateLastActivityAtom"]);
    return {
        // State
        user,
        isAuthenticated,
        isLoading,
        organization,
        isSessionActive,
        permissions,
        role,
        subscription,
        // Actions
        setUser,
        updateUser,
        clearAuth,
        updateActivity
    };
}
_s(useAuth, "z+/goQgoxjECkZxzbjzMdt8sULk=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"]
    ];
});
const useUser = ()=>{
    _s1();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["userAtom"]);
};
_s1(useUser, "ZVRRUipwa0Th20s2u0xzYzJSEZE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"]
    ];
});
const useIsAuthenticated = ()=>{
    _s2();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isAuthenticatedAtom"]);
};
_s2(useIsAuthenticated, "ZVRRUipwa0Th20s2u0xzYzJSEZE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"]
    ];
});
const useAuthLoading = ()=>{
    _s3();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authLoadingAtom"]);
};
_s3(useAuthLoading, "ZVRRUipwa0Th20s2u0xzYzJSEZE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"]
    ];
});
const useOrganization = ()=>{
    _s4();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["organizationAtom"]);
};
_s4(useOrganization, "ZVRRUipwa0Th20s2u0xzYzJSEZE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"]
    ];
});
function useTheme() {
    _s5();
    const [theme, setTheme] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$theme$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["themeAtom"]);
    const [sidebarOpen, setSidebarOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$theme$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["sidebarOpenAtom"]);
    const isOnline = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$theme$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isOnlineAtom"]);
    const features = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$theme$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["featureFlagsAtom"]);
    const toggleSidebar = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$theme$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toggleSidebarAtom"]);
    const toggleFeature = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$theme$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toggleFeatureAtom"]);
    return {
        // State
        theme,
        sidebarOpen,
        isOnline,
        features,
        // Actions
        setTheme,
        setSidebarOpen,
        toggleSidebar,
        toggleFeature
    };
}
_s5(useTheme, "zDeuiq8AOPZK4bxluwLq0kOlFbw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"]
    ];
});
function useNotifications() {
    _s6();
    const notifications = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$notifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["notificationsAtom"]);
    const unreadNotifications = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$notifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["unreadNotificationsAtom"]);
    const addNotification = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$notifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addNotificationAtom"]);
    const removeNotification = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$notifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["removeNotificationAtom"]);
    const clearNotifications = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$notifications$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearNotificationsAtom"]);
    return {
        // State
        notifications,
        unreadNotifications,
        // Actions
        addNotification,
        removeNotification,
        clearNotifications
    };
}
_s6(useNotifications, "Bs8sD/RaAJcAH2+mfXnX0Zwx+Es=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"]
    ];
});
function useModals() {
    _s7();
    const modals = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$modals$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["modalsAtom"]);
    const openModal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$modals$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["openModalAtom"]);
    const closeModal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$modals$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["closeModalAtom"]);
    const closeAllModals = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$modals$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["closeAllModalsAtom"]);
    return {
        // State
        modals,
        // Actions
        openModal,
        closeModal,
        closeAllModals
    };
}
_s7(useModals, "JFRaSKM3YmdkHwyNknkY8r1vuRs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"]
    ];
});
function useModal(modalName) {
    _s8();
    const isOpen = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$modals$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isModalOpenAtom"])(modalName));
    const openModal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$modals$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["openModalAtom"]);
    const closeModal = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$ui$2f$modals$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["closeModalAtom"]);
    return {
        isOpen,
        open: ()=>openModal(modalName),
        close: ()=>closeModal(modalName)
    };
}
_s8(useModal, "Uq3xE+z9Z8cDWsCdQiP81+Tf7Cw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"]
    ];
});
function useProperties() {
    _s9();
    const properties = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["propertiesAtom"]);
    const selectedProperty = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectedPropertyAtom"]);
    const filters = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["propertyFiltersAtom"]);
    const filteredProperties = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["filteredPropertiesAtom"]);
    const vacantUnitsCount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["vacantUnitsCountAtom"]);
    const propertiesByCity = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["propertiesByCityAtom"]);
    // Import mutation atoms from server layer
    const mutations = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$server$2f$mutations$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePropertiesMutationsAtom"]);
    const selectProperty = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectPropertyAtom"]);
    const setFilters = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setPropertyFiltersAtom"]);
    const clearFilters = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearPropertyFiltersAtom"]);
    return {
        // State
        properties,
        selectedProperty,
        filters,
        filteredProperties,
        vacantUnitsCount,
        propertiesByCity,
        // Actions from mutations
        createProperty: mutations.createProperty,
        updateProperty: mutations.updateProperty,
        deleteProperty: mutations.deleteProperty,
        selectProperty,
        setFilters,
        clearFilters
    };
}
_s9(useProperties, "/I7XPvHfvOpLuYYkFMti+lUMCmk=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"]
    ];
});
function useTenants() {
    _s10();
    const tenants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tenantsAtom"]);
    const selectedTenant = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectedTenantAtom"]);
    const filters = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tenantFiltersAtom"]);
    const filteredTenants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["filteredTenantsAtom"]);
    const activeTenants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["activeTenentsAtom"]);
    const tenantsByProperty = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tenantsByPropertyAtom"]);
    const tenantsByStatus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tenantsByStatusAtom"]);
    const setTenants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setTenantsAtom"]);
    const addTenant = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addTenantAtom"]);
    const updateTenant = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["updateTenantAtom"]);
    const deleteTenant = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deleteTenantAtom"]);
    const selectTenant = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectTenantAtom"]);
    const setFilters = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setTenantFiltersAtom"]);
    const clearFilters = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearTenantFiltersAtom"]);
    return {
        // State
        tenants,
        selectedTenant,
        filters,
        filteredTenants,
        activeTenants,
        tenantsByProperty,
        tenantsByStatus,
        // Actions
        setTenants,
        addTenant,
        updateTenant,
        deleteTenant,
        selectTenant,
        setFilters,
        clearFilters
    };
}
_s10(useTenants, "W03HJqkMt6bANLQKszrn5yyoklM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSetAtom"]
    ];
});
const useSelectedProperty = ()=>{
    _s11();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectedPropertyAtom"]);
};
_s11(useSelectedProperty, "ZVRRUipwa0Th20s2u0xzYzJSEZE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"]
    ];
});
const usePropertyFilters = ()=>{
    _s12();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["propertyFiltersAtom"]);
};
_s12(usePropertyFilters, "ZVRRUipwa0Th20s2u0xzYzJSEZE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"]
    ];
});
const useFilteredProperties = ()=>{
    _s13();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["filteredPropertiesAtom"]);
};
_s13(useFilteredProperties, "ZVRRUipwa0Th20s2u0xzYzJSEZE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"]
    ];
});
const useSelectedTenant = ()=>{
    _s14();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectedTenantAtom"]);
};
_s14(useSelectedTenant, "ZVRRUipwa0Th20s2u0xzYzJSEZE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"]
    ];
});
const useTenantFilters = ()=>{
    _s15();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tenantFiltersAtom"]);
};
_s15(useTenantFilters, "ZVRRUipwa0Th20s2u0xzYzJSEZE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"]
    ];
});
const useFilteredTenants = ()=>{
    _s16();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["filteredTenantsAtom"]);
};
_s16(useFilteredTenants, "ZVRRUipwa0Th20s2u0xzYzJSEZE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"]
    ];
});
const useActiveTenants = ()=>{
    _s17();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["activeTenentsAtom"]);
};
_s17(useActiveTenants, "ZVRRUipwa0Th20s2u0xzYzJSEZE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtomValue"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/auth-api.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Authentication API functions
 * Handles auth operations with the backend
 */ __turbopack_context__.s({
    "AuthApi": ()=>AuthApi
});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/api-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/supabase.ts [app-client] (ecmascript)");
;
;
class AuthApi {
    /**
   * Login with email and password
   */ static async login(credentials) {
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password
        });
        if (error) {
            throw {
                message: error.message,
                code: error.message
            };
        }
        if (!data.session || !data.user) {
            throw {
                message: 'Login failed - no session created'
            };
        }
        // Sync with backend and get user profile
        try {
            const backendUser = await this.syncWithBackend();
            return {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_in: data.session.expires_in || 3600,
                user: backendUser
            };
        } catch (backendError) {
            // If backend sync fails, still return the Supabase session
            console.warn('Backend sync failed during login:', backendError);
            return {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_in: data.session.expires_in || 3600,
                user: this.mapSupabaseUser(data.user)
            };
        }
    }
    /**
   * Sign up new user
   */ static async signup(credentials) {
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.signUp({
            email: credentials.email,
            password: credentials.password,
            options: {
                data: {
                    name: credentials.name,
                    full_name: credentials.name
                }
            }
        });
        if (error) {
            throw {
                message: error.message,
                code: error.message
            };
        }
        if (!data.user) {
            throw {
                message: 'Signup failed - user not created'
            };
        }
        return {
            message: 'Account created successfully. Please check your email to verify your account.'
        };
    }
    /**
   * Logout current user
   */ static async logout() {
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.signOut();
        if (error) {
            console.warn('Logout error:', error);
        }
    }
    /**
   * Get current session
   */ static async getCurrentSession() {
        const { data: { session } } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
        if (!session) {
            return null;
        }
        try {
            const backendUser = await this.syncWithBackend();
            return {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_in: session.expires_in || 3600,
                user: backendUser
            };
        } catch (error) {
            console.warn('Failed to sync with backend:', error);
            return null;
        }
    }
    /**
   * Refresh session
   */ static async refreshSession() {
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.refreshSession();
        if (error || !data.session) {
            return null;
        }
        try {
            const backendUser = await this.syncWithBackend();
            return {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_in: data.session.expires_in || 3600,
                user: backendUser
            };
        } catch (error) {
            console.warn('Failed to sync with backend during refresh:', error);
            return null;
        }
    }
    /**
   * Sync user with backend (validates token and gets user profile)
   */ static async syncWithBackend() {
        try {
            // The backend auth service will validate the token and return user data
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/auth/me');
            // Handle both wrapped and direct user response formats
            if (response.data && typeof response.data === 'object' && 'user' in response.data && response.data.user) {
                return response.data.user;
            }
            // If response.data is directly the user object
            return response.data;
        } catch (error) {
            console.error('Backend sync failed:', error);
            throw error;
        }
    }
    /**
   * Map Supabase user to our User interface (fallback)
   */ static mapSupabaseUser(supabaseUser) {
        var _supabaseUser_user_metadata, _supabaseUser_user_metadata1, _supabaseUser_user_metadata2;
        return {
            id: supabaseUser.id,
            email: supabaseUser.email,
            name: ((_supabaseUser_user_metadata = supabaseUser.user_metadata) === null || _supabaseUser_user_metadata === void 0 ? void 0 : _supabaseUser_user_metadata.name) || ((_supabaseUser_user_metadata1 = supabaseUser.user_metadata) === null || _supabaseUser_user_metadata1 === void 0 ? void 0 : _supabaseUser_user_metadata1.full_name),
            avatarUrl: (_supabaseUser_user_metadata2 = supabaseUser.user_metadata) === null || _supabaseUser_user_metadata2 === void 0 ? void 0 : _supabaseUser_user_metadata2.avatar_url,
            role: 'OWNER',
            emailVerified: !!supabaseUser.email_confirmed_at,
            createdAt: supabaseUser.created_at,
            updatedAt: supabaseUser.updated_at,
            supabaseId: supabaseUser.id,
            phone: null,
            bio: null,
            stripeCustomerId: null,
            organizationId: null
        };
    }
    /**
   * Reset password
   */ static async resetPassword(email) {
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.resetPasswordForEmail(email, {
            redirectTo: "".concat(window.location.origin, "/auth/reset-password")
        });
        if (error) {
            throw {
                message: error.message,
                code: error.message
            };
        }
        return {
            message: 'Password reset email sent. Please check your inbox.'
        };
    }
    /**
   * Update password
   */ static async updatePassword(newPassword) {
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.updateUser({
            password: newPassword
        });
        if (error) {
            throw {
                message: error.message,
                code: error.message
            };
        }
        return {
            message: 'Password updated successfully.'
        };
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/hooks/use-auth.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Authentication hook
 * Provides auth state and actions using Jotai
 */ __turbopack_context__.s({
    "useAuth": ()=>useAuth,
    "useMe": ()=>useMe
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/react.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/supabase.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$auth$2d$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/auth-api.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/core/user.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
;
;
;
;
;
;
function useAuth() {
    _s();
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["userAtom"]);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authLoadingAtom"]);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$core$2f$user$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authErrorAtom"]);
    // Initialize auth state
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useAuth.useEffect": ()=>{
            let mounted = true;
            const initializeAuth = {
                "useAuth.useEffect.initializeAuth": async ()=>{
                    try {
                        setLoading(true);
                        const session = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$auth$2d$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuthApi"].getCurrentSession();
                        if (mounted) {
                            setUser((session === null || session === void 0 ? void 0 : session.user) || null);
                        }
                    } catch (error) {
                        console.error('Auth initialization failed:', error);
                        if (mounted) {
                            setUser(null);
                        }
                    } finally{
                        if (mounted) {
                            setLoading(false);
                        }
                    }
                }
            }["useAuth.useEffect.initializeAuth"];
            initializeAuth();
            // Listen for auth state changes
            const { data: { subscription } } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$supabase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["onAuthStateChange"])({
                "useAuth.useEffect": async (event, session)=>{
                    if (!mounted) return;
                    try {
                        if (event === 'SIGNED_OUT' || !session) {
                            setUser(null);
                            setError(null);
                        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                            // Sync with backend when signed in
                            try {
                                const authSession = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$auth$2d$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuthApi"].getCurrentSession();
                                setUser((authSession === null || authSession === void 0 ? void 0 : authSession.user) || null);
                            } catch (backendError) {
                                console.warn('Backend sync failed:', backendError);
                                // Keep the user logged in with Supabase data only
                                if (session.user) {
                                    var _session_user_user_metadata, _session_user_user_metadata1, _session_user_user_metadata2;
                                    setUser({
                                        id: session.user.id,
                                        email: session.user.email,
                                        name: (_session_user_user_metadata = session.user.user_metadata) === null || _session_user_user_metadata === void 0 ? void 0 : _session_user_user_metadata.name,
                                        avatarUrl: (_session_user_user_metadata1 = session.user.user_metadata) === null || _session_user_user_metadata1 === void 0 ? void 0 : _session_user_user_metadata1.avatar_url,
                                        // Use role from user metadata or default to TENANT (least privileged)
                                        role: ((_session_user_user_metadata2 = session.user.user_metadata) === null || _session_user_user_metadata2 === void 0 ? void 0 : _session_user_user_metadata2.role) || 'TENANT',
                                        emailVerified: !!session.user.email_confirmed_at,
                                        createdAt: session.user.created_at,
                                        updatedAt: session.user.updated_at,
                                        supabaseId: session.user.id,
                                        phone: null,
                                        bio: null,
                                        stripeCustomerId: null,
                                        organizationId: null
                                    });
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Auth state change error:', error);
                    }
                }
            }["useAuth.useEffect"]);
            return ({
                "useAuth.useEffect": ()=>{
                    mounted = false;
                    subscription.unsubscribe();
                }
            })["useAuth.useEffect"];
        }
    }["useAuth.useEffect"], [
        setUser,
        setLoading,
        setError
    ]);
    // Login function
    const login = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAuth.useCallback[login]": async (credentials)=>{
            try {
                setLoading(true);
                setError(null);
                const session = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$auth$2d$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuthApi"].login(credentials);
                setUser(session.user);
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Welcome back!');
                return {
                    success: true
                };
            } catch (error) {
                const authError = {
                    type: 'AUTH_ERROR',
                    message: error instanceof Error ? error.message : 'Login failed',
                    code: error instanceof Error && 'code' in error ? error.code : 'AUTH_ERROR'
                };
                setError(authError);
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(authError.message);
                return {
                    success: false,
                    error: authError
                };
            } finally{
                setLoading(false);
            }
        }
    }["useAuth.useCallback[login]"], [
        setUser,
        setLoading,
        setError
    ]);
    // Signup function
    const signup = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAuth.useCallback[signup]": async (credentials)=>{
            try {
                setLoading(true);
                setError(null);
                const result = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$auth$2d$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuthApi"].signup(credentials);
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success(result.message);
                return {
                    success: true,
                    message: result.message
                };
            } catch (error) {
                const authError = {
                    type: 'AUTH_ERROR',
                    message: error instanceof Error ? error.message : 'Signup failed',
                    code: error instanceof Error && 'code' in error ? error.code : 'AUTH_ERROR'
                };
                setError(authError);
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(authError.message);
                return {
                    success: false,
                    error: authError
                };
            } finally{
                setLoading(false);
            }
        }
    }["useAuth.useCallback[signup]"], [
        setLoading,
        setError
    ]);
    // Logout function
    const logout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAuth.useCallback[logout]": async ()=>{
            try {
                setLoading(true);
                await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$auth$2d$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuthApi"].logout();
                setUser(null);
                setError(null);
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Logged out successfully');
            } catch (error) {
                console.error('Logout error:', error);
                // Clear local state even if logout fails
                setUser(null);
                setError(null);
            } finally{
                setLoading(false);
            }
        }
    }["useAuth.useCallback[logout]"], [
        setUser,
        setLoading,
        setError
    ]);
    // Reset password function
    const resetPassword = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useAuth.useCallback[resetPassword]": async (email)=>{
            try {
                setLoading(true);
                setError(null);
                const result = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$auth$2d$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AuthApi"].resetPassword(email);
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success(result.message);
                return {
                    success: true,
                    message: result.message
                };
            } catch (error) {
                const authError = {
                    type: 'AUTH_ERROR',
                    message: error instanceof Error ? error.message : 'Password reset failed',
                    code: error instanceof Error && 'code' in error ? error.code : 'AUTH_ERROR'
                };
                setError(authError);
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(authError.message);
                return {
                    success: false,
                    error: authError
                };
            } finally{
                setLoading(false);
            }
        }
    }["useAuth.useCallback[resetPassword]"], [
        setLoading,
        setError
    ]);
    return {
        // State
        user,
        loading,
        error,
        isAuthenticated: !!user,
        // Actions
        login,
        signup,
        logout,
        resetPassword
    };
}
_s(useAuth, "9UDt66KrqRf5ySwlCNuoEpTusVY=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"]
    ];
});
const useMe = ()=>{
    _s1();
    const { user, loading, error } = useAuth();
    return {
        data: user,
        isLoading: loading,
        error
    };
};
_s1(useMe, "0Oj1uxQ9sPd1TYF7cc1lBwLoQgk=", false, function() {
    return [
        useAuth
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/hooks/use-properties.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Properties hook
 * Provides properties data and actions using Jotai queries
 */ __turbopack_context__.s({
    "useProperties": ()=>useProperties
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/react.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/business/properties.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/api/properties.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
function useProperties() {
    _s();
    const [propertiesQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["propertiesQueryAtom"]);
    const [propertyStatsQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["propertyStatsQueryAtom"]);
    const [selectedProperty, setSelectedProperty] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectedPropertyAtom"]);
    const [filters, setFilters] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["propertyFiltersAtom"]);
    // Create property
    const createProperty = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useProperties.useCallback[createProperty]": async (data)=>{
            try {
                var // Invalidate queries to refetch data
                _propertiesQuery_refetch, _propertyStatsQuery_refetch;
                const property = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PropertiesApi"].createProperty(data);
                (_propertiesQuery_refetch = propertiesQuery.refetch) === null || _propertiesQuery_refetch === void 0 ? void 0 : _propertiesQuery_refetch.call(propertiesQuery);
                (_propertyStatsQuery_refetch = propertyStatsQuery.refetch) === null || _propertyStatsQuery_refetch === void 0 ? void 0 : _propertyStatsQuery_refetch.call(propertyStatsQuery);
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Property created successfully');
                return {
                    success: true,
                    data: property
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to create property';
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(message);
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useProperties.useCallback[createProperty]"], [
        propertiesQuery,
        propertyStatsQuery
    ]);
    // Update property
    const updateProperty = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useProperties.useCallback[updateProperty]": async (id, data)=>{
            try {
                var // Invalidate queries to refetch data
                _propertiesQuery_refetch, _propertyStatsQuery_refetch;
                const property = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PropertiesApi"].updateProperty(id, data);
                (_propertiesQuery_refetch = propertiesQuery.refetch) === null || _propertiesQuery_refetch === void 0 ? void 0 : _propertiesQuery_refetch.call(propertiesQuery);
                (_propertyStatsQuery_refetch = propertyStatsQuery.refetch) === null || _propertyStatsQuery_refetch === void 0 ? void 0 : _propertyStatsQuery_refetch.call(propertyStatsQuery);
                // Update selected property if it's the one being updated
                if ((selectedProperty === null || selectedProperty === void 0 ? void 0 : selectedProperty.id) === id) {
                    setSelectedProperty({
                        ...selectedProperty,
                        ...property
                    });
                }
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Property updated successfully');
                return {
                    success: true,
                    data: property
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to update property';
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(message);
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useProperties.useCallback[updateProperty]"], [
        propertiesQuery,
        propertyStatsQuery,
        selectedProperty,
        setSelectedProperty
    ]);
    // Delete property
    const deleteProperty = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useProperties.useCallback[deleteProperty]": async (id)=>{
            try {
                var // Invalidate queries to refetch data
                _propertiesQuery_refetch, _propertyStatsQuery_refetch;
                await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PropertiesApi"].deleteProperty(id);
                (_propertiesQuery_refetch = propertiesQuery.refetch) === null || _propertiesQuery_refetch === void 0 ? void 0 : _propertiesQuery_refetch.call(propertiesQuery);
                (_propertyStatsQuery_refetch = propertyStatsQuery.refetch) === null || _propertyStatsQuery_refetch === void 0 ? void 0 : _propertyStatsQuery_refetch.call(propertyStatsQuery);
                // Clear selected property if it's the one being deleted
                if ((selectedProperty === null || selectedProperty === void 0 ? void 0 : selectedProperty.id) === id) {
                    setSelectedProperty(null);
                }
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Property deleted successfully');
                return {
                    success: true
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to delete property';
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(message);
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useProperties.useCallback[deleteProperty]"], [
        propertiesQuery,
        propertyStatsQuery,
        selectedProperty,
        setSelectedProperty
    ]);
    // Get single property
    const getProperty = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useProperties.useCallback[getProperty]": async (id)=>{
            try {
                const property = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PropertiesApi"].getProperty(id);
                return {
                    success: true,
                    data: property
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to fetch property';
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useProperties.useCallback[getProperty]"], []);
    return {
        // Data
        properties: propertiesQuery.data || [],
        stats: propertyStatsQuery.data || null,
        selectedProperty,
        filters,
        // Loading states
        isLoading: propertiesQuery.isLoading,
        isLoadingStats: propertyStatsQuery.isLoading,
        isFetching: propertiesQuery.isFetching,
        isError: propertiesQuery.isError || propertyStatsQuery.isError,
        error: propertiesQuery.error || propertyStatsQuery.error,
        // Actions
        createProperty,
        updateProperty,
        deleteProperty,
        getProperty,
        setSelectedProperty,
        setFilters,
        refetch: propertiesQuery.refetch,
        refetchStats: propertyStatsQuery.refetch
    };
}
_s(useProperties, "HXXNrygwAV9ptFuYfT8q056d0Co=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/hooks/use-tenants.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Tenants hook
 * Provides tenants data and actions using Jotai queries
 */ __turbopack_context__.s({
    "useTenants": ()=>useTenants
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/react.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/atoms/business/tenants.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/api/tenants.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
;
;
;
;
function useTenants() {
    _s();
    const [tenantsQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tenantsQueryAtom"]);
    const [selectedTenant, setSelectedTenant] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectedTenantAtom"]);
    const [filters, setFilters] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$atoms$2f$business$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tenantFiltersAtom"]);
    // Create tenant
    const createTenant = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useTenants.useCallback[createTenant]": async (data)=>{
            try {
                var // Invalidate query to refetch data
                _tenantsQuery_refetch;
                const tenant = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TenantsApi"].createTenant(data);
                (_tenantsQuery_refetch = tenantsQuery.refetch) === null || _tenantsQuery_refetch === void 0 ? void 0 : _tenantsQuery_refetch.call(tenantsQuery);
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Tenant created successfully');
                return {
                    success: true,
                    data: tenant
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to create tenant';
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(message);
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useTenants.useCallback[createTenant]"], [
        tenantsQuery
    ]);
    // Update tenant
    const updateTenant = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useTenants.useCallback[updateTenant]": async (id, data)=>{
            try {
                var // Invalidate query to refetch data
                _tenantsQuery_refetch;
                const tenant = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TenantsApi"].updateTenant(id, data);
                (_tenantsQuery_refetch = tenantsQuery.refetch) === null || _tenantsQuery_refetch === void 0 ? void 0 : _tenantsQuery_refetch.call(tenantsQuery);
                // Update selected tenant if it's the one being updated
                if ((selectedTenant === null || selectedTenant === void 0 ? void 0 : selectedTenant.id) === id) {
                    setSelectedTenant({
                        ...selectedTenant,
                        ...tenant
                    });
                }
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Tenant updated successfully');
                return {
                    success: true,
                    data: tenant
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to update tenant';
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(message);
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useTenants.useCallback[updateTenant]"], [
        tenantsQuery,
        selectedTenant,
        setSelectedTenant
    ]);
    // Delete tenant
    const deleteTenant = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useTenants.useCallback[deleteTenant]": async (id)=>{
            try {
                var // Invalidate query to refetch data
                _tenantsQuery_refetch;
                await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TenantsApi"].deleteTenant(id);
                (_tenantsQuery_refetch = tenantsQuery.refetch) === null || _tenantsQuery_refetch === void 0 ? void 0 : _tenantsQuery_refetch.call(tenantsQuery);
                // Clear selected tenant if it's the one being deleted
                if ((selectedTenant === null || selectedTenant === void 0 ? void 0 : selectedTenant.id) === id) {
                    setSelectedTenant(null);
                }
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Tenant deleted successfully');
                return {
                    success: true
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to delete tenant';
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(message);
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useTenants.useCallback[deleteTenant]"], [
        tenantsQuery,
        selectedTenant,
        setSelectedTenant
    ]);
    // Get single tenant
    const getTenant = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useTenants.useCallback[getTenant]": async (id)=>{
            try {
                const tenant = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TenantsApi"].getTenant(id);
                return {
                    success: true,
                    data: tenant
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to fetch tenant';
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useTenants.useCallback[getTenant]"], []);
    return {
        // Data
        tenants: tenantsQuery.data || [],
        selectedTenant,
        filters,
        // Loading states
        isLoading: tenantsQuery.isLoading,
        isFetching: tenantsQuery.isFetching,
        isError: tenantsQuery.isError,
        error: tenantsQuery.error,
        // Actions
        createTenant,
        updateTenant,
        deleteTenant,
        getTenant,
        setSelectedTenant,
        setFilters,
        refetch: tenantsQuery.refetch
    };
}
_s(useTenants, "HNJ1j7PYvMx9ZNdhUxcG0ILdq08=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/hooks/use-lease-management.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Lease Management hook
 * Provides lease data and actions using Jotai queries
 * Migrated from Vite/TanStack Router backup
 */ __turbopack_context__.s({
    "useLeaseManagement": ()=>useLeaseManagement
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/react.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/vanilla.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/api-client.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
;
;
;
// Create proper Jotai atoms
const leasesAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])({
    data: [],
    isLoading: false,
    error: null,
    refetch: ()=>{}
});
const selectedLeaseAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null);
function useLeaseManagement() {
    _s();
    const [leasesQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(leasesAtom);
    const [selectedLease, setSelectedLease] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(selectedLeaseAtom);
    // Get all leases
    const getLeases = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useLeaseManagement.useCallback[getLeases]": async (params)=>{
            try {
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/leases', {
                    params
                });
                return {
                    success: true,
                    data: response.data
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to fetch leases';
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useLeaseManagement.useCallback[getLeases]"], []);
    // Get single lease
    const getLease = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useLeaseManagement.useCallback[getLease]": async (id)=>{
            try {
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/leases/".concat(id));
                return {
                    success: true,
                    data: response.data
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to fetch lease';
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useLeaseManagement.useCallback[getLease]"], []);
    // Create lease
    const createLease = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useLeaseManagement.useCallback[createLease]": async (data)=>{
            try {
                var // Refetch leases to update the list
                _leasesQuery_refetch;
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/leases', data);
                (_leasesQuery_refetch = leasesQuery.refetch) === null || _leasesQuery_refetch === void 0 ? void 0 : _leasesQuery_refetch.call(leasesQuery);
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Lease created successfully');
                return {
                    success: true,
                    data: response.data
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to create lease';
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(message);
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useLeaseManagement.useCallback[createLease]"], [
        leasesQuery
    ]);
    // Update lease
    const updateLease = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useLeaseManagement.useCallback[updateLease]": async (id, data)=>{
            try {
                var // Refetch leases to update the list
                _leasesQuery_refetch;
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].put("/leases/".concat(id), data);
                (_leasesQuery_refetch = leasesQuery.refetch) === null || _leasesQuery_refetch === void 0 ? void 0 : _leasesQuery_refetch.call(leasesQuery);
                // Update selected lease if it's the one being updated
                if ((selectedLease === null || selectedLease === void 0 ? void 0 : selectedLease.id) === id) {
                    setSelectedLease({
                        ...selectedLease,
                        ...response.data
                    });
                }
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Lease updated successfully');
                return {
                    success: true,
                    data: response.data
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to update lease';
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(message);
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useLeaseManagement.useCallback[updateLease]"], [
        leasesQuery,
        selectedLease,
        setSelectedLease
    ]);
    // Delete lease
    const deleteLease = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useLeaseManagement.useCallback[deleteLease]": async (id)=>{
            try {
                var // Refetch leases to update the list
                _leasesQuery_refetch;
                await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete("/leases/".concat(id));
                (_leasesQuery_refetch = leasesQuery.refetch) === null || _leasesQuery_refetch === void 0 ? void 0 : _leasesQuery_refetch.call(leasesQuery);
                // Clear selected lease if it's the one being deleted
                if ((selectedLease === null || selectedLease === void 0 ? void 0 : selectedLease.id) === id) {
                    setSelectedLease(null);
                }
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Lease deleted successfully');
                return {
                    success: true
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to delete lease';
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(message);
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useLeaseManagement.useCallback[deleteLease]"], [
        leasesQuery,
        selectedLease,
        setSelectedLease
    ]);
    // Generate lease document
    const generateLeaseDocument = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useLeaseManagement.useCallback[generateLeaseDocument]": async (id)=>{
            try {
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post("/leases/".concat(id, "/generate-document"));
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Lease document generated successfully');
                return {
                    success: true,
                    data: response.data
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to generate lease document';
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(message);
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useLeaseManagement.useCallback[generateLeaseDocument]"], []);
    // Get lease expiration alerts
    const getExpirationAlerts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useLeaseManagement.useCallback[getExpirationAlerts]": async function() {
            let daysAhead = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 30;
            try {
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/leases/expiration-alerts', {
                    params: {
                        daysAhead
                    }
                });
                return {
                    success: true,
                    data: response.data
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to fetch expiration alerts';
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useLeaseManagement.useCallback[getExpirationAlerts]"], []);
    return {
        // Data
        leases: leasesQuery.data || [],
        selectedLease,
        // Loading states
        isLoading: leasesQuery.isLoading,
        isError: leasesQuery.error,
        error: leasesQuery.error,
        // Actions
        getLeases,
        getLease,
        createLease,
        updateLease,
        deleteLease,
        generateLeaseDocument,
        getExpirationAlerts,
        setSelectedLease,
        refetch: leasesQuery.refetch
    };
}
_s(useLeaseManagement, "xqhEMWc7iWpLocKf2XAjAv9gKvY=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/hooks/use-maintenance.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Maintenance Management hook
 * Provides maintenance request data and actions using Jotai queries
 * Migrated from Vite/TanStack Router backup
 */ __turbopack_context__.s({
    "useCreateMaintenanceRequest": ()=>useCreateMaintenanceRequest,
    "useMaintenance": ()=>useMaintenance
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/react.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/jotai/esm/vanilla.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/api-client.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
;
;
;
;
;
// Create proper Jotai atoms
const maintenanceAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])({
    data: [],
    isLoading: false,
    error: null,
    refetch: ()=>{}
});
const selectedMaintenanceAtom = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$vanilla$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atom"])(null);
function useMaintenance() {
    _s();
    const [maintenanceQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(maintenanceAtom);
    const [selectedMaintenance, setSelectedMaintenance] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"])(selectedMaintenanceAtom);
    // Get all maintenance requests
    const getMaintenanceRequests = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useMaintenance.useCallback[getMaintenanceRequests]": async (params)=>{
            try {
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/maintenance', {
                    params
                });
                return {
                    success: true,
                    data: response.data
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to fetch maintenance requests';
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useMaintenance.useCallback[getMaintenanceRequests]"], []);
    // Get single maintenance request
    const getMaintenanceRequest = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useMaintenance.useCallback[getMaintenanceRequest]": async (id)=>{
            try {
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/maintenance/".concat(id));
                return {
                    success: true,
                    data: response.data
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to fetch maintenance request';
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useMaintenance.useCallback[getMaintenanceRequest]"], []);
    // Create maintenance request
    const createMaintenanceRequest = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useMaintenance.useCallback[createMaintenanceRequest]": async (data)=>{
            try {
                var // Refetch maintenance requests to update the list
                _maintenanceQuery_refetch;
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/maintenance', data);
                (_maintenanceQuery_refetch = maintenanceQuery.refetch) === null || _maintenanceQuery_refetch === void 0 ? void 0 : _maintenanceQuery_refetch.call(maintenanceQuery);
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Maintenance request created successfully');
                return {
                    success: true,
                    data: response.data
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to create maintenance request';
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(message);
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useMaintenance.useCallback[createMaintenanceRequest]"], [
        maintenanceQuery
    ]);
    // Update maintenance request
    const updateMaintenanceRequest = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useMaintenance.useCallback[updateMaintenanceRequest]": async (id, data)=>{
            try {
                var // Refetch maintenance requests to update the list
                _maintenanceQuery_refetch;
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].put("/maintenance/".concat(id), data);
                (_maintenanceQuery_refetch = maintenanceQuery.refetch) === null || _maintenanceQuery_refetch === void 0 ? void 0 : _maintenanceQuery_refetch.call(maintenanceQuery);
                // Update selected maintenance request if it's the one being updated
                if ((selectedMaintenance === null || selectedMaintenance === void 0 ? void 0 : selectedMaintenance.id) === id) {
                    setSelectedMaintenance({
                        ...selectedMaintenance,
                        ...response.data
                    });
                }
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Maintenance request updated successfully');
                return {
                    success: true,
                    data: response.data
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to update maintenance request';
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(message);
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useMaintenance.useCallback[updateMaintenanceRequest]"], [
        maintenanceQuery,
        selectedMaintenance,
        setSelectedMaintenance
    ]);
    // Delete maintenance request
    const deleteMaintenanceRequest = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useMaintenance.useCallback[deleteMaintenanceRequest]": async (id)=>{
            try {
                var // Refetch maintenance requests to update the list
                _maintenanceQuery_refetch;
                await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete("/maintenance/".concat(id));
                (_maintenanceQuery_refetch = maintenanceQuery.refetch) === null || _maintenanceQuery_refetch === void 0 ? void 0 : _maintenanceQuery_refetch.call(maintenanceQuery);
                // Clear selected maintenance request if it's the one being deleted
                if ((selectedMaintenance === null || selectedMaintenance === void 0 ? void 0 : selectedMaintenance.id) === id) {
                    setSelectedMaintenance(null);
                }
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Maintenance request deleted successfully');
                return {
                    success: true
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to delete maintenance request';
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(message);
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useMaintenance.useCallback[deleteMaintenanceRequest]"], [
        maintenanceQuery,
        selectedMaintenance,
        setSelectedMaintenance
    ]);
    // Update maintenance status
    const updateMaintenanceStatus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useMaintenance.useCallback[updateMaintenanceStatus]": async (id, status)=>{
            try {
                var // Refetch maintenance requests to update the list
                _maintenanceQuery_refetch;
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].patch("/maintenance/".concat(id, "/status"), {
                    status
                });
                (_maintenanceQuery_refetch = maintenanceQuery.refetch) === null || _maintenanceQuery_refetch === void 0 ? void 0 : _maintenanceQuery_refetch.call(maintenanceQuery);
                // Update selected maintenance request if it's the one being updated
                if ((selectedMaintenance === null || selectedMaintenance === void 0 ? void 0 : selectedMaintenance.id) === id) {
                    setSelectedMaintenance({
                        ...selectedMaintenance,
                        status: status
                    });
                }
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success("Maintenance request ".concat(status.toLowerCase()));
                return {
                    success: true,
                    data: response.data
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to update maintenance status';
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(message);
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useMaintenance.useCallback[updateMaintenanceStatus]"], [
        maintenanceQuery,
        selectedMaintenance,
        setSelectedMaintenance
    ]);
    // Get maintenance alerts
    const getMaintenanceAlerts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useMaintenance.useCallback[getMaintenanceAlerts]": async ()=>{
            try {
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/maintenance/alerts');
                return {
                    success: true,
                    data: response.data
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to fetch maintenance alerts';
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useMaintenance.useCallback[getMaintenanceAlerts]"], []);
    // Upload maintenance photos
    const uploadMaintenancePhotos = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useMaintenance.useCallback[uploadMaintenancePhotos]": async (id, files)=>{
            try {
                const formData = new FormData();
                files.forEach({
                    "useMaintenance.useCallback[uploadMaintenancePhotos]": (file, index)=>{
                        formData.append("photos[".concat(index, "]"), file);
                    }
                }["useMaintenance.useCallback[uploadMaintenancePhotos]"]);
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post("/maintenance/".concat(id, "/photos"), formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success('Photos uploaded successfully');
                return {
                    success: true,
                    data: response.data
                };
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to upload photos';
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(message);
                return {
                    success: false,
                    error: message
                };
            }
        }
    }["useMaintenance.useCallback[uploadMaintenancePhotos]"], []);
    return {
        maintenanceRequests: maintenanceQuery.data || [],
        selectedMaintenance,
        isLoading: maintenanceQuery.isLoading,
        isError: maintenanceQuery.error,
        error: maintenanceQuery.error,
        getMaintenanceRequests,
        getMaintenanceRequest,
        createMaintenanceRequest,
        updateMaintenanceRequest,
        deleteMaintenanceRequest,
        updateMaintenanceStatus,
        getMaintenanceAlerts,
        uploadMaintenancePhotos,
        setSelectedMaintenance,
        refetch: maintenanceQuery.refetch
    };
}
_s(useMaintenance, "jrpNUvRi0aJrQRm3TFqU8haLTHM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$jotai$2f$esm$2f$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAtom"]
    ];
});
function useCreateMaintenanceRequest() {
    _s1();
    const { createMaintenanceRequest } = useMaintenance();
    const [isPending, setIsPending] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    return {
        mutateAsync: async (data)=>{
            setIsPending(true);
            try {
                const result = await createMaintenanceRequest(data);
                if (!result.success) {
                    throw new Error(result.error);
                }
                return result.data;
            } finally{
                setIsPending(false);
            }
        },
        isPending
    };
}
_s1(useCreateMaintenanceRequest, "mMUnE+sFAgWRzLP7pRRie8/xVMY=", false, function() {
    return [
        useMaintenance
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/hooks/use-server-action.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "useServerAction": ()=>useServerAction
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
;
;
function useServerAction(action) {
    let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    _s();
    const [isPending, startTransition] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTransition"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const { onSuccess, onError, showSuccessToast = true, showErrorToast = true, successMessage = 'Action completed successfully', revalidatePath } = options;
    const execute = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useServerAction.useCallback[execute]": async function() {
            for(var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++){
                args[_key] = arguments[_key];
            }
            return new Promise({
                "useServerAction.useCallback[execute]": (resolve)=>{
                    startTransition({
                        "useServerAction.useCallback[execute]": async ()=>{
                            try {
                                const result = await action(...args);
                                if (result.success) {
                                    if (showSuccessToast) {
                                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success(result.message || successMessage);
                                    }
                                    if (revalidatePath) {
                                        router.push(revalidatePath);
                                    }
                                    onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess(result.data);
                                } else {
                                    var _result_errors__form, _result_errors;
                                    const errorMessage = ((_result_errors = result.errors) === null || _result_errors === void 0 ? void 0 : (_result_errors__form = _result_errors._form) === null || _result_errors__form === void 0 ? void 0 : _result_errors__form[0]) || result.message || 'Action failed';
                                    if (showErrorToast) {
                                        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(errorMessage);
                                    }
                                    onError === null || onError === void 0 ? void 0 : onError(errorMessage);
                                }
                                resolve(result);
                            } catch (error) {
                                const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
                                if (showErrorToast) {
                                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(errorMessage);
                                }
                                onError === null || onError === void 0 ? void 0 : onError(errorMessage);
                                const errorResult = {
                                    success: false,
                                    message: errorMessage,
                                    errors: {
                                        _form: [
                                            errorMessage
                                        ]
                                    }
                                };
                                resolve(errorResult);
                            }
                        }
                    }["useServerAction.useCallback[execute]"]);
                }
            }["useServerAction.useCallback[execute]"]);
        }
    }["useServerAction.useCallback[execute]"], [
        action,
        onSuccess,
        onError,
        showSuccessToast,
        showErrorToast,
        successMessage,
        revalidatePath,
        router
    ]);
    return [
        execute,
        isPending
    ];
}
_s(useServerAction, "Ww8OAjJcFJaxgwR68aY6entbhDI=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useTransition"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/hooks/use-optimistic-data.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "useOptimisticData": ()=>useOptimisticData,
    "useOptimisticItem": ()=>useOptimisticItem
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
;
function useOptimisticData(initialData, reducer) {
    _s();
    const defaultReducer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useOptimisticData.useCallback[defaultReducer]": (state, action)=>{
            switch(action.type){
                case 'add':
                    return action.data ? [
                        ...state,
                        action.data
                    ] : state;
                case 'update':
                    return action.data ? state.map({
                        "useOptimisticData.useCallback[defaultReducer]": (item)=>item.id === action.data.id ? action.data : item
                    }["useOptimisticData.useCallback[defaultReducer]"]) : state;
                case 'delete':
                    return action.id ? state.filter({
                        "useOptimisticData.useCallback[defaultReducer]": (item)=>item.id !== action.id
                    }["useOptimisticData.useCallback[defaultReducer]"]) : action.predicate ? state.filter({
                        "useOptimisticData.useCallback[defaultReducer]": (item)=>!action.predicate(item)
                    }["useOptimisticData.useCallback[defaultReducer]"]) : state;
                case 'replace':
                    return action.data ? [
                        action.data
                    ] : [];
                default:
                    return state;
            }
        }
    }["useOptimisticData.useCallback[defaultReducer]"], []);
    const [optimisticData, setOptimisticData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useOptimistic"])(initialData, reducer || defaultReducer);
    const addOptimistic = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useOptimisticData.useCallback[addOptimistic]": (data)=>{
            setOptimisticData({
                type: 'add',
                data
            });
        }
    }["useOptimisticData.useCallback[addOptimistic]"], [
        setOptimisticData
    ]);
    const updateOptimistic = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useOptimisticData.useCallback[updateOptimistic]": (data)=>{
            setOptimisticData({
                type: 'update',
                data
            });
        }
    }["useOptimisticData.useCallback[updateOptimistic]"], [
        setOptimisticData
    ]);
    const deleteOptimistic = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useOptimisticData.useCallback[deleteOptimistic]": (id)=>{
            setOptimisticData({
                type: 'delete',
                id
            });
        }
    }["useOptimisticData.useCallback[deleteOptimistic]"], [
        setOptimisticData
    ]);
    const deleteOptimisticWhere = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useOptimisticData.useCallback[deleteOptimisticWhere]": (predicate)=>{
            setOptimisticData({
                type: 'delete',
                predicate
            });
        }
    }["useOptimisticData.useCallback[deleteOptimisticWhere]"], [
        setOptimisticData
    ]);
    const replaceOptimistic = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useOptimisticData.useCallback[replaceOptimistic]": (data)=>{
            setOptimisticData({
                type: 'replace',
                data
            });
        }
    }["useOptimisticData.useCallback[replaceOptimistic]"], [
        setOptimisticData
    ]);
    return {
        data: optimisticData,
        addOptimistic,
        updateOptimistic,
        deleteOptimistic,
        deleteOptimisticWhere,
        replaceOptimistic,
        setOptimisticData
    };
}
_s(useOptimisticData, "ILMpToIgvtt6C9fYKt6moIwmm/0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useOptimistic"]
    ];
});
function useOptimisticItem(initialData, reducer) {
    _s1();
    const defaultReducer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useOptimisticItem.useCallback[defaultReducer]": (state, action)=>{
            if (action.type === 'update') {
                return {
                    ...state,
                    ...action.data
                };
            }
            return state;
        }
    }["useOptimisticItem.useCallback[defaultReducer]"], []);
    const [optimisticData, setOptimisticData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useOptimistic"])(initialData, reducer || defaultReducer);
    const updateOptimistic = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "useOptimisticItem.useCallback[updateOptimistic]": (data)=>{
            setOptimisticData({
                type: 'update',
                data
            });
        }
    }["useOptimisticItem.useCallback[updateOptimistic]"], [
        setOptimisticData
    ]);
    return {
        data: optimisticData,
        updateOptimistic,
        setOptimisticData
    };
}
_s1(useOptimisticItem, "3PpTFNd3k1rEp23Z1jQiL/Lg2Rs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useOptimistic"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
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
"[project]/apps/frontend/src/lib/logger.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Logger utility for frontend
 * Simple console wrapper with levels
 */ __turbopack_context__.s({
    "logger": ()=>logger
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
const logger = {
    debug: function(message) {
        for(var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++){
            args[_key - 1] = arguments[_key];
        }
        if ("TURBOPACK compile-time truthy", 1) {
            console.debug("[DEBUG] ".concat(message), ...args);
        }
    },
    info: function(message) {
        for(var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++){
            args[_key - 1] = arguments[_key];
        }
        console.info("[INFO] ".concat(message), ...args);
    },
    warn: function(message) {
        for(var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++){
            args[_key - 1] = arguments[_key];
        }
        console.warn("[WARN] ".concat(message), ...args);
    },
    error: function(message) {
        for(var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++){
            args[_key - 1] = arguments[_key];
        }
        console.error("[ERROR] ".concat(message), ...args);
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/lib/clients/supabase-oauth.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "formatAuthError": ()=>formatAuthError,
    "getSession": ()=>getSession,
    "getUser": ()=>getUser,
    "onAuthStateChange": ()=>onAuthStateChange,
    "signInWithGoogle": ()=>signInWithGoogle,
    "signOut": ()=>signOut
});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/clients/index.ts [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/clients/supabase-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/logger.ts [app-client] (ecmascript)");
;
;
async function signInWithGoogle() {
    try {
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
            return {
                success: false,
                error: 'Supabase client not initialized'
            };
        }
        // Use the same redirect URL pattern as server-side
        const redirectTo = "".concat(window.location.origin, "/auth/callback");
        // Remove debug logging in production
        // if (process.env.NODE_ENV !== 'production') {
        //   logger.info('[OAuth Client] Initiating Google sign-in with redirect to:', redirectTo)
        // }
        const { data, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.signInWithOAuth({
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
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logger"].error('[OAuth Client Error] Supabase OAuth error', error);
            return {
                success: false,
                error: error.message
            };
        }
        // If we have a URL, redirect to it
        if (data === null || data === void 0 ? void 0 : data.url) {
            // Remove debug logging in production
            // if (process.env.NODE_ENV !== 'production') {
            //   logger.info('[OAuth Client] Redirecting to Google OAuth URL:', data.url)
            // }
            window.location.href = data.url;
            return {
                success: true,
                redirectUrl: data.url
            };
        }
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logger"].error('[OAuth Client Error] No redirect URL received from Supabase');
        return {
            success: false,
            error: 'No redirect URL received from Supabase'
        };
    } catch (error) {
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logger"].error('[OAuth Client Error] Unexpected error during OAuth', error);
        return {
            success: false,
            error: 'An unexpected error occurred during sign-in'
        };
    }
}
async function signOut() {
    try {
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
            return {
                success: false,
                error: 'Supabase client not initialized'
            };
        }
        const { error } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.signOut();
        if (error) {
            return {
                success: false,
                error: error.message
            };
        }
        return {
            success: true
        };
    } catch (error) {
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logger"].error('Error signing out', error);
        return {
            success: false,
            error: 'An unexpected error occurred during sign-out'
        };
    }
}
async function getSession() {
    try {
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logger"].error('Supabase client not initialized');
            return null;
        }
        const { data: { session }, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getSession();
        if (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logger"].error('Error getting session', error);
            return null;
        }
        return session;
    } catch (error) {
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logger"].error('Unexpected error getting session', error);
        return null;
    }
}
async function getUser() {
    try {
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logger"].error('Supabase client not initialized');
            return null;
        }
        const { data: { user }, error } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.getUser();
        if (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logger"].error('Error getting user', error);
            return null;
        }
        return user;
    } catch (error) {
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logger"].error('Unexpected error getting user', error);
        return null;
    }
}
function onAuthStateChange(callback) {
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logger"].error('Supabase client not initialized');
        return {
            data: {
                subscription: {
                    unsubscribe: ()=>{
                        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logger"].debug('Auth state change unsubscribed - no cleanup needed for null client');
                    }
                }
            }
        };
    }
    const { data: { subscription } } = __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.onAuthStateChange(callback);
    return {
        data: {
            subscription: {
                unsubscribe: ()=>{
                    subscription.unsubscribe();
                    __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["logger"].debug('Auth state change subscription properly unsubscribed');
                }
            }
        }
    };
}
function formatAuthError(error) {
    if (typeof error === 'string') {
        return error;
    }
    if ('message' in error) {
        // Common Supabase error messages to user-friendly text
        switch(error.message){
            case 'Invalid login credentials':
                return 'Invalid email or password';
            case 'Email not confirmed':
                return 'Please check your email and click the confirmation link';
            case 'User already registered':
                return 'An account with this email already exists';
            case 'Password should be at least 6 characters':
                return 'Password must be at least 6 characters long';
            default:
                return error.message;
        }
    }
    return 'An unexpected error occurred';
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/hooks/use-signup.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "useSignup": ()=>useSignup
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/clients/index.ts [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/clients/supabase-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$oauth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/clients/supabase-oauth.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
;
;
;
function useSignup() {
    let { redirectTo = '/dashboard', onSuccess } = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    _s();
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [error, setError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [success, setSuccess] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const signupWithEmail = async (data)=>{
        setIsLoading(true);
        setError(null);
        try {
            // Validation
            if (data.password !== data.confirmPassword) {
                throw new Error('Passwords do not match');
            }
            if (!data.agreedToTerms) {
                throw new Error('Please agree to the terms and conditions');
            }
            if (!__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"]) {
                throw new Error('Authentication service is not available');
            }
            const { error, data: authData } = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["supabase"].auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    emailRedirectTo: "".concat(window.location.origin, "/auth/callback?type=signup&redirect=").concat(redirectTo),
                    data: {
                        name: data.name,
                        full_name: data.name
                    }
                }
            });
            if (error) throw error;
            if (authData.user) {
                setSuccess(true);
                onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess();
            }
        } catch (error) {
            const authError = error;
            setError(authError.message || 'An error occurred during signup');
        } finally{
            setIsLoading(false);
        }
    };
    const signupWithGoogle = async ()=>{
        setIsLoading(true);
        setError(null);
        try {
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$clients$2f$supabase$2d$oauth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["signInWithGoogle"])();
            if (!result.success) {
                throw new Error(result.error || 'Failed to sign up with Google');
            }
        // If successful, Supabase will redirect to the callback URL
        } catch (error) {
            const authError = error;
            setError(authError.message || 'An error occurred');
            setIsLoading(false);
        }
    };
    const clearError = ()=>setError(null);
    const resetToSignIn = ()=>{
        router.push('/auth/login');
    };
    return {
        isLoading,
        error,
        success,
        signupWithEmail,
        signupWithGoogle,
        clearError,
        resetToSignIn
    };
}
_s(useSignup, "QIyqqfl+AnqRwd5W0mxipV72lhU=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/hooks/use-password-validation.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "usePasswordValidation": ()=>usePasswordValidation
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
function usePasswordValidation(password) {
    _s();
    const passwordStrength = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "usePasswordValidation.useMemo[passwordStrength]": ()=>({
                hasMinLength: password.length >= 8,
                hasUpperCase: /[A-Z]/.test(password),
                hasLowerCase: /[a-z]/.test(password),
                hasNumber: /\d/.test(password),
                hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
            })
    }["usePasswordValidation.useMemo[passwordStrength]"], [
        password
    ]);
    const isPasswordStrong = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "usePasswordValidation.useMemo[isPasswordStrong]": ()=>Object.values(passwordStrength).filter(Boolean).length >= 4
    }["usePasswordValidation.useMemo[isPasswordStrong]"], [
        passwordStrength
    ]);
    const validatePassword = (confirmPassword)=>{
        if (!isPasswordStrong) {
            return 'Please choose a stronger password';
        }
        if (confirmPassword !== undefined && password !== confirmPassword) {
            return 'Passwords do not match';
        }
        return null;
    };
    return {
        passwordStrength,
        isPasswordStrong,
        validatePassword
    };
}
_s(usePasswordValidation, "HlVT2DZBdNUgI+ZxvNssgZvbUGI=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/hooks/use-form-state.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "useFormState": ()=>useFormState
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
const initialFormState = {
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    showPassword: false,
    showConfirmPassword: false,
    agreedToTerms: false
};
function useFormState() {
    _s();
    const [formState, setFormState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initialFormState);
    const updateField = (field, value)=>{
        setFormState((prev)=>({
                ...prev,
                [field]: value
            }));
    };
    const togglePasswordVisibility = ()=>{
        setFormState((prev)=>({
                ...prev,
                showPassword: !prev.showPassword
            }));
    };
    const toggleConfirmPasswordVisibility = ()=>{
        setFormState((prev)=>({
                ...prev,
                showConfirmPassword: !prev.showConfirmPassword
            }));
    };
    const resetForm = ()=>{
        setFormState(initialFormState);
    };
    const getFormData = ()=>({
            name: formState.name,
            email: formState.email,
            password: formState.password,
            confirmPassword: formState.confirmPassword,
            agreedToTerms: formState.agreedToTerms
        });
    return {
        formState,
        updateField,
        togglePasswordVisibility,
        toggleConfirmPasswordVisibility,
        resetForm,
        getFormData
    };
}
_s(useFormState, "vt2r4Ev0Jv1LjGL0bFpM3lJoTjg=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/hooks/index.ts [app-client] (ecmascript) <locals>": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
// Import specific hooks to avoid conflicts
__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$atoms$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-atoms.ts [app-client] (ecmascript)");
// Export dedicated hooks (these take precedence)
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-properties.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-tenants.ts [app-client] (ecmascript)");
// Advanced business hooks (migrated from backup)
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$lease$2d$management$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-lease-management.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$maintenance$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-maintenance.ts [app-client] (ecmascript)");
// Server action and optimistic update hooks
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$hooks$2f$use$2d$server$2d$action$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/hooks/use-server-action.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$hooks$2f$use$2d$optimistic$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/hooks/use-optimistic-data.ts [app-client] (ecmascript)");
// Auth form hooks
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$signup$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-signup.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$password$2d$validation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-password-validation.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$form$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-form-state.ts [app-client] (ecmascript)");
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/hooks/index.ts [app-client] (ecmascript) <module evaluation>": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$atoms$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-atoms.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-properties.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-tenants.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$lease$2d$management$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-lease-management.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$maintenance$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-maintenance.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$hooks$2f$use$2d$server$2d$action$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/hooks/use-server-action.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$hooks$2f$use$2d$optimistic$2d$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/hooks/use-optimistic-data.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$signup$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-signup.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$password$2d$validation$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-password-validation.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$form$2d$state$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-form-state.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/index.ts [app-client] (ecmascript) <locals>");
}),
"[project]/apps/frontend/src/lib/actions/data:035d15 [app-client] (ecmascript) <text/javascript>": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/* __next_internal_action_entry_do_not_use__ [{"00fa0b760d75df25ad2d603f356ae96344b3c04945":"logoutAction"},"apps/frontend/src/lib/actions/auth-actions.ts",""] */ __turbopack_context__.s({
    "logoutAction": ()=>logoutAction
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-client-wrapper.js [app-client] (ecmascript)");
"use turbopack no side effects";
;
var logoutAction = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createServerReference"])("00fa0b760d75df25ad2d603f356ae96344b3c04945", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["callServer"], void 0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$client$2d$wrapper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["findSourceMapURL"], "logoutAction"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4vYXV0aC1hY3Rpb25zLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJztcblxuaW1wb3J0IHsgcmV2YWxpZGF0ZVRhZyB9IGZyb20gJ25leHQvY2FjaGUnO1xuaW1wb3J0IHsgcmVkaXJlY3QgfSBmcm9tICduZXh0L25hdmlnYXRpb24nO1xuaW1wb3J0IHsgeiB9IGZyb20gJ3pvZCc7XG5pbXBvcnQgeyBhdXRoLCBzdXBhYmFzZSB9IGZyb20gJ0AvbGliL3N1cGFiYXNlJztcbmltcG9ydCB0eXBlIHsgQXV0aFVzZXIgfSBmcm9tICdAL2xpYi9zdXBhYmFzZSc7XG5pbXBvcnQgeyB0cmFja1NlcnZlclNpZGVFdmVudCB9IGZyb20gJ0AvbGliL2FuYWx5dGljcy9wb3N0aG9nLXNlcnZlcic7XG5pbXBvcnQgeyBjb21tb25WYWxpZGF0aW9ucyB9IGZyb20gJ0AvbGliL3ZhbGlkYXRpb24vc2NoZW1hcyc7XG5cbi8vIEF1dGggZm9ybSBzY2hlbWFzIHVzaW5nIGNvbnNvbGlkYXRlZCB2YWxpZGF0aW9uc1xuY29uc3QgTG9naW5TY2hlbWEgPSB6Lm9iamVjdCh7XG4gIGVtYWlsOiBjb21tb25WYWxpZGF0aW9ucy5lbWFpbCxcbiAgcGFzc3dvcmQ6IHouc3RyaW5nKCkubWluKDYsICdQYXNzd29yZCBtdXN0IGJlIGF0IGxlYXN0IDYgY2hhcmFjdGVycycpLFxufSk7XG5cbmNvbnN0IFNpZ251cFNjaGVtYSA9IHoub2JqZWN0KHtcbiAgZW1haWw6IGNvbW1vblZhbGlkYXRpb25zLmVtYWlsLFxuICBwYXNzd29yZDogei5zdHJpbmcoKS5taW4oOCwgJ1Bhc3N3b3JkIG11c3QgYmUgYXQgbGVhc3QgOCBjaGFyYWN0ZXJzJyksXG4gIGNvbmZpcm1QYXNzd29yZDogei5zdHJpbmcoKS5taW4oOCwgJ1Bhc3N3b3JkIG11c3QgYmUgYXQgbGVhc3QgOCBjaGFyYWN0ZXJzJyksXG4gIGZ1bGxOYW1lOiBjb21tb25WYWxpZGF0aW9ucy5uYW1lLFxuICBjb21wYW55TmFtZTogY29tbW9uVmFsaWRhdGlvbnMub3B0aW9uYWxTdHJpbmcsXG59KS5yZWZpbmUoKGRhdGEpID0+IGRhdGEucGFzc3dvcmQgPT09IGRhdGEuY29uZmlybVBhc3N3b3JkLCB7XG4gIG1lc3NhZ2U6IFwiUGFzc3dvcmRzIGRvbid0IG1hdGNoXCIsXG4gIHBhdGg6IFtcImNvbmZpcm1QYXNzd29yZFwiXSxcbn0pO1xuXG5jb25zdCBSZXNldFBhc3N3b3JkU2NoZW1hID0gei5vYmplY3Qoe1xuICBlbWFpbDogY29tbW9uVmFsaWRhdGlvbnMuZW1haWwsXG59KTtcblxuY29uc3QgVXBkYXRlUGFzc3dvcmRTY2hlbWEgPSB6Lm9iamVjdCh7XG4gIHBhc3N3b3JkOiB6LnN0cmluZygpLm1pbig4LCAnUGFzc3dvcmQgbXVzdCBiZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnMnKSxcbiAgY29uZmlybVBhc3N3b3JkOiB6LnN0cmluZygpLm1pbig4LCAnUGFzc3dvcmQgbXVzdCBiZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnMnKSxcbn0pLnJlZmluZSgoZGF0YSkgPT4gZGF0YS5wYXNzd29yZCA9PT0gZGF0YS5jb25maXJtUGFzc3dvcmQsIHtcbiAgbWVzc2FnZTogXCJQYXNzd29yZHMgZG9uJ3QgbWF0Y2hcIixcbiAgcGF0aDogW1wiY29uZmlybVBhc3N3b3JkXCJdLFxufSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXV0aEZvcm1TdGF0ZSB7XG4gIGVycm9ycz86IHtcbiAgICBlbWFpbD86IHN0cmluZ1tdO1xuICAgIHBhc3N3b3JkPzogc3RyaW5nW107XG4gICAgY29uZmlybVBhc3N3b3JkPzogc3RyaW5nW107XG4gICAgZnVsbE5hbWU/OiBzdHJpbmdbXTtcbiAgICBjb21wYW55TmFtZT86IHN0cmluZ1tdO1xuICAgIF9mb3JtPzogc3RyaW5nW107XG4gIH07XG4gIHN1Y2Nlc3M/OiBib29sZWFuO1xuICBtZXNzYWdlPzogc3RyaW5nO1xuICBkYXRhPzoge1xuICAgIHVzZXI/OiB7XG4gICAgICBpZDogc3RyaW5nO1xuICAgICAgZW1haWw6IHN0cmluZztcbiAgICAgIG5hbWU/OiBzdHJpbmc7XG4gICAgfTtcbiAgICBzZXNzaW9uPzoge1xuICAgICAgYWNjZXNzX3Rva2VuOiBzdHJpbmc7XG4gICAgICByZWZyZXNoX3Rva2VuOiBzdHJpbmc7XG4gICAgfTtcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvZ2luQWN0aW9uKFxuICBwcmV2U3RhdGU6IEF1dGhGb3JtU3RhdGUsXG4gIGZvcm1EYXRhOiBGb3JtRGF0YVxuKTogUHJvbWlzZTxBdXRoRm9ybVN0YXRlPiB7XG4gIGNvbnN0IHJhd0RhdGEgPSB7XG4gICAgZW1haWw6IGZvcm1EYXRhLmdldCgnZW1haWwnKSxcbiAgICBwYXNzd29yZDogZm9ybURhdGEuZ2V0KCdwYXNzd29yZCcpLFxuICB9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IExvZ2luU2NoZW1hLnNhZmVQYXJzZShyYXdEYXRhKTtcblxuICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogcmVzdWx0LmVycm9yLmZsYXR0ZW4oKS5maWVsZEVycm9ycyxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhdXRoLnNpZ25JbldpdGhQYXNzd29yZCh7XG4gICAgICBlbWFpbDogcmVzdWx0LmRhdGEuZW1haWwsXG4gICAgICBwYXNzd29yZDogcmVzdWx0LmRhdGEucGFzc3dvcmQsXG4gICAgfSk7XG5cbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIC8vIFRyYWNrIGZhaWxlZCBsb2dpbiBhdHRlbXB0XG4gICAgICBhd2FpdCB0cmFja1NlcnZlclNpZGVFdmVudCgndXNlcl9sb2dpbl9mYWlsZWQnLCB1bmRlZmluZWQsIHtcbiAgICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgZW1haWxfZG9tYWluOiByZXN1bHQuZGF0YS5lbWFpbC5zcGxpdCgnQCcpWzFdLFxuICAgICAgICBtZXRob2Q6ICdlbWFpbCcsXG4gICAgICB9KTtcbiAgICAgIFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZXJyb3JzOiB7XG4gICAgICAgICAgX2Zvcm06IFtlcnJvci5tZXNzYWdlXSxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gVHJhY2sgc3VjY2Vzc2Z1bCBsb2dpblxuICAgIGlmIChkYXRhLnVzZXIpIHtcbiAgICAgIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX3NpZ25lZF9pbicsIGRhdGEudXNlci5pZCwge1xuICAgICAgICBtZXRob2Q6ICdlbWFpbCcsXG4gICAgICAgIGVtYWlsOiBkYXRhLnVzZXIuZW1haWwsXG4gICAgICAgIHVzZXJfaWQ6IGRhdGEudXNlci5pZCxcbiAgICAgICAgc2Vzc2lvbl9pZDogZGF0YS5zZXNzaW9uPy5hY2Nlc3NfdG9rZW4/LnNsaWNlKC04KSwgLy8gTGFzdCA4IGNoYXJzIGZvciBpZGVudGlmaWNhdGlvblxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gUmV2YWxpZGF0ZSBhdXRoLXJlbGF0ZWQgY2FjaGVzXG4gICAgcmV2YWxpZGF0ZVRhZygndXNlcicpO1xuICAgIHJldmFsaWRhdGVUYWcoJ3Nlc3Npb24nKTtcbiAgICBcbiAgICAvLyBSZWRpcmVjdCB0byBkYXNoYm9hcmRcbiAgICByZWRpcmVjdCgnL2Rhc2hib2FyZCcpO1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdMb2dpbiBmYWlsZWQnO1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgX2Zvcm06IFttZXNzYWdlXSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2lnbnVwQWN0aW9uKFxuICBwcmV2U3RhdGU6IEF1dGhGb3JtU3RhdGUsXG4gIGZvcm1EYXRhOiBGb3JtRGF0YVxuKTogUHJvbWlzZTxBdXRoRm9ybVN0YXRlPiB7XG4gIGNvbnN0IHJhd0RhdGEgPSB7XG4gICAgZW1haWw6IGZvcm1EYXRhLmdldCgnZW1haWwnKSxcbiAgICBwYXNzd29yZDogZm9ybURhdGEuZ2V0KCdwYXNzd29yZCcpLFxuICAgIGNvbmZpcm1QYXNzd29yZDogZm9ybURhdGEuZ2V0KCdjb25maXJtUGFzc3dvcmQnKSxcbiAgICBmdWxsTmFtZTogZm9ybURhdGEuZ2V0KCdmdWxsTmFtZScpLFxuICAgIGNvbXBhbnlOYW1lOiBmb3JtRGF0YS5nZXQoJ2NvbXBhbnlOYW1lJyksXG4gIH07XG5cbiAgY29uc3QgcmVzdWx0ID0gU2lnbnVwU2NoZW1hLnNhZmVQYXJzZShyYXdEYXRhKTtcblxuICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogcmVzdWx0LmVycm9yLmZsYXR0ZW4oKS5maWVsZEVycm9ycyxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhdXRoLnNpZ25VcCh7XG4gICAgICBlbWFpbDogcmVzdWx0LmRhdGEuZW1haWwsXG4gICAgICBwYXNzd29yZDogcmVzdWx0LmRhdGEucGFzc3dvcmQsXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBmdWxsX25hbWU6IHJlc3VsdC5kYXRhLmZ1bGxOYW1lLFxuICAgICAgICAgIGNvbXBhbnlfbmFtZTogcmVzdWx0LmRhdGEuY29tcGFueU5hbWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICAvLyBUcmFjayBmYWlsZWQgc2lnbnVwIGF0dGVtcHRcbiAgICAgIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX3NpZ251cF9mYWlsZWQnLCB1bmRlZmluZWQsIHtcbiAgICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgZW1haWxfZG9tYWluOiByZXN1bHQuZGF0YS5lbWFpbC5zcGxpdCgnQCcpWzFdLFxuICAgICAgICBoYXNfY29tcGFueV9uYW1lOiAhIXJlc3VsdC5kYXRhLmNvbXBhbnlOYW1lLFxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGVycm9yczoge1xuICAgICAgICAgIF9mb3JtOiBbZXJyb3IubWVzc2FnZV0sXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFRyYWNrIHN1Y2Nlc3NmdWwgc2lnbnVwXG4gICAgaWYgKGRhdGEudXNlcikge1xuICAgICAgYXdhaXQgdHJhY2tTZXJ2ZXJTaWRlRXZlbnQoJ3VzZXJfc2lnbmVkX3VwJywgZGF0YS51c2VyLmlkLCB7XG4gICAgICAgIG1ldGhvZDogJ2VtYWlsJyxcbiAgICAgICAgZW1haWw6IGRhdGEudXNlci5lbWFpbCxcbiAgICAgICAgdXNlcl9pZDogZGF0YS51c2VyLmlkLFxuICAgICAgICBoYXNfY29tcGFueV9uYW1lOiAhIXJlc3VsdC5kYXRhLmNvbXBhbnlOYW1lLFxuICAgICAgICBmdWxsX25hbWU6IHJlc3VsdC5kYXRhLmZ1bGxOYW1lLFxuICAgICAgICBuZWVkc19lbWFpbF92ZXJpZmljYXRpb246ICFkYXRhLnVzZXIuZW1haWxfY29uZmlybWVkX2F0LFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBtZXNzYWdlOiAnQWNjb3VudCBjcmVhdGVkISBQbGVhc2UgY2hlY2sgeW91ciBlbWFpbCB0byB2ZXJpZnkgeW91ciBhY2NvdW50LicsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnU2lnbnVwIGZhaWxlZCc7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczoge1xuICAgICAgICBfZm9ybTogW21lc3NhZ2VdLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2dvdXRBY3Rpb24oKTogUHJvbWlzZTxBdXRoRm9ybVN0YXRlPiB7XG4gIHRyeSB7XG4gICAgLy8gR2V0IGN1cnJlbnQgdXNlciBmb3IgdHJhY2tpbmcgYmVmb3JlIGxvZ291dFxuICAgIGNvbnN0IHsgZGF0YTogeyB1c2VyIH0gfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIFxuICAgIGF3YWl0IGF1dGguc2lnbk91dCgpO1xuICAgIFxuICAgIC8vIFRyYWNrIGxvZ291dCBldmVudFxuICAgIGlmICh1c2VyKSB7XG4gICAgICBhd2FpdCB0cmFja1NlcnZlclNpZGVFdmVudCgndXNlcl9zaWduZWRfb3V0JywgdXNlci5pZCwge1xuICAgICAgICB1c2VyX2lkOiB1c2VyLmlkLFxuICAgICAgICBlbWFpbDogdXNlci5lbWFpbCxcbiAgICAgICAgbG9nb3V0X21ldGhvZDogJ21hbnVhbCcsXG4gICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2xlYXIgYWxsIGNhY2hlZCBkYXRhXG4gICAgcmV2YWxpZGF0ZVRhZygndXNlcicpO1xuICAgIHJldmFsaWRhdGVUYWcoJ3Nlc3Npb24nKTtcbiAgICByZXZhbGlkYXRlVGFnKCdwcm9wZXJ0aWVzJyk7XG4gICAgcmV2YWxpZGF0ZVRhZygndGVuYW50cycpO1xuICAgIHJldmFsaWRhdGVUYWcoJ2xlYXNlcycpO1xuICAgIHJldmFsaWRhdGVUYWcoJ21haW50ZW5hbmNlJyk7XG4gICAgXG4gICAgLy8gUmVkaXJlY3QgdG8gaG9tZSBwYWdlXG4gICAgcmVkaXJlY3QoJy8nKTtcbiAgfSBjYXRjaCAoZXJyb3I6IHVua25vd24pIHtcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcic7XG4gICAgY29uc29sZS5lcnJvcignTG9nb3V0IGVycm9yOicsIG1lc3NhZ2UpO1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgX2Zvcm06IFttZXNzYWdlXSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZm9yZ290UGFzc3dvcmRBY3Rpb24oXG4gIHByZXZTdGF0ZTogQXV0aEZvcm1TdGF0ZSxcbiAgZm9ybURhdGE6IEZvcm1EYXRhXG4pOiBQcm9taXNlPEF1dGhGb3JtU3RhdGU+IHtcbiAgY29uc3QgcmF3RGF0YSA9IHtcbiAgICBlbWFpbDogZm9ybURhdGEuZ2V0KCdlbWFpbCcpLFxuICB9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IFJlc2V0UGFzc3dvcmRTY2hlbWEuc2FmZVBhcnNlKHJhd0RhdGEpO1xuXG4gIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZXJyb3JzOiByZXN1bHQuZXJyb3IuZmxhdHRlbigpLmZpZWxkRXJyb3JzLFxuICAgIH07XG4gIH1cblxuICB0cnkge1xuICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IGF1dGgucmVzZXRQYXNzd29yZEZvckVtYWlsKHJlc3VsdC5kYXRhLmVtYWlsLCB7XG4gICAgICByZWRpcmVjdFRvOiBgJHtwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TSVRFX1VSTH0vYXV0aC91cGRhdGUtcGFzc3dvcmRgLFxuICAgIH0pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcnM6IHtcbiAgICAgICAgICBfZm9ybTogW2Vycm9yLm1lc3NhZ2VdLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIG1lc3NhZ2U6ICdQYXNzd29yZCByZXNldCBlbWFpbCBzZW50ISBDaGVjayB5b3VyIGluYm94IGZvciBpbnN0cnVjdGlvbnMuJyxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdGYWlsZWQgdG8gc2VuZCByZXNldCBlbWFpbCc7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczoge1xuICAgICAgICBfZm9ybTogW21lc3NhZ2VdLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGRhdGVQYXNzd29yZEFjdGlvbihcbiAgcHJldlN0YXRlOiBBdXRoRm9ybVN0YXRlLFxuICBmb3JtRGF0YTogRm9ybURhdGFcbik6IFByb21pc2U8QXV0aEZvcm1TdGF0ZT4ge1xuICBjb25zdCByYXdEYXRhID0ge1xuICAgIHBhc3N3b3JkOiBmb3JtRGF0YS5nZXQoJ3Bhc3N3b3JkJyksXG4gICAgY29uZmlybVBhc3N3b3JkOiBmb3JtRGF0YS5nZXQoJ2NvbmZpcm1QYXNzd29yZCcpLFxuICB9O1xuXG4gIGNvbnN0IHJlc3VsdCA9IFVwZGF0ZVBhc3N3b3JkU2NoZW1hLnNhZmVQYXJzZShyYXdEYXRhKTtcblxuICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVycm9yczogcmVzdWx0LmVycm9yLmZsYXR0ZW4oKS5maWVsZEVycm9ycyxcbiAgICB9O1xuICB9XG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBhdXRoLnVwZGF0ZVVzZXIoe1xuICAgICAgcGFzc3dvcmQ6IHJlc3VsdC5kYXRhLnBhc3N3b3JkLFxuICAgIH0pO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBlcnJvcnM6IHtcbiAgICAgICAgICBfZm9ybTogW2Vycm9yLm1lc3NhZ2VdLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBSZXZhbGlkYXRlIHVzZXIgZGF0YVxuICAgIHJldmFsaWRhdGVUYWcoJ3VzZXInKTtcbiAgICBcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIG1lc3NhZ2U6ICdQYXNzd29yZCB1cGRhdGVkIHN1Y2Nlc3NmdWxseSEnLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ0ZhaWxlZCB0byB1cGRhdGUgcGFzc3dvcmQnO1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcnM6IHtcbiAgICAgICAgX2Zvcm06IFttZXNzYWdlXSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuXG4vLyBTZXJ2ZXItc2lkZSBhdXRoIGhlbHBlcnNcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDdXJyZW50VXNlcigpOiBQcm9taXNlPEF1dGhVc2VyIHwgbnVsbD4ge1xuICB0cnkge1xuICAgIGNvbnN0IHsgZGF0YTogeyB1c2VyIH0gfSA9IGF3YWl0IHN1cGFiYXNlLmF1dGguZ2V0VXNlcigpO1xuICAgIFxuICAgIGlmICghdXNlcikgcmV0dXJuIG51bGw7XG5cbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHVzZXIuaWQsXG4gICAgICBlbWFpbDogdXNlci5lbWFpbCEsXG4gICAgICBuYW1lOiB1c2VyLnVzZXJfbWV0YWRhdGE/LmZ1bGxfbmFtZSB8fCB1c2VyLmVtYWlsISxcbiAgICAgIGF2YXRhcl91cmw6IHVzZXIudXNlcl9tZXRhZGF0YT8uYXZhdGFyX3VybCxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0dldCBjdXJyZW50IHVzZXIgZXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXF1aXJlQXV0aCgpOiBQcm9taXNlPEF1dGhVc2VyPiB7XG4gIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRDdXJyZW50VXNlcigpO1xuICBcbiAgaWYgKCF1c2VyKSB7XG4gICAgcmVkaXJlY3QoJy9sb2dpbicpO1xuICB9XG4gIFxuICByZXR1cm4gdXNlcjtcbn1cblxuLy8gT0F1dGggYWN0aW9uc1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNpZ25JbldpdGhHb29nbGUoKTogUHJvbWlzZTx2b2lkPiB7XG4gIC8vIENvbnN0cnVjdCB0aGUgcmVkaXJlY3QgVVJMLCBmYWxsYmFjayB0byBsb2NhbGhvc3QgZm9yIGRldmVsb3BtZW50XG4gIGNvbnN0IHNpdGVVcmwgPSBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TSVRFX1VSTCB8fCBcbiAgICAgICAgICAgICAgICAgIHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX0FQUF9VUkwgfHwgXG4gICAgICAgICAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDozMDAwJztcbiAgY29uc3QgcmVkaXJlY3RUbyA9IGAke3NpdGVVcmx9L2F1dGgvY2FsbGJhY2tgO1xuICBcbiAgY29uc29sZS5sb2coJ1tPQXV0aCBEZWJ1Z10gSW5pdGlhdGluZyBHb29nbGUgc2lnbi1pbiB3aXRoIHJlZGlyZWN0IHRvOicsIHJlZGlyZWN0VG8pO1xuICBcbiAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgYXV0aC5zaWduSW5XaXRoT0F1dGgoe1xuICAgIHByb3ZpZGVyOiAnZ29vZ2xlJyxcbiAgICBvcHRpb25zOiB7XG4gICAgICByZWRpcmVjdFRvLFxuICAgICAgcXVlcnlQYXJhbXM6IHtcbiAgICAgICAgYWNjZXNzX3R5cGU6ICdvZmZsaW5lJyxcbiAgICAgICAgcHJvbXB0OiAnY29uc2VudCcsXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuXG4gIGlmIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tPQXV0aCBFcnJvcl0gR29vZ2xlIHNpZ24taW4gZmFpbGVkOicsIGVycm9yKTtcbiAgICAvLyBUcmFjayBmYWlsZWQgT0F1dGggYXR0ZW1wdFxuICAgIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX29hdXRoX2ZhaWxlZCcsIHVuZGVmaW5lZCwge1xuICAgICAgcHJvdmlkZXI6ICdnb29nbGUnLFxuICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgIG1ldGhvZDogJ29hdXRoJyxcbiAgICB9KTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBzaWduIGluIHdpdGggR29vZ2xlLiBQbGVhc2UgdHJ5IGFnYWluIG9yIGNvbnRhY3Qgc3VwcG9ydCBpZiB0aGUgaXNzdWUgcGVyc2lzdHMuJyk7XG4gIH1cblxuICAvLyBUcmFjayBPQXV0aCBpbml0aWF0aW9uXG4gIGF3YWl0IHRyYWNrU2VydmVyU2lkZUV2ZW50KCd1c2VyX29hdXRoX2luaXRpYXRlZCcsIHVuZGVmaW5lZCwge1xuICAgIHByb3ZpZGVyOiAnZ29vZ2xlJyxcbiAgICBtZXRob2Q6ICdvYXV0aCcsXG4gICAgcmVkaXJlY3RfdXJsOiBkYXRhLnVybCxcbiAgfSk7XG5cbiAgaWYgKGRhdGEudXJsKSB7XG4gICAgY29uc29sZS5sb2coJ1tPQXV0aCBEZWJ1Z10gUmVkaXJlY3RpbmcgdG8gR29vZ2xlIE9BdXRoIFVSTDonLCBkYXRhLnVybCk7XG4gICAgcmVkaXJlY3QoZGF0YS51cmwpO1xuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tPQXV0aCBFcnJvcl0gTm8gcmVkaXJlY3QgVVJMIHJlY2VpdmVkIGZyb20gU3VwYWJhc2UnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0F1dGhlbnRpY2F0aW9uIHNlcnZpY2UgdGVtcG9yYXJpbHkgdW5hdmFpbGFibGUuIFBsZWFzZSB0cnkgYWdhaW4gaW4gYSBmZXcgbW9tZW50cy4nKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2lnbkluV2l0aEdpdEh1YigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgLy8gQ29uc3RydWN0IHRoZSByZWRpcmVjdCBVUkwsIGZhbGxiYWNrIHRvIGxvY2FsaG9zdCBmb3IgZGV2ZWxvcG1lbnRcbiAgY29uc3Qgc2l0ZVVybCA9IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NJVEVfVVJMIHx8IFxuICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfQVBQX1VSTCB8fCBcbiAgICAgICAgICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjMwMDAnO1xuICBjb25zdCByZWRpcmVjdFRvID0gYCR7c2l0ZVVybH0vYXV0aC9jYWxsYmFja2A7XG4gIFxuICBjb25zb2xlLmxvZygnW09BdXRoIERlYnVnXSBJbml0aWF0aW5nIEdpdEh1YiBzaWduLWluIHdpdGggcmVkaXJlY3QgdG86JywgcmVkaXJlY3RUbyk7XG4gIFxuICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBhdXRoLnNpZ25JbldpdGhPQXV0aCh7XG4gICAgcHJvdmlkZXI6ICdnaXRodWInLFxuICAgIG9wdGlvbnM6IHtcbiAgICAgIHJlZGlyZWN0VG8sXG4gICAgfSxcbiAgfSk7XG5cbiAgaWYgKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignW09BdXRoIEVycm9yXSBHaXRIdWIgc2lnbi1pbiBmYWlsZWQ6JywgZXJyb3IpO1xuICAgIC8vIFRyYWNrIGZhaWxlZCBPQXV0aCBhdHRlbXB0XG4gICAgYXdhaXQgdHJhY2tTZXJ2ZXJTaWRlRXZlbnQoJ3VzZXJfb2F1dGhfZmFpbGVkJywgdW5kZWZpbmVkLCB7XG4gICAgICBwcm92aWRlcjogJ2dpdGh1YicsXG4gICAgICBlcnJvcl9tZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgbWV0aG9kOiAnb2F1dGgnLFxuICAgIH0pO1xuICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIHNpZ24gaW4gd2l0aCBHaXRIdWIuIFBsZWFzZSB0cnkgYWdhaW4gb3IgY29udGFjdCBzdXBwb3J0IGlmIHRoZSBpc3N1ZSBwZXJzaXN0cy4nKTtcbiAgfVxuXG4gIC8vIFRyYWNrIE9BdXRoIGluaXRpYXRpb25cbiAgYXdhaXQgdHJhY2tTZXJ2ZXJTaWRlRXZlbnQoJ3VzZXJfb2F1dGhfaW5pdGlhdGVkJywgdW5kZWZpbmVkLCB7XG4gICAgcHJvdmlkZXI6ICdnaXRodWInLFxuICAgIG1ldGhvZDogJ29hdXRoJyxcbiAgICByZWRpcmVjdF91cmw6IGRhdGEudXJsLFxuICB9KTtcblxuICBpZiAoZGF0YS51cmwpIHtcbiAgICBjb25zb2xlLmxvZygnW09BdXRoIERlYnVnXSBSZWRpcmVjdGluZyB0byBHaXRIdWIgT0F1dGggVVJMOicsIGRhdGEudXJsKTtcbiAgICByZWRpcmVjdChkYXRhLnVybCk7XG4gIH0gZWxzZSB7XG4gICAgY29uc29sZS5lcnJvcignW09BdXRoIEVycm9yXSBObyByZWRpcmVjdCBVUkwgcmVjZWl2ZWQgZnJvbSBTdXBhYmFzZScpO1xuICAgIHRocm93IG5ldyBFcnJvcignQXV0aGVudGljYXRpb24gc2VydmljZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZS4gUGxlYXNlIHRyeSBhZ2FpbiBpbiBhIGZldyBtb21lbnRzLicpO1xuICB9XG59Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJtVEF3TXNCIn0=
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "Navigation": ()=>Navigation
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/avatar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/dropdown-menu.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/bell.js [app-client] (ecmascript) <export default as Bell>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user.js [app-client] (ecmascript) <export default as User>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/settings.js [app-client] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/log-out.js [app-client] (ecmascript) <export default as LogOut>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/index.ts [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$data$3a$035d15__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/actions/data:035d15 [app-client] (ecmascript) <text/javascript>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$hooks$2f$use$2d$server$2d$action$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/hooks/use-server-action.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
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
function Navigation(param) {
    let { className } = param;
    var _user_email;
    _s();
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const [logout, isLoggingOut] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$hooks$2f$use$2d$server$2d$action$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useServerAction"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$actions$2f$data$3a$035d15__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$text$2f$javascript$3e$__["logoutAction"], {
        showSuccessToast: false
    });
    const handleLogout = ()=>{
        logout();
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
        className: "flex items-center justify-between p-4 bg-card border-b ".concat(className || ''),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-4 flex-1 max-w-md",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative flex-1",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                            className: "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                            lineNumber: 39,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                            placeholder: "Search properties, tenants...",
                            className: "pl-10"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                            lineNumber: 40,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                    lineNumber: 38,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                lineNumber: 37,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Button"], {
                        variant: "ghost",
                        size: "sm",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"], {
                            className: "h-5 w-5"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                            lineNumber: 51,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                        lineNumber: 50,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenu"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuTrigger"], {
                                asChild: true,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Button"], {
                                    variant: "ghost",
                                    className: "relative h-8 w-8 rounded-full",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Avatar"], {
                                        className: "h-8 w-8",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AvatarImage"], {
                                                src: user === null || user === void 0 ? void 0 : user.avatarUrl,
                                                alt: (user === null || user === void 0 ? void 0 : user.name) || (user === null || user === void 0 ? void 0 : user.email)
                                            }, void 0, false, {
                                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                                lineNumber: 59,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$avatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AvatarFallback"], {
                                                children: (user === null || user === void 0 ? void 0 : user.name) ? user.name.charAt(0).toUpperCase() : (user === null || user === void 0 ? void 0 : (_user_email = user.email) === null || _user_email === void 0 ? void 0 : _user_email.charAt(0).toUpperCase()) || 'U'
                                            }, void 0, false, {
                                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                                lineNumber: 60,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                        lineNumber: 58,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                    lineNumber: 57,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                lineNumber: 56,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuContent"], {
                                className: "w-56",
                                align: "end",
                                forceMount: true,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuLabel"], {
                                        className: "font-normal",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex flex-col space-y-1",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-sm font-medium leading-none",
                                                    children: (user === null || user === void 0 ? void 0 : user.name) || 'User'
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                                    lineNumber: 69,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-xs leading-none text-muted-foreground",
                                                    children: user === null || user === void 0 ? void 0 : user.email
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                                    lineNumber: 72,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                            lineNumber: 68,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                        lineNumber: 67,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuSeparator"], {}, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                        lineNumber: 77,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                        asChild: true,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: "/profile",
                                            className: "cursor-pointer",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__["User"], {
                                                    className: "mr-2 h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                                    lineNumber: 80,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Profile"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                                    lineNumber: 81,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                            lineNumber: 79,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                        lineNumber: 78,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                        asChild: true,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: "/settings",
                                            className: "cursor-pointer",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"], {
                                                    className: "mr-2 h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                                    lineNumber: 86,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Settings"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                                    lineNumber: 87,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                            lineNumber: 85,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                        lineNumber: 84,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuSeparator"], {}, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                        lineNumber: 90,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$dropdown$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DropdownMenuItem"], {
                                        className: "cursor-pointer",
                                        onClick: handleLogout,
                                        disabled: isLoggingOut,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__["LogOut"], {
                                                className: "mr-2 h-4 w-4"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                                lineNumber: 96,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                children: isLoggingOut ? 'Signing out...' : 'Sign out'
                                            }, void 0, false, {
                                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                                lineNumber: 97,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                        lineNumber: 91,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                                lineNumber: 66,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                        lineNumber: 55,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
                lineNumber: 48,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-navigation.tsx",
        lineNumber: 35,
        columnNumber: 5
    }, this);
}
_s(Navigation, "TJwJraNayfAAzcwu5EvXEU1SZeo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$hooks$2f$use$2d$server$2d$action$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useServerAction"]
    ];
});
_c = Navigation;
var _c;
__turbopack_context__.k.register(_c, "Navigation");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/app/layout.constants.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "LAYOUT_CONSTANTS": ()=>LAYOUT_CONSTANTS,
    "metadata": ()=>metadata,
    "viewport": ()=>viewport
});
const LAYOUT_CONSTANTS = {
    SIDEBAR_WIDTH: 256,
    HEADER_HEIGHT: 64,
    MOBILE_BREAKPOINT: 768,
    DESKTOP_BREAKPOINT: 1024
};
const metadata = {
    title: 'TenantFlow',
    description: 'Modern property management platform'
};
const viewport = {
    width: 'device-width',
    initialScale: 1
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/hooks/use-mobile.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "useIsMobile": ()=>useIsMobile
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$app$2f$layout$2e$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/app/layout.constants.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
;
function useIsMobile() {
    _s();
    const [isMobile, setIsMobile] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](undefined);
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "useIsMobile.useEffect": ()=>{
            const mql = window.matchMedia("(max-width: ".concat(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$app$2f$layout$2e$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LAYOUT_CONSTANTS"].MOBILE_BREAKPOINT - 1, "px)"));
            const onChange = {
                "useIsMobile.useEffect.onChange": ()=>{
                    setIsMobile(window.innerWidth < __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$app$2f$layout$2e$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LAYOUT_CONSTANTS"].MOBILE_BREAKPOINT);
                }
            }["useIsMobile.useEffect.onChange"];
            mql.addEventListener("change", onChange);
            setIsMobile(window.innerWidth < __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$app$2f$layout$2e$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LAYOUT_CONSTANTS"].MOBILE_BREAKPOINT);
            return ({
                "useIsMobile.useEffect": ()=>mql.removeEventListener("change", onChange)
            })["useIsMobile.useEffect"];
        }
    }["useIsMobile.useEffect"], []);
    return !!isMobile;
}
_s(useIsMobile, "D6B2cPXNCaIbeOx+abFr1uxLRM0=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/tooltip.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "Tooltip": ()=>Tooltip,
    "TooltipContent": ()=>TooltipContent,
    "TooltipProvider": ()=>TooltipProvider,
    "TooltipTrigger": ()=>TooltipTrigger
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-tooltip/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
"use client";
;
;
;
function TooltipProvider(param) {
    let { delayDuration = 0, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Provider"], {
        "data-slot": "tooltip-provider",
        delayDuration: delayDuration,
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/tooltip.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
_c = TooltipProvider;
function Tooltip(param) {
    let { ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(TooltipProvider, {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Root"], {
            "data-slot": "tooltip",
            ...props
        }, void 0, false, {
            fileName: "[project]/apps/frontend/src/components/ui/tooltip.tsx",
            lineNumber: 26,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/tooltip.tsx",
        lineNumber: 25,
        columnNumber: 5
    }, this);
}
_c1 = Tooltip;
function TooltipTrigger(param) {
    let { ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Trigger"], {
        "data-slot": "tooltip-trigger",
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/tooltip.tsx",
        lineNumber: 34,
        columnNumber: 10
    }, this);
}
_c2 = TooltipTrigger;
function TooltipContent(param) {
    let { className, sideOffset = 0, children, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Portal"], {
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Content"], {
            "data-slot": "tooltip-content",
            sideOffset: sideOffset,
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance", className),
            ...props,
            children: [
                children,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$tooltip$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Arrow"], {
                    className: "bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]"
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/ui/tooltip.tsx",
                    lineNumber: 55,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/frontend/src/components/ui/tooltip.tsx",
            lineNumber: 45,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/tooltip.tsx",
        lineNumber: 44,
        columnNumber: 5
    }, this);
}
_c3 = TooltipContent;
;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "TooltipProvider");
__turbopack_context__.k.register(_c1, "Tooltip");
__turbopack_context__.k.register(_c2, "TooltipTrigger");
__turbopack_context__.k.register(_c3, "TooltipContent");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/sidebar-context.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Context - Client Component
 * 
 * Manages sidebar state, mobile responsiveness, and keyboard shortcuts.
 * This is a client component as it handles browser APIs and state.
 */ __turbopack_context__.s({
    "SidebarContext": ()=>SidebarContext,
    "useSidebar": ()=>useSidebar
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
const SidebarContext = /*#__PURE__*/ __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"](null);
function useSidebar() {
    _s();
    const context = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"](SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider.");
    }
    return context;
}
_s(useSidebar, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/constants.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Constants
 * 
 * Centralized configuration for consistent sidebar behavior
 * across the application.
 */ __turbopack_context__.s({
    "SIDEBAR_COOKIE_MAX_AGE": ()=>SIDEBAR_COOKIE_MAX_AGE,
    "SIDEBAR_COOKIE_NAME": ()=>SIDEBAR_COOKIE_NAME,
    "SIDEBAR_KEYBOARD_SHORTCUT": ()=>SIDEBAR_KEYBOARD_SHORTCUT,
    "SIDEBAR_WIDTH": ()=>SIDEBAR_WIDTH,
    "SIDEBAR_WIDTH_ICON": ()=>SIDEBAR_WIDTH_ICON,
    "SIDEBAR_WIDTH_MOBILE": ()=>SIDEBAR_WIDTH_MOBILE
});
const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days
;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/sidebar-provider.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Provider - Client Component
 * 
 * Provides sidebar state management with:
 * - Mobile responsiveness
 * - Keyboard shortcuts
 * - Cookie persistence
 * - Context distribution
 */ __turbopack_context__.s({
    "SidebarProvider": ()=>SidebarProvider
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$mobile$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-mobile.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$tooltip$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/tooltip.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-context.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/constants.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
function SidebarProvider(param) {
    let { defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props } = param;
    _s();
    const isMobile = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$mobile$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useIsMobile"])();
    const [openMobile, setOpenMobile] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](false);
    // Internal state with controlled/uncontrolled support
    const [_open, _setOpen] = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"](defaultOpen);
    const open = openProp !== null && openProp !== void 0 ? openProp : _open;
    const setOpen = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "SidebarProvider.useCallback[setOpen]": (value)=>{
            const openState = typeof value === "function" ? value(open) : value;
            if (setOpenProp) {
                setOpenProp(openState);
            } else {
                _setOpen(openState);
            }
            // Persist to cookie for consistent state across sessions
            document.cookie = "".concat(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SIDEBAR_COOKIE_NAME"], "=").concat(openState, "; path=/; max-age=").concat(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SIDEBAR_COOKIE_MAX_AGE"]);
        }
    }["SidebarProvider.useCallback[setOpen]"], [
        setOpenProp,
        open
    ]);
    // Toggle helper for mobile vs desktop
    const toggleSidebar = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"]({
        "SidebarProvider.useCallback[toggleSidebar]": ()=>{
            return isMobile ? setOpenMobile({
                "SidebarProvider.useCallback[toggleSidebar]": (open)=>!open
            }["SidebarProvider.useCallback[toggleSidebar]"]) : setOpen({
                "SidebarProvider.useCallback[toggleSidebar]": (open)=>!open
            }["SidebarProvider.useCallback[toggleSidebar]"]);
        }
    }["SidebarProvider.useCallback[toggleSidebar]"], [
        isMobile,
        setOpen,
        setOpenMobile
    ]);
    // Keyboard shortcut: Cmd+B / Ctrl+B
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"]({
        "SidebarProvider.useEffect": ()=>{
            const handleKeyDown = {
                "SidebarProvider.useEffect.handleKeyDown": (event)=>{
                    if (event.key === __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SIDEBAR_KEYBOARD_SHORTCUT"] && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault();
                        toggleSidebar();
                    }
                }
            }["SidebarProvider.useEffect.handleKeyDown"];
            window.addEventListener("keydown", handleKeyDown);
            return ({
                "SidebarProvider.useEffect": ()=>window.removeEventListener("keydown", handleKeyDown)
            })["SidebarProvider.useEffect"];
        }
    }["SidebarProvider.useEffect"], [
        toggleSidebar
    ]);
    const state = open ? "expanded" : "collapsed";
    const contextValue = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"]({
        "SidebarProvider.useMemo[contextValue]": ()=>({
                state,
                open,
                setOpen,
                isMobile,
                openMobile,
                setOpenMobile,
                toggleSidebar
            })
    }["SidebarProvider.useMemo[contextValue]"], [
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SidebarContext"].Provider, {
        value: contextValue,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$tooltip$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TooltipProvider"], {
            delayDuration: 0,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                "data-slot": "sidebar-wrapper",
                style: {
                    "--sidebar-width": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SIDEBAR_WIDTH"],
                    "--sidebar-width-icon": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SIDEBAR_WIDTH_ICON"],
                    ...style
                },
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full", className),
                ...props,
                children: children
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-provider.tsx",
                lineNumber: 101,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-provider.tsx",
            lineNumber: 100,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-provider.tsx",
        lineNumber: 99,
        columnNumber: 5
    }, this);
}
_s(SidebarProvider, "QSOkjq1AvKFJW5+zwiK52jPX7zI=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$mobile$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useIsMobile"]
    ];
});
_c = SidebarProvider;
var _c;
__turbopack_context__.k.register(_c, "SidebarProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sheet.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "Sheet": ()=>Sheet,
    "SheetClose": ()=>SheetClose,
    "SheetContent": ()=>SheetContent,
    "SheetDescription": ()=>SheetDescription,
    "SheetFooter": ()=>SheetFooter,
    "SheetHeader": ()=>SheetHeader,
    "SheetTitle": ()=>SheetTitle,
    "SheetTrigger": ()=>SheetTrigger
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-dialog/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as XIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
"use client";
;
;
;
;
function Sheet(param) {
    let { ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Root"], {
        "data-slot": "sheet",
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sheet.tsx",
        lineNumber: 10,
        columnNumber: 10
    }, this);
}
_c = Sheet;
function SheetTrigger(param) {
    let { ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Trigger"], {
        "data-slot": "sheet-trigger",
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sheet.tsx",
        lineNumber: 16,
        columnNumber: 10
    }, this);
}
_c1 = SheetTrigger;
function SheetClose(param) {
    let { ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Close"], {
        "data-slot": "sheet-close",
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sheet.tsx",
        lineNumber: 22,
        columnNumber: 10
    }, this);
}
_c2 = SheetClose;
function SheetPortal(param) {
    let { ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Portal"], {
        "data-slot": "sheet-portal",
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sheet.tsx",
        lineNumber: 28,
        columnNumber: 10
    }, this);
}
_c3 = SheetPortal;
function SheetOverlay(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Overlay"], {
        "data-slot": "sheet-overlay",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sheet.tsx",
        lineNumber: 36,
        columnNumber: 5
    }, this);
}
_c4 = SheetOverlay;
function SheetContent(param) {
    let { className, children, side = "right", ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SheetPortal, {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SheetOverlay, {}, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/sheet.tsx",
                lineNumber: 57,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Content"], {
                "data-slot": "sheet-content",
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500", side === "right" && "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm", side === "left" && "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm", side === "top" && "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b", side === "bottom" && "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t", className),
                ...props,
                children: [
                    children,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Close"], {
                        className: "ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XIcon$3e$__["XIcon"], {
                                className: "size-4"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/ui/sheet.tsx",
                                lineNumber: 76,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "sr-only",
                                children: "Close"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/ui/sheet.tsx",
                                lineNumber: 77,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/frontend/src/components/ui/sheet.tsx",
                        lineNumber: 75,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/ui/sheet.tsx",
                lineNumber: 58,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/ui/sheet.tsx",
        lineNumber: 56,
        columnNumber: 5
    }, this);
}
_c5 = SheetContent;
function SheetHeader(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "sheet-header",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex flex-col gap-1.5 p-4", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sheet.tsx",
        lineNumber: 86,
        columnNumber: 5
    }, this);
}
_c6 = SheetHeader;
function SheetFooter(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "sheet-footer",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("mt-auto flex flex-col gap-2 p-4", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sheet.tsx",
        lineNumber: 96,
        columnNumber: 5
    }, this);
}
_c7 = SheetFooter;
function SheetTitle(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Title"], {
        "data-slot": "sheet-title",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-foreground font-semibold", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sheet.tsx",
        lineNumber: 109,
        columnNumber: 5
    }, this);
}
_c8 = SheetTitle;
function SheetDescription(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$dialog$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Description"], {
        "data-slot": "sheet-description",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-muted-foreground text-sm", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sheet.tsx",
        lineNumber: 122,
        columnNumber: 5
    }, this);
}
_c9 = SheetDescription;
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9;
__turbopack_context__.k.register(_c, "Sheet");
__turbopack_context__.k.register(_c1, "SheetTrigger");
__turbopack_context__.k.register(_c2, "SheetClose");
__turbopack_context__.k.register(_c3, "SheetPortal");
__turbopack_context__.k.register(_c4, "SheetOverlay");
__turbopack_context__.k.register(_c5, "SheetContent");
__turbopack_context__.k.register(_c6, "SheetHeader");
__turbopack_context__.k.register(_c7, "SheetFooter");
__turbopack_context__.k.register(_c8, "SheetTitle");
__turbopack_context__.k.register(_c9, "SheetDescription");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/sidebar-mobile.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Mobile - Client Component
 * 
 * Mobile-specific sidebar using Sheet component for overlay behavior.
 * Client component due to sheet state management.
 */ __turbopack_context__.s({
    "SidebarMobile": ()=>SidebarMobile
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sheet.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/constants.ts [app-client] (ecmascript)");
"use client";
;
;
;
function SidebarMobile(param) {
    let { open, onOpenChange, side = "left", className, children, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Sheet"], {
        open: open,
        onOpenChange: onOpenChange,
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SheetContent"], {
            "data-sidebar": "sidebar",
            "data-slot": "sidebar",
            "data-mobile": "true",
            className: "bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden",
            style: {
                "--sidebar-width": __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SIDEBAR_WIDTH_MOBILE"]
            },
            side: side,
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SheetHeader"], {
                    className: "sr-only",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SheetTitle"], {
                            children: "Sidebar"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-mobile.tsx",
                            lineNumber: 49,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SheetDescription"], {
                            children: "Displays the mobile sidebar."
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-mobile.tsx",
                            lineNumber: 50,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-mobile.tsx",
                    lineNumber: 48,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex h-full w-full flex-col",
                    children: children
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-mobile.tsx",
                    lineNumber: 52,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-mobile.tsx",
            lineNumber: 36,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-mobile.tsx",
        lineNumber: 35,
        columnNumber: 5
    }, this);
}
_c = SidebarMobile;
var _c;
__turbopack_context__.k.register(_c, "SidebarMobile");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/sidebar.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar - Server Component with Client Island
 * 
 * Main sidebar container with responsive behavior:
 * - Server component for structure and SEO
 * - Client hook integration for state
 * - Responsive mobile/desktop rendering
 */ __turbopack_context__.s({
    "Sidebar": ()=>Sidebar
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-context.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$mobile$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-mobile.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
function Sidebar(param) {
    let { side = "left", variant = "sidebar", collapsible = "offcanvas", className, children, ...props } = param;
    _s();
    const { isMobile, state, openMobile, setOpenMobile } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSidebar"])();
    // Non-collapsible sidebar - pure server component
    if (collapsible === "none") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            "data-slot": "sidebar",
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col", className),
            ...props,
            children: children
        }, void 0, false, {
            fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar.tsx",
            lineNumber: 35,
            columnNumber: 7
        }, this);
    }
    // Mobile sidebar - client component for sheet behavior
    if (isMobile) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$mobile$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SidebarMobile"], {
            open: openMobile,
            onOpenChange: setOpenMobile,
            side: side,
            className: className,
            ...props,
            children: children
        }, void 0, false, {
            fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar.tsx",
            lineNumber: 51,
            columnNumber: 7
        }, this);
    }
    // Desktop sidebar - server component with responsive styling
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "group peer text-sidebar-foreground hidden md:block",
        "data-state": state,
        "data-collapsible": state === "collapsed" ? collapsible : "",
        "data-variant": variant,
        "data-side": side,
        "data-slot": "sidebar",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                "data-slot": "sidebar-gap",
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear", "group-data-[collapsible=offcanvas]:w-0", "group-data-[side=right]:rotate-180", variant === "floating" || variant === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)")
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar.tsx",
                lineNumber: 74,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                "data-slot": "sidebar-container",
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex", side === "left" ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]" : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]", variant === "floating" || variant === "inset" ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l", className),
                ...props,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    "data-sidebar": "sidebar",
                    "data-slot": "sidebar-inner",
                    className: "bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm",
                    children: children
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar.tsx",
                    lineNumber: 101,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar.tsx",
                lineNumber: 87,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar.tsx",
        lineNumber: 65,
        columnNumber: 5
    }, this);
}
_s(Sidebar, "hAL3+uRFwO9tnbDK50BUE5wZ71s=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSidebar"]
    ];
});
_c = Sidebar;
var _c;
__turbopack_context__.k.register(_c, "Sidebar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/sidebar-trigger.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Trigger - Client Component
 * 
 * Toggle button for sidebar state. Client component for click handling.
 */ __turbopack_context__.s({
    "SidebarTrigger": ()=>SidebarTrigger
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$panel$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__PanelLeftIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/panel-left.js [app-client] (ecmascript) <export default as PanelLeftIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-context.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
function SidebarTrigger(param) {
    let { className, onClick, ...props } = param;
    _s();
    const { toggleSidebar } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSidebar"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Button"], {
        "data-sidebar": "trigger",
        "data-slot": "sidebar-trigger",
        variant: "ghost",
        size: "icon",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("size-7", className),
        onClick: (event)=>{
            onClick === null || onClick === void 0 ? void 0 : onClick(event);
            toggleSidebar();
        },
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$panel$2d$left$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__PanelLeftIcon$3e$__["PanelLeftIcon"], {}, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-trigger.tsx",
                lineNumber: 35,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "sr-only",
                children: "Toggle Sidebar"
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-trigger.tsx",
                lineNumber: 36,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-trigger.tsx",
        lineNumber: 23,
        columnNumber: 5
    }, this);
}
_s(SidebarTrigger, "dRnjPhQbCChcVGr4xvQkpNxnqyg=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSidebar"]
    ];
});
_c = SidebarTrigger;
var _c;
__turbopack_context__.k.register(_c, "SidebarTrigger");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/sidebar-rail.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Rail - Client Component
 * 
 * Interactive rail for toggling sidebar with hover effects.
 * Client component for click and hover interactions.
 */ __turbopack_context__.s({
    "SidebarRail": ()=>SidebarRail
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-context.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function SidebarRail(param) {
    let { className, ...props } = param;
    _s();
    const { toggleSidebar } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSidebar"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
        "data-sidebar": "rail",
        "data-slot": "sidebar-rail",
        "aria-label": "Toggle Sidebar",
        tabIndex: -1,
        onClick: toggleSidebar,
        title: "Toggle Sidebar",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex", "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize", "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize", "hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full", "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2", "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-rail.tsx",
        lineNumber: 21,
        columnNumber: 5
    }, this);
}
_s(SidebarRail, "dRnjPhQbCChcVGr4xvQkpNxnqyg=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSidebar"]
    ];
});
_c = SidebarRail;
var _c;
__turbopack_context__.k.register(_c, "SidebarRail");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/sidebar-header.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Header - Server Component
 * 
 * Static header section of the sidebar. Pure server component
 * for better SEO and performance.
 */ __turbopack_context__.s({
    "SidebarHeader": ()=>SidebarHeader
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
;
;
function SidebarHeader(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-sidebar": "header",
        "data-slot": "sidebar-header",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex flex-col gap-2 p-2", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-header.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, this);
}
_c = SidebarHeader;
var _c;
__turbopack_context__.k.register(_c, "SidebarHeader");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/sidebar-content.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Content - Server Component
 * 
 * Main content area of the sidebar. Server component for static structure.
 */ __turbopack_context__.s({
    "SidebarContent": ()=>SidebarContent
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
;
;
function SidebarContent(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-sidebar": "content",
        "data-slot": "sidebar-content",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-content.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
_c = SidebarContent;
var _c;
__turbopack_context__.k.register(_c, "SidebarContent");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/sidebar-footer.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Footer - Server Component
 * 
 * Static footer section of the sidebar. Pure server component.
 */ __turbopack_context__.s({
    "SidebarFooter": ()=>SidebarFooter
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
;
;
function SidebarFooter(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-sidebar": "footer",
        "data-slot": "sidebar-footer",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex flex-col gap-2 p-2", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-footer.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
_c = SidebarFooter;
var _c;
__turbopack_context__.k.register(_c, "SidebarFooter");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/sidebar-group.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Group - Server Component
 * 
 * Grouping container for sidebar menu items. Pure server component
 * for semantic structure.
 */ __turbopack_context__.s({
    "SidebarGroup": ()=>SidebarGroup,
    "SidebarGroupContent": ()=>SidebarGroupContent,
    "SidebarGroupLabel": ()=>SidebarGroupLabel
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
;
;
function SidebarGroup(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-sidebar": "group",
        "data-slot": "sidebar-group",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("relative flex w-full min-w-0 flex-col p-2", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-group.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, this);
}
_c = SidebarGroup;
function SidebarGroupLabel(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-sidebar": "group-label",
        "data-slot": "sidebar-group-label",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-group.tsx",
        lineNumber: 33,
        columnNumber: 5
    }, this);
}
_c1 = SidebarGroupLabel;
function SidebarGroupContent(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-sidebar": "group-content",
        "data-slot": "sidebar-group-content",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full text-sm", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-group.tsx",
        lineNumber: 50,
        columnNumber: 5
    }, this);
}
_c2 = SidebarGroupContent;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "SidebarGroup");
__turbopack_context__.k.register(_c1, "SidebarGroupLabel");
__turbopack_context__.k.register(_c2, "SidebarGroupContent");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Menu Components - Server Components
 * 
 * Menu structure components that are purely presentational.
 * All server components for better performance and SEO.
 */ __turbopack_context__.s({
    "SidebarMenu": ()=>SidebarMenu,
    "SidebarMenuItem": ()=>SidebarMenuItem,
    "SidebarMenuSub": ()=>SidebarMenuSub,
    "SidebarMenuSubItem": ()=>SidebarMenuSubItem
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
;
;
function SidebarMenu(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
        "data-sidebar": "menu",
        "data-slot": "sidebar-menu",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex w-full min-w-0 flex-col gap-1", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu.tsx",
        lineNumber: 19,
        columnNumber: 5
    }, this);
}
_c = SidebarMenu;
function SidebarMenuItem(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
        "data-sidebar": "menu-item",
        "data-slot": "sidebar-menu-item",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("group/menu-item relative", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu.tsx",
        lineNumber: 34,
        columnNumber: 5
    }, this);
}
_c1 = SidebarMenuItem;
function SidebarMenuSub(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
        "data-sidebar": "menu-sub",
        "data-slot": "sidebar-menu-sub",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5", "group-data-[collapsible=icon]:hidden", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu.tsx",
        lineNumber: 49,
        columnNumber: 5
    }, this);
}
_c2 = SidebarMenuSub;
function SidebarMenuSubItem(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
        "data-sidebar": "menu-sub-item",
        "data-slot": "sidebar-menu-sub-item",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("group/menu-sub-item", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu.tsx",
        lineNumber: 68,
        columnNumber: 5
    }, this);
}
_c3 = SidebarMenuSubItem;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "SidebarMenu");
__turbopack_context__.k.register(_c1, "SidebarMenuItem");
__turbopack_context__.k.register(_c2, "SidebarMenuSub");
__turbopack_context__.k.register(_c3, "SidebarMenuSubItem");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-button.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Menu Button - Server/Client Hybrid
 * 
 * Interactive menu button component. Can be used as both server and client
 * component depending on the interactivity needs.
 */ __turbopack_context__.s({
    "SidebarMenuButton": ()=>SidebarMenuButton,
    "SidebarMenuSubButton": ()=>SidebarMenuSubButton
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-slot/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/class-variance-authority/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$tooltip$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/tooltip.tsx [app-client] (ecmascript)");
;
;
;
;
;
const sidebarMenuButtonVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0", {
    variants: {
        variant: {
            default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            outline: "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]"
        },
        size: {
            default: "h-8 text-sm",
            sm: "h-7 text-xs",
            lg: "h-12 text-sm group-data-[collapsible=icon]:!size-11"
        }
    },
    defaultVariants: {
        variant: "default",
        size: "default"
    }
});
function SidebarMenuButton(param) {
    let { asChild = false, isActive = false, variant = "default", size = "default", tooltip, className, ...props } = param;
    const Comp = asChild ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Slot"] : "button";
    const button = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Comp, {
        "data-sidebar": "menu-button",
        "data-slot": "sidebar-menu-button",
        "data-size": size,
        "data-active": isActive,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(sidebarMenuButtonVariants({
            variant,
            size
        }), className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-button.tsx",
        lineNumber: 56,
        columnNumber: 5
    }, this);
    if (!tooltip) {
        return button;
    }
    if (typeof tooltip === "string") {
        tooltip = {
            children: tooltip
        };
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$tooltip$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Tooltip"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$tooltip$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TooltipTrigger"], {
                asChild: true,
                children: button
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-button.tsx",
                lineNumber: 78,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$tooltip$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TooltipContent"], {
                side: "right",
                align: "center",
                hidden: false,
                className: "group-data-[collapsible=expanded]/sidebar-wrapper:hidden",
                ...tooltip
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-button.tsx",
                lineNumber: 79,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-button.tsx",
        lineNumber: 77,
        columnNumber: 5
    }, this);
}
_c = SidebarMenuButton;
function SidebarMenuSubButton(param) {
    let { asChild = false, size = "sm", className, ...props } = param;
    const Comp = asChild ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Slot"] : "button";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Comp, {
        "data-sidebar": "menu-sub-button",
        "data-slot": "sidebar-menu-sub-button",
        "data-size": size,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(sidebarMenuButtonVariants({
            variant: "default",
            size
        }), "h-7 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-button.tsx",
        lineNumber: 100,
        columnNumber: 5
    }, this);
}
_c1 = SidebarMenuSubButton;
var _c, _c1;
__turbopack_context__.k.register(_c, "SidebarMenuButton");
__turbopack_context__.k.register(_c1, "SidebarMenuSubButton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-action.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Menu Action - Client Component
 * 
 * Interactive action button for menu items (dropdowns, actions).
 * Client component for interaction handling.
 */ __turbopack_context__.s({
    "SidebarMenuAction": ()=>SidebarMenuAction
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-slot/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$tooltip$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/tooltip.tsx [app-client] (ecmascript)");
"use client";
;
;
;
;
function SidebarMenuAction(param) {
    let { asChild = false, showOnHover = false, tooltip, className, ...props } = param;
    const Comp = asChild ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Slot"] : "button";
    const button = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Comp, {
        "data-sidebar": "menu-action",
        "data-slot": "sidebar-menu-action",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0", // Affects transform
        "after:absolute after:-inset-2 after:md:hidden", "peer-data-[size=sm]/menu-button:top-1", "peer-data-[size=default]/menu-button:top-1.5", "peer-data-[size=lg]/menu-button:top-2.5", "group-data-[collapsible=icon]:hidden", showOnHover && "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-action.tsx",
        lineNumber: 32,
        columnNumber: 5
    }, this);
    if (!tooltip) {
        return button;
    }
    if (typeof tooltip === "string") {
        tooltip = {
            children: tooltip
        };
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$tooltip$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Tooltip"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$tooltip$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TooltipTrigger"], {
                asChild: true,
                children: button
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-action.tsx",
                lineNumber: 63,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$tooltip$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TooltipContent"], {
                side: "right",
                align: "center",
                ...tooltip
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-action.tsx",
                lineNumber: 64,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-action.tsx",
        lineNumber: 62,
        columnNumber: 5
    }, this);
}
_c = SidebarMenuAction;
var _c;
__turbopack_context__.k.register(_c, "SidebarMenuAction");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-badge.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Menu Badge - Server Component
 * 
 * Badge component for menu items. Pure server component for static display.
 */ __turbopack_context__.s({
    "SidebarMenuBadge": ()=>SidebarMenuBadge
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
;
;
function SidebarMenuBadge(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-sidebar": "menu-badge",
        "data-slot": "sidebar-menu-badge",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground select-none pointer-events-none", "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground", "group-data-[collapsible=icon]:hidden", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-badge.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
_c = SidebarMenuBadge;
var _c;
__turbopack_context__.k.register(_c, "SidebarMenuBadge");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/skeleton.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "Skeleton": ()=>Skeleton
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
;
;
function Skeleton(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("animate-pulse rounded-md bg-muted", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/skeleton.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, this);
}
_c = Skeleton;
;
var _c;
__turbopack_context__.k.register(_c, "Skeleton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-skeleton.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Menu Skeleton - Server Component
 * 
 * Loading skeleton for sidebar menu items. Server component for static structure.
 */ __turbopack_context__.s({
    "SidebarMenuSkeleton": ()=>SidebarMenuSkeleton
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/skeleton.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
;
;
;
function SidebarMenuSkeleton(param) {
    let { className, showIcon = false, ...props } = param;
    _s();
    // Random width for more organic loading state
    const width = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"]({
        "SidebarMenuSkeleton.useMemo[width]": ()=>{
            return "".concat(Math.floor(Math.random() * 40) + 50, "%");
        }
    }["SidebarMenuSkeleton.useMemo[width]"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-sidebar": "menu-skeleton",
        "data-slot": "sidebar-menu-skeleton",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("rounded-md h-8 flex gap-2 px-2 items-center", className),
        ...props,
        children: [
            showIcon && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                className: "size-4 rounded-sm"
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-skeleton.tsx",
                lineNumber: 33,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                className: "h-4 flex-1 max-w-[--skeleton-width]",
                style: {
                    "--skeleton-width": width
                }
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-skeleton.tsx",
                lineNumber: 35,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-skeleton.tsx",
        lineNumber: 26,
        columnNumber: 5
    }, this);
}
_s(SidebarMenuSkeleton, "nKFjX4dxbYo91VAj5VdWQ1XUe3I=");
_c = SidebarMenuSkeleton;
var _c;
__turbopack_context__.k.register(_c, "SidebarMenuSkeleton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/sidebar-inset.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Inset - Server Component
 * 
 * Main content area that adjusts to sidebar state.
 * Server component for static layout structure.
 */ __turbopack_context__.s({
    "SidebarInset": ()=>SidebarInset
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
;
;
function SidebarInset(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
        "data-sidebar": "inset",
        "data-slot": "sidebar-inset",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("relative flex min-h-svh flex-1 flex-col bg-background", "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-inset.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, this);
}
_c = SidebarInset;
var _c;
__turbopack_context__.k.register(_c, "SidebarInset");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/sidebar-input.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Input - Server Component
 * 
 * Styled input component for sidebar contexts.
 * Server component with optional client interactivity.
 */ __turbopack_context__.s({
    "SidebarInput": ()=>SidebarInput
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/input.tsx [app-client] (ecmascript)");
;
;
;
function SidebarInput(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
        "data-sidebar": "input",
        "data-slot": "sidebar-input",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-input.tsx",
        lineNumber: 17,
        columnNumber: 5
    }, this);
}
_c = SidebarInput;
var _c;
__turbopack_context__.k.register(_c, "SidebarInput");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/separator.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "Separator": ()=>Separator
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$separator$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-separator/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
"use client";
;
;
;
function Separator(param) {
    let { className, orientation = "horizontal", decorative = true, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$separator$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Root"], {
        "data-slot": "separator",
        decorative: decorative,
        orientation: orientation,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/separator.tsx",
        lineNumber: 15,
        columnNumber: 5
    }, this);
}
_c = Separator;
;
var _c;
__turbopack_context__.k.register(_c, "Separator");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/sidebar-separator.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Separator - Server Component
 * 
 * Visual separator for sidebar sections. Pure server component.
 */ __turbopack_context__.s({
    "SidebarSeparator": ()=>SidebarSeparator
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$separator$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/separator.tsx [app-client] (ecmascript)");
;
;
;
function SidebarSeparator(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$separator$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Separator"], {
        "data-sidebar": "separator",
        "data-slot": "sidebar-separator",
        orientation: "horizontal",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("mx-2 w-auto bg-sidebar-border", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/sidebar/sidebar-separator.tsx",
        lineNumber: 16,
        columnNumber: 5
    }, this);
}
_c = SidebarSeparator;
var _c;
__turbopack_context__.k.register(_c, "SidebarSeparator");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/index.ts [app-client] (ecmascript) <locals>": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Sidebar Component System - Next.js 15 Optimized
 * 
 * Architecture:
 * - Server components for static structure and SEO
 * - Client islands for interactive state management
 * - Compound component pattern for maximum flexibility
 */ __turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$trigger$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-trigger.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$rail$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-rail.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$header$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-header.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$content$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-content.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$footer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-footer.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$group$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-group.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2d$action$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-action.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2d$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-badge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2d$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-skeleton.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$inset$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-inset.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$separator$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-separator.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-context.tsx [app-client] (ecmascript)");
// Constants
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/constants.ts [app-client] (ecmascript)");
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
;
;
;
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/sidebar/index.ts [app-client] (ecmascript) <module evaluation>": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$trigger$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-trigger.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$rail$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-rail.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$header$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-header.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$content$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-content.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$footer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-footer.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$group$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-group.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2d$action$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-action.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2d$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-badge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2d$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-skeleton.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$inset$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-inset.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$separator$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-separator.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-context.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$constants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/constants.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/index.ts [app-client] (ecmascript) <locals>");
}),
"[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "DashboardSidebar": ()=>DashboardSidebar,
    "Sidebar": ()=>DashboardSidebar
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/index.ts [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$header$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-header.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$content$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-content.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$footer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-footer.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$group$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-group.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-menu-button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$trigger$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/sidebar/sidebar-trigger.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/house.js [app-client] (ecmascript) <export default as Home>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/building.js [app-client] (ecmascript) <export default as Building>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/users.js [app-client] (ecmascript) <export default as Users>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-text.js [app-client] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wrench$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wrench$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/wrench.js [app-client] (ecmascript) <export default as Wrench>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chart-column.js [app-client] (ecmascript) <export default as BarChart3>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/settings.js [app-client] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/log-out.js [app-client] (ecmascript) <export default as LogOut>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/user.js [app-client] (ecmascript) <export default as User>");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
const navigation = [
    {
        id: 'dashboard',
        name: 'Dashboard',
        href: '/dashboard',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__["Home"]
    },
    {
        id: 'properties',
        name: 'Properties',
        href: '/(dashboard)/properties',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building$3e$__["Building"]
    },
    {
        id: 'tenants',
        name: 'Tenants',
        href: '/tenants',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"]
    },
    {
        id: 'leases',
        name: 'Leases',
        href: '/leases',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"]
    },
    {
        id: 'maintenance',
        name: 'Maintenance',
        href: '/maintenance',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wrench$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wrench$3e$__["Wrench"]
    },
    {
        id: 'reports',
        name: 'Reports',
        href: '/reports',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chart$2d$column$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__BarChart3$3e$__["BarChart3"]
    },
    {
        id: 'settings',
        name: 'Settings',
        href: '/settings',
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"]
    }
];
function DashboardSidebar(param) {
    let { className } = param;
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SidebarProvider"], {
        defaultOpen: true,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Sidebar"], {
                collapsible: "icon",
                className: className,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$header$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SidebarHeader"], {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: "/dashboard",
                            className: "flex items-center gap-2 px-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building$3e$__["Building"], {
                                    className: "h-8 w-8 text-primary"
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                    lineNumber: 52,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "font-bold text-xl group-data-[collapsible=icon]:hidden",
                                    children: "TenantFlow"
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                    lineNumber: 53,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                            lineNumber: 51,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                        lineNumber: 50,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$content$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SidebarContent"], {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$group$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SidebarGroup"], {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$group$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SidebarGroupContent"], {
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SidebarMenu"], {
                                    children: navigation.map((item)=>{
                                        const Icon = item.icon;
                                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SidebarMenuItem"], {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SidebarMenuButton"], {
                                                asChild: true,
                                                isActive: isActive,
                                                tooltip: item.name,
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                    href: item.href,
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                                            className: "h-4 w-4"
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                                            lineNumber: 75,
                                                            columnNumber: 27
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: item.name
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                                            lineNumber: 76,
                                                            columnNumber: 27
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                                    lineNumber: 74,
                                                    columnNumber: 25
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                                lineNumber: 69,
                                                columnNumber: 23
                                            }, this)
                                        }, item.id, false, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                            lineNumber: 68,
                                            columnNumber: 21
                                        }, this);
                                    })
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                    lineNumber: 62,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                lineNumber: 61,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                            lineNumber: 60,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                        lineNumber: 59,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$footer$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SidebarFooter"], {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SidebarMenu"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SidebarMenuItem"], {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SidebarMenuButton"], {
                                        asChild: true,
                                        tooltip: "Profile",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                            href: "/profile",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__User$3e$__["User"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                                    lineNumber: 92,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Profile"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                                    lineNumber: 93,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                            lineNumber: 91,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                        lineNumber: 90,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                    lineNumber: 89,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SidebarMenuItem"], {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$menu$2d$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SidebarMenuButton"], {
                                        asChild: true,
                                        tooltip: "Logout",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>console.log('Logout'),
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$log$2d$out$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__LogOut$3e$__["LogOut"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                                    lineNumber: 100,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    children: "Logout"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                                    lineNumber: 101,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                            lineNumber: 99,
                                            columnNumber: 17
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                        lineNumber: 98,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                                    lineNumber: 97,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                            lineNumber: 88,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                        lineNumber: 87,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                lineNumber: 49,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "absolute top-4 right-4 z-50 lg:hidden",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$sidebar$2f$sidebar$2d$trigger$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SidebarTrigger"], {}, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                    lineNumber: 111,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
                lineNumber: 110,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-sidebar.tsx",
        lineNumber: 48,
        columnNumber: 5
    }, this);
}
_s(DashboardSidebar, "xbyQPtUVMO7MNj7WjJlpdWqRcTo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"]
    ];
});
_c = DashboardSidebar;
;
var _c;
__turbopack_context__.k.register(_c, "DashboardSidebar");
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
"[project]/apps/frontend/src/providers/posthog-provider.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "PHProvider": ()=>PHProvider
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/posthog-js/dist/module.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$posthog$2d$js$2f$react$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/posthog-js/react/dist/esm/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
// Initialize PostHog only on the client side
if ("TURBOPACK compile-time truthy", 1) {
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].init(("TURBOPACK compile-time value", "phc_rSyH7L2ImIDIi4evbhKV2sozqmf5PWIZvGzFfrfuVHf"), {
        api_host: '/ingest',
        person_profiles: 'identified_only',
        capture_pageview: false,
        capture_pageleave: true,
        persistence: 'localStorage+cookie',
        autocapture: {
            // Configure autocapture settings
            capture_copied_text: false,
            css_selector_allowlist: [
                '[data-track]'
            ]
        },
        session_recording: {
            maskAllInputs: true,
            maskInputOptions: {
                password: true,
                email: true,
                tel: true
            }
        },
        opt_out_capturing_by_default: false,
        loaded: (posthog)=>{
            // Check if we should track based on env and feature flags
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
        }
    });
}
function PHProvider(param) {
    let { children } = param;
    _s();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PHProvider.useEffect": ()=>{
            // Check for Do Not Track browser setting
            if ("object" !== 'undefined' && navigator.doNotTrack === '1') {
                __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].opt_out_capturing();
            }
        }
    }["PHProvider.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$posthog$2d$js$2f$react$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PostHogProvider"], {
        client: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"],
        children: children
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/providers/posthog-provider.tsx",
        lineNumber: 46,
        columnNumber: 10
    }, this);
}
_s(PHProvider, "OD7bBpZva5O2jO+Puf00hKivP7c=");
_c = PHProvider;
var _c;
__turbopack_context__.k.register(_c, "PHProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/analytics/posthog-page-view.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "PostHogPageView": ()=>PostHogPageView
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$posthog$2d$js$2f$react$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/posthog-js/react/dist/esm/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
function PostHogPageView() {
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const posthog = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$posthog$2d$js$2f$react$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePostHog"])();
    const prevPathRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])('');
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PostHogPageView.useEffect": ()=>{
            if (!posthog || !pathname) return;
            // Build the full URL
            let url = window.origin + pathname;
            if (searchParams === null || searchParams === void 0 ? void 0 : searchParams.toString()) {
                url = url + "?".concat(searchParams.toString());
            }
            // Only track if the path has actually changed
            if (prevPathRef.current !== url) {
                prevPathRef.current = url;
                // Capture pageview with additional metadata
                posthog.capture('$pageview', {
                    $current_url: url,
                    $pathname: pathname,
                    $search: (searchParams === null || searchParams === void 0 ? void 0 : searchParams.toString()) || '',
                    $referrer: document.referrer,
                    $referring_domain: document.referrer ? new URL(document.referrer).hostname : '',
                    $screen_height: window.screen.height,
                    $screen_width: window.screen.width,
                    $viewport_height: window.innerHeight,
                    $viewport_width: window.innerWidth,
                    timestamp: new Date().toISOString()
                });
                // Track page performance metrics
                if ("object" !== 'undefined' && window.performance) {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    if (perfData) {
                        posthog.capture('$page_performance', {
                            $current_url: url,
                            load_time: perfData.loadEventEnd - perfData.loadEventStart,
                            dom_interactive: perfData.domInteractive,
                            dom_content_loaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart
                        });
                    }
                }
            }
        }
    }["PostHogPageView.useEffect"], [
        pathname,
        searchParams,
        posthog
    ]);
    // This component doesn't render anything
    return null;
}
_s(PostHogPageView, "5ZHLBaWiaqDc34HiokSWqYXd8R0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$posthog$2d$js$2f$react$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePostHog"]
    ];
});
_c = PostHogPageView;
var _c;
__turbopack_context__.k.register(_c, "PostHogPageView");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/hooks/use-posthog.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "usePostHog": ()=>usePostHog
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$posthog$2d$js$2f$react$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/posthog-js/react/dist/esm/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
function usePostHog() {
    _s();
    const posthog = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$posthog$2d$js$2f$react$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePostHog"])();
    // Track custom events with consistent naming
    const trackEvent = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "usePostHog.useCallback[trackEvent]": (event, properties)=>{
            if (!posthog) return;
            // Add consistent metadata to all events
            const enrichedProperties = {
                ...properties,
                app_version: ("TURBOPACK compile-time value", "1.0.0"),
                environment: ("TURBOPACK compile-time value", "production"),
                timestamp: new Date().toISOString()
            };
            posthog.capture(event, enrichedProperties);
        }
    }["usePostHog.useCallback[trackEvent]"], [
        posthog
    ]);
    // Identify user with properties
    const identifyUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "usePostHog.useCallback[identifyUser]": (user, organizationId)=>{
            if (!posthog || !user) return;
            posthog.identify(user.id, {
                email: user.email,
                created_at: user.createdAt,
                organization_id: organizationId
            });
        }
    }["usePostHog.useCallback[identifyUser]"], [
        posthog
    ]);
    // Reset user identification on logout
    const resetUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "usePostHog.useCallback[resetUser]": ()=>{
            if (!posthog) return;
            posthog.reset();
        }
    }["usePostHog.useCallback[resetUser]"], [
        posthog
    ]);
    // Track conversion goals
    const trackConversion = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "usePostHog.useCallback[trackConversion]": (goalName, value, properties)=>{
            if (!posthog) return;
            posthog.capture('conversion_goal', {
                goal_name: goalName,
                goal_value: value,
                ...properties
            });
        }
    }["usePostHog.useCallback[trackConversion]"], [
        posthog
    ]);
    // Track errors with context
    const trackError = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "usePostHog.useCallback[trackError]": (error, context)=>{
            if (!posthog) return;
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            posthog.capture('error_occurred', {
                error_message: errorMessage,
                error_stack: errorStack,
                error_type: error instanceof Error ? error.name : 'UnknownError',
                ...context
            });
        }
    }["usePostHog.useCallback[trackError]"], [
        posthog
    ]);
    // Check feature flag status
    const isFeatureEnabled = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "usePostHog.useCallback[isFeatureEnabled]": function(flagKey) {
            let fallback = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : false;
            if (!posthog) return fallback;
            var _posthog_isFeatureEnabled;
            return (_posthog_isFeatureEnabled = posthog.isFeatureEnabled(flagKey)) !== null && _posthog_isFeatureEnabled !== void 0 ? _posthog_isFeatureEnabled : fallback;
        }
    }["usePostHog.useCallback[isFeatureEnabled]"], [
        posthog
    ]);
    // Get feature flag payload
    const getFeatureFlagPayload = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "usePostHog.useCallback[getFeatureFlagPayload]": (flagKey)=>{
            if (!posthog) return null;
            return posthog.getFeatureFlagPayload(flagKey);
        }
    }["usePostHog.useCallback[getFeatureFlagPayload]"], [
        posthog
    ]);
    // Track timing metrics
    const trackTiming = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "usePostHog.useCallback[trackTiming]": (category, variable, time, label)=>{
            if (!posthog) return;
            posthog.capture('timing_metric', {
                timing_category: category,
                timing_variable: variable,
                timing_time: time,
                timing_label: label
            });
        }
    }["usePostHog.useCallback[trackTiming]"], [
        posthog
    ]);
    return {
        posthog,
        trackEvent,
        identifyUser,
        resetUser,
        trackConversion,
        trackError,
        isFeatureEnabled,
        getFeatureFlagPayload,
        trackTiming
    };
}
_s(usePostHog, "VV5Ymx8luIczxT2kLGmLbqzX6CM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$posthog$2d$js$2f$react$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePostHog"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/analytics/posthog-user-provider.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "PostHogUserProvider": ()=>PostHogUserProvider
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$posthog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/use-posthog.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
function PostHogUserProvider(param) {
    let { children } = param;
    _s();
    const { user } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const { posthog, trackEvent } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$posthog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePostHog"])();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "PostHogUserProvider.useEffect": ()=>{
            if (user && posthog) {
                // Identify the user in PostHog
                posthog.identify(user.id, {
                    email: user.email,
                    created_at: user.createdAt
                });
                // Track sign in event if user just logged in
                const isNewSession = sessionStorage.getItem('posthog_new_session') !== 'false';
                if (isNewSession) {
                    trackEvent('user_signed_in', {
                        user_id: user.id
                    });
                    sessionStorage.setItem('posthog_new_session', 'false');
                }
            } else if (posthog) {
                // Reset user identification on logout
                posthog.reset();
                sessionStorage.removeItem('posthog_new_session');
            }
        }
    }["PostHogUserProvider.useEffect"], [
        user,
        posthog,
        trackEvent
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: children
    }, void 0, false);
}
_s(PostHogUserProvider, "Gr6nsVXlr6ldRaSSbv4F00GNwcQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$use$2d$posthog$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePostHog"]
    ];
});
_c = PostHogUserProvider;
var _c;
__turbopack_context__.k.register(_c, "PostHogUserProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/analytics/posthog-error-boundary.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "PostHogErrorBoundary": ()=>PostHogErrorBoundary
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/posthog-js/dist/module.js [app-client] (ecmascript)");
'use client';
;
;
;
class PostHogErrorBoundary extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Component"] {
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error
        };
    }
    componentDidCatch(error, errorInfo) {
        // Log error to PostHog
        if ("object" !== 'undefined' && __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"]) {
            __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$posthog$2d$js$2f$dist$2f$module$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].capture('error_occurred', {
                error_message: error.message,
                error_stack: error.stack,
                error_type: error.name,
                error_boundary: true,
                component_stack: errorInfo.componentStack,
                error_digest: errorInfo.digest,
                page_url: window.location.href,
                user_agent: navigator.userAgent
            });
        }
        // Also log to console in development
        if ("TURBOPACK compile-time truthy", 1) {
            console.error('Error caught by PostHog Error Boundary:', error, errorInfo);
        }
    }
    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return this.props.fallback || /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex min-h-screen items-center justify-center p-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                            className: "mb-4 text-xl font-semibold text-gray-900 dark:text-white",
                            children: "Something went wrong"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/analytics/posthog-error-boundary.tsx",
                            lineNumber: 54,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mb-4 text-gray-600 dark:text-gray-300",
                            children: "We've encountered an unexpected error. Our team has been notified and is working on a fix."
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/analytics/posthog-error-boundary.tsx",
                            lineNumber: 57,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>window.location.reload(),
                            className: "w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                            children: "Reload Page"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/analytics/posthog-error-boundary.tsx",
                            lineNumber: 60,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/frontend/src/components/analytics/posthog-error-boundary.tsx",
                    lineNumber: 53,
                    columnNumber: 13
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/analytics/posthog-error-boundary.tsx",
                lineNumber: 52,
                columnNumber: 11
            }, this);
        }
        return this.props.children;
    }
    constructor(props){
        super(props);
        this.state = {
            hasError: false
        };
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
}]);

//# sourceMappingURL=apps_frontend_src_ceb12dca._.js.map
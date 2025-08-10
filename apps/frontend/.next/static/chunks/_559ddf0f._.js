(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push([typeof document === "object" ? document.currentScript : undefined, {

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
"[project]/apps/frontend/src/components/ui/alert.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "Alert": ()=>Alert,
    "AlertDescription": ()=>AlertDescription,
    "AlertTitle": ()=>AlertTitle
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/class-variance-authority/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
;
;
;
const alertVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current", {
    variants: {
        variant: {
            default: "bg-card text-card-foreground",
            destructive: "text-destructive bg-card [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90"
        }
    },
    defaultVariants: {
        variant: "default"
    }
});
function Alert(param) {
    let { className, variant, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "alert",
        role: "alert",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(alertVariants({
            variant
        }), className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/alert.tsx",
        lineNumber: 28,
        columnNumber: 5
    }, this);
}
_c = Alert;
function AlertTitle(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "alert-title",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/alert.tsx",
        lineNumber: 39,
        columnNumber: 5
    }, this);
}
_c1 = AlertTitle;
function AlertDescription(param) {
    let { className, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "alert-description",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/alert.tsx",
        lineNumber: 55,
        columnNumber: 5
    }, this);
}
_c2 = AlertDescription;
;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "Alert");
__turbopack_context__.k.register(_c1, "AlertTitle");
__turbopack_context__.k.register(_c2, "AlertDescription");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "DashboardErrorBoundary": ()=>DashboardErrorBoundary
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/card.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/alert.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/refresh-cw.js [app-client] (ecmascript) <export default as RefreshCw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/house.js [app-client] (ecmascript) <export default as Home>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
'use client';
;
;
;
;
;
;
;
class DashboardErrorBoundary extends __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Component"] {
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error
        };
    }
    componentDidCatch(error, errorInfo) {
        console.error('Dashboard error:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            var _this_state_error_message, _this_state_error, _this_state_error_message1, _this_state_error1;
            // Check if it's an API error
            const isApiError = ((_this_state_error = this.state.error) === null || _this_state_error === void 0 ? void 0 : (_this_state_error_message = _this_state_error.message) === null || _this_state_error_message === void 0 ? void 0 : _this_state_error_message.includes('404')) || ((_this_state_error1 = this.state.error) === null || _this_state_error1 === void 0 ? void 0 : (_this_state_error_message1 = _this_state_error1.message) === null || _this_state_error_message1 === void 0 ? void 0 : _this_state_error_message1.includes('Request failed'));
            if (isApiError) {
                // Show a friendly message for API errors
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "container mx-auto p-6 max-w-4xl",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Alert"], {
                            className: "mb-6",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                                    className: "h-4 w-4"
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                    lineNumber: 45,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AlertTitle"], {
                                    children: "Limited Functionality"
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                    lineNumber: 46,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AlertDescription"], {
                                    children: "Some features are currently unavailable. You can still explore the application."
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                    lineNumber: 47,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                            lineNumber: 44,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid gap-6 md:grid-cols-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                                                    children: "Quick Actions"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                                    lineNumber: 55,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardDescription"], {
                                                    children: "Get started with these features"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                                    lineNumber: 56,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                            lineNumber: 54,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                                            className: "space-y-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                    href: "/properties",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Button"], {
                                                        variant: "outline",
                                                        className: "w-full justify-start",
                                                        children: "View Properties"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                                        lineNumber: 60,
                                                        columnNumber: 21
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                                    lineNumber: 59,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                    href: "/tenants",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Button"], {
                                                        variant: "outline",
                                                        className: "w-full justify-start",
                                                        children: "Manage Tenants"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                                        lineNumber: 65,
                                                        columnNumber: 21
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                                    lineNumber: 64,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                    href: "/settings",
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Button"], {
                                                        variant: "outline",
                                                        className: "w-full justify-start",
                                                        children: "Account Settings"
                                                    }, void 0, false, {
                                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                                        lineNumber: 70,
                                                        columnNumber: 21
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                                    lineNumber: 69,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                            lineNumber: 58,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                    lineNumber: 53,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                                                    children: "Welcome to TenantFlow"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                                    lineNumber: 79,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardDescription"], {
                                                    children: "Your property management platform"
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                                    lineNumber: 80,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                            lineNumber: 78,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-sm text-muted-foreground mb-4",
                                                    children: "We're currently setting up your dashboard. In the meantime, you can explore the available features using the navigation menu."
                                                }, void 0, false, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                                    lineNumber: 83,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Button"], {
                                                    onClick: ()=>window.location.reload(),
                                                    variant: "secondary",
                                                    className: "w-full",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                                                            className: "mr-2 h-4 w-4"
                                                        }, void 0, false, {
                                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                                            lineNumber: 92,
                                                            columnNumber: 21
                                                        }, this),
                                                        "Retry Loading Dashboard"
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                                    lineNumber: 87,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                            lineNumber: 82,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                    lineNumber: 77,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                            lineNumber: 52,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "mt-6 text-center",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: "/",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Button"], {
                                    variant: "ghost",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__["Home"], {
                                            className: "mr-2 h-4 w-4"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                            lineNumber: 102,
                                            columnNumber: 19
                                        }, this),
                                        "Back to Home"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                    lineNumber: 101,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                lineNumber: 100,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                            lineNumber: 99,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                    lineNumber: 43,
                    columnNumber: 11
                }, this);
            }
            // For other errors, show the fallback or default error
            return this.props.fallback || /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex min-h-screen items-center justify-center",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                    className: "w-full max-w-md",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                                    children: "Something went wrong"
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                    lineNumber: 116,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardDescription"], {
                                    children: "An unexpected error occurred. Please try refreshing the page."
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                    lineNumber: 117,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                            lineNumber: 115,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                            className: "space-y-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Button"], {
                                    onClick: ()=>window.location.reload(),
                                    className: "w-full",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                                            className: "mr-2 h-4 w-4"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                            lineNumber: 123,
                                            columnNumber: 17
                                        }, this),
                                        "Refresh Page"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                    lineNumber: 122,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    href: "/",
                                    className: "block",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Button"], {
                                        variant: "outline",
                                        className: "w-full",
                                        children: "Go to Home"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                        lineNumber: 127,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                                    lineNumber: 126,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                            lineNumber: 121,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                    lineNumber: 114,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-error-boundary.tsx",
                lineNumber: 113,
                columnNumber: 9
            }, this);
        }
        return this.props.children;
    }
    constructor(props){
        super(props);
        this.state = {
            hasError: false,
            error: null
        };
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/hooks/query-factory.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * React Query Factory Utilities
 * 
 * Consolidates common React Query patterns to eliminate duplication across hooks.
 * Based on official TanStack Query patterns from documentation.
 */ __turbopack_context__.s({
    "useCrudMutations": ()=>useCrudMutations,
    "useDetailQuery": ()=>useDetailQuery,
    "useListQuery": ()=>useListQuery,
    "useMutationFactory": ()=>useMutationFactory,
    "useQueryFactory": ()=>useQueryFactory,
    "useStatsQuery": ()=>useStatsQuery
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/useQuery.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/useMutation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/sonner/dist/index.mjs [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature(), _s4 = __turbopack_context__.k.signature(), _s5 = __turbopack_context__.k.signature();
;
;
function useQueryFactory(options) {
    _s();
    const { queryKey, queryFn, enabled = true, refetchInterval, staleTime = 5 * 60 * 1000, gcTime = 10 * 60 * 1000, onSuccess, onError } = options;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey,
        queryFn,
        enabled,
        refetchInterval,
        staleTime,
        gcTime,
        meta: {
            onSuccess,
            onError
        }
    });
}
_s(useQueryFactory, "4ZpngI1uv+Uo3WQHEZmTQ5FNM+k=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"]
    ];
});
function useMutationFactory(options) {
    _s1();
    const queryClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"])();
    const { mutationFn, onSuccess, onError, invalidateKeys = [], successMessage, errorMessage, optimisticUpdate } = options;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutation"])({
        mutationFn,
        onMutate: {
            "useMutationFactory.useMutation": async (variables)=>{
                // Optimistic update pattern
                if (optimisticUpdate) {
                    await queryClient.cancelQueries({
                        queryKey: optimisticUpdate.queryKey
                    });
                    const previousData = queryClient.getQueryData(optimisticUpdate.queryKey);
                    queryClient.setQueryData(optimisticUpdate.queryKey, optimisticUpdate.updater(previousData, variables));
                    return {
                        previousData
                    };
                }
                return undefined;
            }
        }["useMutationFactory.useMutation"],
        onSuccess: {
            "useMutationFactory.useMutation": (data, variables)=>{
                // Invalidate related queries
                invalidateKeys.forEach({
                    "useMutationFactory.useMutation": (key)=>{
                        queryClient.invalidateQueries({
                            queryKey: key
                        });
                    }
                }["useMutationFactory.useMutation"]);
                // Show success toast
                if (successMessage) {
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].success(successMessage);
                }
                // Custom success callback
                onSuccess === null || onSuccess === void 0 ? void 0 : onSuccess(data, variables);
            }
        }["useMutationFactory.useMutation"],
        onError: {
            "useMutationFactory.useMutation": (error, variables, context)=>{
                // Revert optimistic update on error
                if (optimisticUpdate && (context === null || context === void 0 ? void 0 : context.previousData) !== undefined) {
                    queryClient.setQueryData(optimisticUpdate.queryKey, context.previousData);
                }
                // Show error toast
                if (errorMessage) {
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error(errorMessage);
                } else {
                    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$sonner$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toast"].error('An error occurred. Please try again.');
                }
                // Custom error callback
                onError === null || onError === void 0 ? void 0 : onError(error, variables);
            }
        }["useMutationFactory.useMutation"]
    });
}
_s1(useMutationFactory, "YK0wzM21ECnncaq5SECwU+/SVdQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutation"]
    ];
});
function useCrudMutations(resource, api) {
    _s2();
    const listQueryKey = [
        resource,
        'list'
    ];
    const invalidateKeys = [
        listQueryKey
    ];
    const createMutation = useMutationFactory({
        mutationFn: api.create,
        invalidateKeys,
        successMessage: "".concat(resource, " created successfully"),
        errorMessage: "Failed to create ".concat(resource)
    });
    const updateMutation = useMutationFactory({
        mutationFn: {
            "useCrudMutations.useMutationFactory[updateMutation]": (param)=>{
                let { id, input } = param;
                return api.update(id, input);
            }
        }["useCrudMutations.useMutationFactory[updateMutation]"],
        invalidateKeys,
        successMessage: "".concat(resource, " updated successfully"),
        errorMessage: "Failed to update ".concat(resource)
    });
    const deleteMutation = useMutationFactory({
        mutationFn: api.delete,
        invalidateKeys,
        successMessage: "".concat(resource, " deleted successfully"),
        errorMessage: "Failed to delete ".concat(resource)
    });
    return {
        createMutation,
        updateMutation,
        deleteMutation
    };
}
_s2(useCrudMutations, "Cv35D5LkloGrlx8b45OXtXlr4S4=", false, function() {
    return [
        useMutationFactory,
        useMutationFactory,
        useMutationFactory
    ];
});
function useListQuery(resource, fetcher, params) {
    _s3();
    return useQueryFactory({
        queryKey: [
            resource,
            'list',
            params
        ],
        queryFn: {
            "useListQuery.useQueryFactory": ()=>fetcher(params)
        }["useListQuery.useQueryFactory"],
        enabled: true,
        staleTime: 5 * 60 * 1000
    });
}
_s3(useListQuery, "UhCLg2PC09ybNJk4wW9kKTzKqUc=", false, function() {
    return [
        useQueryFactory
    ];
});
function useDetailQuery(resource, id, fetcher) {
    _s4();
    return useQueryFactory({
        queryKey: [
            resource,
            'detail',
            id
        ],
        queryFn: {
            "useDetailQuery.useQueryFactory": ()=>fetcher(id)
        }["useDetailQuery.useQueryFactory"],
        enabled: !!id,
        staleTime: 2 * 60 * 1000
    });
}
_s4(useDetailQuery, "UhCLg2PC09ybNJk4wW9kKTzKqUc=", false, function() {
    return [
        useQueryFactory
    ];
});
function useStatsQuery(resource, fetcher) {
    let refetchInterval = arguments.length > 2 && arguments[2] !== void 0 // 5 minutes
     ? arguments[2] : 5 * 60 * 1000;
    _s5();
    return useQueryFactory({
        queryKey: [
            resource,
            'stats'
        ],
        queryFn: fetcher,
        enabled: true,
        refetchInterval,
        staleTime: 2 * 60 * 1000
    });
}
_s5(useStatsQuery, "UhCLg2PC09ybNJk4wW9kKTzKqUc=", false, function() {
    return [
        useQueryFactory
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/hooks/api/use-dashboard.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * React Query hooks for Dashboard
 * Provides type-safe data fetching for dashboard statistics and analytics
 */ __turbopack_context__.s({
    "useDashboardActivity": ()=>useDashboardActivity,
    "useDashboardOverview": ()=>useDashboardOverview,
    "useDashboardStats": ()=>useDashboardStats,
    "useMaintenanceMetrics": ()=>useMaintenanceMetrics,
    "useOccupancyTrends": ()=>useOccupancyTrends,
    "useRevenueAnalytics": ()=>useRevenueAnalytics,
    "useTenantMetrics": ()=>useTenantMetrics
});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/api-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$react$2d$query$2f$query$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/react-query/query-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/query-factory.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature(), _s4 = __turbopack_context__.k.signature(), _s5 = __turbopack_context__.k.signature(), _s6 = __turbopack_context__.k.signature();
;
;
;
function useDashboardStats(options) {
    _s();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useStatsQuery"])('dashboard', {
        "useDashboardStats.useStatsQuery": async ()=>{
            try {
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/dashboard/stats');
                return response.data;
            } catch (e) {
                // Return default data on error to allow UI to render
                console.warn('Dashboard stats API unavailable, using defaults');
                return {
                    properties: {
                        totalProperties: 0,
                        occupancyRate: 0
                    },
                    tenants: {
                        totalTenants: 0
                    },
                    leases: {
                        activeLeases: 0,
                        expiredLeases: 0
                    },
                    maintenanceRequests: {
                        open: 0
                    }
                };
            }
        }
    }["useDashboardStats.useStatsQuery"], options === null || options === void 0 ? void 0 : options.refetchInterval);
}
_s(useDashboardStats, "SgTkKr4wlBwHxVbcmHcm7NlQbSU=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useStatsQuery"]
    ];
});
function useDashboardOverview(options) {
    _s1();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryFactory"])({
        queryKey: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$react$2d$query$2f$query$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["queryKeys"].dashboardOverview(),
        queryFn: {
            "useDashboardOverview.useQueryFactory": async ()=>{
                try {
                    const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/dashboard/overview');
                    return response.data;
                } catch (e) {
                    console.warn('Dashboard overview API unavailable');
                    // Return empty data structure
                    return {
                        recentActivity: [],
                        upcomingLeaseExpirations: [],
                        overduePayments: [],
                        propertyPerformance: []
                    };
                }
            }
        }["useDashboardOverview.useQueryFactory"],
        enabled: options === null || options === void 0 ? void 0 : options.enabled,
        staleTime: 2 * 60 * 1000
    });
}
_s1(useDashboardOverview, "UhCLg2PC09ybNJk4wW9kKTzKqUc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryFactory"]
    ];
});
function useDashboardActivity() {
    let limit = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 10, options = arguments.length > 1 ? arguments[1] : void 0;
    _s2();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryFactory"])({
        queryKey: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$react$2d$query$2f$query$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["queryKeys"].dashboardActivity(),
        queryFn: {
            "useDashboardActivity.useQueryFactory": async ()=>{
                try {
                    const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/dashboard/activity', {
                        params: {
                            limit
                        }
                    });
                    return response.data;
                } catch (e) {
                    console.warn('Dashboard activity API unavailable');
                    return [] // Return empty array on error
                    ;
                }
            }
        }["useDashboardActivity.useQueryFactory"],
        enabled: options === null || options === void 0 ? void 0 : options.enabled,
        staleTime: 60 * 1000
    });
}
_s2(useDashboardActivity, "UhCLg2PC09ybNJk4wW9kKTzKqUc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryFactory"]
    ];
});
function useRevenueAnalytics(options) {
    _s3();
    var _options_period, _options_enabled;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryFactory"])({
        queryKey: [
            'revenue-analytics',
            (_options_period = options === null || options === void 0 ? void 0 : options.period) !== null && _options_period !== void 0 ? _options_period : 'month'
        ],
        queryFn: {
            "useRevenueAnalytics.useQueryFactory": async ()=>{
                var _options_period;
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/dashboard/revenue', {
                    params: {
                        period: (_options_period = options === null || options === void 0 ? void 0 : options.period) !== null && _options_period !== void 0 ? _options_period : 'month'
                    }
                });
                return response.data;
            }
        }["useRevenueAnalytics.useQueryFactory"],
        enabled: (_options_enabled = options === null || options === void 0 ? void 0 : options.enabled) !== null && _options_enabled !== void 0 ? _options_enabled : true,
        staleTime: 10 * 60 * 1000
    });
}
_s3(useRevenueAnalytics, "UhCLg2PC09ybNJk4wW9kKTzKqUc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryFactory"]
    ];
});
function useOccupancyTrends(options) {
    _s4();
    var _options_months, _options_enabled;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryFactory"])({
        queryKey: [
            'occupancy-trends',
            (_options_months = options === null || options === void 0 ? void 0 : options.months) !== null && _options_months !== void 0 ? _options_months : 12
        ],
        queryFn: {
            "useOccupancyTrends.useQueryFactory": async ()=>{
                var _options_months;
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/dashboard/occupancy-trends', {
                    params: {
                        months: (_options_months = options === null || options === void 0 ? void 0 : options.months) !== null && _options_months !== void 0 ? _options_months : 12
                    }
                });
                return response.data;
            }
        }["useOccupancyTrends.useQueryFactory"],
        enabled: (_options_enabled = options === null || options === void 0 ? void 0 : options.enabled) !== null && _options_enabled !== void 0 ? _options_enabled : true,
        staleTime: 30 * 60 * 1000
    });
}
_s4(useOccupancyTrends, "UhCLg2PC09ybNJk4wW9kKTzKqUc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryFactory"]
    ];
});
function useMaintenanceMetrics(options) {
    _s5();
    var _options_enabled;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryFactory"])({
        queryKey: [
            'maintenance-metrics'
        ],
        queryFn: {
            "useMaintenanceMetrics.useQueryFactory": async ()=>{
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/dashboard/maintenance-metrics');
                return response.data;
            }
        }["useMaintenanceMetrics.useQueryFactory"],
        enabled: (_options_enabled = options === null || options === void 0 ? void 0 : options.enabled) !== null && _options_enabled !== void 0 ? _options_enabled : true,
        staleTime: 15 * 60 * 1000
    });
}
_s5(useMaintenanceMetrics, "UhCLg2PC09ybNJk4wW9kKTzKqUc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryFactory"]
    ];
});
function useTenantMetrics(options) {
    _s6();
    var _options_enabled;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryFactory"])({
        queryKey: [
            'tenant-metrics'
        ],
        queryFn: {
            "useTenantMetrics.useQueryFactory": async ()=>{
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/dashboard/tenant-metrics');
                return response.data;
            }
        }["useTenantMetrics.useQueryFactory"],
        enabled: (_options_enabled = options === null || options === void 0 ? void 0 : options.enabled) !== null && _options_enabled !== void 0 ? _options_enabled : true,
        staleTime: 20 * 60 * 1000
    });
}
_s6(useTenantMetrics, "UhCLg2PC09ybNJk4wW9kKTzKqUc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryFactory"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/constants/auth.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Authentication constants
 * Runtime constants and enums for user authentication and roles
 */ __turbopack_context__.s({
    "USER_ROLE": ()=>USER_ROLE,
    "USER_ROLE_OPTIONS": ()=>USER_ROLE_OPTIONS
});
const USER_ROLE = {
    OWNER: 'OWNER',
    MANAGER: 'MANAGER',
    TENANT: 'TENANT',
    ADMIN: 'ADMIN'
};
const USER_ROLE_OPTIONS = Object.values(USER_ROLE);
_c = USER_ROLE_OPTIONS;
var _c;
__turbopack_context__.k.register(_c, "USER_ROLE_OPTIONS");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/types/global.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Global type declarations and augmentations
 * 
 * This file contains global type declarations that extend the global namespace,
 * window object, and other global interfaces used throughout the application.
 */ __turbopack_context__.s({});
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/types/reminders.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Reminder types
 * Types for reminder and notification management
 */ __turbopack_context__.s({
    "getReminderStatusColor": ()=>getReminderStatusColor,
    "getReminderStatusLabel": ()=>getReminderStatusLabel,
    "getReminderTypeLabel": ()=>getReminderTypeLabel
});
const getReminderTypeLabel = (type)=>{
    const labels = {
        RENT_REMINDER: 'Rent Reminder',
        LEASE_EXPIRATION: 'Lease Expiration',
        MAINTENANCE_DUE: 'Maintenance Due',
        PAYMENT_OVERDUE: 'Payment Overdue'
    };
    return labels[type] || type;
};
const getReminderStatusLabel = (status)=>{
    const labels = {
        PENDING: 'Pending',
        SENT: 'Sent',
        FAILED: 'Failed',
        DELIVERED: 'Delivered',
        OPENED: 'Opened'
    };
    return labels[status] || status;
};
const getReminderStatusColor = (status)=>{
    const colors = {
        PENDING: 'bg-yellow-100 text-yellow-800',
        SENT: 'bg-blue-100 text-blue-800',
        FAILED: 'bg-red-100 text-red-800',
        DELIVERED: 'bg-green-100 text-green-800',
        OPENED: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/types/stripe-pricing.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Stripe Pricing Component Types
 * Based on official Stripe documentation and best practices
 */ // Import types from consolidated stripe.ts
__turbopack_context__.s({
    "calculateYearlySavings": ()=>calculateYearlySavings,
    "getStripeErrorMessage": ()=>getStripeErrorMessage,
    "validatePricingPlan": ()=>validatePricingPlan
});
const calculateYearlySavings = (monthlyPrice, yearlyPrice)=>{
    const yearlyMonthlyEquivalent = monthlyPrice * 12;
    const savings = yearlyMonthlyEquivalent - yearlyPrice;
    return Math.round(savings / yearlyMonthlyEquivalent * 100);
};
const getStripeErrorMessage = (error)=>{
    switch(error.code){
        case 'card_declined':
            return 'Your card was declined. Please try a different payment method.';
        case 'expired_card':
            return 'Your card has expired. Please use a different card.';
        case 'insufficient_funds':
            return 'Your card has insufficient funds. Please use a different card.';
        case 'incorrect_cvc':
            return 'Your card\'s security code is incorrect. Please try again.';
        case 'processing_error':
            return 'An error occurred while processing your card. Please try again.';
        case 'rate_limit_error':
            return 'Too many requests made too quickly. Please wait a moment and try again.';
        default:
            return error.message || 'An unexpected error occurred. Please try again.';
    }
};
const validatePricingPlan = (tier)=>{
    return !!(tier.id && tier.name && tier.description && tier.price.monthly >= 0 && tier.price.annual >= 0 && Array.isArray(tier.features) && (tier.stripePriceIds.monthly || tier.stripePriceIds.annual));
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/types/stripe.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Unified Stripe Type System
 *
 * Comprehensive type definitions for all Stripe-related functionality across TenantFlow.
 * This file serves as the single source of truth for Stripe types, eliminating duplication
 * and ensuring type safety across frontend and backend.
 *
 * @fileoverview Consolidates types from billing.ts, stripe-unified.ts, and local definitions
 */ // Essential Stripe interfaces for type compatibility
// This allows the shared package to compile without requiring stripe as a dependency
__turbopack_context__.s({
    "BILLING_PERIODS": ()=>BILLING_PERIODS,
    "DEFAULT_STRIPE_RETRY_CONFIG": ()=>DEFAULT_STRIPE_RETRY_CONFIG,
    "ERROR_CATEGORY_MAPPING": ()=>ERROR_CATEGORY_MAPPING,
    "ERROR_SEVERITY_MAPPING": ()=>ERROR_SEVERITY_MAPPING,
    "PLAN_TYPES": ()=>PLAN_TYPES,
    "RETRYABLE_ERROR_CODES": ()=>RETRYABLE_ERROR_CODES,
    "STRIPE_API_VERSIONS": ()=>STRIPE_API_VERSIONS,
    "STRIPE_DECLINE_CODES": ()=>STRIPE_DECLINE_CODES,
    "STRIPE_ERROR_CATEGORIES": ()=>STRIPE_ERROR_CATEGORIES,
    "STRIPE_ERROR_CODES": ()=>STRIPE_ERROR_CODES,
    "STRIPE_ERROR_SEVERITIES": ()=>STRIPE_ERROR_SEVERITIES,
    "SUBSCRIPTION_STATUSES": ()=>SUBSCRIPTION_STATUSES,
    "WEBHOOK_EVENT_TYPES": ()=>WEBHOOK_EVENT_TYPES,
    "validateStripeConfig": ()=>validateStripeConfig
});
const STRIPE_API_VERSIONS = {
    CURRENT: '2024-06-20',
    BETA: '2025-06-30.basil',
    LEGACY: '2023-10-16'
};
const STRIPE_ERROR_CODES = {
    // Card Errors
    CARD_DECLINED: 'card_declined',
    EXPIRED_CARD: 'expired_card',
    INCORRECT_CVC: 'incorrect_cvc',
    INCORRECT_NUMBER: 'incorrect_number',
    INSUFFICIENT_FUNDS: 'insufficient_funds',
    INVALID_EXPIRY_MONTH: 'invalid_expiry_month',
    INVALID_EXPIRY_YEAR: 'invalid_expiry_year',
    INVALID_NUMBER: 'invalid_number',
    PROCESSING_ERROR: 'processing_error',
    // Rate Limit Errors
    RATE_LIMIT: 'rate_limit',
    // Invalid Request Errors
    INVALID_REQUEST: 'invalid_request_error',
    MISSING_PARAMETER: 'missing',
    INVALID_PARAMETER: 'invalid',
    // API Errors
    API_CONNECTION_ERROR: 'api_connection_error',
    API_ERROR: 'api_error',
    AUTHENTICATION_ERROR: 'authentication_error',
    PERMISSION_ERROR: 'permission_error',
    IDEMPOTENCY_ERROR: 'idempotency_error',
    // Application Errors
    CUSTOMER_NOT_FOUND: 'customer_not_found',
    SUBSCRIPTION_NOT_FOUND: 'subscription_not_found',
    INVALID_PRICE_ID: 'invalid_price_id',
    WEBHOOK_SIGNATURE_INVALID: 'webhook_signature_invalid',
    CONFIGURATION_ERROR: 'configuration_error'
};
const STRIPE_DECLINE_CODES = {
    GENERIC_DECLINE: 'generic_decline',
    INSUFFICIENT_FUNDS: 'insufficient_funds',
    LOST_CARD: 'lost_card',
    STOLEN_CARD: 'stolen_card',
    EXPIRED_CARD: 'expired_card',
    INCORRECT_CVC: 'incorrect_cvc',
    PROCESSING_ERROR: 'processing_error',
    CARD_NOT_SUPPORTED: 'card_not_supported',
    CURRENCY_NOT_SUPPORTED: 'currency_not_supported',
    FRAUDULENT: 'fraudulent',
    MERCHANT_BLACKLIST: 'merchant_blacklist',
    PICKUP_CARD: 'pickup_card',
    RESTRICTED_CARD: 'restricted_card',
    SECURITY_VIOLATION: 'security_violation',
    SERVICE_NOT_ALLOWED: 'service_not_allowed',
    STOP_PAYMENT_ORDER: 'stop_payment_order',
    TESTMODE_DECLINE: 'testmode_decline',
    TRANSACTION_NOT_ALLOWED: 'transaction_not_allowed',
    TRY_AGAIN_LATER: 'try_again_later',
    WITHDRAWAL_COUNT_LIMIT_EXCEEDED: 'withdrawal_count_limit_exceeded'
};
const PLAN_TYPES = {
    FREETRIAL: 'FREETRIAL',
    STARTER: 'STARTER',
    GROWTH: 'GROWTH',
    TENANTFLOW_MAX: 'TENANTFLOW_MAX'
};
const BILLING_PERIODS = {
    MONTHLY: 'monthly',
    ANNUAL: 'annual',
    // Backward compatibility alias - prefer ANNUAL
    YEARLY: 'yearly'
};
const SUBSCRIPTION_STATUSES = {
    INCOMPLETE: 'incomplete',
    INCOMPLETE_EXPIRED: 'incomplete_expired',
    TRIALING: 'trialing',
    ACTIVE: 'active',
    PAST_DUE: 'past_due',
    CANCELED: 'canceled',
    UNPAID: 'unpaid',
    PAUSED: 'paused',
    UPDATING: 'updating'
};
const WEBHOOK_EVENT_TYPES = {
    // Customer events
    CUSTOMER_CREATED: 'customer.created',
    CUSTOMER_UPDATED: 'customer.updated',
    CUSTOMER_DELETED: 'customer.deleted',
    // Subscription events
    SUBSCRIPTION_CREATED: 'customer.subscription.created',
    SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
    SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
    SUBSCRIPTION_TRIAL_WILL_END: 'customer.subscription.trial_will_end',
    SUBSCRIPTION_PAUSED: 'customer.subscription.paused',
    SUBSCRIPTION_RESUMED: 'customer.subscription.resumed',
    // Invoice events
    INVOICE_CREATED: 'invoice.created',
    INVOICE_FINALIZED: 'invoice.finalized',
    INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
    INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
    INVOICE_PAYMENT_ACTION_REQUIRED: 'invoice.payment_action_required',
    INVOICE_UPCOMING: 'invoice.upcoming',
    // Payment events
    PAYMENT_INTENT_CREATED: 'payment_intent.created',
    PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
    PAYMENT_INTENT_PAYMENT_FAILED: 'payment_intent.payment_failed',
    PAYMENT_INTENT_REQUIRES_ACTION: 'payment_intent.requires_action',
    // Charge events
    CHARGE_FAILED: 'charge.failed',
    // Checkout events
    CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
    CHECKOUT_SESSION_EXPIRED: 'checkout.session.expired',
    // Setup intent events
    SETUP_INTENT_SUCCEEDED: 'setup_intent.succeeded',
    SETUP_INTENT_SETUP_FAILED: 'setup_intent.setup_failed'
};
const STRIPE_ERROR_CATEGORIES = {
    PAYMENT_METHOD: 'payment_method',
    INFRASTRUCTURE: 'infrastructure',
    CLIENT_ERROR: 'client_error',
    STRIPE_SERVICE: 'stripe_service',
    CONFIGURATION: 'configuration',
    UNKNOWN: 'unknown'
};
const STRIPE_ERROR_SEVERITIES = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};
const DEFAULT_STRIPE_RETRY_CONFIG = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    exponentialBase: 2,
    jitterMs: 100
};
const ERROR_CATEGORY_MAPPING = {
    [STRIPE_ERROR_CODES.CARD_DECLINED]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [STRIPE_ERROR_CODES.EXPIRED_CARD]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [STRIPE_ERROR_CODES.INCORRECT_CVC]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [STRIPE_ERROR_CODES.INCORRECT_NUMBER]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [STRIPE_ERROR_CODES.INVALID_EXPIRY_MONTH]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [STRIPE_ERROR_CODES.INVALID_EXPIRY_YEAR]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [STRIPE_ERROR_CODES.INVALID_NUMBER]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [STRIPE_ERROR_CODES.PROCESSING_ERROR]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [STRIPE_ERROR_CODES.RATE_LIMIT]: STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE,
    [STRIPE_ERROR_CODES.API_CONNECTION_ERROR]: STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE,
    [STRIPE_ERROR_CODES.API_ERROR]: STRIPE_ERROR_CATEGORIES.STRIPE_SERVICE,
    [STRIPE_ERROR_CODES.AUTHENTICATION_ERROR]: STRIPE_ERROR_CATEGORIES.CONFIGURATION,
    [STRIPE_ERROR_CODES.PERMISSION_ERROR]: STRIPE_ERROR_CATEGORIES.CONFIGURATION,
    [STRIPE_ERROR_CODES.INVALID_REQUEST]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [STRIPE_ERROR_CODES.MISSING_PARAMETER]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [STRIPE_ERROR_CODES.INVALID_PARAMETER]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [STRIPE_ERROR_CODES.IDEMPOTENCY_ERROR]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [STRIPE_ERROR_CODES.CUSTOMER_NOT_FOUND]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [STRIPE_ERROR_CODES.SUBSCRIPTION_NOT_FOUND]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [STRIPE_ERROR_CODES.INVALID_PRICE_ID]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [STRIPE_ERROR_CODES.WEBHOOK_SIGNATURE_INVALID]: STRIPE_ERROR_CATEGORIES.CONFIGURATION,
    [STRIPE_ERROR_CODES.CONFIGURATION_ERROR]: STRIPE_ERROR_CATEGORIES.CONFIGURATION
};
const ERROR_SEVERITY_MAPPING = {
    [STRIPE_ERROR_CODES.CARD_DECLINED]: STRIPE_ERROR_SEVERITIES.LOW,
    [STRIPE_ERROR_CODES.EXPIRED_CARD]: STRIPE_ERROR_SEVERITIES.LOW,
    [STRIPE_ERROR_CODES.INCORRECT_CVC]: STRIPE_ERROR_SEVERITIES.LOW,
    [STRIPE_ERROR_CODES.INCORRECT_NUMBER]: STRIPE_ERROR_SEVERITIES.LOW,
    [STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS]: STRIPE_ERROR_SEVERITIES.LOW,
    [STRIPE_ERROR_CODES.INVALID_EXPIRY_MONTH]: STRIPE_ERROR_SEVERITIES.LOW,
    [STRIPE_ERROR_CODES.INVALID_EXPIRY_YEAR]: STRIPE_ERROR_SEVERITIES.LOW,
    [STRIPE_ERROR_CODES.INVALID_NUMBER]: STRIPE_ERROR_SEVERITIES.LOW,
    [STRIPE_ERROR_CODES.PROCESSING_ERROR]: STRIPE_ERROR_SEVERITIES.MEDIUM,
    [STRIPE_ERROR_CODES.RATE_LIMIT]: STRIPE_ERROR_SEVERITIES.HIGH,
    [STRIPE_ERROR_CODES.API_CONNECTION_ERROR]: STRIPE_ERROR_SEVERITIES.HIGH,
    [STRIPE_ERROR_CODES.API_ERROR]: STRIPE_ERROR_SEVERITIES.HIGH,
    [STRIPE_ERROR_CODES.AUTHENTICATION_ERROR]: STRIPE_ERROR_SEVERITIES.CRITICAL,
    [STRIPE_ERROR_CODES.PERMISSION_ERROR]: STRIPE_ERROR_SEVERITIES.CRITICAL,
    [STRIPE_ERROR_CODES.INVALID_REQUEST]: STRIPE_ERROR_SEVERITIES.MEDIUM,
    [STRIPE_ERROR_CODES.MISSING_PARAMETER]: STRIPE_ERROR_SEVERITIES.MEDIUM,
    [STRIPE_ERROR_CODES.INVALID_PARAMETER]: STRIPE_ERROR_SEVERITIES.MEDIUM,
    [STRIPE_ERROR_CODES.IDEMPOTENCY_ERROR]: STRIPE_ERROR_SEVERITIES.MEDIUM,
    [STRIPE_ERROR_CODES.CUSTOMER_NOT_FOUND]: STRIPE_ERROR_SEVERITIES.MEDIUM,
    [STRIPE_ERROR_CODES.SUBSCRIPTION_NOT_FOUND]: STRIPE_ERROR_SEVERITIES.MEDIUM,
    [STRIPE_ERROR_CODES.INVALID_PRICE_ID]: STRIPE_ERROR_SEVERITIES.HIGH,
    [STRIPE_ERROR_CODES.WEBHOOK_SIGNATURE_INVALID]: STRIPE_ERROR_SEVERITIES.CRITICAL,
    [STRIPE_ERROR_CODES.CONFIGURATION_ERROR]: STRIPE_ERROR_SEVERITIES.CRITICAL
};
const RETRYABLE_ERROR_CODES = [
    STRIPE_ERROR_CODES.RATE_LIMIT,
    STRIPE_ERROR_CODES.API_ERROR,
    STRIPE_ERROR_CODES.API_CONNECTION_ERROR,
    STRIPE_ERROR_CODES.PROCESSING_ERROR
];
function validateStripeConfig(config) {
    const errors = [];
    if (!config.secretKey) {
        errors.push('STRIPE_SECRET_KEY is required');
    } else if (!config.secretKey.startsWith('sk_')) {
        errors.push('STRIPE_SECRET_KEY must start with "sk_"');
    }
    if (!config.publishableKey) {
        errors.push('STRIPE_PUBLISHABLE_KEY is required');
    } else if (!config.publishableKey.startsWith('pk_')) {
        errors.push('STRIPE_PUBLISHABLE_KEY must start with "pk_"');
    }
    // Webhook secret is optional but if provided, should be valid
    if (config.webhookSecret && !config.webhookSecret.startsWith('whsec_')) {
        errors.push('STRIPE_WEBHOOK_SECRET must start with "whsec_"');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/types/stripe-guards.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Stripe Type Guards
 * 
 * Runtime type validation utilities for Stripe types.
 * Provides type-safe guards for validating Stripe objects at runtime.
 * 
 * @fileoverview Type guards for all Stripe-related types
 */ __turbopack_context__.s({
    "StripeTypeGuards": ()=>StripeTypeGuards,
    "isBillingPeriod": ()=>isBillingPeriod,
    "isCardError": ()=>isCardError,
    "isConfigurationError": ()=>isConfigurationError,
    "isCreateCheckoutSessionParams": ()=>isCreateCheckoutSessionParams,
    "isCreatePortalSessionParams": ()=>isCreatePortalSessionParams,
    "isCriticalError": ()=>isCriticalError,
    "isInfrastructureError": ()=>isInfrastructureError,
    "isPaymentMethod": ()=>isPaymentMethod,
    "isPlanConfig": ()=>isPlanConfig,
    "isPlanType": ()=>isPlanType,
    "isRateLimitError": ()=>isRateLimitError,
    "isRetryableError": ()=>isRetryableError,
    "isStandardizedStripeError": ()=>isStandardizedStripeError,
    "isStripeApiVersion": ()=>isStripeApiVersion,
    "isStripeCheckoutSessionId": ()=>isStripeCheckoutSessionId,
    "isStripeConfig": ()=>isStripeConfig,
    "isStripeCustomerId": ()=>isStripeCustomerId,
    "isStripeDeclineCode": ()=>isStripeDeclineCode,
    "isStripeErrorCategory": ()=>isStripeErrorCategory,
    "isStripeErrorCode": ()=>isStripeErrorCode,
    "isStripeErrorResponse": ()=>isStripeErrorResponse,
    "isStripeErrorSeverity": ()=>isStripeErrorSeverity,
    "isStripeId": ()=>isStripeId,
    "isStripeInvoiceId": ()=>isStripeInvoiceId,
    "isStripePaymentMethodId": ()=>isStripePaymentMethodId,
    "isStripePriceId": ()=>isStripePriceId,
    "isStripePublishableKey": ()=>isStripePublishableKey,
    "isStripeSecretKey": ()=>isStripeSecretKey,
    "isStripeSubscriptionId": ()=>isStripeSubscriptionId,
    "isStripeSuccessResponse": ()=>isStripeSuccessResponse,
    "isStripeWebhookEvent": ()=>isStripeWebhookEvent,
    "isStripeWebhookSecret": ()=>isStripeWebhookSecret,
    "isSubscriptionStatus": ()=>isSubscriptionStatus,
    "isUsageMetrics": ()=>isUsageMetrics,
    "isUserSubscription": ()=>isUserSubscription,
    "isValidAmount": ()=>isValidAmount,
    "isValidCurrency": ()=>isValidCurrency,
    "isValidEmail": ()=>isValidEmail,
    "isValidMetadata": ()=>isValidMetadata,
    "isValidUrl": ()=>isValidUrl,
    "isWebhookEventType": ()=>isWebhookEventType,
    "requiresUserAction": ()=>requiresUserAction
});
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/stripe.ts [app-client] (ecmascript)");
;
function isPlanType(value) {
    return typeof value === 'string' && Object.values(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAN_TYPES"]).includes(value);
}
function isBillingPeriod(value) {
    return typeof value === 'string' && Object.values(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BILLING_PERIODS"]).includes(value);
}
function isSubscriptionStatus(value) {
    return typeof value === 'string' && Object.values(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SUBSCRIPTION_STATUSES"]).includes(value);
}
function isWebhookEventType(value) {
    return typeof value === 'string' && Object.values(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["WEBHOOK_EVENT_TYPES"]).includes(value);
}
function isStripeErrorCode(value) {
    return typeof value === 'string' && Object.values(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CODES"]).includes(value);
}
function isStripeDeclineCode(value) {
    return typeof value === 'string' && Object.values(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_DECLINE_CODES"]).includes(value);
}
function isStripeErrorCategory(value) {
    return typeof value === 'string' && Object.values(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CATEGORIES"]).includes(value);
}
function isStripeErrorSeverity(value) {
    return typeof value === 'string' && Object.values(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_SEVERITIES"]).includes(value);
}
function isStripeApiVersion(value) {
    return typeof value === 'string' && Object.values(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_API_VERSIONS"]).includes(value);
}
function isStandardizedStripeError(value) {
    if (!value || typeof value !== 'object') return false;
    const error = value;
    return isStripeErrorCode(error.code) && typeof error.message === 'string' && typeof error.userMessage === 'string' && typeof error.errorId === 'string' && isStripeErrorCategory(error.category) && isStripeErrorSeverity(error.severity) && typeof error.retryable === 'boolean' && typeof error.context === 'object' && error.context !== null;
}
function isStripeWebhookEvent(value) {
    if (!value || typeof value !== 'object') return false;
    const event = value;
    return typeof event.id === 'string' && event.object === 'event' && typeof event.api_version === 'string' && typeof event.created === 'number' && typeof event.data === 'object' && event.data !== null && typeof event.livemode === 'boolean' && typeof event.pending_webhooks === 'number' && typeof event.request === 'object' && event.request !== null && isWebhookEventType(event.type);
}
function isPaymentMethod(value) {
    if (!value || typeof value !== 'object') return false;
    const pm = value;
    return typeof pm.id === 'string' && pm.object === 'payment_method' && typeof pm.type === 'string' && typeof pm.created === 'number' && typeof pm.livemode === 'boolean' && typeof pm.metadata === 'object' && pm.metadata !== null && typeof pm.billing_details === 'object' && pm.billing_details !== null;
}
function isUserSubscription(value) {
    if (!value || typeof value !== 'object') return false;
    const sub = value;
    return typeof sub.id === 'string' && typeof sub.userId === 'string' && isPlanType(sub.planType) && isSubscriptionStatus(sub.status) && isBillingPeriod(sub.billingPeriod) && typeof sub.cancelAtPeriodEnd === 'boolean' && sub.createdAt instanceof Date && sub.updatedAt instanceof Date;
}
function isPlanConfig(value) {
    if (!value || typeof value !== 'object') return false;
    const plan = value;
    return isPlanType(plan.id) && typeof plan.name === 'string' && typeof plan.description === 'string' && typeof plan.price === 'object' && plan.price !== null && Array.isArray(plan.features) && typeof plan.limits === 'object' && plan.limits !== null && typeof plan.priority === 'boolean' && typeof plan.stripeIds === 'object' && plan.stripeIds !== null;
}
function isUsageMetrics(value) {
    if (!value || typeof value !== 'object') return false;
    const usage = value;
    return typeof usage.properties === 'number' && typeof usage.tenants === 'number' && typeof usage.leases === 'number' && typeof usage.storageUsedMB === 'number' && typeof usage.apiCallsCount === 'number' && typeof usage.leaseGenerationsCount === 'number' && typeof usage.month === 'string' && /^\d{4}-\d{2}$/.test(usage.month);
}
function isStripeConfig(value) {
    if (!value || typeof value !== 'object') return false;
    const config = value;
    return typeof config.secretKey === 'string' && typeof config.publishableKey === 'string' && typeof config.webhookSecret === 'string' && isStripeApiVersion(config.apiVersion) && typeof config.automaticTax === 'boolean' && typeof config.defaultTrialDays === 'number' && (config.environment === 'test' || config.environment === 'live');
}
function isCreateCheckoutSessionParams(value) {
    if (!value || typeof value !== 'object') return false;
    const params = value;
    return typeof params.userId === 'string' && isPlanType(params.planType) && isBillingPeriod(params.billingInterval) && typeof params.successUrl === 'string' && typeof params.cancelUrl === 'string';
}
function isCreatePortalSessionParams(value) {
    if (!value || typeof value !== 'object') return false;
    const params = value;
    return typeof params.customerId === 'string' && typeof params.returnUrl === 'string';
}
function isStripeSuccessResponse(value) {
    if (!value || typeof value !== 'object') return false;
    const response = value;
    return response.success === true && 'data' in response;
}
function isStripeErrorResponse(value) {
    if (!value || typeof value !== 'object') return false;
    const response = value;
    return response.success === false && typeof response.error === 'object' && response.error !== null;
}
function isRetryableError(error) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RETRYABLE_ERROR_CODES"].includes(error.code);
}
function isCardError(error) {
    const cardErrorCodes = [
        __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CODES"].CARD_DECLINED,
        __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CODES"].EXPIRED_CARD,
        __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CODES"].INCORRECT_CVC,
        __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CODES"].INCORRECT_NUMBER,
        __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CODES"].INSUFFICIENT_FUNDS,
        __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CODES"].INVALID_EXPIRY_MONTH,
        __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CODES"].INVALID_EXPIRY_YEAR,
        __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CODES"].INVALID_NUMBER,
        __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CODES"].PROCESSING_ERROR
    ];
    return cardErrorCodes.includes(error.code);
}
function isRateLimitError(error) {
    return error.code === __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CODES"].RATE_LIMIT;
}
function isInfrastructureError(error) {
    return error.category === __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CATEGORIES"].INFRASTRUCTURE;
}
function isConfigurationError(error) {
    return error.category === __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CATEGORIES"].CONFIGURATION;
}
function isCriticalError(error) {
    return error.severity === __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_SEVERITIES"].CRITICAL;
}
function requiresUserAction(error) {
    const userActionErrorCodes = [
        __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CODES"].CARD_DECLINED,
        __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CODES"].EXPIRED_CARD,
        __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CODES"].INCORRECT_CVC,
        __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CODES"].INSUFFICIENT_FUNDS
    ];
    return userActionErrorCodes.includes(error.code);
}
function isStripeId(value, prefix) {
    if (typeof value !== 'string') return false;
    // All Stripe IDs start with a prefix followed by underscore
    if (!value.includes('_')) return false;
    if (prefix) {
        return value.startsWith(prefix + '_');
    }
    // Common Stripe ID prefixes
    const commonPrefixes = [
        'acct',
        'ba',
        'card',
        'ch',
        'cus',
        'evt',
        'fee',
        'file',
        'ic',
        'in',
        'inv',
        'pi',
        'pm',
        'po',
        'prod',
        'py',
        'req',
        'rp',
        'si',
        'src',
        'sub',
        'tok',
        'tr',
        'txn',
        'cs',
        'price',
        'whsec',
        'sk',
        'pk',
        'rk'
    ];
    return commonPrefixes.some((prefix)=>value.startsWith(prefix + '_'));
}
function isStripeCustomerId(value) {
    return isStripeId(value, 'cus');
}
function isStripeSubscriptionId(value) {
    return isStripeId(value, 'sub');
}
function isStripePriceId(value) {
    return isStripeId(value, 'price');
}
function isStripePaymentMethodId(value) {
    return isStripeId(value, 'pm');
}
function isStripeCheckoutSessionId(value) {
    return isStripeId(value, 'cs');
}
function isStripeInvoiceId(value) {
    return isStripeId(value, 'in');
}
function isStripeWebhookSecret(value) {
    return typeof value === 'string' && value.startsWith('whsec_');
}
function isStripeSecretKey(value) {
    return typeof value === 'string' && value.startsWith('sk_');
}
function isStripePublishableKey(value) {
    return typeof value === 'string' && value.startsWith('pk_');
}
function isValidEmail(value) {
    if (typeof value !== 'string') return false;
    // Use bounded quantifiers to prevent ReDoS attacks
    const emailRegex = /^[^\s@]{1,64}@[^\s@]{1,63}(?:\.[^\s@]{1,63})+$/;
    return emailRegex.test(value);
}
function isValidCurrency(value) {
    if (typeof value !== 'string') return false;
    return /^[A-Z]{3}$/.test(value.toUpperCase()) && value.length === 3;
}
function isValidAmount(value) {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
function isValidUrl(value) {
    if (typeof value !== 'string') return false;
    try {
        new URL(value);
        return true;
    } catch (e) {
        return false;
    }
}
function isValidMetadata(value) {
    if (!value || typeof value !== 'object') return false;
    const metadata = value;
    return Object.entries(metadata).every((param)=>{
        let [key, val] = param;
        return typeof key === 'string' && typeof val === 'string';
    });
}
const StripeTypeGuards = {
    // Primitive guards
    isPlanType,
    isBillingPeriod,
    isSubscriptionStatus,
    isWebhookEventType,
    isStripeErrorCode,
    isStripeDeclineCode,
    isStripeErrorCategory,
    isStripeErrorSeverity,
    isStripeApiVersion,
    // Complex type guards
    isStandardizedStripeError,
    isStripeWebhookEvent,
    isPaymentMethod,
    isUserSubscription,
    isPlanConfig,
    isUsageMetrics,
    isStripeConfig,
    isCreateCheckoutSessionParams,
    isCreatePortalSessionParams,
    isStripeSuccessResponse,
    isStripeErrorResponse,
    // Error classification
    isRetryableError,
    isCardError,
    isRateLimitError,
    isInfrastructureError,
    isConfigurationError,
    isCriticalError,
    requiresUserAction,
    // Stripe ID guards
    isStripeId,
    isStripeCustomerId,
    isStripeSubscriptionId,
    isStripePriceId,
    isStripePaymentMethodId,
    isStripeCheckoutSessionId,
    isStripeInvoiceId,
    isStripeWebhookSecret,
    isStripeSecretKey,
    isStripePublishableKey,
    // Validation utilities
    isValidEmail,
    isValidCurrency,
    isValidAmount,
    isValidUrl,
    isValidMetadata
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/utils/currency.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Currency and price formatting utilities for consistent display across the application
 * Consolidates multiple formatPrice implementations into a single shared utility
 */ __turbopack_context__.s({
    "formatCompactCurrency": ()=>formatCompactCurrency,
    "formatCurrency": ()=>formatCurrency,
    "formatCurrencyChange": ()=>formatCurrencyChange,
    "formatNumber": ()=>formatNumber,
    "formatPercentage": ()=>formatPercentage,
    "formatPercentageChange": ()=>formatPercentageChange,
    "formatPrice": ()=>formatPrice,
    "formatPriceFromCents": ()=>formatPriceFromCents,
    "formatPriceWithInterval": ()=>formatPriceWithInterval,
    "getCollectionRateStatus": ()=>getCollectionRateStatus,
    "getDashboardCurrency": ()=>getDashboardCurrency,
    "getDashboardPercentage": ()=>getDashboardPercentage,
    "getIntervalSuffix": ()=>getIntervalSuffix
});
const formatCurrency = function(amount) {
    let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const { locale = 'en-US', currency = 'USD', minimumFractionDigits = 0, maximumFractionDigits = 2, compact = false } = options;
    const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits,
        maximumFractionDigits,
        notation: compact ? 'compact' : 'standard',
        compactDisplay: 'short'
    });
    return formatter.format(amount);
};
const formatPrice = function(amount) {
    let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const { interval, showInterval = true, fromCents = false, currency = 'USD', minimumFractionDigits, maximumFractionDigits, ...formatOptions } = options;
    // Handle special values
    if (amount === 0) return 'Free';
    if (amount === -1) return 'Custom';
    // Convert from cents if needed
    const dollarAmount = fromCents ? amount / 100 : amount;
    // Determine fraction digits based on amount if not specified
    const shouldShowDecimals = fromCents ? amount % 100 !== 0 : dollarAmount % 1 !== 0;
    const finalMinFractionDigits = minimumFractionDigits !== null && minimumFractionDigits !== void 0 ? minimumFractionDigits : shouldShowDecimals ? 2 : 0;
    const finalMaxFractionDigits = maximumFractionDigits !== null && maximumFractionDigits !== void 0 ? maximumFractionDigits : shouldShowDecimals ? 2 : 0;
    // Format the currency
    const formatted = formatCurrency(dollarAmount, {
        currency,
        minimumFractionDigits: finalMinFractionDigits,
        maximumFractionDigits: finalMaxFractionDigits,
        ...formatOptions
    });
    // Add interval suffix if requested
    if (showInterval && interval) {
        const suffix = getIntervalSuffix(interval);
        return "".concat(formatted).concat(suffix);
    }
    return formatted;
};
const getIntervalSuffix = (interval)=>{
    switch(interval){
        case 'monthly':
        case 'month':
            return '/mo';
        case 'annual':
        case 'year':
            return '/yr';
        default:
            return '';
    }
};
const formatCompactCurrency = function(amount) {
    let currency = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 'USD';
    return formatCurrency(amount, {
        compact: true,
        maximumFractionDigits: 1,
        currency
    });
};
const formatPercentage = function(value) {
    let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const { minimumFractionDigits = 0, maximumFractionDigits = 1 } = options;
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits,
        maximumFractionDigits
    });
    return formatter.format(value / 100);
};
const formatNumber = function(value) {
    let options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const { minimumFractionDigits = 0, maximumFractionDigits = 0, compact = false } = options;
    const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits,
        maximumFractionDigits,
        notation: compact ? 'compact' : 'standard',
        compactDisplay: 'short'
    });
    return formatter.format(value);
};
const formatCurrencyChange = function(amount) {
    let showSign = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : true, currency = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 'USD';
    const formatted = formatCurrency(Math.abs(amount), {
        currency
    });
    if (!showSign) return formatted;
    return amount >= 0 ? "+".concat(formatted) : "-".concat(formatted);
};
const formatPercentageChange = function(value) {
    let showSign = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : true;
    const formatted = formatPercentage(Math.abs(value));
    if (!showSign) return formatted;
    return value >= 0 ? "+".concat(formatted) : "-".concat(formatted);
};
const getDashboardCurrency = function(amount) {
    let currency = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 'USD';
    return {
        value: formatCurrency(amount, {
            currency
        }),
        compact: formatCompactCurrency(amount, currency),
        raw: amount
    };
};
const getDashboardPercentage = (value)=>{
    let trend;
    if (value > 0) {
        trend = 'positive';
    } else if (value < 0) {
        trend = 'negative';
    } else {
        trend = 'neutral';
    }
    let color;
    if (trend === 'positive') {
        color = 'text-green-600';
    } else if (trend === 'negative') {
        color = 'text-red-600';
    } else {
        color = 'text-muted-foreground';
    }
    return {
        value: formatPercentage(value),
        color,
        trend
    };
};
const getCollectionRateStatus = (rate)=>{
    if (rate >= 95) {
        return {
            status: 'Excellent',
            color: 'text-green-600',
            icon: '🎯'
        };
    } else if (rate >= 85) {
        return {
            status: 'Good',
            color: 'text-blue-600',
            icon: '👍'
        };
    } else if (rate >= 70) {
        return {
            status: 'Fair',
            color: 'text-orange-600',
            icon: '⚠️'
        };
    } else {
        return {
            status: 'Poor',
            color: 'text-red-600',
            icon: '🔻'
        };
    }
};
const formatPriceFromCents = function(priceInCents) {
    let currency = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 'USD';
    return formatPrice(priceInCents, {
        fromCents: true,
        currency,
        showInterval: false
    });
};
const formatPriceWithInterval = function(amount, interval) {
    let fromCents = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
    return formatPrice(amount, {
        interval,
        fromCents
    });
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/types/stripe-utils.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Stripe Utility Functions
 *
 * Helper functions for common Stripe operations, error handling, and data transformations.
 * Provides consistent behavior across frontend and backend implementations.
 *
 * @fileoverview Utility functions for Stripe integration
 */ __turbopack_context__.s({
    "StripeUtils": ()=>StripeUtils,
    "calculateAnnualSavings": ()=>calculateAnnualSavings,
    "calculateRetryDelay": ()=>calculateRetryDelay,
    "createStandardizedError": ()=>createStandardizedError,
    "extractWebhookData": ()=>extractWebhookData,
    "formatPrice": ()=>formatPrice,
    "generateErrorAnalytics": ()=>generateErrorAnalytics,
    "generateErrorId": ()=>generateErrorId,
    "generateIdempotencyKey": ()=>generateIdempotencyKey,
    "generateUserMessage": ()=>generateUserMessage,
    "getBillingPeriodFromPriceId": ()=>getBillingPeriodFromPriceId,
    "getDaysUntilExpiry": ()=>getDaysUntilExpiry,
    "getErrorCategory": ()=>getErrorCategory,
    "getErrorSeverity": ()=>getErrorSeverity,
    "getPlanDisplayName": ()=>getPlanDisplayName,
    "getPlanTypeFromPriceId": ()=>getPlanTypeFromPriceId,
    "getSubscriptionStatusDisplay": ()=>getSubscriptionStatusDisplay,
    "getTrialDaysRemaining": ()=>getTrialDaysRemaining,
    "getWebhookEventPriority": ()=>getWebhookEventPriority,
    "isActiveSubscription": ()=>isActiveSubscription,
    "isInGracePeriod": ()=>isInGracePeriod,
    "isRetryableErrorCode": ()=>isRetryableErrorCode,
    "needsAttention": ()=>needsAttention,
    "sanitizeMetadata": ()=>sanitizeMetadata,
    "shouldProcessWebhookEvent": ()=>shouldProcessWebhookEvent,
    "toClientSafeError": ()=>toClientSafeError,
    "validateStripeConfig": ()=>validateStripeConfig
});
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/stripe.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2d$guards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/stripe-guards.ts [app-client] (ecmascript)");
;
;
function generateErrorId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return "stripe_error_".concat(timestamp, "_").concat(random);
}
function getErrorCategory(code) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ERROR_CATEGORY_MAPPING"][code] || __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CATEGORIES"].UNKNOWN;
}
function getErrorSeverity(code) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ERROR_SEVERITY_MAPPING"][code] || __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_SEVERITIES"].MEDIUM;
}
function isRetryableErrorCode(code) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["RETRYABLE_ERROR_CODES"].includes(code);
}
function calculateRetryDelay(attemptCount) {
    let config = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    const finalConfig = {
        ...__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DEFAULT_STRIPE_RETRY_CONFIG"],
        ...config
    };
    const exponentialDelay = finalConfig.baseDelayMs * Math.pow(finalConfig.exponentialBase, attemptCount - 1);
    const delayWithJitter = exponentialDelay + Math.random() * finalConfig.jitterMs;
    return Math.min(delayWithJitter, finalConfig.maxDelayMs);
}
function toClientSafeError(error) {
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2d$guards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isStandardizedStripeError"])(error)) {
        throw new Error('Invalid StandardizedStripeError provided');
    }
    return {
        code: error.code,
        userMessage: error.userMessage,
        retryable: error.retryable,
        retryAfter: error.retryAfter,
        errorId: error.errorId,
        category: error.category,
        severity: error.severity
    };
}
function generateErrorAnalytics(error) {
    const category = getErrorCategory(error.code);
    const severity = getErrorSeverity(error.code);
    // Determine if action is required based on error type
    const actionRequired = severity === __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_SEVERITIES"].CRITICAL || category === __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CATEGORIES"].CONFIGURATION;
    // Determine if should escalate to Stripe support
    const escalateToStripe = category === __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CATEGORIES"].STRIPE_SERVICE || category === __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_CATEGORIES"].INFRASTRUCTURE && severity === __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["STRIPE_ERROR_SEVERITIES"].HIGH;
    return {
        category,
        severity,
        actionRequired,
        escalateToStripe,
        affectedUsers: 1,
        errorRate: 0,
        avgResponseTime: 0 // To be calculated by monitoring system
    };
}
function createStandardizedError(code, message, context) {
    let options = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
    const errorId = generateErrorId();
    const category = getErrorCategory(code);
    const severity = getErrorSeverity(code);
    const retryable = isRetryableErrorCode(code);
    return {
        code,
        message,
        userMessage: options.userMessage || generateUserMessage(code),
        details: options.details,
        errorId,
        category,
        severity,
        retryable,
        retryAfter: options.retryAfter,
        context: {
            ...context,
            timestamp: new Date()
        }
    };
}
function generateUserMessage(code) {
    const userMessages = {
        card_declined: 'Your card was declined. Please try a different payment method.',
        expired_card: 'Your card has expired. Please update your payment information.',
        incorrect_cvc: 'The security code is incorrect. Please check and try again.',
        incorrect_number: 'The card number is incorrect. Please check and try again.',
        insufficient_funds: 'Your card has insufficient funds. Please try a different card.',
        invalid_expiry_month: 'The expiration month is invalid. Please check and try again.',
        invalid_expiry_year: 'The expiration year is invalid. Please check and try again.',
        invalid_number: 'The card number is invalid. Please check and try again.',
        processing_error: 'There was an error processing your payment. Please try again.',
        rate_limit: 'Too many requests. Please wait a moment and try again.',
        invalid_request_error: 'There was an error with your request. Please try again.',
        missing: 'Required information is missing. Please check your details.',
        invalid: 'Some information is invalid. Please check your details.',
        api_connection_error: 'Unable to connect to payment processor. Please try again.',
        api_error: 'Payment processing is temporarily unavailable. Please try again.',
        authentication_error: 'Authentication failed. Please contact support.',
        permission_error: 'Access denied. Please contact support.',
        idempotency_error: 'Duplicate request detected. Please try again.',
        customer_not_found: 'Customer account not found. Please contact support.',
        subscription_not_found: 'Subscription not found. Please contact support.',
        invalid_price_id: 'Invalid pricing information. Please contact support.',
        webhook_signature_invalid: 'Security validation failed. Please contact support.',
        configuration_error: 'Payment system configuration error. Please contact support.'
    };
    return userMessages[code] || 'An unexpected error occurred. Please try again or contact support.';
}
function getPlanTypeFromPriceId(priceId) {
    // This would typically map to your actual Stripe price IDs
    // For now, we'll use pattern matching
    const lowerPriceId = priceId.toLowerCase();
    if (lowerPriceId.includes('starter')) return __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAN_TYPES"].STARTER;
    if (lowerPriceId.includes('growth')) return __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAN_TYPES"].GROWTH;
    if (lowerPriceId.includes('tenantflow_max') || lowerPriceId.includes('tenantflow')) return __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAN_TYPES"].TENANTFLOW_MAX;
    if (lowerPriceId.includes('free') || lowerPriceId.includes('trial')) return __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAN_TYPES"].FREETRIAL;
    return null;
}
function getBillingPeriodFromPriceId(priceId) {
    const lowerPriceId = priceId.toLowerCase();
    if (lowerPriceId.includes('monthly') || lowerPriceId.includes('month')) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BILLING_PERIODS"].MONTHLY;
    }
    if (lowerPriceId.includes('annual') || lowerPriceId.includes('year')) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BILLING_PERIODS"].ANNUAL;
    }
    return null;
}
function formatPrice(amount) {
    let currency = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 'USD', interval = arguments.length > 2 ? arguments[2] : void 0;
    // Import dynamically to avoid circular dependency
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { formatPrice: sharedFormatPrice } = __turbopack_context__.r("[project]/packages/shared/src/utils/currency.ts [app-client] (ecmascript)");
    const intervalMapping = {
        [__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BILLING_PERIODS"].MONTHLY]: 'monthly',
        [__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BILLING_PERIODS"].ANNUAL]: 'annual'
    };
    return sharedFormatPrice(amount, {
        currency: currency.toUpperCase(),
        interval: interval ? intervalMapping[interval] : undefined,
        fromCents: true,
        showInterval: !!interval
    });
}
function calculateAnnualSavings(monthlyPrice, annualPrice) {
    const monthlyTotal = monthlyPrice * 12;
    const savings = monthlyTotal - annualPrice;
    return Math.round(savings / monthlyTotal * 100);
}
function getPlanDisplayName(planType) {
    const displayNames = {
        [__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAN_TYPES"].FREETRIAL]: 'Free Trial',
        [__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAN_TYPES"].STARTER]: 'Starter',
        [__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAN_TYPES"].GROWTH]: 'Growth',
        [__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLAN_TYPES"].TENANTFLOW_MAX]: 'TenantFlow Max'
    };
    return displayNames[planType] || planType;
}
function isActiveSubscription(status) {
    return status === 'active' || status === 'trialing';
}
function isInGracePeriod(status) {
    return status === 'past_due';
}
function needsAttention(status) {
    return [
        'past_due',
        'unpaid',
        'incomplete'
    ].includes(status);
}
function getSubscriptionStatusDisplay(status) {
    const statusDisplay = {
        incomplete: 'Setup Required',
        incomplete_expired: 'Setup Expired',
        trialing: 'Trial',
        active: 'Active',
        past_due: 'Past Due',
        canceled: 'Canceled',
        unpaid: 'Unpaid',
        paused: 'Paused',
        updating: 'Updating'
    };
    return statusDisplay[status] || status;
}
function getDaysUntilExpiry(currentPeriodEnd) {
    if (!currentPeriodEnd) return null;
    const now = new Date();
    const diffTime = currentPeriodEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}
function getTrialDaysRemaining(trialEnd) {
    if (!trialEnd) return null;
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}
function extractWebhookData(_eventType, eventData) {
    // Cast to expected type - in practice, you'd want more specific typing
    return eventData;
}
function shouldProcessWebhookEvent(eventType, supportedEvents) {
    return supportedEvents.includes(eventType);
}
function getWebhookEventPriority(eventType) {
    const highPriorityEvents = [
        'invoice.payment_failed',
        'customer.subscription.deleted',
        'invoice.payment_succeeded'
    ];
    const mediumPriorityEvents = [
        'customer.subscription.created',
        'customer.subscription.updated',
        'checkout.session.completed'
    ];
    if (highPriorityEvents.includes(eventType)) return 'high';
    if (mediumPriorityEvents.includes(eventType)) return 'medium';
    return 'low';
}
function validateStripeConfig(config) {
    const errors = [];
    if (!config.secretKey) {
        errors.push('Secret key is required');
    } else if (!config.secretKey.startsWith('sk_')) {
        errors.push('Invalid secret key format');
    }
    if (!config.publishableKey) {
        errors.push('Publishable key is required');
    } else if (!config.publishableKey.startsWith('pk_')) {
        errors.push('Invalid publishable key format');
    }
    if (config.secretKey && config.publishableKey) {
        const secretEnv = config.secretKey.includes('_test_') ? 'test' : 'live';
        const pubEnv = config.publishableKey.includes('_test_') ? 'test' : 'live';
        if (secretEnv !== pubEnv) {
            errors.push('Secret key and publishable key environment mismatch');
        }
    }
    if (config.webhookSecret && !config.webhookSecret.startsWith('whsec_')) {
        errors.push('Invalid webhook secret format');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
function sanitizeMetadata(metadata) {
    const sanitized = {};
    Object.entries(metadata).forEach((param)=>{
        let [key, value] = param;
        // Convert to string and limit length (Stripe has limits)
        const stringValue = String(value).substring(0, 500);
        const sanitizedKey = key.substring(0, 40).replace(/\W/g, '_');
        if (sanitizedKey && stringValue) {
            sanitized[sanitizedKey] = stringValue;
        }
    });
    return sanitized;
}
function generateIdempotencyKey(operation, params) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const hash = params ? btoa(JSON.stringify(params)).substring(0, 8) : 'no_params';
    return "".concat(operation, "_").concat(timestamp, "_").concat(random, "_").concat(hash);
}
const StripeUtils = {
    // Error handling
    generateErrorId,
    getErrorCategory,
    getErrorSeverity,
    isRetryableErrorCode,
    calculateRetryDelay,
    toClientSafeError,
    generateErrorAnalytics,
    createStandardizedError,
    generateUserMessage,
    // Plan and pricing
    getPlanTypeFromPriceId,
    getBillingPeriodFromPriceId,
    formatPrice,
    calculateAnnualSavings,
    getPlanDisplayName,
    // Subscription
    isActiveSubscription,
    isInGracePeriod,
    needsAttention,
    getSubscriptionStatusDisplay,
    getDaysUntilExpiry,
    getTrialDaysRemaining,
    // Webhook
    extractWebhookData,
    shouldProcessWebhookEvent,
    getWebhookEventPriority,
    // Validation
    validateStripeConfig,
    sanitizeMetadata,
    generateIdempotencyKey
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/types/billing.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Billing and subscription management types
 * All types related to subscriptions, plans, invoices, and billing
 */ // Import consolidated types from stripe.ts
__turbopack_context__.s({
    "PLAN_TYPE": ()=>PLAN_TYPE,
    "STRIPE_ERRORS": ()=>STRIPE_ERRORS,
    "getPlanTypeLabel": ()=>getPlanTypeLabel
});
const PLAN_TYPE = {
    FREETRIAL: 'FREETRIAL',
    STARTER: 'STARTER',
    GROWTH: 'GROWTH',
    TENANTFLOW_MAX: 'TENANTFLOW_MAX'
};
const getPlanTypeLabel = (plan)=>{
    const labels = {
        FREETRIAL: 'Free Trial',
        STARTER: 'Starter',
        GROWTH: 'Growth',
        TENANTFLOW_MAX: 'TenantFlow Max'
    };
    return labels[plan] || plan;
};
const STRIPE_ERRORS = {
    CUSTOMER_NOT_FOUND: 'Customer not found',
    SUBSCRIPTION_NOT_FOUND: 'Subscription not found',
    INVALID_PRICE_ID: 'Invalid price ID',
    WEBHOOK_SIGNATURE_INVALID: 'Invalid webhook signature',
    CONFIGURATION_ERROR: 'Stripe configuration error',
    RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
    PAYMENT_DECLINED: 'Payment declined',
    AUTHENTICATION_FAILED: 'Authentication failed',
    INVALID_REQUEST: 'Invalid request parameters',
    API_CONNECTION_ERROR: 'API connection error',
    CARD_DECLINED: 'Card declined',
    PROCESSING_ERROR: 'Processing error'
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/config/pricing.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Pricing configuration for 4-tier subscription system
 * Defines products, trials, limits, and features for each tier
 */ __turbopack_context__.s({
    "PRODUCT_TIERS": ()=>PRODUCT_TIERS,
    "calculateAnnualSavings": ()=>calculateAnnualSavings,
    "checkPlanLimits": ()=>checkPlanLimits,
    "getProductTier": ()=>getProductTier,
    "getRecommendedUpgrade": ()=>getRecommendedUpgrade,
    "getStripePriceId": ()=>getStripePriceId,
    "getTrialConfig": ()=>getTrialConfig,
    "hasTrial": ()=>hasTrial
});
const PRODUCT_TIERS = {
    FREETRIAL: {
        id: 'FREETRIAL',
        name: 'Free Trial',
        description: 'Perfect for trying out TenantFlow',
        price: {
            monthly: 0,
            annual: 0
        },
        trial: {
            trialPeriodDays: 14,
            trialEndBehavior: 'cancel',
            collectPaymentMethod: false,
            reminderDaysBeforeEnd: 3
        },
        features: [
            'Up to 1 property',
            'Up to 5 units',
            'Basic tenant management',
            'Email support',
            'Mobile app access'
        ],
        limits: {
            properties: 1,
            units: 5,
            users: 1,
            storage: 1,
            apiCalls: 1000
        },
        support: 'email',
        stripePriceIds: {
            monthly: null,
            annual: null
        }
    },
    STARTER: {
        id: 'STARTER',
        name: 'Starter',
        description: 'Great for small property managers',
        price: {
            monthly: 29,
            annual: 290 // Save $58/year (2 months free)
        },
        trial: {
            trialPeriodDays: 14,
            trialEndBehavior: 'pause',
            collectPaymentMethod: false,
            reminderDaysBeforeEnd: 3
        },
        features: [
            'Up to 5 properties',
            'Up to 50 units',
            'Advanced tenant management',
            'Lease management',
            'Maintenance tracking',
            'Financial reporting',
            'Priority email support',
            'API access'
        ],
        limits: {
            properties: 5,
            units: 50,
            users: 3,
            storage: 10,
            apiCalls: 10000
        },
        support: 'email',
        stripePriceIds: {
            monthly: 'price_1Rbnyk00PMlKUSP0oGJV2i1G',
            annual: 'price_1Rbnyk00PMlKUSP0uS33sCq3'
        }
    },
    GROWTH: {
        id: 'GROWTH',
        name: 'Growth',
        description: 'Ideal for growing property management companies',
        price: {
            monthly: 79,
            annual: 790 // Save $158/year (2 months free)
        },
        trial: {
            trialPeriodDays: 14,
            trialEndBehavior: 'pause',
            collectPaymentMethod: false,
            reminderDaysBeforeEnd: 3
        },
        features: [
            'Up to 20 properties',
            'Up to 200 units',
            'Everything in Starter',
            'Advanced analytics',
            'Custom reports',
            'Bulk operations',
            'Team collaboration',
            'Priority support',
            'Advanced API access',
            'Integrations'
        ],
        limits: {
            properties: 20,
            units: 200,
            users: 10,
            storage: 50,
            apiCalls: 50000
        },
        support: 'priority',
        stripePriceIds: {
            monthly: 'price_1Rbnzv00PMlKUSP0fq5R5MNV',
            annual: 'price_1Rbnzv00PMlKUSP0jIq3BxTy'
        }
    },
    TENANTFLOW_MAX: {
        id: 'TENANTFLOW_MAX',
        name: 'TenantFlow Max',
        description: 'For large property management operations',
        price: {
            monthly: 299,
            annual: 2990 // Custom pricing available
        },
        trial: {
            trialPeriodDays: 30,
            trialEndBehavior: 'pause',
            collectPaymentMethod: true,
            reminderDaysBeforeEnd: 7
        },
        features: [
            'Unlimited properties',
            'Unlimited units',
            'Everything in Growth',
            'White-label options',
            'Custom integrations',
            'Dedicated account manager',
            'SLA guarantee',
            '24/7 phone support',
            'Custom training',
            'API rate limit bypass'
        ],
        limits: {
            properties: -1,
            units: -1,
            users: -1,
            storage: -1,
            apiCalls: -1 // Unlimited
        },
        support: 'dedicated',
        stripePriceIds: {
            monthly: 'price_1Rbo0P00PMlKUSP0Isi7U1Wr',
            annual: 'price_1Rbo0r00PMlKUSP0rzUhwgkO'
        }
    }
};
function getProductTier(planType) {
    const tier = PRODUCT_TIERS[planType];
    if (!tier) {
        throw new Error("Product tier not found for plan type: ".concat(planType));
    }
    return tier;
}
function getStripePriceId(planType, interval) {
    const tier = PRODUCT_TIERS[planType];
    if (!tier) return null;
    return tier.stripePriceIds[interval];
}
function hasTrial(planType) {
    const tier = PRODUCT_TIERS[planType];
    if (!tier) return false;
    return tier.trial.trialPeriodDays > 0;
}
function getTrialConfig(planType) {
    const tier = PRODUCT_TIERS[planType];
    return tier === null || tier === void 0 ? void 0 : tier.trial;
}
function checkPlanLimits(planType, usage) {
    const tier = PRODUCT_TIERS[planType];
    const exceededLimits = [];
    if (!tier) {
        return {
            exceeded: false,
            limits: []
        };
    }
    if (tier.limits.properties !== -1 && usage.properties && usage.properties > tier.limits.properties) {
        exceededLimits.push({
            type: 'properties',
            current: usage.properties,
            limit: tier.limits.properties
        });
    }
    if (tier.limits.units !== -1 && usage.units && usage.units > tier.limits.units) {
        exceededLimits.push({
            type: 'units',
            current: usage.units,
            limit: tier.limits.units
        });
    }
    if (tier.limits.users !== undefined && tier.limits.users !== -1 && usage.users && usage.users > tier.limits.users) {
        exceededLimits.push({
            type: 'users',
            current: usage.users,
            limit: tier.limits.users
        });
    }
    if (tier.limits.storage !== undefined && tier.limits.storage !== -1 && usage.storage && usage.storage > tier.limits.storage) {
        exceededLimits.push({
            type: 'storage',
            current: usage.storage,
            limit: tier.limits.storage
        });
    }
    if (tier.limits.apiCalls !== undefined && tier.limits.apiCalls !== -1 && usage.apiCalls && usage.apiCalls > tier.limits.apiCalls) {
        exceededLimits.push({
            type: 'apiCalls',
            current: usage.apiCalls,
            limit: tier.limits.apiCalls
        });
    }
    return {
        exceeded: exceededLimits.length > 0,
        limits: exceededLimits
    };
}
function getRecommendedUpgrade(currentPlan, usage) {
    const planOrder = [
        'FREETRIAL',
        'STARTER',
        'GROWTH',
        'TENANTFLOW_MAX'
    ];
    const currentIndex = planOrder.indexOf(currentPlan);
    // Check each plan in order to find the first one that fits usage
    for(let i = currentIndex + 1; i < planOrder.length; i++){
        const plan = planOrder[i];
        if (!plan) continue; // Skip if plan is undefined
        const tier = PRODUCT_TIERS[plan];
        if (!tier) continue; // Skip if tier is undefined
        const fitsUsage = (tier.limits.properties === -1 || tier.limits.properties === undefined || !usage.properties || usage.properties <= tier.limits.properties) && (tier.limits.units === -1 || tier.limits.units === undefined || !usage.units || usage.units <= tier.limits.units) && (tier.limits.users === -1 || tier.limits.users === undefined || !usage.users || usage.users <= tier.limits.users);
        if (fitsUsage) {
            return plan;
        }
    }
    return null;
}
function calculateAnnualSavings(planType) {
    const tier = PRODUCT_TIERS[planType];
    const monthlyCost = tier.price.monthly * 12;
    const annualCost = tier.price.annual;
    return monthlyCost - annualCost;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/types/lease-generator.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Lease Generator types (consolidated from apps/frontend/src/components/lease-generator/types)
 * These are frontend domain-specific types that should be accessible from shared package
 */ __turbopack_context__.s({
    "leaseFormSchema": ()=>leaseFormSchema
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-client] (ecmascript) <export * as z>");
;
const leaseFormSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    // Property Information
    propertyAddress: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Property address is required'),
    city: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'City is required'),
    state: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(2, 'State is required'),
    zipCode: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(5, 'Valid ZIP code is required'),
    unitNumber: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    countyName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    propertyType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'house',
        'apartment',
        'condo',
        'townhouse',
        'duplex',
        'other'
    ]),
    bedrooms: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().optional(),
    bathrooms: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().optional(),
    squareFootage: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().optional(),
    // Landlord Information
    landlordName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Landlord name is required'),
    landlordEmail: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email('Valid email is required'),
    landlordPhone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    landlordAddress: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Landlord address is required'),
    // Tenant Information
    tenantNames: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
    })).min(1, 'At least one tenant is required'),
    // Lease Terms
    leaseStartDate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Lease start date is required'),
    leaseEndDate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Lease end date is required'),
    rentAmount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(1, 'Rent amount must be greater than 0'),
    securityDeposit: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0, 'Security deposit cannot be negative'),
    // Payment Information
    paymentDueDate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(1).max(31),
    lateFeeAmount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0),
    lateFeeDays: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(1),
    paymentMethod: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'check',
        'online',
        'bank_transfer',
        'cash'
    ]),
    paymentAddress: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    // Additional Terms
    petPolicy: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'allowed',
        'not_allowed',
        'with_deposit'
    ]),
    petDeposit: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().optional(),
    parkingSpaces: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().optional(),
    storageUnit: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    smokingPolicy: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'allowed',
        'not_allowed'
    ]),
    maintenanceResponsibility: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'landlord',
        'tenant',
        'shared'
    ]),
    utilitiesIncluded: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()),
    // Occupancy
    maxOccupants: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(1),
    occupancyLimits: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        adults: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
        childrenUnder18: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
        childrenUnder2: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number()
    }),
    // Emergency Contact
    emergencyContact: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        phone: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        relationship: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
    }).optional(),
    // Additional fields
    moveInDate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    prorationAmount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().optional(),
    petDetails: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        breed: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        weight: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
        registration: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
    }).optional(),
    keyDeposit: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().optional(),
    // Additional Clauses
    additionalTerms: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    specialProvisions: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional()
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/constants/invoices.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Invoice-related constants
 * Configuration for lead magnet functionality and invoice management
 */ // ========================
// Lead Magnet Configuration
// ========================
/**
 * Lead magnet tier configuration
 */ __turbopack_context__.s({
    "CUSTOMER_INVOICE_STATUS": ()=>CUSTOMER_INVOICE_STATUS,
    "CUSTOMER_INVOICE_STATUS_OPTIONS": ()=>CUSTOMER_INVOICE_STATUS_OPTIONS,
    "INVOICE_DEFAULTS": ()=>INVOICE_DEFAULTS,
    "INVOICE_FILE_LIMITS": ()=>INVOICE_FILE_LIMITS,
    "INVOICE_NUMBER_PREFIX": ()=>INVOICE_NUMBER_PREFIX,
    "LEAD_MAGNET_CONFIG": ()=>LEAD_MAGNET_CONFIG
});
const LEAD_MAGNET_CONFIG = {
    FREE_TIER: {
        maxInvoicesPerMonth: 5,
        watermarkRequired: true,
        customBrandingAllowed: false,
        emailRequired: true,
        maxLineItems: 10
    },
    PRO_TIER: {
        maxInvoicesPerMonth: -1,
        watermarkRequired: false,
        customBrandingAllowed: true,
        emailRequired: false,
        maxLineItems: -1,
        price: 9.99
    }
};
const CUSTOMER_INVOICE_STATUS = {
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    VIEWED: 'VIEWED',
    PAID: 'PAID',
    OVERDUE: 'OVERDUE',
    CANCELLED: 'CANCELLED'
};
const CUSTOMER_INVOICE_STATUS_OPTIONS = Object.values(CUSTOMER_INVOICE_STATUS);
_c = CUSTOMER_INVOICE_STATUS_OPTIONS;
const INVOICE_DEFAULTS = {
    TAX_RATE: 0,
    PAYMENT_TERMS_DAYS: 30,
    NOTES: 'Thank you for your business!',
    TERMS: 'Payment is due within 30 days.',
    DOWNLOAD_COUNT: 0,
    IS_PRO_VERSION: false
};
const INVOICE_NUMBER_PREFIX = 'INV-';
const INVOICE_FILE_LIMITS = {
    MAX_FILE_SIZE_MB: 10,
    ALLOWED_MIME_TYPES: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf'
    ]
};
var _c;
__turbopack_context__.k.register(_c, "CUSTOMER_INVOICE_STATUS_OPTIONS");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/constants/billing.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Billing constants
 * Central source of truth for billing enums and constants
 */ // Plan type enum (matching Prisma schema)
__turbopack_context__.s({
    "BILLING_PERIOD": ()=>BILLING_PERIOD,
    "BILLING_PERIOD_OPTIONS": ()=>BILLING_PERIOD_OPTIONS,
    "PLANS": ()=>PLANS,
    "PLAN_TYPE": ()=>PLAN_TYPE,
    "PLAN_TYPE_OPTIONS": ()=>PLAN_TYPE_OPTIONS,
    "SUB_STATUS": ()=>SUB_STATUS,
    "SUB_STATUS_OPTIONS": ()=>SUB_STATUS_OPTIONS
});
const PLAN_TYPE = {
    FREETRIAL: 'FREETRIAL',
    STARTER: 'STARTER',
    GROWTH: 'GROWTH',
    TENANTFLOW_MAX: 'TENANTFLOW_MAX'
};
const BILLING_PERIOD = {
    MONTHLY: 'MONTHLY',
    ANNUAL: 'ANNUAL'
};
const SUB_STATUS = {
    ACTIVE: 'ACTIVE',
    CANCELLED: 'CANCELLED',
    PAST_DUE: 'PAST_DUE',
    INCOMPLETE: 'INCOMPLETE',
    INCOMPLETE_EXPIRED: 'INCOMPLETE_EXPIRED',
    TRIALING: 'TRIALING',
    UNPAID: 'UNPAID'
};
const PLANS = [
    {
        id: 'FREETRIAL',
        name: 'Free Trial',
        description: 'Perfect for getting started',
        price: {
            monthly: 0,
            annual: 0
        },
        features: [
            'Up to 2 properties',
            '5GB storage',
            'Basic support'
        ],
        propertyLimit: 2,
        storageLimit: 5000,
        apiCallLimit: 1000,
        priority: false
    },
    {
        id: 'STARTER',
        name: 'Starter',
        description: 'Great for small portfolios',
        price: {
            monthly: 2900,
            annual: 29000
        },
        features: [
            'Up to 10 properties',
            '50GB storage',
            'Email support'
        ],
        propertyLimit: 10,
        storageLimit: 50000,
        apiCallLimit: 10000,
        priority: false
    },
    {
        id: 'GROWTH',
        name: 'Growth',
        description: 'Scale your property business',
        price: {
            monthly: 7900,
            annual: 79000
        },
        features: [
            'Up to 50 properties',
            '200GB storage',
            'Priority support'
        ],
        propertyLimit: 50,
        storageLimit: 200000,
        apiCallLimit: 50000,
        priority: true
    },
    {
        id: 'TENANTFLOW_MAX',
        name: 'TenantFlow MAX',
        description: 'For large property portfolios',
        price: {
            monthly: 19900,
            annual: 199000
        },
        features: [
            'Unlimited properties',
            'Unlimited storage',
            '24/7 support',
            'Custom integrations'
        ],
        propertyLimit: -1,
        storageLimit: -1,
        apiCallLimit: -1,
        priority: true
    }
];
const PLAN_TYPE_OPTIONS = Object.values(PLAN_TYPE);
_c = PLAN_TYPE_OPTIONS;
const BILLING_PERIOD_OPTIONS = Object.values(BILLING_PERIOD);
_c1 = BILLING_PERIOD_OPTIONS;
const SUB_STATUS_OPTIONS = Object.values(SUB_STATUS);
_c2 = SUB_STATUS_OPTIONS;
var _c, _c1, _c2;
__turbopack_context__.k.register(_c, "PLAN_TYPE_OPTIONS");
__turbopack_context__.k.register(_c1, "BILLING_PERIOD_OPTIONS");
__turbopack_context__.k.register(_c2, "SUB_STATUS_OPTIONS");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/constants/stripe-errors.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Standardized Stripe Error Constants
 * 
 * Centralized error codes and messages for consistent error handling across the application.
 * Following Stripe's official error documentation and best practices.
 */ /**
 * Stripe API error types as defined by Stripe SDK
 */ __turbopack_context__.s({
    "DEFAULT_STRIPE_RETRY_CONFIG": ()=>DEFAULT_STRIPE_RETRY_CONFIG,
    "ERROR_CATEGORY_MAP": ()=>ERROR_CATEGORY_MAP,
    "ERROR_SEVERITY_MAP": ()=>ERROR_SEVERITY_MAP,
    "RETRYABLE_ERROR_CODES": ()=>RETRYABLE_ERROR_CODES,
    "STRIPE_DECLINE_MESSAGES": ()=>STRIPE_DECLINE_MESSAGES,
    "STRIPE_ERROR_CATEGORIES": ()=>STRIPE_ERROR_CATEGORIES,
    "STRIPE_ERROR_CODES": ()=>STRIPE_ERROR_CODES,
    "STRIPE_ERROR_MESSAGES": ()=>STRIPE_ERROR_MESSAGES,
    "STRIPE_ERROR_SEVERITIES": ()=>STRIPE_ERROR_SEVERITIES,
    "STRIPE_ERROR_TYPES": ()=>STRIPE_ERROR_TYPES
});
const STRIPE_ERROR_TYPES = {
    CARD_ERROR: 'StripeCardError',
    RATE_LIMIT_ERROR: 'StripeRateLimitError',
    INVALID_REQUEST_ERROR: 'StripeInvalidRequestError',
    API_ERROR: 'StripeAPIError',
    CONNECTION_ERROR: 'StripeConnectionError',
    AUTHENTICATION_ERROR: 'StripeAuthenticationError',
    PERMISSION_ERROR: 'StripePermissionError',
    IDEMPOTENCY_ERROR: 'StripeIdempotencyError',
    SIGNATURE_VERIFICATION_ERROR: 'StripeSignatureVerificationError'
};
const STRIPE_ERROR_CODES = {
    // Card Errors
    CARD_DECLINED: 'card_declined',
    EXPIRED_CARD: 'expired_card',
    INCORRECT_CVC: 'incorrect_cvc',
    INCORRECT_NUMBER: 'incorrect_number',
    INSUFFICIENT_FUNDS: 'insufficient_funds',
    INVALID_EXPIRY: 'invalid_expiry',
    INVALID_NUMBER: 'invalid_number',
    PROCESSING_ERROR: 'processing_error',
    // Rate Limit Errors
    RATE_LIMIT: 'rate_limit',
    // Invalid Request Errors
    INVALID_REQUEST: 'invalid_request_error',
    MISSING_PARAMETER: 'missing',
    INVALID_PARAMETER: 'invalid',
    // API Errors
    API_CONNECTION_ERROR: 'api_connection_error',
    API_ERROR: 'api_error',
    AUTHENTICATION_ERROR: 'authentication_error',
    PERMISSION_ERROR: 'permission_error',
    IDEMPOTENCY_ERROR: 'idempotency_error',
    // Application Errors
    CUSTOMER_NOT_FOUND: 'customer_not_found',
    SUBSCRIPTION_NOT_FOUND: 'subscription_not_found',
    INVALID_PRICE_ID: 'invalid_price_id',
    WEBHOOK_SIGNATURE_INVALID: 'webhook_signature_invalid',
    CONFIGURATION_ERROR: 'configuration_error',
    // Network Errors
    NETWORK_ERROR: 'network_error',
    TIMEOUT_ERROR: 'timeout_error',
    UNKNOWN_ERROR: 'unknown_error'
};
const STRIPE_ERROR_MESSAGES = {
    // Card Errors
    [STRIPE_ERROR_CODES.CARD_DECLINED]: 'Your card was declined. Please try a different payment method or contact your bank.',
    [STRIPE_ERROR_CODES.EXPIRED_CARD]: 'Your card has expired. Please use a different payment method.',
    [STRIPE_ERROR_CODES.INCORRECT_CVC]: 'Your card\'s security code is incorrect. Please check and try again.',
    [STRIPE_ERROR_CODES.INCORRECT_NUMBER]: 'Your card number is incorrect. Please check and try again.',
    [STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS]: 'Your card has insufficient funds. Please try a different payment method.',
    [STRIPE_ERROR_CODES.INVALID_EXPIRY]: 'Your card\'s expiration date is invalid. Please check and try again.',
    [STRIPE_ERROR_CODES.INVALID_NUMBER]: 'Your card number is invalid. Please check and try again.',
    [STRIPE_ERROR_CODES.PROCESSING_ERROR]: 'There was an error processing your card. Please try again.',
    // Rate Limit Errors
    [STRIPE_ERROR_CODES.RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',
    // Invalid Request Errors
    [STRIPE_ERROR_CODES.INVALID_REQUEST]: 'The request contains invalid information. Please contact support if this persists.',
    [STRIPE_ERROR_CODES.MISSING_PARAMETER]: 'Required information is missing. Please fill in all required fields.',
    [STRIPE_ERROR_CODES.INVALID_PARAMETER]: 'Some information is invalid. Please check your input and try again.',
    // API Errors
    [STRIPE_ERROR_CODES.API_CONNECTION_ERROR]: 'Connection error. Please check your internet connection and try again.',
    [STRIPE_ERROR_CODES.API_ERROR]: 'Payment processing temporarily unavailable. Please try again in a few moments.',
    [STRIPE_ERROR_CODES.AUTHENTICATION_ERROR]: 'Service authentication error. Please contact support.',
    [STRIPE_ERROR_CODES.PERMISSION_ERROR]: 'This operation is not permitted. Please contact support.',
    [STRIPE_ERROR_CODES.IDEMPOTENCY_ERROR]: 'Duplicate request detected. Please refresh and try again.',
    // Application Errors
    [STRIPE_ERROR_CODES.CUSTOMER_NOT_FOUND]: 'Customer information not found. Please contact support.',
    [STRIPE_ERROR_CODES.SUBSCRIPTION_NOT_FOUND]: 'Subscription not found. Please contact support.',
    [STRIPE_ERROR_CODES.INVALID_PRICE_ID]: 'Invalid pricing information. Please contact support.',
    [STRIPE_ERROR_CODES.WEBHOOK_SIGNATURE_INVALID]: 'Invalid webhook signature. Please check your configuration.',
    [STRIPE_ERROR_CODES.CONFIGURATION_ERROR]: 'Service configuration error. Please contact support.',
    // Network Errors
    [STRIPE_ERROR_CODES.NETWORK_ERROR]: 'Network connection error. Please check your internet connection and try again.',
    [STRIPE_ERROR_CODES.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
    [STRIPE_ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred. Please contact support if this persists.'
};
const STRIPE_DECLINE_MESSAGES = {
    'generic_decline': 'Your card was declined. Please contact your bank or try a different payment method.',
    'insufficient_funds': 'Your card has insufficient funds. Please try a different payment method.',
    'lost_card': 'Your card has been reported as lost. Please contact your bank.',
    'stolen_card': 'Your card has been reported as stolen. Please contact your bank.',
    'expired_card': 'Your card has expired. Please use a different payment method.',
    'incorrect_cvc': 'Your card\'s security code is incorrect. Please check and try again.',
    'processing_error': 'There was an error processing your card. Please try again.',
    'card_not_supported': 'This card type is not supported. Please try a different payment method.',
    'currency_not_supported': 'Your card doesn\'t support this currency. Please try a different payment method.',
    'fraudulent': 'This transaction appears fraudulent. Please contact your bank.',
    'merchant_blacklist': 'Your card cannot be used with this merchant. Please try a different payment method.',
    'pickup_card': 'Your card cannot be used. Please contact your bank.',
    'restricted_card': 'Your card has restrictions. Please contact your bank.',
    'security_violation': 'Security violation detected. Please contact your bank.',
    'service_not_allowed': 'This service is not allowed on your card. Please try a different payment method.',
    'stop_payment_order': 'A stop payment order exists on your card. Please contact your bank.',
    'testmode_decline': 'Your card was declined (test mode).',
    'transaction_not_allowed': 'This transaction is not allowed on your card. Please contact your bank.',
    'try_again_later': 'Please try again later.',
    'withdrawal_count_limit_exceeded': 'Withdrawal limit exceeded. Please try again later.'
};
const STRIPE_ERROR_CATEGORIES = {
    PAYMENT_METHOD: 'payment_method',
    INFRASTRUCTURE: 'infrastructure',
    CLIENT_ERROR: 'client_error',
    STRIPE_SERVICE: 'stripe_service',
    CONFIGURATION: 'configuration',
    UNKNOWN: 'unknown'
};
const STRIPE_ERROR_SEVERITIES = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};
const RETRYABLE_ERROR_CODES = new Set([
    STRIPE_ERROR_CODES.RATE_LIMIT,
    STRIPE_ERROR_CODES.API_ERROR,
    STRIPE_ERROR_CODES.API_CONNECTION_ERROR,
    STRIPE_ERROR_CODES.PROCESSING_ERROR,
    STRIPE_ERROR_CODES.NETWORK_ERROR,
    STRIPE_ERROR_CODES.TIMEOUT_ERROR
]);
const DEFAULT_STRIPE_RETRY_CONFIG = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    exponentialBase: 2,
    jitterMs: 100
};
const ERROR_CATEGORY_MAP = {
    [STRIPE_ERROR_CODES.CARD_DECLINED]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [STRIPE_ERROR_CODES.EXPIRED_CARD]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [STRIPE_ERROR_CODES.INCORRECT_CVC]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [STRIPE_ERROR_CODES.INCORRECT_NUMBER]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [STRIPE_ERROR_CODES.INVALID_EXPIRY]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [STRIPE_ERROR_CODES.INVALID_NUMBER]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [STRIPE_ERROR_CODES.PROCESSING_ERROR]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
    [STRIPE_ERROR_CODES.RATE_LIMIT]: STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE,
    [STRIPE_ERROR_CODES.API_CONNECTION_ERROR]: STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE,
    [STRIPE_ERROR_CODES.NETWORK_ERROR]: STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE,
    [STRIPE_ERROR_CODES.TIMEOUT_ERROR]: STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE,
    [STRIPE_ERROR_CODES.INVALID_REQUEST]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [STRIPE_ERROR_CODES.MISSING_PARAMETER]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [STRIPE_ERROR_CODES.INVALID_PARAMETER]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [STRIPE_ERROR_CODES.IDEMPOTENCY_ERROR]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [STRIPE_ERROR_CODES.CUSTOMER_NOT_FOUND]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [STRIPE_ERROR_CODES.SUBSCRIPTION_NOT_FOUND]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [STRIPE_ERROR_CODES.INVALID_PRICE_ID]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
    [STRIPE_ERROR_CODES.API_ERROR]: STRIPE_ERROR_CATEGORIES.STRIPE_SERVICE,
    [STRIPE_ERROR_CODES.AUTHENTICATION_ERROR]: STRIPE_ERROR_CATEGORIES.CONFIGURATION,
    [STRIPE_ERROR_CODES.PERMISSION_ERROR]: STRIPE_ERROR_CATEGORIES.CONFIGURATION,
    [STRIPE_ERROR_CODES.WEBHOOK_SIGNATURE_INVALID]: STRIPE_ERROR_CATEGORIES.CONFIGURATION,
    [STRIPE_ERROR_CODES.CONFIGURATION_ERROR]: STRIPE_ERROR_CATEGORIES.CONFIGURATION,
    [STRIPE_ERROR_CODES.UNKNOWN_ERROR]: STRIPE_ERROR_CATEGORIES.UNKNOWN
};
const ERROR_SEVERITY_MAP = {
    [STRIPE_ERROR_CODES.CARD_DECLINED]: STRIPE_ERROR_SEVERITIES.LOW,
    [STRIPE_ERROR_CODES.EXPIRED_CARD]: STRIPE_ERROR_SEVERITIES.LOW,
    [STRIPE_ERROR_CODES.INCORRECT_CVC]: STRIPE_ERROR_SEVERITIES.LOW,
    [STRIPE_ERROR_CODES.INCORRECT_NUMBER]: STRIPE_ERROR_SEVERITIES.LOW,
    [STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS]: STRIPE_ERROR_SEVERITIES.LOW,
    [STRIPE_ERROR_CODES.INVALID_EXPIRY]: STRIPE_ERROR_SEVERITIES.LOW,
    [STRIPE_ERROR_CODES.INVALID_NUMBER]: STRIPE_ERROR_SEVERITIES.LOW,
    [STRIPE_ERROR_CODES.PROCESSING_ERROR]: STRIPE_ERROR_SEVERITIES.MEDIUM,
    [STRIPE_ERROR_CODES.RATE_LIMIT]: STRIPE_ERROR_SEVERITIES.MEDIUM,
    [STRIPE_ERROR_CODES.API_CONNECTION_ERROR]: STRIPE_ERROR_SEVERITIES.HIGH,
    [STRIPE_ERROR_CODES.NETWORK_ERROR]: STRIPE_ERROR_SEVERITIES.MEDIUM,
    [STRIPE_ERROR_CODES.TIMEOUT_ERROR]: STRIPE_ERROR_SEVERITIES.MEDIUM,
    [STRIPE_ERROR_CODES.INVALID_REQUEST]: STRIPE_ERROR_SEVERITIES.MEDIUM,
    [STRIPE_ERROR_CODES.MISSING_PARAMETER]: STRIPE_ERROR_SEVERITIES.MEDIUM,
    [STRIPE_ERROR_CODES.INVALID_PARAMETER]: STRIPE_ERROR_SEVERITIES.MEDIUM,
    [STRIPE_ERROR_CODES.IDEMPOTENCY_ERROR]: STRIPE_ERROR_SEVERITIES.MEDIUM,
    [STRIPE_ERROR_CODES.CUSTOMER_NOT_FOUND]: STRIPE_ERROR_SEVERITIES.MEDIUM,
    [STRIPE_ERROR_CODES.SUBSCRIPTION_NOT_FOUND]: STRIPE_ERROR_SEVERITIES.MEDIUM,
    [STRIPE_ERROR_CODES.INVALID_PRICE_ID]: STRIPE_ERROR_SEVERITIES.HIGH,
    [STRIPE_ERROR_CODES.API_ERROR]: STRIPE_ERROR_SEVERITIES.HIGH,
    [STRIPE_ERROR_CODES.AUTHENTICATION_ERROR]: STRIPE_ERROR_SEVERITIES.CRITICAL,
    [STRIPE_ERROR_CODES.PERMISSION_ERROR]: STRIPE_ERROR_SEVERITIES.CRITICAL,
    [STRIPE_ERROR_CODES.WEBHOOK_SIGNATURE_INVALID]: STRIPE_ERROR_SEVERITIES.CRITICAL,
    [STRIPE_ERROR_CODES.CONFIGURATION_ERROR]: STRIPE_ERROR_SEVERITIES.CRITICAL,
    [STRIPE_ERROR_CODES.UNKNOWN_ERROR]: STRIPE_ERROR_SEVERITIES.HIGH
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/constants/leases.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Lease constants
 * Runtime constants and enums for lease management
 */ // Lease status enum - matches Prisma schema LeaseStatus enum
__turbopack_context__.s({
    "LEASE_STATUS": ()=>LEASE_STATUS,
    "LEASE_STATUS_OPTIONS": ()=>LEASE_STATUS_OPTIONS,
    "LEASE_TYPE": ()=>LEASE_TYPE,
    "LEASE_TYPE_OPTIONS": ()=>LEASE_TYPE_OPTIONS
});
const LEASE_STATUS = {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
    TERMINATED: 'TERMINATED'
};
const LEASE_STATUS_OPTIONS = Object.values(LEASE_STATUS);
_c = LEASE_STATUS_OPTIONS;
const LEASE_TYPE = {
    FIXED_TERM: 'FIXED_TERM',
    MONTH_TO_MONTH: 'MONTH_TO_MONTH',
    WEEK_TO_WEEK: 'WEEK_TO_WEEK'
};
const LEASE_TYPE_OPTIONS = Object.values(LEASE_TYPE);
_c1 = LEASE_TYPE_OPTIONS;
var _c, _c1;
__turbopack_context__.k.register(_c, "LEASE_STATUS_OPTIONS");
__turbopack_context__.k.register(_c1, "LEASE_TYPE_OPTIONS");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/constants/maintenance.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Maintenance constants
 */ __turbopack_context__.s({
    "MAINTENANCE_CATEGORY": ()=>MAINTENANCE_CATEGORY,
    "PRIORITY": ()=>PRIORITY,
    "PRIORITY_OPTIONS": ()=>PRIORITY_OPTIONS,
    "REQUEST_STATUS": ()=>REQUEST_STATUS,
    "REQUEST_STATUS_OPTIONS": ()=>REQUEST_STATUS_OPTIONS
});
const PRIORITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    EMERGENCY: 'EMERGENCY'
};
const MAINTENANCE_CATEGORY = {
    GENERAL: 'GENERAL',
    PLUMBING: 'PLUMBING',
    ELECTRICAL: 'ELECTRICAL',
    HVAC: 'HVAC',
    APPLIANCES: 'APPLIANCES',
    SAFETY: 'SAFETY',
    OTHER: 'OTHER'
};
const REQUEST_STATUS = {
    OPEN: 'OPEN',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELED: 'CANCELED',
    ON_HOLD: 'ON_HOLD'
};
const PRIORITY_OPTIONS = Object.values(PRIORITY);
_c = PRIORITY_OPTIONS;
const REQUEST_STATUS_OPTIONS = Object.values(REQUEST_STATUS);
_c1 = REQUEST_STATUS_OPTIONS;
var _c, _c1;
__turbopack_context__.k.register(_c, "PRIORITY_OPTIONS");
__turbopack_context__.k.register(_c1, "REQUEST_STATUS_OPTIONS");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/constants/properties.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Property constants
 * Central source of truth for property-related enums and constants
 */ __turbopack_context__.s({
    "PROPERTY_STATUS": ()=>PROPERTY_STATUS,
    "PROPERTY_TYPE": ()=>PROPERTY_TYPE,
    "PROPERTY_TYPE_OPTIONS": ()=>PROPERTY_TYPE_OPTIONS,
    "UNIT_STATUS": ()=>UNIT_STATUS,
    "UNIT_STATUS_OPTIONS": ()=>UNIT_STATUS_OPTIONS
});
const PROPERTY_STATUS = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    UNDER_CONTRACT: 'UNDER_CONTRACT',
    SOLD: 'SOLD'
};
const PROPERTY_TYPE = {
    SINGLE_FAMILY: 'SINGLE_FAMILY',
    MULTI_UNIT: 'MULTI_UNIT',
    APARTMENT: 'APARTMENT',
    COMMERCIAL: 'COMMERCIAL'
};
const UNIT_STATUS = {
    VACANT: 'VACANT',
    OCCUPIED: 'OCCUPIED',
    MAINTENANCE: 'MAINTENANCE',
    RESERVED: 'RESERVED'
};
const PROPERTY_TYPE_OPTIONS = Object.values(PROPERTY_TYPE);
_c = PROPERTY_TYPE_OPTIONS;
const UNIT_STATUS_OPTIONS = Object.values(UNIT_STATUS);
_c1 = UNIT_STATUS_OPTIONS;
var _c, _c1;
__turbopack_context__.k.register(_c, "PROPERTY_TYPE_OPTIONS");
__turbopack_context__.k.register(_c1, "UNIT_STATUS_OPTIONS");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/constants/tenants.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Tenant constants
 * Runtime constants and enums for tenant management
 */ __turbopack_context__.s({
    "TENANT_STATUS": ()=>TENANT_STATUS
});
const TENANT_STATUS = {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    EVICTED: 'EVICTED',
    PENDING: 'PENDING'
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/constants/reminders.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Reminder constants
 * Runtime constants and enums for reminder management
 */ // Reminder type enum - matches Prisma schema ReminderType enum
__turbopack_context__.s({
    "REMINDER_STATUS": ()=>REMINDER_STATUS,
    "REMINDER_STATUS_OPTIONS": ()=>REMINDER_STATUS_OPTIONS,
    "REMINDER_TYPE": ()=>REMINDER_TYPE,
    "REMINDER_TYPE_OPTIONS": ()=>REMINDER_TYPE_OPTIONS
});
const REMINDER_TYPE = {
    RENT_REMINDER: 'RENT_REMINDER',
    LEASE_EXPIRATION: 'LEASE_EXPIRATION',
    MAINTENANCE_DUE: 'MAINTENANCE_DUE',
    PAYMENT_OVERDUE: 'PAYMENT_OVERDUE'
};
const REMINDER_STATUS = {
    PENDING: 'PENDING',
    SENT: 'SENT',
    FAILED: 'FAILED',
    DELIVERED: 'DELIVERED',
    OPENED: 'OPENED'
};
const REMINDER_TYPE_OPTIONS = Object.values(REMINDER_TYPE);
_c = REMINDER_TYPE_OPTIONS;
const REMINDER_STATUS_OPTIONS = Object.values(REMINDER_STATUS);
_c1 = REMINDER_STATUS_OPTIONS;
var _c, _c1;
__turbopack_context__.k.register(_c, "REMINDER_TYPE_OPTIONS");
__turbopack_context__.k.register(_c1, "REMINDER_STATUS_OPTIONS");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/constants/index.ts [app-client] (ecmascript) <locals>": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Constants barrel exports
 * Centralized exports for all runtime constants
 */ // Invoice constants
__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$invoices$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/invoices.ts [app-client] (ecmascript)");
// Auth constants
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/auth.ts [app-client] (ecmascript)");
// Billing constants  
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$billing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/billing.ts [app-client] (ecmascript)");
// Stripe error constants
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$stripe$2d$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/stripe-errors.ts [app-client] (ecmascript)");
// Lease constants
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$leases$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/leases.ts [app-client] (ecmascript)");
// Maintenance constants
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$maintenance$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/maintenance.ts [app-client] (ecmascript)");
// Property constants
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/properties.ts [app-client] (ecmascript)");
// Tenant constants
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/tenants.ts [app-client] (ecmascript)");
// Reminder constants
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$reminders$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/reminders.ts [app-client] (ecmascript)");
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
"[project]/packages/shared/src/constants/index.ts [app-client] (ecmascript) <module evaluation>": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$invoices$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/invoices.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$billing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/billing.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$stripe$2d$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/stripe-errors.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$leases$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/leases.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$maintenance$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/maintenance.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/properties.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/tenants.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$reminders$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/reminders.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/index.ts [app-client] (ecmascript) <locals>");
}),
"[project]/packages/shared/src/types/security.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Security-related types shared between frontend and backend
 */ /**
 * Comprehensive security event types for monitoring
 */ __turbopack_context__.s({
    "SecurityEventSeverity": ()=>SecurityEventSeverity,
    "SecurityEventType": ()=>SecurityEventType
});
var SecurityEventType = /*#__PURE__*/ function(SecurityEventType) {
    // Authentication events
    SecurityEventType["AUTH_ATTEMPT"] = "AUTH_ATTEMPT";
    SecurityEventType["AUTH_SUCCESS"] = "AUTH_SUCCESS";
    SecurityEventType["AUTH_FAILURE"] = "AUTH_FAILURE";
    SecurityEventType["AUTH_TOKEN_INVALID"] = "AUTH_TOKEN_INVALID";
    SecurityEventType["AUTH_RATE_LIMIT"] = "AUTH_RATE_LIMIT";
    SecurityEventType["PASSWORD_CHANGE"] = "PASSWORD_CHANGE";
    SecurityEventType["TOKEN_REFRESH"] = "TOKEN_REFRESH";
    SecurityEventType["SESSION_INVALIDATED"] = "SESSION_INVALIDATED";
    SecurityEventType["ACCOUNT_LOCKED"] = "ACCOUNT_LOCKED";
    // Authorization events
    SecurityEventType["PERMISSION_DENIED"] = "PERMISSION_DENIED";
    SecurityEventType["FORBIDDEN_ACCESS"] = "FORBIDDEN_ACCESS";
    SecurityEventType["RLS_BYPASS_ATTEMPT"] = "RLS_BYPASS_ATTEMPT";
    SecurityEventType["UNAUTHORIZED_QUERY"] = "UNAUTHORIZED_QUERY";
    // Input validation & security threats
    SecurityEventType["VALIDATION_FAILURE"] = "VALIDATION_FAILURE";
    SecurityEventType["INVALID_INPUT_DETECTED"] = "INVALID_INPUT_DETECTED";
    SecurityEventType["INJECTION_ATTEMPT"] = "INJECTION_ATTEMPT";
    SecurityEventType["SQL_INJECTION_ATTEMPT"] = "SQL_INJECTION_ATTEMPT";
    SecurityEventType["XSS_ATTEMPT"] = "XSS_ATTEMPT";
    SecurityEventType["CSRF_ATTEMPT"] = "CSRF_ATTEMPT";
    SecurityEventType["PATH_TRAVERSAL"] = "PATH_TRAVERSAL";
    SecurityEventType["FILE_UPLOAD_BLOCKED"] = "FILE_UPLOAD_BLOCKED";
    SecurityEventType["FILE_TYPE_VIOLATION"] = "FILE_TYPE_VIOLATION";
    SecurityEventType["FILE_SIZE_VIOLATION"] = "FILE_SIZE_VIOLATION";
    SecurityEventType["MALICIOUS_FILE_UPLOAD"] = "MALICIOUS_FILE_UPLOAD";
    // Rate limiting & suspicious activity
    SecurityEventType["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    SecurityEventType["SUSPICIOUS_ACTIVITY"] = "SUSPICIOUS_ACTIVITY";
    SecurityEventType["SUSPICIOUS_REQUEST"] = "SUSPICIOUS_REQUEST";
    SecurityEventType["SUSPICIOUS_PATTERN"] = "SUSPICIOUS_PATTERN";
    // Administrative & system events
    SecurityEventType["ADMIN_ACTION"] = "ADMIN_ACTION";
    SecurityEventType["DATA_EXPORT"] = "DATA_EXPORT";
    SecurityEventType["CONFIGURATION_CHANGE"] = "CONFIGURATION_CHANGE";
    SecurityEventType["CONFIG_ACCESS"] = "CONFIG_ACCESS";
    SecurityEventType["PII_ACCESS"] = "PII_ACCESS";
    SecurityEventType["SYSTEM_ERROR"] = "SYSTEM_ERROR";
    return SecurityEventType;
}({});
var SecurityEventSeverity = /*#__PURE__*/ function(SecurityEventSeverity) {
    SecurityEventSeverity["LOW"] = "LOW";
    SecurityEventSeverity["MEDIUM"] = "MEDIUM";
    SecurityEventSeverity["HIGH"] = "HIGH";
    SecurityEventSeverity["CRITICAL"] = "CRITICAL";
    return SecurityEventSeverity;
}({});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/types/logger.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Logger types shared between frontend and backend
 */ /**
 * Log levels for application logging
 */ __turbopack_context__.s({
    "LogLevel": ()=>LogLevel
});
const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/utils/billing.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Billing utility functions
 * Helper functions for subscription calculations and plan management
 */ __turbopack_context__.s({
    "SUBSCRIPTION_URLS": ()=>SUBSCRIPTION_URLS,
    "calculateAnnualPrice": ()=>calculateAnnualPrice,
    "calculateAnnualSavings": ()=>calculateAnnualSavings,
    "calculateProratedAmount": ()=>calculateProratedAmount,
    "getPlanById": ()=>getPlanById
});
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$billing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/billing.ts [app-client] (ecmascript)");
;
function getPlanById(planId) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$billing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PLANS"].find((plan)=>plan.id === planId);
}
function calculateProratedAmount(amount, daysRemaining, daysInPeriod) {
    return Math.round(amount * daysRemaining / daysInPeriod);
}
function calculateAnnualPrice(monthlyPrice) {
    // 10% discount for annual billing
    return Math.round(monthlyPrice * 12 * 0.9);
}
function calculateAnnualSavings(monthlyPrice) {
    const yearlyWithoutDiscount = monthlyPrice * 12;
    const yearlyWithDiscount = calculateAnnualPrice(monthlyPrice);
    return yearlyWithoutDiscount - yearlyWithDiscount;
}
const SUBSCRIPTION_URLS = {
    MANAGE: '/dashboard/subscription',
    UPGRADE: '/dashboard/subscription/upgrade',
    CANCEL: '/dashboard/subscription/cancel',
    PORTAL: '/dashboard/billing-portal',
    dashboardWithTrial: '/dashboard?trial=success',
    dashboardWithSetup: '/dashboard?setup=complete'
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/utils/errors.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Shared error handling utilities
 * Common error classification and handling patterns for both frontend and backend
 */ __turbopack_context__.s({
    "ERROR_SEVERITY": ()=>ERROR_SEVERITY,
    "ERROR_TYPES": ()=>ERROR_TYPES,
    "classifyError": ()=>classifyError,
    "createBusinessLogicError": ()=>createBusinessLogicError,
    "createNetworkError": ()=>createNetworkError,
    "createStandardError": ()=>createStandardError,
    "createValidationError": ()=>createValidationError,
    "getErrorLogLevel": ()=>getErrorLogLevel,
    "isRetryableError": ()=>isRetryableError
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-client] (ecmascript) <export * as z>");
;
const ERROR_TYPES = {
    VALIDATION: 'VALIDATION',
    NOT_FOUND: 'NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    BUSINESS_LOGIC: 'BUSINESS_LOGIC',
    NETWORK: 'NETWORK',
    NETWORK_ERROR: 'NETWORK_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    AUTH_ERROR: 'AUTH_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    RATE_LIMIT: 'RATE_LIMIT',
    DATABASE: 'DATABASE',
    EXTERNAL_SERVICE: 'EXTERNAL_SERVICE',
    UNKNOWN: 'UNKNOWN'
};
const ERROR_SEVERITY = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
};
function createStandardError(type, message) {
    let options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    return {
        type,
        severity: options.severity || ERROR_SEVERITY.MEDIUM,
        message,
        code: options.code,
        details: options.details,
        field: options.field,
        context: options.context,
        timestamp: new Date().toISOString(),
        userMessage: options.userMessage || message,
        retryable: false
    };
}
function createValidationError(zodError, context) {
    const firstIssue = zodError.issues[0];
    const field = (firstIssue === null || firstIssue === void 0 ? void 0 : firstIssue.path.join('.')) || 'unknown';
    const fieldErrors = {};
    zodError.issues.forEach((issue)=>{
        var _fieldErrors, _fieldPath;
        const fieldPath = issue.path.join('.');
        var _;
        (_ = (_fieldErrors = fieldErrors)[_fieldPath = fieldPath]) !== null && _ !== void 0 ? _ : _fieldErrors[_fieldPath] = [];
        fieldErrors[fieldPath].push(issue.message);
    });
    return {
        type: ERROR_TYPES.VALIDATION,
        severity: ERROR_SEVERITY.LOW,
        message: "Validation failed for field: ".concat(field),
        field,
        details: {
            zodError,
            fieldErrors
        },
        context,
        timestamp: new Date().toISOString(),
        userMessage: (firstIssue === null || firstIssue === void 0 ? void 0 : firstIssue.message) || 'Please check your input and try again',
        retryable: false
    };
}
function createNetworkError(message, status) {
    let options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    return {
        type: ERROR_TYPES.NETWORK,
        severity: status && status >= 500 ? ERROR_SEVERITY.HIGH : ERROR_SEVERITY.MEDIUM,
        message,
        details: {
            status,
            statusText: options.statusText,
            url: options.url,
            method: options.method
        },
        context: options.context,
        timestamp: new Date().toISOString(),
        userMessage: getNetworkErrorMessage(status, message),
        retryable: !status || status >= 500
    };
}
function createBusinessLogicError(operation, reason) {
    let options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    return {
        type: ERROR_TYPES.BUSINESS_LOGIC,
        severity: options.severity || ERROR_SEVERITY.MEDIUM,
        message: "Business logic error in ".concat(operation, ": ").concat(reason),
        code: options.code || 'BUSINESS_LOGIC_ERROR',
        details: {
            operation,
            resource: options.resource,
            reason
        },
        context: options.context,
        timestamp: new Date().toISOString(),
        userMessage: options.userMessage || reason,
        retryable: false
    };
}
/**
 * Get user-friendly network error message
 */ function getNetworkErrorMessage(status, originalMessage) {
    if (!status) {
        return 'Network error occurred. Please check your connection.';
    }
    switch(status){
        case 400:
            return 'Invalid request. Please check your input.';
        case 401:
            return 'Please log in to continue.';
        case 403:
            return 'You don\'t have permission to perform this action.';
        case 404:
            return 'The requested resource was not found.';
        case 409:
            return 'This action conflicts with existing data.';
        case 422:
            return 'Please check your input and try again.';
        case 429:
            return 'Too many requests. Please wait a moment and try again.';
        case 500:
            return 'Server error. Please try again later.';
        case 502:
        case 503:
        case 504:
            return 'Service temporarily unavailable. Please try again later.';
        default:
            return originalMessage || 'An unexpected error occurred.';
    }
}
function classifyError(error) {
    // Handle Zod validation errors
    if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].ZodError) {
        return createValidationError(error);
    }
    // Handle standard Error objects
    if (error instanceof Error) {
        // Check for specific error types based on message patterns
        const message = error.message.toLowerCase();
        if (message.includes('network') || message.includes('fetch')) {
            return createNetworkError(error.message);
        }
        if (message.includes('not found')) {
            const standardError = createStandardError(ERROR_TYPES.NOT_FOUND, error.message, {
                severity: ERROR_SEVERITY.LOW,
                userMessage: 'The requested item was not found.'
            });
            standardError.retryable = false;
            return standardError;
        }
        if (message.includes('unauthorized') || message.includes('authentication')) {
            const standardError = createStandardError(ERROR_TYPES.UNAUTHORIZED, error.message, {
                severity: ERROR_SEVERITY.MEDIUM,
                userMessage: 'Please log in to continue.'
            });
            standardError.retryable = false;
            return standardError;
        }
        if (message.includes('permission') || message.includes('forbidden')) {
            const standardError = createStandardError(ERROR_TYPES.PERMISSION_DENIED, error.message, {
                severity: ERROR_SEVERITY.MEDIUM,
                userMessage: 'You don\'t have permission to perform this action.'
            });
            standardError.retryable = false;
            return standardError;
        }
        const standardError = createStandardError(ERROR_TYPES.UNKNOWN, error.message, {
            severity: ERROR_SEVERITY.MEDIUM
        });
        standardError.retryable = true;
        return standardError;
    }
    // Handle string errors
    if (typeof error === 'string') {
        const standardError = createStandardError(ERROR_TYPES.UNKNOWN, error, {
            severity: ERROR_SEVERITY.MEDIUM
        });
        standardError.retryable = true;
        return standardError;
    }
    // Handle unknown error types
    const standardError = createStandardError(ERROR_TYPES.UNKNOWN, 'An unexpected error occurred', {
        severity: ERROR_SEVERITY.MEDIUM,
        details: {
            originalError: error
        }
    });
    standardError.retryable = true;
    return standardError;
}
function isRetryableError(error) {
    switch(error.type){
        case ERROR_TYPES.NETWORK:
            {
                const networkError = error;
                const status = networkError.details.status;
                // Retry on 5xx errors and network failures
                return !status || status >= 500;
            }
        case ERROR_TYPES.RATE_LIMIT:
            return true;
        case ERROR_TYPES.DATABASE:
            return true;
        case ERROR_TYPES.EXTERNAL_SERVICE:
            return true;
        default:
            return false;
    }
}
function getErrorLogLevel(error) {
    switch(error.severity){
        case ERROR_SEVERITY.LOW:
            return 'info';
        case ERROR_SEVERITY.MEDIUM:
            return 'warn';
        case ERROR_SEVERITY.HIGH:
        case ERROR_SEVERITY.CRITICAL:
            return 'error';
        default:
            return 'warn';
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/utils/auth.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Authentication utilities
 * Helper functions for user role display and management
 */ __turbopack_context__.s({
    "getUserRoleColor": ()=>getUserRoleColor,
    "getUserRoleLabel": ()=>getUserRoleLabel
});
const getUserRoleLabel = (role)=>{
    const labels = {
        OWNER: 'Property Owner',
        MANAGER: 'Property Manager',
        TENANT: 'Tenant',
        ADMIN: 'Administrator'
    };
    return labels[role] || role;
};
const getUserRoleColor = (role)=>{
    const colors = {
        OWNER: 'bg-purple-100 text-purple-800',
        MANAGER: 'bg-blue-100 text-blue-800',
        TENANT: 'bg-green-100 text-green-800',
        ADMIN: 'bg-red-100 text-red-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/utils/properties.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Property utilities
 * Helper functions for property and unit display
 */ __turbopack_context__.s({
    "getPropertyTypeLabel": ()=>getPropertyTypeLabel,
    "getUnitStatusColor": ()=>getUnitStatusColor,
    "getUnitStatusLabel": ()=>getUnitStatusLabel
});
const getPropertyTypeLabel = (type)=>{
    const labels = {
        SINGLE_FAMILY: 'Single Family',
        MULTI_UNIT: 'Multi Unit',
        APARTMENT: 'Apartment',
        COMMERCIAL: 'Commercial'
    };
    return labels[type] || type;
};
const getUnitStatusLabel = (status)=>{
    const labels = {
        VACANT: 'Vacant',
        OCCUPIED: 'Occupied',
        MAINTENANCE: 'Under Maintenance',
        RESERVED: 'Reserved'
    };
    return labels[status] || status;
};
const getUnitStatusColor = (status)=>{
    const colors = {
        VACANT: 'bg-yellow-100 text-yellow-800',
        OCCUPIED: 'bg-green-100 text-green-800',
        MAINTENANCE: 'bg-orange-100 text-orange-800',
        RESERVED: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/utils/tenants.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Tenant utilities
 * Helper functions for tenant invitation status display
 */ __turbopack_context__.s({
    "getInvitationStatusColor": ()=>getInvitationStatusColor,
    "getInvitationStatusLabel": ()=>getInvitationStatusLabel
});
const getInvitationStatusLabel = (status)=>{
    const labels = {
        PENDING: 'Pending',
        ACCEPTED: 'Accepted',
        EXPIRED: 'Expired',
        DECLINED: 'Declined',
        CANCELLED: 'Cancelled'
    };
    return labels[status] || status;
};
const getInvitationStatusColor = (status)=>{
    const colors = {
        PENDING: 'bg-yellow-100 text-yellow-800',
        ACCEPTED: 'bg-green-100 text-green-800',
        EXPIRED: 'bg-red-100 text-red-800',
        DECLINED: 'bg-red-100 text-red-800',
        CANCELLED: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/utils/leases.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Lease utilities
 * Helper functions for lease status display and management
 */ __turbopack_context__.s({
    "getLeaseStatusColor": ()=>getLeaseStatusColor,
    "getLeaseStatusLabel": ()=>getLeaseStatusLabel
});
const getLeaseStatusLabel = (status)=>{
    const labels = {
        DRAFT: 'Draft',
        ACTIVE: 'Active',
        EXPIRED: 'Expired',
        TERMINATED: 'Terminated'
    };
    return labels[status] || status;
};
const getLeaseStatusColor = (status)=>{
    const colors = {
        DRAFT: 'bg-gray-100 text-gray-800',
        ACTIVE: 'bg-green-100 text-green-800',
        EXPIRED: 'bg-red-100 text-red-800',
        TERMINATED: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/utils/maintenance.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Maintenance utilities
 * Helper functions for maintenance priority and status display
 */ __turbopack_context__.s({
    "getPriorityColor": ()=>getPriorityColor,
    "getPriorityLabel": ()=>getPriorityLabel,
    "getRequestStatusColor": ()=>getRequestStatusColor,
    "getRequestStatusLabel": ()=>getRequestStatusLabel
});
const getPriorityLabel = (priority)=>{
    const labels = {
        LOW: 'Low Priority',
        MEDIUM: 'Medium Priority',
        HIGH: 'High Priority',
        EMERGENCY: 'Emergency'
    };
    return labels[priority] || priority;
};
const getPriorityColor = (priority)=>{
    const colors = {
        LOW: 'bg-green-100 text-green-800',
        MEDIUM: 'bg-yellow-100 text-yellow-800',
        HIGH: 'bg-orange-100 text-orange-800',
        EMERGENCY: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
};
const getRequestStatusLabel = (status)=>{
    const labels = {
        OPEN: 'Open',
        IN_PROGRESS: 'In Progress',
        COMPLETED: 'Completed',
        CANCELED: 'Canceled',
        ON_HOLD: 'On Hold'
    };
    return labels[status] || status;
};
const getRequestStatusColor = (status)=>{
    const colors = {
        OPEN: 'bg-yellow-100 text-yellow-800',
        IN_PROGRESS: 'bg-blue-100 text-blue-800',
        COMPLETED: 'bg-green-100 text-green-800',
        CANCELED: 'bg-gray-100 text-gray-800',
        ON_HOLD: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/utils/type-adapters.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Type Adapter Utilities
 * Provides type-safe bridges between domain types and API layer requirements
 */ /**
 * Generic type adapter interface that ensures type safety while satisfying API requirements
 */ __turbopack_context__.s({
    "TypeAdapterError": ()=>TypeAdapterError,
    "createApiCall": ()=>createApiCall,
    "createMutationAdapter": ()=>createMutationAdapter,
    "createQueryAdapter": ()=>createQueryAdapter,
    "createResponseAdapter": ()=>createResponseAdapter,
    "handleAdapterError": ()=>handleAdapterError,
    "isValidMutationData": ()=>isValidMutationData,
    "isValidQueryParam": ()=>isValidQueryParam,
    "mergeApiParams": ()=>mergeApiParams,
    "safeParseDate": ()=>safeParseDate,
    "safeParseNumber": ()=>safeParseNumber,
    "validateApiParams": ()=>validateApiParams,
    "validateEnumValue": ()=>validateEnumValue
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/node_modules/@swc/helpers/esm/_define_property.js [app-client] (ecmascript)");
;
function createQueryAdapter(query) {
    if (!query) return {};
    // Filter out undefined values and ensure proper serialization
    const filtered = {};
    for (const [key, value] of Object.entries(query)){
        if (value !== undefined && value !== null) {
            // Handle nested objects by serializing them
            if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                filtered[key] = JSON.stringify(value);
            } else if (value instanceof Date) {
                filtered[key] = value.toISOString();
            } else {
                filtered[key] = value;
            }
        }
    }
    return filtered;
}
function createMutationAdapter(data) {
    // Ensure all required fields are present and properly typed
    const adapted = {};
    for (const [key, value] of Object.entries(data)){
        if (value !== undefined) {
            // Handle Date objects
            if (value instanceof Date) {
                adapted[key] = value.toISOString();
            } else if (Array.isArray(value)) {
                adapted[key] = value;
            } else if (typeof value === 'object' && value !== null) {
                adapted[key] = value;
            } else {
                adapted[key] = value;
            }
        }
    }
    return adapted;
}
function validateApiParams(params, requiredFields) {
    for (const field of requiredFields){
        if (params[field] === undefined || params[field] === null) {
            throw new Error("Required field '".concat(String(field), "' is missing"));
        }
    }
}
function createResponseAdapter(apiData, transformer) {
    try {
        return transformer(apiData);
    } catch (error) {
        throw new Error("Failed to transform API response: ".concat(error instanceof Error ? error.message : 'Unknown error'));
    }
}
function validateEnumValue(value, enumObject, fallback) {
    const enumValues = Object.values(enumObject);
    if (enumValues.includes(value)) {
        return value;
    }
    if (fallback !== undefined) {
        return fallback;
    }
    throw new Error("Invalid enum value '".concat(value, "'. Valid values are: ").concat(enumValues.join(', ')));
}
function safeParseNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
}
function safeParseDate(value) {
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
}
function mergeApiParams(base, override) {
    return {
        ...base,
        ...override
    };
}
function createApiCall(endpoint) {
    let method = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 'GET';
    return {
        endpoint,
        method,
        prepareParams: (params)=>createQueryAdapter(params),
        prepareData: (data)=>createMutationAdapter(data)
    };
}
function isValidQueryParam(value) {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}
function isValidMutationData(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
class TypeAdapterError extends Error {
    constructor(message, operation, originalData){
        super(message), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "operation", void 0), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "originalData", void 0), this.operation = operation, this.originalData = originalData;
        this.name = 'TypeAdapterError';
    }
}
function handleAdapterError(error, operation, data) {
    if (error instanceof Error) {
        throw new TypeAdapterError(error.message, operation, data);
    }
    throw new TypeAdapterError('Unknown adapter error', operation, data);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/utils/index.ts [app-client] (ecmascript) <locals>": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * @repo/shared/utils - Utility functions export
 * 
 * Re-exports all utility functions from the utils directory.
 */ // Billing utilities
__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$billing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/billing.ts [app-client] (ecmascript)");
// Error handling utilities  
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/errors.ts [app-client] (ecmascript)");
// Auth utilities
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/auth.ts [app-client] (ecmascript)");
// Property utilities
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/properties.ts [app-client] (ecmascript)");
// Tenant utilities
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/tenants.ts [app-client] (ecmascript)");
// Lease utilities
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$leases$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/leases.ts [app-client] (ecmascript)");
// Maintenance utilities
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$maintenance$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/maintenance.ts [app-client] (ecmascript)");
// Currency utilities
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$currency$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/currency.ts [app-client] (ecmascript)");
// Type adapter utilities
// IMPORTANT: ALL imports from utils should go through this barrel export (./utils)
// to maintain CI/CD compatibility. Do NOT import directly from ./utils/type-adapters
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$type$2d$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/type-adapters.ts [app-client] (ecmascript)");
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
"[project]/packages/shared/src/utils/index.ts [app-client] (ecmascript) <module evaluation>": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$billing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/billing.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$errors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/errors.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/properties.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/tenants.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$leases$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/leases.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$maintenance$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/maintenance.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$currency$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/currency.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$type$2d$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/type-adapters.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/index.ts [app-client] (ecmascript) <locals>");
}),
"[project]/packages/shared/src/types/domain.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Domain-Driven Design Types for TenantFlow
 * 
 * These types provide common patterns for implementing DDD concepts
 * across frontend and backend, ensuring consistency in domain modeling.
 */ // ========================
// Value Object Base Types
// ========================
__turbopack_context__.s({
    "Address": ()=>Address,
    "BaseEntity": ()=>BaseEntity,
    "BaseSpecification": ()=>BaseSpecification,
    "BaseValueObject": ()=>BaseValueObject,
    "BusinessRuleValidationError": ()=>BusinessRuleValidationError,
    "ConflictError": ()=>ConflictError,
    "DomainError": ()=>DomainError,
    "Email": ()=>Email,
    "ForbiddenError": ()=>ForbiddenError,
    "Money": ()=>Money,
    "NotFoundError": ()=>NotFoundError,
    "PhoneNumber": ()=>PhoneNumber,
    "Result": ()=>Result,
    "UnauthorizedError": ()=>UnauthorizedError,
    "ValidationError": ()=>ValidationError,
    "createId": ()=>createId
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/node_modules/@swc/helpers/esm/_define_property.js [app-client] (ecmascript)");
;
class BaseValueObject {
}
class BaseEntity {
    equals(other) {
        return this.id === other.id;
    }
    constructor(id){
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "id", void 0);
        this.id = id;
    }
}
class BaseSpecification {
    and(other) {
        return new AndSpecification(this, other);
    }
    or(other) {
        return new OrSpecification(this, other);
    }
    not() {
        return new NotSpecification(this);
    }
}
class AndSpecification extends BaseSpecification {
    isSatisfiedBy(candidate) {
        return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
    }
    constructor(left, right){
        super(), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "left", void 0), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "right", void 0), this.left = left, this.right = right;
    }
}
class OrSpecification extends BaseSpecification {
    isSatisfiedBy(candidate) {
        return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
    }
    constructor(left, right){
        super(), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "left", void 0), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "right", void 0), this.left = left, this.right = right;
    }
}
class NotSpecification extends BaseSpecification {
    isSatisfiedBy(candidate) {
        return !this.spec.isSatisfiedBy(candidate);
    }
    constructor(spec){
        super(), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "spec", void 0), this.spec = spec;
    }
}
const Result = {
    success: (value)=>({
            success: true,
            value
        }),
    failure: (error)=>({
            success: false,
            error
        }),
    isSuccess: (result)=>{
        return result.success === true;
    },
    isFailure: (result)=>{
        return result.success === false;
    }
};
class BusinessRuleValidationError extends Error {
    constructor(brokenRule, message){
        super(message || brokenRule.message), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "brokenRule", void 0), this.brokenRule = brokenRule;
        this.name = 'BusinessRuleValidationError';
    }
}
const createId = {
    user: (id)=>id,
    property: (id)=>id,
    unit: (id)=>id,
    tenant: (id)=>id,
    lease: (id)=>id,
    maintenanceRequest: (id)=>id,
    organization: (id)=>id,
    document: (id)=>id,
    file: (id)=>id,
    activity: (id)=>id,
    notification: (id)=>id,
    reminderLog: (id)=>id,
    blogArticle: (id)=>id,
    customerInvoice: (id)=>id
};
class Money extends BaseValueObject {
    equals(other) {
        return this.amount === other.amount && this.currency === other.currency;
    }
    toString() {
        return "".concat(this.amount, " ").concat(this.currency);
    }
    add(other) {
        if (this.currency !== other.currency) {
            throw new Error('Cannot add money with different currencies');
        }
        return new Money(this.amount + other.amount, this.currency);
    }
    subtract(other) {
        if (this.currency !== other.currency) {
            throw new Error('Cannot subtract money with different currencies');
        }
        return new Money(this.amount - other.amount, this.currency);
    }
    multiply(multiplier) {
        return new Money(this.amount * multiplier, this.currency);
    }
    isZero() {
        return this.amount === 0;
    }
    isPositive() {
        return this.amount > 0;
    }
    isNegative() {
        return this.amount < 0;
    }
    constructor(amount, currency = 'USD'){
        super(), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "amount", void 0), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "currency", void 0), this.amount = amount, this.currency = currency;
        if (amount < 0) {
            throw new Error('Money amount cannot be negative');
        }
        if (!currency || currency.length !== 3) {
            throw new Error('Currency must be a valid 3-letter code');
        }
    }
}
class Email extends BaseValueObject {
    isValidEmail(email) {
        // Use bounded quantifiers to prevent ReDoS attacks
        // RFC 5321: local part max 64 chars, domain parts max 63 chars each
        const emailRegex = /^[^\s@]{1,64}@[^\s@]{1,63}(?:\.[^\s@]{1,63})+$/;
        return emailRegex.test(email);
    }
    equals(other) {
        return this.value.toLowerCase() === other.value.toLowerCase();
    }
    toString() {
        return this.value;
    }
    getDomain() {
        const parts = this.value.split('@');
        return parts[1] || '';
    }
    getLocalPart() {
        const parts = this.value.split('@');
        return parts[0] || '';
    }
    constructor(value){
        super(), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "value", void 0), this.value = value;
        if (!this.isValidEmail(value)) {
            throw new Error('Invalid email format');
        }
    }
}
class PhoneNumber extends BaseValueObject {
    isValidPhoneNumber(phone) {
        // Basic international phone number validation
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(phone.replace(/\s|-/g, ''));
    }
    equals(other) {
        return this.normalize() === other.normalize();
    }
    toString() {
        return this.value;
    }
    normalize() {
        return this.value.replace(/\s|-/g, '');
    }
    constructor(value){
        super(), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "value", void 0), this.value = value;
        if (!this.isValidPhoneNumber(value)) {
            throw new Error('Invalid phone number format');
        }
    }
}
class Address extends BaseValueObject {
    equals(other) {
        return this.street === other.street && this.city === other.city && this.state === other.state && this.zipCode === other.zipCode && this.country === other.country;
    }
    toString() {
        return "".concat(this.street, ", ").concat(this.city, ", ").concat(this.state, " ").concat(this.zipCode, ", ").concat(this.country);
    }
    getFullAddress() {
        return this.toString();
    }
    constructor(street, city, state, zipCode, country = 'US'){
        super(), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "street", void 0), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "city", void 0), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "state", void 0), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "zipCode", void 0), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "country", void 0), this.street = street, this.city = city, this.state = state, this.zipCode = zipCode, this.country = country;
        if (!(street === null || street === void 0 ? void 0 : street.trim())) throw new Error('Street is required');
        if (!(city === null || city === void 0 ? void 0 : city.trim())) throw new Error('City is required');
        if (!(state === null || state === void 0 ? void 0 : state.trim())) throw new Error('State is required');
        if (!(zipCode === null || zipCode === void 0 ? void 0 : zipCode.trim())) throw new Error('ZIP code is required');
        if (!(country === null || country === void 0 ? void 0 : country.trim())) throw new Error('Country is required');
    }
}
class DomainError extends Error {
    constructor(message, code, context){
        super(message), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "code", void 0), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "context", void 0), this.code = code, this.context = context;
        this.name = 'DomainError';
    }
}
class ValidationError extends DomainError {
    constructor(message, field){
        super(message, 'VALIDATION_ERROR', {
            field
        }), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$node_modules$2f40$swc$2f$helpers$2f$esm$2f$_define_property$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["_"])(this, "field", void 0), this.field = field;
        this.name = 'ValidationError';
    }
}
class NotFoundError extends DomainError {
    constructor(entityName, id){
        super("".concat(entityName, " with ID ").concat(id, " not found"), 'NOT_FOUND', {
            entityName,
            id
        });
        this.name = 'NotFoundError';
    }
}
class ConflictError extends DomainError {
    constructor(message, context){
        super(message, 'CONFLICT', context);
        this.name = 'ConflictError';
    }
}
class UnauthorizedError extends DomainError {
    constructor(message = 'Unauthorized access'){
        super(message, 'UNAUTHORIZED');
        this.name = 'UnauthorizedError';
    }
}
class ForbiddenError extends DomainError {
    constructor(message = 'Forbidden operation'){
        super(message, 'FORBIDDEN');
        this.name = 'ForbiddenError';
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/validation/common.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "actionStateSchema": ()=>actionStateSchema,
    "addressSchema": ()=>addressSchema,
    "advancedSearchSchema": ()=>advancedSearchSchema,
    "auditFieldsSchema": ()=>auditFieldsSchema,
    "baseQuerySchema": ()=>baseQuerySchema,
    "bulkOperationSchema": ()=>bulkOperationSchema,
    "bulkResponseSchema": ()=>bulkResponseSchema,
    "coordinatesSchema": ()=>coordinatesSchema,
    "createApiResponseSchema": ()=>createApiResponseSchema,
    "createListResponseSchema": ()=>createListResponseSchema,
    "createPaginatedResponseSchema": ()=>createPaginatedResponseSchema,
    "currencyAmountSchema": ()=>currencyAmountSchema,
    "dateRangeSchema": ()=>dateRangeSchema,
    "dateStringSchema": ()=>dateStringSchema,
    "emailSchema": ()=>emailSchema,
    "errorResponseSchema": ()=>errorResponseSchema,
    "fileSizeSchema": ()=>fileSizeSchema,
    "fileTypeSchema": ()=>fileTypeSchema,
    "formActionStateSchema": ()=>formActionStateSchema,
    "idSchema": ()=>idSchema,
    "metadataSchema": ()=>metadataSchema,
    "nonEmptyStringSchema": ()=>nonEmptyStringSchema,
    "nonNegativeNumberSchema": ()=>nonNegativeNumberSchema,
    "paginationQuerySchema": ()=>paginationQuerySchema,
    "paginationResponseSchema": ()=>paginationResponseSchema,
    "paginationSchema": ()=>paginationSchema,
    "percentageSchema": ()=>percentageSchema,
    "phoneSchema": ()=>phoneSchema,
    "positiveNumberSchema": ()=>positiveNumberSchema,
    "searchSchema": ()=>searchSchema,
    "serverActionResponseSchema": ()=>serverActionResponseSchema,
    "sortOrderSchema": ()=>sortOrderSchema,
    "sortSchema": ()=>sortSchema,
    "statusSchema": ()=>statusSchema,
    "successResponseSchema": ()=>successResponseSchema,
    "timeRangeSchema": ()=>timeRangeSchema,
    "timestampFieldsSchema": ()=>timestampFieldsSchema,
    "uploadedFileSchema": ()=>uploadedFileSchema,
    "urlSchema": ()=>urlSchema,
    "uuidSchema": ()=>uuidSchema,
    "webhookDeliverySchema": ()=>webhookDeliverySchema,
    "webhookEventSchema": ()=>webhookEventSchema
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-client] (ecmascript) <export * as z>");
;
const uuidSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, {
    message: 'UUID is required'
}).refine((val)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val), {
    message: 'Invalid UUID format'
});
const emailSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, {
    message: 'Email is required'
}).refine((val)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: 'Invalid email format'
});
const nonEmptyStringSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, {
    message: 'This field is required'
});
const positiveNumberSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().positive({
    message: 'Must be a positive number'
});
const nonNegativeNumberSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().nonnegative({
    message: 'Cannot be negative'
});
const paginationSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    page: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive().default(1),
    limit: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().positive().max(100).default(10)
});
const paginationQuerySchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    page: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.number().int().positive().default(1),
    limit: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].coerce.number().int().positive().max(100).default(10)
});
const paginationResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    totalCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    totalPages: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    currentPage: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    hasNextPage: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    hasPreviousPage: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean()
});
const dateStringSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().refine((val)=>!val || !isNaN(Date.parse(val)), {
    message: 'Invalid date format'
});
const dateRangeSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional()
});
const idSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: uuidSchema
});
const timestampFieldsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    createdAt: dateStringSchema,
    updatedAt: dateStringSchema
});
const statusSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    'ACTIVE',
    'INACTIVE',
    'PENDING',
    'COMPLETED',
    'FAILED'
]);
const sortOrderSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    'asc',
    'desc'
]).optional().default('desc');
const searchSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    search: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    sortBy: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    sortOrder: sortOrderSchema
});
const baseQuerySchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    ...paginationSchema.shape,
    ...searchSchema.shape,
    ...dateRangeSchema.shape
});
const successResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    success: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    message: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional()
});
const errorResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    error: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    message: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    code: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional()
});
const metadataSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].record(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].unknown());
const auditFieldsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    createdBy: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().refine((val)=>!val || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val), {
        message: 'Invalid UUID format'
    }).optional(),
    updatedBy: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().refine((val)=>!val || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val), {
        message: 'Invalid UUID format'
    }).optional(),
    createdAt: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].date(),
    updatedAt: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].date()
});
const createPaginatedResponseSchema = (itemSchema)=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        data: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(itemSchema),
        pagination: paginationResponseSchema
    });
const createApiResponseSchema = (dataSchema)=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        success: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
        data: dataSchema.optional(),
        error: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
        message: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional()
    });
const createListResponseSchema = (itemSchema)=>__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        items: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(itemSchema),
        totalCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
        page: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
        pageSize: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
        totalPages: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number()
    });
const actionStateSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    success: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().optional(),
    loading: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean().optional(),
    error: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    message: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    data: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].unknown().optional()
});
const formActionStateSchema = actionStateSchema.extend({
    fieldErrors: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].record(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string())).optional()
});
const serverActionResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    success: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    data: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].unknown().optional(),
    error: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    message: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional(),
    redirect: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional()
});
const phoneSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');
const currencyAmountSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0, 'Amount cannot be negative').max(999999999.99, 'Amount is too large');
const percentageSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(0, 'Percentage cannot be negative').max(100, 'Percentage cannot exceed 100');
const urlSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().refine((val)=>{
    try {
        new URL(val);
        return true;
    } catch (e) {
        return false;
    }
}, {
    message: 'Invalid URL format'
});
const fileTypeSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
]);
const fileSizeSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(1, 'File cannot be empty').max(10 * 1024 * 1024, 'File size cannot exceed 10MB') // 10MB
;
const uploadedFileSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    size: fileSizeSchema,
    type: fileTypeSchema,
    lastModified: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    data: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional() // base64 data
});
const addressSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    street: nonEmptyStringSchema,
    city: nonEmptyStringSchema,
    state: nonEmptyStringSchema,
    zipCode: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
    country: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().length(2, 'Country code must be 2 letters').default('US')
});
const coordinatesSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    latitude: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(-90).max(90),
    longitude: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(-180).max(180)
});
const sortSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    field: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    direction: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'asc',
        'desc'
    ]).default('desc')
});
const advancedSearchSchema = searchSchema.extend({
    filters: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].record(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].unknown()).optional(),
    sort: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(sortSchema).optional(),
    include: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()).optional(),
    exclude: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()).optional()
});
const timeRangeSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    from: dateStringSchema.optional(),
    to: dateStringSchema.optional(),
    preset: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'today',
        'yesterday',
        'last7days',
        'last30days',
        'thisMonth',
        'lastMonth',
        'thisYear',
        'lastYear'
    ]).optional()
});
const bulkOperationSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    action: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'create',
        'update',
        'delete',
        'archive',
        'restore'
    ]),
    ids: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(uuidSchema).min(1, 'At least one ID is required'),
    data: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].unknown().optional()
});
const bulkResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    successful: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(uuidSchema),
    failed: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        id: uuidSchema,
        error: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
    })),
    totalProcessed: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    successCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    failureCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number()
});
const webhookEventSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: uuidSchema,
    type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    data: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].unknown(),
    timestamp: dateStringSchema,
    version: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().default('1.0')
});
const webhookDeliverySchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: uuidSchema,
    url: urlSchema,
    event: webhookEventSchema,
    attempts: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().min(1),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'pending',
        'delivered',
        'failed'
    ]),
    response: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
        status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
        headers: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].record(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()),
        body: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
    }).optional(),
    nextRetry: dateStringSchema.optional()
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/validation/index.ts [app-client] (ecmascript) <locals>": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * Shared validation schemas for TenantFlow
 * Common Zod schemas used across frontend and backend
 */ __turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$validation$2f$common$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/validation/common.ts [app-client] (ecmascript)");
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/validation/index.ts [app-client] (ecmascript) <module evaluation>": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$validation$2f$common$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/validation/common.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$validation$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/shared/src/validation/index.ts [app-client] (ecmascript) <locals>");
}),
"[project]/packages/shared/src/index.ts [app-client] (ecmascript) <locals>": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * @repo/shared - Main export file
 * 
 * This file exports commonly used types and utilities from the shared package.
 * More specific exports are available through the package.json exports map.
 */ // ========================
// Core Entity Types
// ========================
__turbopack_context__.s({});
// Export UserRole constants
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/auth.ts [app-client] (ecmascript)");
// Global type declarations (augmentations)
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$global$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/global.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$reminders$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/reminders.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2d$pricing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/stripe-pricing.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/stripe.ts [app-client] (ecmascript)");
// ========================
// Stripe Type Guards
// ========================
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2d$guards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/stripe-guards.ts [app-client] (ecmascript)");
// ========================
// Stripe Utilities
// ========================
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/stripe-utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$billing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/billing.ts [app-client] (ecmascript)");
// ========================
// Pricing Configuration
// ========================
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$config$2f$pricing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/config/pricing.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$lease$2d$generator$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/lease-generator.ts [app-client] (ecmascript)");
// ========================
// Constants
// ========================
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/index.ts [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/tenants.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$reminders$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/reminders.ts [app-client] (ecmascript)");
// ========================
// Security Types
// ========================
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$security$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/security.ts [app-client] (ecmascript)");
// Export LogLevel const object
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/logger.ts [app-client] (ecmascript)");
// ========================
// Utilities
// ========================
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/index.ts [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$domain$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/domain.ts [app-client] (ecmascript)");
// ========================
// Validation
// ========================
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$validation$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/packages/shared/src/validation/index.ts [app-client] (ecmascript) <module evaluation>");
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
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/packages/shared/src/index.ts [app-client] (ecmascript) <module evaluation>": ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$global$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/global.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$reminders$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/reminders.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2d$pricing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/stripe-pricing.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/stripe.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2d$guards$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/stripe-guards.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$stripe$2d$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/stripe-utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$billing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/billing.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$config$2f$pricing$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/config/pricing.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$lease$2d$generator$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/lease-generator.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/index.ts [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$tenants$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/tenants.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$constants$2f$reminders$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/constants/reminders.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$security$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/security.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$logger$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/logger.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/index.ts [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$types$2f$domain$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/types/domain.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$validation$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/packages/shared/src/validation/index.ts [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/shared/src/index.ts [app-client] (ecmascript) <locals>");
}),
"[project]/apps/frontend/src/hooks/api/use-properties.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
/**
 * React Query hooks for Properties
 * Provides type-safe data fetching and mutations with optimistic updates
 */ __turbopack_context__.s({
    "useCreateProperty": ()=>useCreateProperty,
    "useDeleteProperty": ()=>useDeleteProperty,
    "usePrefetchProperty": ()=>usePrefetchProperty,
    "useProperties": ()=>useProperties,
    "useProperty": ()=>useProperty,
    "usePropertyStats": ()=>usePropertyStats,
    "useUpdateProperty": ()=>useUpdateProperty
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/api-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$react$2d$query$2f$query$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/react-query/query-client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/packages/shared/src/index.ts [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$type$2d$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/shared/src/utils/type-adapters.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/query-factory.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature(), _s4 = __turbopack_context__.k.signature(), _s5 = __turbopack_context__.k.signature(), _s6 = __turbopack_context__.k.signature();
;
;
;
;
;
function useProperties(query, options) {
    _s();
    var _options_enabled;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryFactory"])({
        queryKey: [
            'tenantflow',
            'properties',
            'list',
            query
        ],
        queryFn: {
            "useProperties.useQueryFactory": async ()=>{
                try {
                    const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/properties', {
                        params: (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$type$2d$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createQueryAdapter"])(query)
                    });
                    return response.data;
                } catch (e) {
                    console.warn('Properties API unavailable, returning empty list');
                    return [] // Return empty array on error to allow UI to render
                    ;
                }
            }
        }["useProperties.useQueryFactory"],
        enabled: (_options_enabled = options === null || options === void 0 ? void 0 : options.enabled) !== null && _options_enabled !== void 0 ? _options_enabled : true,
        staleTime: 5 * 60 * 1000
    });
}
_s(useProperties, "UhCLg2PC09ybNJk4wW9kKTzKqUc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryFactory"]
    ];
});
function useProperty(id, options) {
    _s1();
    var _options_enabled;
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useDetailQuery"])('properties', Boolean(id) && ((_options_enabled = options === null || options === void 0 ? void 0 : options.enabled) !== null && _options_enabled !== void 0 ? _options_enabled : true) ? id : undefined, {
        "useProperty.useDetailQuery": async (id)=>{
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/properties/".concat(id));
            return response.data;
        }
    }["useProperty.useDetailQuery"]);
}
_s1(useProperty, "T3ilukHMMkO56tolFmxb5nlN6I8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useDetailQuery"]
    ];
});
function usePropertyStats() {
    _s2();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useStatsQuery"])('properties', {
        "usePropertyStats.useStatsQuery": async ()=>{
            const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get('/properties/stats');
            return response.data;
        }
    }["usePropertyStats.useStatsQuery"]);
}
_s2(usePropertyStats, "SgTkKr4wlBwHxVbcmHcm7NlQbSU=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useStatsQuery"]
    ];
});
function useCreateProperty() {
    _s3();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutationFactory"])({
        mutationFn: {
            "useCreateProperty.useMutationFactory": async (data)=>{
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].post('/properties', (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$type$2d$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createMutationAdapter"])(data));
                return response.data;
            }
        }["useCreateProperty.useMutationFactory"],
        invalidateKeys: [
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$react$2d$query$2f$query$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["queryKeys"].properties(),
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$react$2d$query$2f$query$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["queryKeys"].propertyStats()
        ],
        successMessage: 'Property created successfully',
        errorMessage: 'Failed to create property',
        optimisticUpdate: {
            queryKey: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$react$2d$query$2f$query$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["queryKeys"].propertyList(),
            updater: {
                "useCreateProperty.useMutationFactory": (oldData, variables)=>{
                    const previousProperties = oldData;
                    return previousProperties ? [
                        ...previousProperties,
                        {
                            ...variables,
                            id: "temp-".concat(Date.now()),
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    ] : [];
                }
            }["useCreateProperty.useMutationFactory"]
        }
    });
}
_s3(useCreateProperty, "/FGQbtc17h4TQkYHpHGvrun58PY=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutationFactory"]
    ];
});
function useUpdateProperty() {
    _s4();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutationFactory"])({
        mutationFn: {
            "useUpdateProperty.useMutationFactory": async (param)=>{
                let { id, data } = param;
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].put("/properties/".concat(id), (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$shared$2f$src$2f$utils$2f$type$2d$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createMutationAdapter"])(data));
                return response.data;
            }
        }["useUpdateProperty.useMutationFactory"],
        invalidateKeys: [
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$react$2d$query$2f$query$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["queryKeys"].properties(),
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$react$2d$query$2f$query$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["queryKeys"].propertyStats()
        ],
        successMessage: 'Property updated successfully',
        errorMessage: 'Failed to update property',
        optimisticUpdate: {
            queryKey: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$react$2d$query$2f$query$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["queryKeys"].propertyList(),
            updater: {
                "useUpdateProperty.useMutationFactory": (oldData, param)=>{
                    let { id, data } = param;
                    const previousList = oldData;
                    return previousList ? previousList.map({
                        "useUpdateProperty.useMutationFactory": (p)=>p.id === id ? {
                                ...p,
                                ...data
                            } : p
                    }["useUpdateProperty.useMutationFactory"]) : [];
                }
            }["useUpdateProperty.useMutationFactory"]
        }
    });
}
_s4(useUpdateProperty, "/FGQbtc17h4TQkYHpHGvrun58PY=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutationFactory"]
    ];
});
function useDeleteProperty() {
    _s5();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutationFactory"])({
        mutationFn: {
            "useDeleteProperty.useMutationFactory": async (id)=>{
                await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].delete("/properties/".concat(id));
            }
        }["useDeleteProperty.useMutationFactory"],
        invalidateKeys: [
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$react$2d$query$2f$query$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["queryKeys"].properties(),
            __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$react$2d$query$2f$query$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["queryKeys"].propertyStats()
        ],
        successMessage: 'Property deleted successfully',
        errorMessage: 'Failed to delete property',
        optimisticUpdate: {
            queryKey: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$react$2d$query$2f$query$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["queryKeys"].propertyList(),
            updater: {
                "useDeleteProperty.useMutationFactory": (oldData, id)=>{
                    const previousList = oldData;
                    return previousList ? previousList.filter({
                        "useDeleteProperty.useMutationFactory": (p)=>p.id !== id
                    }["useDeleteProperty.useMutationFactory"]) : [];
                }
            }["useDeleteProperty.useMutationFactory"]
        }
    });
}
_s5(useDeleteProperty, "/FGQbtc17h4TQkYHpHGvrun58PY=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$query$2d$factory$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutationFactory"]
    ];
});
function usePrefetchProperty() {
    _s6();
    const queryClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"])();
    return (id)=>{
        queryClient.prefetchQuery({
            queryKey: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$react$2d$query$2f$query$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["queryKeys"].propertyDetail(id),
            queryFn: async ()=>{
                const response = await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$api$2d$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["apiClient"].get("/properties/".concat(id));
                return response.data;
            },
            staleTime: 10 * 1000
        });
    };
}
_s6(usePrefetchProperty, "4R+oYVB2Uc11P7bp1KcuhpkfaTw=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/badge.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "Badge": ()=>Badge,
    "badgeVariants": ()=>badgeVariants
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-slot/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/class-variance-authority/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
;
;
;
;
const badgeVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden", {
    variants: {
        variant: {
            default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
            secondary: "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
            destructive: "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
            outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground"
        }
    },
    defaultVariants: {
        variant: "default"
    }
});
function Badge(param) {
    let { className, variant, asChild = false, ...props } = param;
    const Comp = asChild ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$slot$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Slot"] : "span";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Comp, {
        "data-slot": "badge",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(badgeVariants({
            variant
        }), className),
        ...props
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/badge.tsx",
        lineNumber: 38,
        columnNumber: 5
    }, this);
}
_c = Badge;
;
var _c;
__turbopack_context__.k.register(_c, "Badge");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/ui/progress.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "Progress": ()=>Progress
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$progress$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@radix-ui/react-progress/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
"use client";
;
;
;
function Progress(param) {
    let { className, value, ...props } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$progress$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Root"], {
        "data-slot": "progress",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("bg-primary/20 relative h-2 w-full overflow-hidden rounded-full", className),
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$radix$2d$ui$2f$react$2d$progress$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Indicator"], {
            "data-slot": "progress-indicator",
            className: "bg-primary h-full w-full flex-1 transition-all",
            style: {
                transform: "translateX(-".concat(100 - (value || 0), "%)")
            }
        }, void 0, false, {
            fileName: "[project]/apps/frontend/src/components/ui/progress.tsx",
            lineNumber: 22,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/ui/progress.tsx",
        lineNumber: 14,
        columnNumber: 5
    }, this);
}
_c = Progress;
;
var _c;
__turbopack_context__.k.register(_c, "Progress");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "DashboardStats": ()=>DashboardStats,
    "OnboardingBanner": ()=>OnboardingBanner,
    "QuickActions": ()=>QuickActions,
    "RecentProperties": ()=>RecentProperties
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$api$2f$use$2d$dashboard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/api/use-dashboard.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$api$2f$use$2d$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/hooks/api/use-properties.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/card.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/button.tsx [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/skeleton.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/alert.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/badge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$progress$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/components/ui/progress.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/building-2.js [app-client] (ecmascript) <export default as Building2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/users.js [app-client] (ecmascript) <export default as Users>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-text.js [app-client] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wrench$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wrench$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/wrench.js [app-client] (ecmascript) <export default as Wrench>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-right.js [app-client] (ecmascript) <export default as ArrowRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-client] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/house.js [app-client] (ecmascript) <export default as Home>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-client] (ecmascript) <export default as TrendingUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/utils.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature(), _s3 = __turbopack_context__.k.signature();
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
;
;
;
// First-time user detection and progress tracking
function useOnboardingProgress() {
    var _stats_properties, _stats_tenants, _stats_leases;
    _s();
    const { data: stats } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$api$2f$use$2d$dashboard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useDashboardStats"])();
    const [dismissed, setDismissed] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useOnboardingProgress.useEffect": ()=>{
            if ("TURBOPACK compile-time truthy", 1) {
                const dismissedKey = 'onboarding-dismissed';
                setDismissed(localStorage.getItem(dismissedKey) === 'true');
            }
        }
    }["useOnboardingProgress.useEffect"], []);
    const steps = [
        {
            id: 'property',
            label: 'Add a property',
            completed: ((stats === null || stats === void 0 ? void 0 : (_stats_properties = stats.properties) === null || _stats_properties === void 0 ? void 0 : _stats_properties.totalProperties) || 0) > 0,
            href: '/properties/new',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__["Building2"]
        },
        {
            id: 'tenant',
            label: 'Add a tenant',
            completed: ((stats === null || stats === void 0 ? void 0 : (_stats_tenants = stats.tenants) === null || _stats_tenants === void 0 ? void 0 : _stats_tenants.totalTenants) || 0) > 0,
            href: '/tenants/new',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"]
        },
        {
            id: 'lease',
            label: 'Create a lease',
            completed: ((stats === null || stats === void 0 ? void 0 : (_stats_leases = stats.leases) === null || _stats_leases === void 0 ? void 0 : _stats_leases.activeLeases) || 0) > 0,
            href: '/leases/new',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"]
        }
    ];
    const completedSteps = steps.filter((s)=>s.completed).length;
    const progress = completedSteps / steps.length * 100;
    const isNewUser = completedSteps === 0;
    const isPartiallyComplete = completedSteps > 0 && completedSteps < steps.length;
    const dismissOnboarding = ()=>{
        if ("TURBOPACK compile-time truthy", 1) {
            localStorage.setItem('onboarding-dismissed', 'true');
            setDismissed(true);
        }
    };
    return {
        steps,
        progress,
        isNewUser,
        isPartiallyComplete,
        completedSteps,
        dismissed,
        dismissOnboarding
    };
}
_s(useOnboardingProgress, "SzEfVTVyYJZ3OhdEP42VzdxwGYE=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$api$2f$use$2d$dashboard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useDashboardStats"]
    ];
});
function OnboardingBanner() {
    _s1();
    const { steps, progress, isNewUser, isPartiallyComplete, completedSteps, dismissed, dismissOnboarding } = useOnboardingProgress();
    if (dismissed || !isNewUser && !isPartiallyComplete) {
        return null;
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("border-2 transition-all duration-300", isNewUser ? "border-primary/50 bg-primary/5" : "border-green-500/50 bg-green-50/50 dark:bg-green-950/20"),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-start justify-between",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-1",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                                    className: "flex items-center gap-2",
                                    children: isNewUser ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                                className: "h-5 w-5 text-primary"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                                lineNumber: 107,
                                                columnNumber: 19
                                            }, this),
                                            "Welcome to TenantFlow!"
                                        ]
                                    }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__["TrendingUp"], {
                                                className: "h-5 w-5 text-green-600"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                                lineNumber: 112,
                                                columnNumber: 19
                                            }, this),
                                            "Great progress!"
                                        ]
                                    }, void 0, true)
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                    lineNumber: 104,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardDescription"], {
                                    children: isNewUser ? "Let's get you started with your property management journey" : "You're ".concat(completedSteps, "/3 of the way through setup")
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                    lineNumber: 117,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                            lineNumber: 103,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Button"], {
                            variant: "ghost",
                            size: "sm",
                            onClick: dismissOnboarding,
                            className: "text-muted-foreground hover:text-foreground",
                            children: "Dismiss"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                            lineNumber: 123,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                    lineNumber: 102,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                lineNumber: 101,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                className: "space-y-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex justify-between text-sm",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "text-muted-foreground",
                                        children: "Setup Progress"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                        lineNumber: 136,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "font-medium",
                                        children: [
                                            Math.round(progress),
                                            "%"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                        lineNumber: 137,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                lineNumber: 135,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$progress$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Progress"], {
                                value: progress,
                                className: "h-2"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                lineNumber: 139,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                        lineNumber: 134,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid gap-2 sm:grid-cols-3",
                        children: steps.map((step)=>{
                            const Icon = step.icon;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: step.completed ? '#' : step.href,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("group relative flex items-center gap-3 rounded-lg border p-3 transition-all", step.completed ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : "border-border hover:border-primary/50 hover:bg-accent"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex h-8 w-8 items-center justify-center rounded-full", step.completed ? "bg-green-600 text-white" : "bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white"),
                                        children: step.completed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                                            className: "h-4 w-4"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                            lineNumber: 163,
                                            columnNumber: 21
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                            className: "h-4 w-4"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                            lineNumber: 165,
                                            columnNumber: 21
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                        lineNumber: 156,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm font-medium leading-none", step.completed && "line-through opacity-60"),
                                                children: step.label
                                            }, void 0, false, {
                                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                                lineNumber: 169,
                                                columnNumber: 19
                                            }, this),
                                            step.completed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-green-600 dark:text-green-400",
                                                children: "Completed"
                                            }, void 0, false, {
                                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                                lineNumber: 176,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                        lineNumber: 168,
                                        columnNumber: 17
                                    }, this),
                                    !step.completed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                        className: "h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                        lineNumber: 180,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, step.id, true, {
                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                lineNumber: 146,
                                columnNumber: 15
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                        lineNumber: 142,
                        columnNumber: 9
                    }, this),
                    isNewUser && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Alert"], {
                        className: "border-primary/50 bg-primary/5",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                className: "h-4 w-4"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                lineNumber: 189,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AlertTitle"], {
                                children: "Pro tip"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                lineNumber: 190,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AlertDescription"], {
                                children: "Start by adding your first property, then add tenants and create leases to manage your rentals efficiently."
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                lineNumber: 191,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                        lineNumber: 188,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                lineNumber: 133,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
        lineNumber: 97,
        columnNumber: 5
    }, this);
}
_s1(OnboardingBanner, "6zVT+4bjf1zJTLFaCSabnVAkz1U=", false, function() {
    return [
        useOnboardingProgress
    ];
});
_c = OnboardingBanner;
function DashboardStats() {
    var _stats_properties, _stats_properties1, _stats_tenants, _stats_leases, _stats_leases1, _stats_maintenanceRequests;
    _s2();
    const { data: stats, isLoading, error } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$api$2f$use$2d$dashboard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useDashboardStats"])();
    const { data: properties } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$api$2f$use$2d$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProperties"])();
    if (isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid gap-4 md:grid-cols-2 lg:grid-cols-4",
            children: [
                ...Array(4)
            ].map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                        className: "space-y-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                className: "h-4 w-24"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                lineNumber: 212,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                className: "h-8 w-32"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                lineNumber: 213,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                        lineNumber: 211,
                        columnNumber: 13
                    }, this)
                }, i, false, {
                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                    lineNumber: 210,
                    columnNumber: 11
                }, this))
        }, void 0, false, {
            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
            lineNumber: 208,
            columnNumber: 7
        }, this);
    }
    if (error) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Alert"], {
            variant: "destructive",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                    className: "h-4 w-4"
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                    lineNumber: 224,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AlertTitle"], {
                    children: "Error loading dashboard"
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                    lineNumber: 225,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$alert$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AlertDescription"], {
                    children: "There was a problem loading your dashboard data. Please try refreshing the page."
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                    lineNumber: 226,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
            lineNumber: 223,
            columnNumber: 7
        }, this);
    }
    const statCards = [
        {
            title: 'Total Properties',
            value: (stats === null || stats === void 0 ? void 0 : (_stats_properties = stats.properties) === null || _stats_properties === void 0 ? void 0 : _stats_properties.totalProperties) || 0,
            description: "".concat((stats === null || stats === void 0 ? void 0 : (_stats_properties1 = stats.properties) === null || _stats_properties1 === void 0 ? void 0 : _stats_properties1.occupancyRate) || 0, "% occupied"),
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__["Building2"],
            href: '/properties',
            color: 'text-blue-600'
        },
        {
            title: 'Active Tenants',
            value: (stats === null || stats === void 0 ? void 0 : (_stats_tenants = stats.tenants) === null || _stats_tenants === void 0 ? void 0 : _stats_tenants.totalTenants) || 0,
            description: 'Current tenants',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"],
            href: '/tenants',
            color: 'text-green-600'
        },
        {
            title: 'Active Leases',
            value: (stats === null || stats === void 0 ? void 0 : (_stats_leases = stats.leases) === null || _stats_leases === void 0 ? void 0 : _stats_leases.activeLeases) || 0,
            description: "".concat((stats === null || stats === void 0 ? void 0 : (_stats_leases1 = stats.leases) === null || _stats_leases1 === void 0 ? void 0 : _stats_leases1.expiredLeases) || 0, " expired"),
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"],
            href: '/leases',
            color: 'text-purple-600'
        },
        {
            title: 'Maintenance',
            value: (stats === null || stats === void 0 ? void 0 : (_stats_maintenanceRequests = stats.maintenanceRequests) === null || _stats_maintenanceRequests === void 0 ? void 0 : _stats_maintenanceRequests.open) || 0,
            description: 'Open requests',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wrench$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wrench$3e$__["Wrench"],
            href: '/maintenance',
            color: 'text-orange-600'
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "grid gap-4 md:grid-cols-2 lg:grid-cols-4",
        children: statCards.map((stat)=>{
            const Icon = stat.icon;
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                href: stat.href,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
                    className: "transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                            className: "flex flex-row items-center justify-between space-y-0 pb-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                                    className: "text-sm font-medium",
                                    children: stat.title
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                    lineNumber: 276,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("h-4 w-4", stat.color)
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                    lineNumber: 279,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                            lineNumber: 275,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-2xl font-bold",
                                    children: stat.value
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                    lineNumber: 282,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-xs text-muted-foreground",
                                    children: stat.description
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                    lineNumber: 283,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                            lineNumber: 281,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                    lineNumber: 274,
                    columnNumber: 13
                }, this)
            }, stat.title, false, {
                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                lineNumber: 273,
                columnNumber: 11
            }, this);
        })
    }, void 0, false, {
        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
        lineNumber: 269,
        columnNumber: 5
    }, this);
}
_s2(DashboardStats, "OYAWhOXr5w6XhgSCwsPXgSO/Ipo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$api$2f$use$2d$dashboard$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useDashboardStats"],
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$api$2f$use$2d$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProperties"]
    ];
});
_c1 = DashboardStats;
function RecentProperties() {
    _s3();
    const { data: properties, isLoading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$api$2f$use$2d$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProperties"])({
        limit: 5
    });
    if (isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                            children: "Recent Properties"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                            lineNumber: 303,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardDescription"], {
                            children: "Your recently added properties"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                            lineNumber: 304,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                    lineNumber: 302,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                    className: "space-y-4",
                    children: [
                        ...Array(3)
                    ].map((_, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex items-center gap-4",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                    className: "h-12 w-12 rounded-lg"
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                    lineNumber: 309,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex-1 space-y-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                            className: "h-4 w-32"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                            lineNumber: 311,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                                            className: "h-3 w-24"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                            lineNumber: 312,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                    lineNumber: 310,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, i, true, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                            lineNumber: 308,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                    lineNumber: 306,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
            lineNumber: 301,
            columnNumber: 7
        }, this);
    }
    if (!(properties === null || properties === void 0 ? void 0 : properties.length)) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                            children: "Recent Properties"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                            lineNumber: 325,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardDescription"], {
                            children: "Your recently added properties"
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                            lineNumber: 326,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                    lineNumber: 324,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-col items-center justify-center py-8 text-center",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$house$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Home$3e$__["Home"], {
                                className: "h-12 w-12 text-muted-foreground/50 mb-4"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                lineNumber: 330,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-muted-foreground mb-4",
                                children: "No properties added yet"
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                lineNumber: 331,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: "/properties/new",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Button"], {
                                    size: "sm",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__["Building2"], {
                                            className: "h-4 w-4 mr-2"
                                        }, void 0, false, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                            lineNumber: 336,
                                            columnNumber: 17
                                        }, this),
                                        "Add First Property"
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                    lineNumber: 335,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                lineNumber: 334,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                        lineNumber: 329,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                    lineNumber: 328,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
            lineNumber: 323,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex items-center justify-between",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                                    children: "Recent Properties"
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                    lineNumber: 351,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardDescription"], {
                                    children: "Your recently added properties"
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                    lineNumber: 352,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                            lineNumber: 350,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: "/properties",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Button"], {
                                variant: "ghost",
                                size: "sm",
                                children: [
                                    "View all",
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                        className: "ml-2 h-4 w-4"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                        lineNumber: 357,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                lineNumber: 355,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                            lineNumber: 354,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                    lineNumber: 349,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                lineNumber: 348,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "space-y-4",
                    children: properties.map((property)=>{
                        var _property_units;
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: "/properties/".concat(property.id),
                            className: "flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-accent",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__["Building2"], {
                                        className: "h-6 w-6 text-primary"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                        lineNumber: 371,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                    lineNumber: 370,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex-1 space-y-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm font-medium leading-none",
                                            children: property.name
                                        }, void 0, false, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                            lineNumber: 374,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-muted-foreground",
                                            children: property.address
                                        }, void 0, false, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                            lineNumber: 377,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                    lineNumber: 373,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "text-right",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm font-medium",
                                            children: [
                                                ((_property_units = property.units) === null || _property_units === void 0 ? void 0 : _property_units.length) || 0,
                                                " units"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                            lineNumber: 382,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
                                            variant: "secondary",
                                            className: "text-xs",
                                            children: property.propertyType
                                        }, void 0, false, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                            lineNumber: 385,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                    lineNumber: 381,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, property.id, true, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                            lineNumber: 365,
                            columnNumber: 13
                        }, this);
                    })
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                    lineNumber: 363,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                lineNumber: 362,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
        lineNumber: 347,
        columnNumber: 5
    }, this);
}
_s3(RecentProperties, "XVw4yBrV3jfL2RSvYbLbWx8Srwo=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$hooks$2f$api$2f$use$2d$properties$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useProperties"]
    ];
});
_c2 = RecentProperties;
function QuickActions() {
    const actions = [
        {
            label: 'Add Property',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$building$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Building2$3e$__["Building2"],
            href: '/properties/new',
            color: 'bg-blue-500',
            description: 'Register a new property'
        },
        {
            label: 'Add Tenant',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"],
            href: '/tenants/new',
            color: 'bg-green-500',
            description: 'Add a new tenant'
        },
        {
            label: 'Create Lease',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"],
            href: '/leases/new',
            color: 'bg-purple-500',
            description: 'Create a new lease'
        },
        {
            label: 'New Request',
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wrench$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wrench$3e$__["Wrench"],
            href: '/maintenance/new',
            color: 'bg-orange-500',
            description: 'Submit maintenance request'
        }
    ];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Card"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardHeader"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardTitle"], {
                        children: "Quick Actions"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                        lineNumber: 433,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardDescription"], {
                        children: "Common tasks and actions"
                    }, void 0, false, {
                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                        lineNumber: 434,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                lineNumber: 432,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$components$2f$ui$2f$card$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CardContent"], {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid gap-2 sm:grid-cols-2",
                    children: actions.map((action)=>{
                        const Icon = action.icon;
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                            href: action.href,
                            className: "group flex items-center gap-3 rounded-lg border p-3 transition-all hover:border-primary/50 hover:bg-accent",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex h-10 w-10 items-center justify-center rounded-lg text-white transition-transform group-hover:scale-110", action.color),
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                        className: "h-5 w-5"
                                    }, void 0, false, {
                                        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                        lineNumber: 450,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                    lineNumber: 446,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm font-medium",
                                            children: action.label
                                        }, void 0, false, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                            lineNumber: 453,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-muted-foreground",
                                            children: action.description
                                        }, void 0, false, {
                                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                            lineNumber: 454,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                    lineNumber: 452,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowRight$3e$__["ArrowRight"], {
                                    className: "h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                                }, void 0, false, {
                                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                                    lineNumber: 458,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, action.label, true, {
                            fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                            lineNumber: 441,
                            columnNumber: 15
                        }, this);
                    })
                }, void 0, false, {
                    fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                    lineNumber: 437,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
                lineNumber: 436,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/apps/frontend/src/components/dashboard/dashboard-client.tsx",
        lineNumber: 431,
        columnNumber: 5
    }, this);
}
_c3 = QuickActions;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "OnboardingBanner");
__turbopack_context__.k.register(_c1, "DashboardStats");
__turbopack_context__.k.register(_c2, "RecentProperties");
__turbopack_context__.k.register(_c3, "QuickActions");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
}]);

//# sourceMappingURL=_559ddf0f._.js.map
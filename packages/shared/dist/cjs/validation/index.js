"use strict";
/**
 * Shared validation schemas for TenantFlow
 * Common Zod schemas used across frontend and backend
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createListResponseSchema = exports.createApiResponseSchema = exports.createPaginatedResponseSchema = exports.errorResponseSchema = exports.successResponseSchema = exports.webhookDeliverySchema = exports.webhookEventSchema = exports.bulkResponseSchema = exports.bulkOperationSchema = exports.baseQuerySchema = exports.timeRangeSchema = exports.advancedSearchSchema = exports.sortSchema = exports.coordinatesSchema = exports.addressSchema = exports.uploadedFileSchema = exports.fileSizeSchema = exports.fileTypeSchema = exports.urlSchema = exports.percentageSchema = exports.currencyAmountSchema = exports.phoneSchema = exports.serverActionResponseSchema = exports.formActionStateSchema = exports.actionStateSchema = exports.paginationResponseSchema = exports.paginationQuerySchema = exports.paginationSchema = exports.dateStringSchema = exports.nonNegativeNumberSchema = exports.positiveNumberSchema = exports.nonEmptyStringSchema = exports.emailSchema = exports.uuidSchema = void 0;
__exportStar(require("./common"), exports);
// Re-export specific schemas that are commonly used
var common_1 = require("./common");
Object.defineProperty(exports, "uuidSchema", { enumerable: true, get: function () { return common_1.uuidSchema; } });
Object.defineProperty(exports, "emailSchema", { enumerable: true, get: function () { return common_1.emailSchema; } });
Object.defineProperty(exports, "nonEmptyStringSchema", { enumerable: true, get: function () { return common_1.nonEmptyStringSchema; } });
Object.defineProperty(exports, "positiveNumberSchema", { enumerable: true, get: function () { return common_1.positiveNumberSchema; } });
Object.defineProperty(exports, "nonNegativeNumberSchema", { enumerable: true, get: function () { return common_1.nonNegativeNumberSchema; } });
Object.defineProperty(exports, "dateStringSchema", { enumerable: true, get: function () { return common_1.dateStringSchema; } });
// Pagination schemas
Object.defineProperty(exports, "paginationSchema", { enumerable: true, get: function () { return common_1.paginationSchema; } });
Object.defineProperty(exports, "paginationQuerySchema", { enumerable: true, get: function () { return common_1.paginationQuerySchema; } });
Object.defineProperty(exports, "paginationResponseSchema", { enumerable: true, get: function () { return common_1.paginationResponseSchema; } });
// React 19 Action State schemas
Object.defineProperty(exports, "actionStateSchema", { enumerable: true, get: function () { return common_1.actionStateSchema; } });
Object.defineProperty(exports, "formActionStateSchema", { enumerable: true, get: function () { return common_1.formActionStateSchema; } });
Object.defineProperty(exports, "serverActionResponseSchema", { enumerable: true, get: function () { return common_1.serverActionResponseSchema; } });
// Enhanced common schemas
Object.defineProperty(exports, "phoneSchema", { enumerable: true, get: function () { return common_1.phoneSchema; } });
Object.defineProperty(exports, "currencyAmountSchema", { enumerable: true, get: function () { return common_1.currencyAmountSchema; } });
Object.defineProperty(exports, "percentageSchema", { enumerable: true, get: function () { return common_1.percentageSchema; } });
Object.defineProperty(exports, "urlSchema", { enumerable: true, get: function () { return common_1.urlSchema; } });
Object.defineProperty(exports, "fileTypeSchema", { enumerable: true, get: function () { return common_1.fileTypeSchema; } });
Object.defineProperty(exports, "fileSizeSchema", { enumerable: true, get: function () { return common_1.fileSizeSchema; } });
Object.defineProperty(exports, "uploadedFileSchema", { enumerable: true, get: function () { return common_1.uploadedFileSchema; } });
Object.defineProperty(exports, "addressSchema", { enumerable: true, get: function () { return common_1.addressSchema; } });
Object.defineProperty(exports, "coordinatesSchema", { enumerable: true, get: function () { return common_1.coordinatesSchema; } });
// Query schemas
Object.defineProperty(exports, "sortSchema", { enumerable: true, get: function () { return common_1.sortSchema; } });
Object.defineProperty(exports, "advancedSearchSchema", { enumerable: true, get: function () { return common_1.advancedSearchSchema; } });
Object.defineProperty(exports, "timeRangeSchema", { enumerable: true, get: function () { return common_1.timeRangeSchema; } });
Object.defineProperty(exports, "baseQuerySchema", { enumerable: true, get: function () { return common_1.baseQuerySchema; } });
// Bulk operation schemas
Object.defineProperty(exports, "bulkOperationSchema", { enumerable: true, get: function () { return common_1.bulkOperationSchema; } });
Object.defineProperty(exports, "bulkResponseSchema", { enumerable: true, get: function () { return common_1.bulkResponseSchema; } });
// Webhook schemas
Object.defineProperty(exports, "webhookEventSchema", { enumerable: true, get: function () { return common_1.webhookEventSchema; } });
Object.defineProperty(exports, "webhookDeliverySchema", { enumerable: true, get: function () { return common_1.webhookDeliverySchema; } });
// Response schemas
Object.defineProperty(exports, "successResponseSchema", { enumerable: true, get: function () { return common_1.successResponseSchema; } });
Object.defineProperty(exports, "errorResponseSchema", { enumerable: true, get: function () { return common_1.errorResponseSchema; } });
// Utility functions
Object.defineProperty(exports, "createPaginatedResponseSchema", { enumerable: true, get: function () { return common_1.createPaginatedResponseSchema; } });
Object.defineProperty(exports, "createApiResponseSchema", { enumerable: true, get: function () { return common_1.createApiResponseSchema; } });
Object.defineProperty(exports, "createListResponseSchema", { enumerable: true, get: function () { return common_1.createListResponseSchema; } });
//# sourceMappingURL=index.js.map
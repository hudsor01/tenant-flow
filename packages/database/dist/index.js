"use strict";
// Database package now serves as a re-export of Supabase types from shared
// This maintains backward compatibility while removing Prisma dependency
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
exports.checkDatabaseConnection = exports.CustomerInvoiceStatus = exports.BlogStatus = exports.BlogCategory = exports.ReminderStatus = exports.ReminderType = exports.ActivityEntityType = exports.DocumentType = exports.PlanType = exports.SubStatus = exports.RequestStatus = exports.Priority = exports.LeaseStatus = exports.UnitStatus = exports.PropertyType = exports.UserRole = exports.PrismaClientValidationError = exports.PrismaClientInitializationError = exports.PrismaClientRustPanicError = exports.PrismaClientUnknownRequestError = exports.PrismaClientKnownRequestError = exports.Prisma = exports.PrismaClient = void 0;
// Re-export all database types from shared Supabase types
__exportStar(require("@repo/shared/types/supabase-generated"), exports);
// Export Prisma compatibility layer for gradual migration
var prisma_compat_1 = require("./prisma-compat");
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return prisma_compat_1.PrismaClient; } });
Object.defineProperty(exports, "Prisma", { enumerable: true, get: function () { return prisma_compat_1.Prisma; } });
Object.defineProperty(exports, "PrismaClientKnownRequestError", { enumerable: true, get: function () { return prisma_compat_1.PrismaClientKnownRequestError; } });
Object.defineProperty(exports, "PrismaClientUnknownRequestError", { enumerable: true, get: function () { return prisma_compat_1.PrismaClientUnknownRequestError; } });
Object.defineProperty(exports, "PrismaClientRustPanicError", { enumerable: true, get: function () { return prisma_compat_1.PrismaClientRustPanicError; } });
Object.defineProperty(exports, "PrismaClientInitializationError", { enumerable: true, get: function () { return prisma_compat_1.PrismaClientInitializationError; } });
Object.defineProperty(exports, "PrismaClientValidationError", { enumerable: true, get: function () { return prisma_compat_1.PrismaClientValidationError; } });
// Export enum values as constants
Object.defineProperty(exports, "UserRole", { enumerable: true, get: function () { return prisma_compat_1.UserRole; } });
Object.defineProperty(exports, "PropertyType", { enumerable: true, get: function () { return prisma_compat_1.PropertyType; } });
Object.defineProperty(exports, "UnitStatus", { enumerable: true, get: function () { return prisma_compat_1.UnitStatus; } });
Object.defineProperty(exports, "LeaseStatus", { enumerable: true, get: function () { return prisma_compat_1.LeaseStatus; } });
Object.defineProperty(exports, "Priority", { enumerable: true, get: function () { return prisma_compat_1.Priority; } });
Object.defineProperty(exports, "RequestStatus", { enumerable: true, get: function () { return prisma_compat_1.RequestStatus; } });
Object.defineProperty(exports, "SubStatus", { enumerable: true, get: function () { return prisma_compat_1.SubStatus; } });
Object.defineProperty(exports, "PlanType", { enumerable: true, get: function () { return prisma_compat_1.PlanType; } });
Object.defineProperty(exports, "DocumentType", { enumerable: true, get: function () { return prisma_compat_1.DocumentType; } });
Object.defineProperty(exports, "ActivityEntityType", { enumerable: true, get: function () { return prisma_compat_1.ActivityEntityType; } });
Object.defineProperty(exports, "ReminderType", { enumerable: true, get: function () { return prisma_compat_1.ReminderType; } });
Object.defineProperty(exports, "ReminderStatus", { enumerable: true, get: function () { return prisma_compat_1.ReminderStatus; } });
Object.defineProperty(exports, "BlogCategory", { enumerable: true, get: function () { return prisma_compat_1.BlogCategory; } });
Object.defineProperty(exports, "BlogStatus", { enumerable: true, get: function () { return prisma_compat_1.BlogStatus; } });
Object.defineProperty(exports, "CustomerInvoiceStatus", { enumerable: true, get: function () { return prisma_compat_1.CustomerInvoiceStatus; } });
// Export health check utilities
var health_1 = require("./health");
Object.defineProperty(exports, "checkDatabaseConnection", { enumerable: true, get: function () { return health_1.checkDatabaseConnection; } });
//# sourceMappingURL=index.js.map
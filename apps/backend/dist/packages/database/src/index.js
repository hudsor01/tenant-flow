"use strict";
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
exports.checkDatabaseConnection = exports.PrismaClientValidationError = exports.PrismaClientInitializationError = exports.PrismaClientRustPanicError = exports.PrismaClientUnknownRequestError = exports.PrismaClientKnownRequestError = exports.PrismaClient = exports.CustomerInvoiceStatus = exports.BlogStatus = exports.BlogCategory = exports.ReminderStatus = exports.ReminderType = exports.ActivityEntityType = exports.DocumentType = exports.PlanType = exports.SubStatus = exports.RequestStatus = exports.Priority = exports.LeaseStatus = exports.UnitStatus = exports.PropertyType = exports.UserRole = exports.Prisma = void 0;
__exportStar(require("./generated/client"), exports);
var client_1 = require("./generated/client");
Object.defineProperty(exports, "Prisma", { enumerable: true, get: function () { return client_1.Prisma; } });
var client_2 = require("./generated/client");
Object.defineProperty(exports, "UserRole", { enumerable: true, get: function () { return client_2.UserRole; } });
Object.defineProperty(exports, "PropertyType", { enumerable: true, get: function () { return client_2.PropertyType; } });
Object.defineProperty(exports, "UnitStatus", { enumerable: true, get: function () { return client_2.UnitStatus; } });
Object.defineProperty(exports, "LeaseStatus", { enumerable: true, get: function () { return client_2.LeaseStatus; } });
Object.defineProperty(exports, "Priority", { enumerable: true, get: function () { return client_2.Priority; } });
Object.defineProperty(exports, "RequestStatus", { enumerable: true, get: function () { return client_2.RequestStatus; } });
Object.defineProperty(exports, "SubStatus", { enumerable: true, get: function () { return client_2.SubStatus; } });
Object.defineProperty(exports, "PlanType", { enumerable: true, get: function () { return client_2.PlanType; } });
Object.defineProperty(exports, "DocumentType", { enumerable: true, get: function () { return client_2.DocumentType; } });
Object.defineProperty(exports, "ActivityEntityType", { enumerable: true, get: function () { return client_2.ActivityEntityType; } });
Object.defineProperty(exports, "ReminderType", { enumerable: true, get: function () { return client_2.ReminderType; } });
Object.defineProperty(exports, "ReminderStatus", { enumerable: true, get: function () { return client_2.ReminderStatus; } });
Object.defineProperty(exports, "BlogCategory", { enumerable: true, get: function () { return client_2.BlogCategory; } });
Object.defineProperty(exports, "BlogStatus", { enumerable: true, get: function () { return client_2.BlogStatus; } });
Object.defineProperty(exports, "CustomerInvoiceStatus", { enumerable: true, get: function () { return client_2.CustomerInvoiceStatus; } });
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_2.PrismaClient; } });
var library_1 = require("./generated/client/runtime/library");
Object.defineProperty(exports, "PrismaClientKnownRequestError", { enumerable: true, get: function () { return library_1.PrismaClientKnownRequestError; } });
Object.defineProperty(exports, "PrismaClientUnknownRequestError", { enumerable: true, get: function () { return library_1.PrismaClientUnknownRequestError; } });
Object.defineProperty(exports, "PrismaClientRustPanicError", { enumerable: true, get: function () { return library_1.PrismaClientRustPanicError; } });
Object.defineProperty(exports, "PrismaClientInitializationError", { enumerable: true, get: function () { return library_1.PrismaClientInitializationError; } });
Object.defineProperty(exports, "PrismaClientValidationError", { enumerable: true, get: function () { return library_1.PrismaClientValidationError; } });
var health_1 = require("./health");
Object.defineProperty(exports, "checkDatabaseConnection", { enumerable: true, get: function () { return health_1.checkDatabaseConnection; } });

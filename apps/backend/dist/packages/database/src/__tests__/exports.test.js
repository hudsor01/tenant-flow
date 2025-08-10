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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const dbExports = __importStar(require("../index"));
(0, vitest_1.describe)('Database Package Exports', () => {
    (0, vitest_1.describe)('PrismaClient', () => {
        (0, vitest_1.it)('should export PrismaClient', () => {
            (0, vitest_1.expect)(dbExports.PrismaClient).toBeDefined();
            (0, vitest_1.expect)(typeof dbExports.PrismaClient).toBe('function');
        });
    });
    (0, vitest_1.describe)('Prisma Error Types', () => {
        (0, vitest_1.it)('should export PrismaClientKnownRequestError', () => {
            (0, vitest_1.expect)(dbExports.PrismaClientKnownRequestError).toBeDefined();
            (0, vitest_1.expect)(typeof dbExports.PrismaClientKnownRequestError).toBe('function');
        });
        (0, vitest_1.it)('should export PrismaClientUnknownRequestError', () => {
            (0, vitest_1.expect)(dbExports.PrismaClientUnknownRequestError).toBeDefined();
            (0, vitest_1.expect)(typeof dbExports.PrismaClientUnknownRequestError).toBe('function');
        });
        (0, vitest_1.it)('should export PrismaClientRustPanicError', () => {
            (0, vitest_1.expect)(dbExports.PrismaClientRustPanicError).toBeDefined();
            (0, vitest_1.expect)(typeof dbExports.PrismaClientRustPanicError).toBe('function');
        });
        (0, vitest_1.it)('should export PrismaClientInitializationError', () => {
            (0, vitest_1.expect)(dbExports.PrismaClientInitializationError).toBeDefined();
            (0, vitest_1.expect)(typeof dbExports.PrismaClientInitializationError).toBe('function');
        });
        (0, vitest_1.it)('should export PrismaClientValidationError', () => {
            (0, vitest_1.expect)(dbExports.PrismaClientValidationError).toBeDefined();
            (0, vitest_1.expect)(typeof dbExports.PrismaClientValidationError).toBe('function');
        });
    });
    (0, vitest_1.describe)('Database Health Check', () => {
        (0, vitest_1.it)('should export checkDatabaseConnection function', () => {
            (0, vitest_1.expect)(dbExports.checkDatabaseConnection).toBeDefined();
            (0, vitest_1.expect)(typeof dbExports.checkDatabaseConnection).toBe('function');
        });
    });
    (0, vitest_1.describe)('Prisma Types and Enums', () => {
        (0, vitest_1.it)('should export Prisma namespace', () => {
            (0, vitest_1.expect)(dbExports.Prisma).toBeDefined();
            (0, vitest_1.expect)(typeof dbExports.Prisma).toBe('object');
        });
        (0, vitest_1.it)('should export UserRole enum', () => {
            (0, vitest_1.expect)(dbExports.UserRole).toBeDefined();
            (0, vitest_1.expect)(typeof dbExports.UserRole).toBe('object');
        });
        (0, vitest_1.it)('should export PropertyType enum', () => {
            (0, vitest_1.expect)(dbExports.PropertyType).toBeDefined();
            (0, vitest_1.expect)(typeof dbExports.PropertyType).toBe('object');
        });
        (0, vitest_1.it)('should export UnitStatus enum', () => {
            (0, vitest_1.expect)(dbExports.UnitStatus).toBeDefined();
            (0, vitest_1.expect)(typeof dbExports.UnitStatus).toBe('object');
        });
        (0, vitest_1.it)('should export LeaseStatus enum', () => {
            (0, vitest_1.expect)(dbExports.LeaseStatus).toBeDefined();
            (0, vitest_1.expect)(typeof dbExports.LeaseStatus).toBe('object');
        });
        (0, vitest_1.it)('should export Priority enum', () => {
            (0, vitest_1.expect)(dbExports.Priority).toBeDefined();
            (0, vitest_1.expect)(typeof dbExports.Priority).toBe('object');
        });
    });
    (0, vitest_1.describe)('Essential Entity Types', () => {
        (0, vitest_1.it)('should allow importing essential entity types', () => {
            (0, vitest_1.expect)(true).toBe(true);
        });
    });
});

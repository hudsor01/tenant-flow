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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
exports.SimpleSecurityService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
const bcrypt = __importStar(require("bcrypt"));
let SimpleSecurityService = class SimpleSecurityService {
    validatePassword(password) {
        const errors = [];
        if (!password || password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }
        if (/(.)\1{2,}/.test(password)) {
            errors.push('Password must not contain 3 or more repeated characters');
        }
        const commonPasswords = [
            'password', 'password123', 'admin', 'letmein', 'welcome',
            'qwerty', 'asdfgh', '123456789'
        ];
        if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
            errors.push('Password is too common');
        }
        return { valid: errors.length === 0, errors };
    }
    async hashPassword(password) {
        return bcrypt.hash(password, 12);
    }
    async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    validateJwtSecret(secret) {
        if (!secret || secret.length < 32) {
            return {
                valid: false,
                error: 'JWT secret must be at least 32 characters long'
            };
        }
        return { valid: true };
    }
    generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }
    sanitizeInput(input) {
        if (!input)
            return '';
        return input
            .replace(/\0/g, '')
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
            .trim();
    }
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const emailParts = email.split('@');
        const localPart = emailParts[0];
        return emailRegex.test(email) &&
            email.length <= 254 &&
            !email.includes('..') &&
            localPart !== undefined && localPart.length <= 64;
    }
    isSuspiciousInput(input) {
        const suspiciousPatterns = [
            /union.*select/i,
            /insert.*into/i,
            /delete.*from/i,
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
        ];
        return suspiciousPatterns.some(pattern => pattern.test(input));
    }
};
exports.SimpleSecurityService = SimpleSecurityService;
exports.SimpleSecurityService = SimpleSecurityService = __decorate([
    (0, common_1.Injectable)()
], SimpleSecurityService);

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
var SecurityUtils_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityUtils = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
const bcrypt = __importStar(require("bcrypt"));
let SecurityUtils = SecurityUtils_1 = class SecurityUtils {
    constructor() {
        this.logger = new common_1.Logger(SecurityUtils_1.name);
    }
    calculateEntropy(str) {
        const frequency = {};
        for (const char of str) {
            frequency[char] = (frequency[char] || 0) + 1;
        }
        let entropy = 0;
        const length = str.length;
        for (const char in frequency) {
            const count = frequency[char];
            if (count) {
                const probability = count / length;
                entropy -= probability * Math.log2(probability);
            }
        }
        return entropy;
    }
    validateJwtSecret(secret) {
        const errors = [];
        const warnings = [];
        const suggestions = [];
        if (!secret || secret.length < 32) {
            errors.push('JWT secret must be at least 32 characters long');
            suggestions.push('Generate with: openssl rand -base64 64');
            suggestions.push('Or use: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'base64\'))"');
        }
        if (secret && secret.length >= 32) {
            const entropy = this.calculateEntropy(secret);
            const bitsPerChar = entropy;
            if (bitsPerChar < 4.0) {
                warnings.push(`JWT secret has low entropy (${bitsPerChar.toFixed(2)} bits/char, recommended: 4.0+)`);
                suggestions.push('Consider using a more random secret for better security');
            }
            const hasUppercase = /[A-Z]/.test(secret);
            const hasLowercase = /[a-z]/.test(secret);
            const hasNumbers = /[0-9]/.test(secret);
            const hasSpecial = /[^A-Za-z0-9]/.test(secret);
            const diversityCount = [hasUppercase, hasLowercase, hasNumbers, hasSpecial].filter(Boolean).length;
            if (diversityCount < 3) {
                warnings.push('JWT secret should contain at least 3 of: uppercase, lowercase, numbers, special characters');
                suggestions.push('Mix different character types for stronger security');
            }
            if (/(.)\1{3,}/.test(secret)) {
                warnings.push('JWT secret contains repeated characters');
                suggestions.push('Avoid patterns and repeated characters');
            }
            if (/^[a-zA-Z]+$/.test(secret) || /^[0-9]+$/.test(secret)) {
                warnings.push('JWT secret uses only one character type');
                suggestions.push('Use a mix of letters, numbers, and special characters');
            }
        }
        const canProceed = !secret ? false : secret.length >= 32;
        return {
            valid: errors.length === 0 && warnings.length === 0,
            errors,
            warnings,
            canProceed,
            suggestions
        };
    }
    generateSecureJwtSecret(length = 64) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        const bytes = crypto.randomBytes(length);
        let secret = '';
        for (let i = 0; i < length; i++) {
            const byte = bytes[i];
            if (byte !== undefined) {
                secret += charset[byte % charset.length];
            }
        }
        return secret;
    }
    validatePassword(password) {
        const errors = [];
        let score = 0;
        if (!password) {
            errors.push('Password is required');
            return { valid: false, errors, score: 0 };
        }
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        else {
            score += 1;
            if (password.length >= 12)
                score += 1;
            if (password.length >= 16)
                score += 1;
            if (password.length >= 20)
                score += 1;
        }
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
        if (!hasUppercase)
            errors.push('Password must contain at least one uppercase letter');
        else
            score += 1;
        if (!hasLowercase)
            errors.push('Password must contain at least one lowercase letter');
        else
            score += 1;
        if (!hasNumbers)
            errors.push('Password must contain at least one number');
        else
            score += 1;
        if (!hasSpecial)
            errors.push('Password must contain at least one special character');
        else
            score += 1;
        if (/(.)\1{2,}/.test(password)) {
            errors.push('Password must not contain 3 or more repeated characters in a row');
            score -= 1;
        }
        const sequentialPatterns = [
            'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi', 'hij', 'ijk', 'jkl',
            'klm', 'lmn', 'mno', 'nop', 'opq', 'pqr', 'qrs', 'rst', 'stu', 'tuv',
            'uvw', 'vwx', 'wxy', 'xyz', '012', '123', '234', '345', '456', '567',
            '678', '789', '890'
        ];
        const lowerPassword = password.toLowerCase();
        for (const pattern of sequentialPatterns) {
            if (lowerPassword.includes(pattern) || lowerPassword.includes(pattern.split('').reverse().join(''))) {
                errors.push('Password must not contain sequential characters');
                score -= 1;
                break;
            }
        }
        const commonPasswords = [
            'password', 'password123', 'admin', 'letmein', 'welcome', 'monkey',
            'dragon', 'baseball', 'football', 'qwerty', 'asdfgh', 'zxcvbn',
            'trustno1', 'superman', 'iloveyou', 'sunshine', 'master', 'shadow'
        ];
        for (const common of commonPasswords) {
            if (lowerPassword.includes(common)) {
                errors.push('Password is too common or contains common words');
                score -= 2;
                break;
            }
        }
        const entropy = this.calculateEntropy(password);
        if (entropy < 3.0) {
            errors.push('Password has insufficient randomness');
            score -= 1;
        }
        else if (entropy > 4.5) {
            score += 2;
        }
        score = Math.max(0, Math.min(10, score));
        return {
            valid: errors.length === 0,
            errors,
            score
        };
    }
    async hashPassword(password) {
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }
    async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }
    sanitizeInput(input) {
        let sanitized = input.replace(/\0/g, '');
        sanitized = sanitized.trim();
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        return sanitized;
    }
    validateEmail(email) {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!emailRegex.test(email)) {
            return false;
        }
        const [localPart] = email.split('@');
        if (!localPart) {
            return false;
        }
        if (localPart.length > 64) {
            return false;
        }
        if (email.length > 254) {
            return false;
        }
        if (email.includes('..')) {
            return false;
        }
        return true;
    }
    createSecurityAuditLog(event) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            ...event,
            severity: this.getEventSeverity(event.type)
        };
        switch (logEntry.severity) {
            case 'critical':
            case 'high':
                this.logger.error(`SECURITY EVENT: ${JSON.stringify(logEntry)}`);
                break;
            case 'medium':
                this.logger.warn(`SECURITY EVENT: ${JSON.stringify(logEntry)}`);
                break;
            default:
                this.logger.log(`SECURITY EVENT: ${JSON.stringify(logEntry)}`);
        }
        return logEntry;
    }
    getEventSeverity(eventType) {
        const severityMap = {
            'AUTH_ATTEMPT': 'low',
            'AUTH_SUCCESS': 'low',
            'AUTH_FAILURE': 'medium',
            'PASSWORD_CHANGE': 'medium',
            'PERMISSION_DENIED': 'medium',
            'SUSPICIOUS_ACTIVITY': 'high',
            'RATE_LIMIT_EXCEEDED': 'medium',
            'SESSION_INVALIDATED': 'medium',
            'TOKEN_REFRESH': 'low',
            'ACCOUNT_LOCKED': 'high'
        };
        return severityMap[eventType] || 'low';
    }
};
exports.SecurityUtils = SecurityUtils;
exports.SecurityUtils = SecurityUtils = SecurityUtils_1 = __decorate([
    (0, common_1.Injectable)()
], SecurityUtils);

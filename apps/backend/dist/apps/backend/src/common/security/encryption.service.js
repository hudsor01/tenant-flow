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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = __importStar(require("crypto"));
let EncryptionService = class EncryptionService {
    constructor(configService) {
        this.configService = configService;
        this.algorithm = 'aes-256-gcm';
        this.authTagLength = 16;
        const keyString = this.configService.get('ENCRYPTION_KEY') ||
            crypto.randomBytes(32).toString('hex');
        this.key = Buffer.from(keyString.slice(0, 64), 'hex');
    }
    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv, { authTagLength: this.authTagLength });
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        if (authTag.length !== this.authTagLength) {
            throw new Error(`Authentication tag length mismatch: expected ${this.authTagLength} bytes, got ${authTag.length} bytes`);
        }
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }
    decrypt(encrypted, iv, authTag) {
        const authTagBuffer = Buffer.from(authTag, 'hex');
        if (authTagBuffer.length !== this.authTagLength) {
            throw new Error(`Invalid authentication tag length: expected ${this.authTagLength} bytes, got ${authTagBuffer.length} bytes. ` +
                `This may indicate tampering or use of non-standard tag lengths (CWE-310).`);
        }
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, Buffer.from(iv, 'hex'), { authTagLength: this.authTagLength });
        decipher.setAuthTag(authTagBuffer);
        try {
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('auth')) {
                throw new Error('Authentication tag verification failed: data may have been tampered with');
            }
            throw error;
        }
    }
    encryptSSN(ssn) {
        if (!ssn)
            return '';
        const { encrypted, iv, authTag } = this.encrypt(ssn);
        return `${encrypted}:${iv}:${authTag}`;
    }
    decryptSSN(encryptedSSN) {
        if (!encryptedSSN)
            return '';
        const parts = encryptedSSN.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted SSN format: expected format is encrypted:iv:authTag');
        }
        const [encrypted, iv, authTag] = parts;
        if (!encrypted || !iv || !authTag) {
            throw new Error('Invalid encrypted SSN: missing encryption components');
        }
        if (iv.length !== 32) {
            throw new Error('Invalid IV length in encrypted SSN');
        }
        if (authTag.length !== 32) {
            throw new Error('Invalid authentication tag length in encrypted SSN');
        }
        try {
            return this.decrypt(encrypted, iv, authTag);
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to decrypt SSN: ${error.message}`);
            }
            throw error;
        }
    }
};
exports.EncryptionService = EncryptionService;
exports.EncryptionService = EncryptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EncryptionService);

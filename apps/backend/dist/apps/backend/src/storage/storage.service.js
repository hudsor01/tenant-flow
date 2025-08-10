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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var StorageService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
const error_handler_service_1 = require("../common/errors/error-handler.service");
const path = __importStar(require("path"));
let StorageService = StorageService_1 = class StorageService {
    constructor(configService, errorHandler) {
        this.configService = configService;
        this.errorHandler = errorHandler;
        this.logger = new common_1.Logger(StorageService_1.name);
        const supabaseUrl = this.configService.get('SUPABASE_URL');
        const supabaseServiceKey = this.configService.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!supabaseUrl || !supabaseServiceKey) {
            throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.BAD_REQUEST, 'Supabase configuration missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required', { operation: 'constructor', resource: 'storage' });
        }
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
    }
    validateFilePath(filePath) {
        const sanitized = filePath.replace(/\.\./g, '').replace(/\/\//g, '/');
        const normalized = path.normalize(sanitized);
        if (normalized.startsWith('../') || normalized.includes('/../') || normalized === '..') {
            throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.BAD_REQUEST, 'Invalid file path detected', { operation: 'validateFilePath', resource: 'file' });
        }
        return normalized.startsWith('/') ? normalized.slice(1) : normalized;
    }
    validateFileName(filename) {
        const hasControlChars = Array.from(filename).some(char => {
            const code = char.charCodeAt(0);
            return code >= 0 && code <= 31;
        });
        const hasDangerousChars = /[<>:"|?*]/.test(filename);
        const dangerousExtensions = /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|php|asp|aspx|jsp)$/i;
        if (hasControlChars || hasDangerousChars || dangerousExtensions.test(filename)) {
            throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.BAD_REQUEST, 'Invalid file name or extension', { operation: 'validateFileName', resource: 'file' });
        }
        return filename;
    }
    async uploadFile(bucket, filePath, file, options) {
        const safePath = this.validateFilePath(filePath);
        const filename = path.basename(safePath);
        this.validateFileName(filename);
        const { error } = await this.supabase.storage
            .from(bucket)
            .upload(safePath, file, {
            contentType: options?.contentType,
            cacheControl: options?.cacheControl || '3600',
            upsert: options?.upsert || false
        });
        if (error) {
            this.logger.error('Storage upload failed', { error: error.message, path: safePath, bucket });
            throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.STORAGE_ERROR, 'Failed to upload file', { operation: 'uploadFile', resource: 'file', metadata: { bucket, path: safePath, error: error.message } });
        }
        const publicUrl = this.getPublicUrl(bucket, safePath);
        return {
            url: publicUrl,
            path: safePath,
            filename: safePath.split('/').pop() || safePath,
            size: file.length,
            mimeType: options?.contentType || 'application/octet-stream',
            bucket
        };
    }
    getPublicUrl(bucket, path) {
        const { data } = this.supabase.storage
            .from(bucket)
            .getPublicUrl(path);
        return data.publicUrl;
    }
    async deleteFile(bucket, filePath) {
        const safePath = this.validateFilePath(filePath);
        const { error } = await this.supabase.storage
            .from(bucket)
            .remove([safePath]);
        if (error) {
            this.logger.error('Storage delete failed', { error: error.message, path: safePath, bucket });
            throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.STORAGE_ERROR, 'Failed to delete file', { operation: 'deleteFile', resource: 'file', metadata: { bucket, path: safePath, error: error.message } });
        }
        return true;
    }
    async listFiles(bucket, folder) {
        const { data, error } = await this.supabase.storage
            .from(bucket)
            .list(folder);
        if (error) {
            this.logger.error('Storage list failed', { error: error.message, bucket, folder });
            throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.STORAGE_ERROR, 'Failed to list files', { operation: 'listFiles', resource: 'file', metadata: { bucket, folder: folder || null, error: error.message } });
        }
        return data;
    }
    generateUniqueFilename(originalName) {
        const timestamp = Date.now();
        const uniqueId = crypto.randomUUID().substring(0, 8);
        const extension = originalName.split('.').pop();
        const baseName = originalName.replace(/\.[^/.]+$/, "");
        return `${baseName}-${timestamp}-${uniqueId}.${extension}`;
    }
    getStoragePath(entityType, entityId, filename) {
        const uniqueFilename = this.generateUniqueFilename(filename);
        return `${entityType}/${entityId}/${uniqueFilename}`;
    }
    getBucket(fileType) {
        switch (fileType) {
            case 'avatar':
                return 'avatars';
            case 'image':
                return 'property-images';
            case 'document':
            default:
                return 'documents';
        }
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = StorageService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(config_1.ConfigService)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        error_handler_service_1.ErrorHandlerService])
], StorageService);

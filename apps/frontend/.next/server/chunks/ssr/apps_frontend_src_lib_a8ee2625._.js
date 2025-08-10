module.exports = {

"[project]/apps/frontend/src/lib/constants/priority-levels.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

/**
 * Shared priority/severity level constants
 * Used across notifications, security logging, and maintenance systems
 */ __turbopack_context__.s({
    "PRIORITY_COLORS": ()=>PRIORITY_COLORS,
    "PRIORITY_LABELS": ()=>PRIORITY_LABELS,
    "PRIORITY_LEVELS": ()=>PRIORITY_LEVELS,
    "Priority": ()=>Priority,
    "SecurityEventSeverity": ()=>SecurityEventSeverity
});
const PRIORITY_LEVELS = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL',
    EMERGENCY: 'EMERGENCY'
};
const PRIORITY_LABELS = {
    EMERGENCY: 'EMERGENCY',
    CRITICAL: 'Critical',
    HIGH: 'High Priority',
    MEDIUM: 'Medium Priority',
    LOW: 'Low Priority'
};
const PRIORITY_COLORS = {
    EMERGENCY: 'bg-red-100 text-red-800',
    CRITICAL: 'bg-red-100 text-red-800',
    HIGH: 'bg-orange-100 text-orange-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-green-100 text-green-800'
};
const SecurityEventSeverity = PRIORITY_LEVELS;
const Priority = PRIORITY_LEVELS;
}),
"[project]/apps/frontend/src/lib/security/security-logger.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

/**
 * Enterprise Security Event Logging and Monitoring System
 * Comprehensive security event tracking with threat detection
 * GDPR compliant with data retention and anonymization
 */ __turbopack_context__.s({
    "SecurityEventSeverity": ()=>SecurityEventSeverity,
    "SecurityEventType": ()=>SecurityEventType,
    "SecurityLogger": ()=>SecurityLogger,
    "securityLogger": ()=>securityLogger
});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$constants$2f$priority$2d$levels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/constants/priority-levels.ts [app-rsc] (ecmascript)");
var SecurityEventType = /*#__PURE__*/ function(SecurityEventType) {
    // Authentication Events
    SecurityEventType["LOGIN_SUCCESS"] = "LOGIN_SUCCESS";
    SecurityEventType["LOGIN_FAILURE"] = "LOGIN_FAILURE";
    SecurityEventType["LOGOUT"] = "LOGOUT";
    SecurityEventType["SESSION_CREATED"] = "SESSION_CREATED";
    SecurityEventType["SESSION_DESTROYED"] = "SESSION_DESTROYED";
    SecurityEventType["SESSION_EXPIRED"] = "SESSION_EXPIRED";
    SecurityEventType["SESSION_REFRESHED"] = "SESSION_REFRESHED";
    SecurityEventType["SESSION_TERMINATED"] = "SESSION_TERMINATED";
    SecurityEventType["SESSION_HIJACK_ATTEMPT"] = "SESSION_HIJACK_ATTEMPT";
    // Authorization Events
    SecurityEventType["UNAUTHORIZED_ACCESS_ATTEMPT"] = "UNAUTHORIZED_ACCESS_ATTEMPT";
    SecurityEventType["RBAC_ACCESS_DENIED"] = "RBAC_ACCESS_DENIED";
    SecurityEventType["PRIVILEGE_ESCALATION_ATTEMPT"] = "PRIVILEGE_ESCALATION_ATTEMPT";
    SecurityEventType["AUTHENTICATED_ACCESS"] = "AUTHENTICATED_ACCESS";
    // Token and Security Events
    SecurityEventType["INVALID_JWT_TOKEN"] = "INVALID_JWT_TOKEN";
    SecurityEventType["TOKEN_NEAR_EXPIRATION"] = "TOKEN_NEAR_EXPIRATION";
    SecurityEventType["CSRF_TOKEN_MISMATCH"] = "CSRF_TOKEN_MISMATCH";
    SecurityEventType["CSRF_TOKEN_MISSING"] = "CSRF_TOKEN_MISSING";
    // Attack Detection
    SecurityEventType["SUSPICIOUS_REQUEST_PATTERN"] = "SUSPICIOUS_REQUEST_PATTERN";
    SecurityEventType["XSS_ATTEMPT"] = "XSS_ATTEMPT";
    SecurityEventType["SQL_INJECTION_ATTEMPT"] = "SQL_INJECTION_ATTEMPT";
    SecurityEventType["PATH_TRAVERSAL_ATTEMPT"] = "PATH_TRAVERSAL_ATTEMPT";
    SecurityEventType["COMMAND_INJECTION_ATTEMPT"] = "COMMAND_INJECTION_ATTEMPT";
    SecurityEventType["BRUTE_FORCE_ATTEMPT"] = "BRUTE_FORCE_ATTEMPT";
    // Rate Limiting
    SecurityEventType["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    SecurityEventType["SUSPICIOUS_RATE_PATTERN"] = "SUSPICIOUS_RATE_PATTERN";
    // File and Upload Security
    SecurityEventType["MALICIOUS_FILE_UPLOAD"] = "MALICIOUS_FILE_UPLOAD";
    SecurityEventType["FILE_TYPE_VIOLATION"] = "FILE_TYPE_VIOLATION";
    SecurityEventType["FILE_SIZE_VIOLATION"] = "FILE_SIZE_VIOLATION";
    // System Events
    SecurityEventType["MIDDLEWARE_ERROR"] = "MIDDLEWARE_ERROR";
    SecurityEventType["SECURITY_CONFIG_CHANGE"] = "SECURITY_CONFIG_CHANGE";
    SecurityEventType["BOT_ACCESS"] = "BOT_ACCESS";
    SecurityEventType["SUSPICIOUS_ACTIVITY"] = "SUSPICIOUS_ACTIVITY";
    // Data Protection
    SecurityEventType["PII_ACCESS"] = "PII_ACCESS";
    SecurityEventType["DATA_EXPORT"] = "DATA_EXPORT";
    SecurityEventType["GDPR_REQUEST"] = "GDPR_REQUEST";
    return SecurityEventType;
}({});
;
const SecurityEventSeverity = __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$constants$2f$priority$2d$levels$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PRIORITY_LEVELS"];
class SecurityLogger {
    static instance;
    events = [];
    maxEvents = 10000;
    static getInstance() {
        if (!SecurityLogger.instance) {
            SecurityLogger.instance = new SecurityLogger();
        }
        return SecurityLogger.instance;
    }
    async logSecurityEvent(event) {
        const enhancedEvent = {
            ...event,
            severity: this.calculateSeverity({
                ...event,
                severity: undefined
            }),
            timestamp: event.timestamp || new Date().toISOString()
        };
        this.events.push(enhancedEvent);
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents / 2);
        }
        const logLevel = this.getLogLevel(enhancedEvent.severity);
        const logData = {
            timestamp: enhancedEvent.timestamp,
            type: enhancedEvent.type,
            severity: enhancedEvent.severity,
            ip: enhancedEvent.ip,
            userId: enhancedEvent.userId,
            path: enhancedEvent.path,
            reason: enhancedEvent.reason
        };
        console[logLevel]('[SECURITY]', JSON.stringify(logData, null, 2));
    }
    calculateSeverity(event) {
        const criticalEvents = [
            "SESSION_HIJACK_ATTEMPT",
            "SQL_INJECTION_ATTEMPT",
            "COMMAND_INJECTION_ATTEMPT"
        ];
        const highEvents = [
            "BRUTE_FORCE_ATTEMPT",
            "XSS_ATTEMPT",
            "PATH_TRAVERSAL_ATTEMPT"
        ];
        if (criticalEvents.includes(event.type)) {
            return SecurityEventSeverity.CRITICAL;
        }
        if (highEvents.includes(event.type)) {
            return SecurityEventSeverity.HIGH;
        }
        return SecurityEventSeverity.MEDIUM;
    }
    getLogLevel(severity) {
        switch(severity){
            case SecurityEventSeverity.CRITICAL:
            case SecurityEventSeverity.HIGH:
                return 'error';
            case SecurityEventSeverity.MEDIUM:
                return 'warn';
            default:
                return 'log';
        }
    }
    getRecentEvents(limit = 50) {
        return this.events.sort((a, b)=>new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
    }
}
const securityLogger = SecurityLogger.getInstance();
}),
"[project]/apps/frontend/src/lib/security/file-upload-security.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

/**
 * Enterprise File Upload Security System
 * Comprehensive protection against malicious file uploads
 * Multi-layer validation with virus scanning and content analysis
 */ __turbopack_context__.s({
    "getFileConfig": ()=>getFileConfig,
    "quarantineFile": ()=>quarantineFile,
    "updateFileConfig": ()=>updateFileConfig,
    "validateFile": ()=>validateFile,
    "validateMultipleFiles": ()=>validateMultipleFiles
});
var __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$security$2f$security$2d$logger$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/apps/frontend/src/lib/security/security-logger.ts [app-rsc] (ecmascript)");
;
// File type configurations for different contexts
const FILE_CONFIGS = {
    // Property documents (contracts, leases, etc.)
    documents: {
        maxFileSize: 50 * 1024 * 1024,
        allowedMimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv'
        ],
        allowedExtensions: [
            '.pdf',
            '.doc',
            '.docx',
            '.xls',
            '.xlsx',
            '.txt',
            '.csv'
        ],
        allowedMagicNumbers: {
            'pdf': [
                [
                    0x25,
                    0x50,
                    0x44,
                    0x46
                ]
            ],
            'docx': [
                [
                    0x50,
                    0x4B,
                    0x03,
                    0x04
                ]
            ],
            'doc': [
                [
                    0xD0,
                    0xCF,
                    0x11,
                    0xE0
                ]
            ],
            'txt': [
                []
            ]
        },
        scanForMalware: true,
        validateContent: true,
        quarantineOnSuspicion: true
    },
    // Property images
    images: {
        maxFileSize: 20 * 1024 * 1024,
        allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/svg+xml'
        ],
        allowedExtensions: [
            '.jpg',
            '.jpeg',
            '.png',
            '.webp',
            '.gif',
            '.svg'
        ],
        allowedMagicNumbers: {
            'jpeg': [
                [
                    0xFF,
                    0xD8,
                    0xFF
                ]
            ],
            'png': [
                [
                    0x89,
                    0x50,
                    0x4E,
                    0x47,
                    0x0D,
                    0x0A,
                    0x1A,
                    0x0A
                ]
            ],
            'webp': [
                [
                    0x52,
                    0x49,
                    0x46,
                    0x46
                ]
            ],
            'gif': [
                [
                    0x47,
                    0x49,
                    0x46,
                    0x38
                ]
            ],
            'svg': []
        },
        scanForMalware: true,
        validateContent: true,
        quarantineOnSuspicion: true
    },
    // User profile pictures (stricter)
    avatar: {
        maxFileSize: 5 * 1024 * 1024,
        allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/webp'
        ],
        allowedExtensions: [
            '.jpg',
            '.jpeg',
            '.png',
            '.webp'
        ],
        allowedMagicNumbers: {
            'jpeg': [
                [
                    0xFF,
                    0xD8,
                    0xFF
                ]
            ],
            'png': [
                [
                    0x89,
                    0x50,
                    0x4E,
                    0x47,
                    0x0D,
                    0x0A,
                    0x1A,
                    0x0A
                ]
            ],
            'webp': [
                [
                    0x52,
                    0x49,
                    0x46,
                    0x46
                ]
            ]
        },
        scanForMalware: true,
        validateContent: true,
        quarantineOnSuspicion: true
    },
    // Maintenance request attachments
    maintenance: {
        maxFileSize: 25 * 1024 * 1024,
        allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf',
            'video/mp4',
            'video/quicktime',
            'video/x-msvideo'
        ],
        allowedExtensions: [
            '.jpg',
            '.jpeg',
            '.png',
            '.webp',
            '.pdf',
            '.mp4',
            '.mov',
            '.avi'
        ],
        allowedMagicNumbers: {
            'jpeg': [
                [
                    0xFF,
                    0xD8,
                    0xFF
                ]
            ],
            'png': [
                [
                    0x89,
                    0x50,
                    0x4E,
                    0x47,
                    0x0D,
                    0x0A,
                    0x1A,
                    0x0A
                ]
            ],
            'webp': [
                [
                    0x52,
                    0x49,
                    0x46,
                    0x46
                ]
            ],
            'pdf': [
                [
                    0x25,
                    0x50,
                    0x44,
                    0x46
                ]
            ],
            'mp4': [
                [
                    0x00,
                    0x00,
                    0x00,
                    0x18,
                    0x66,
                    0x74,
                    0x79,
                    0x70
                ]
            ]
        },
        scanForMalware: true,
        validateContent: true,
        quarantineOnSuspicion: true
    }
};
// Dangerous file patterns to always block
const DANGEROUS_PATTERNS = [
    // Executable files
    /\.(exe|bat|cmd|scr|pif|com|jar|msi|deb|rpm|dmg|app)$/i,
    // Scripts
    /\.(js|vbs|vbe|jse|ws|wsf|wsc|wsh|ps1|php|py|rb|pl|sh)$/i,
    // Archives that might contain malware
    /\.(rar|7z|tar\.gz|tar\.bz2)$/i,
    // Double extensions (common malware trick)
    /\.\w+\.(exe|bat|cmd|scr|pif|com)$/i,
    // Hidden extensions
    /\.\w+\s+\.(exe|bat|cmd|scr|pif|com)$/i
];
// Suspicious filename patterns
const SUSPICIOUS_NAME_PATTERNS = [
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i,
    /[<>:"|?*\\\/]/g,
    /^\./,
    /\s{2,}/,
    /[\x00-\x1f\x7f-\x9f]/
];
async function validateFile(file, context = 'documents', userId) {
    const config = FILE_CONFIGS[context];
    const result = {
        valid: true,
        errors: [],
        warnings: [],
        fileInfo: {
            name: file.name,
            size: file.size,
            type: file.type,
            extension: getFileExtension(file.name)
        },
        securityFlags: {
            containsScript: false,
            containsMacros: false,
            potentialMalware: false,
            suspiciousName: false,
            oversized: false
        }
    };
    try {
        // 1. Basic file info validation
        await validateBasicInfo(file, config, result);
        // 2. File signature (magic number) validation
        await validateFileSignature(file, config, result);
        // 3. Content analysis
        if (config.validateContent) {
            await validateFileContent(file, config, result);
        }
        // 4. Malware scanning (simplified - in production use proper antivirus)
        if (config.scanForMalware) {
            await scanForMalware(file, config, result);
        }
        // 5. Security flags analysis
        analyzeSecurityFlags(result);
        // 6. Generate file hash for integrity verification
        result.fileInfo.hash = await generateFileHash(file);
        // Log security events
        await logFileUploadEvent(file, result, context.toString(), userId);
    } catch (error) {
        result.valid = false;
        result.errors.push(`File validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$security$2f$security$2d$logger$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["securityLogger"].logSecurityEvent({
            type: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$security$2f$security$2d$logger$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SecurityEventType"].FILE_TYPE_VIOLATION,
            timestamp: new Date().toISOString(),
            userId,
            reason: `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            additionalData: {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                context
            }
        });
    }
    return result;
}
/**
 * Validate basic file information
 */ async function validateBasicInfo(file, config, result) {
    // File size validation
    if (file.size > config.maxFileSize) {
        result.valid = false;
        result.errors.push(`File size exceeds maximum allowed size of ${formatFileSize(config.maxFileSize)}`);
        result.securityFlags.oversized = true;
    }
    if (file.size === 0) {
        result.valid = false;
        result.errors.push('File is empty');
    }
    // MIME type validation
    if (!config.allowedMimeTypes.includes(file.type)) {
        result.valid = false;
        result.errors.push(`File type "${file.type}" is not allowed`);
    }
    // Extension validation
    const extension = getFileExtension(file.name);
    if (!config.allowedExtensions.includes(extension.toLowerCase())) {
        result.valid = false;
        result.errors.push(`File extension "${extension}" is not allowed`);
    }
    // Dangerous file pattern check
    if (DANGEROUS_PATTERNS.some((pattern)=>pattern.test(file.name))) {
        result.valid = false;
        result.errors.push('File type is potentially dangerous and not allowed');
        result.securityFlags.potentialMalware = true;
    }
    // Suspicious filename check
    if (SUSPICIOUS_NAME_PATTERNS.some((pattern)=>pattern.test(file.name))) {
        result.warnings.push('Filename contains suspicious patterns');
        result.securityFlags.suspiciousName = true;
    }
    // Check for null bytes (path traversal attempts)
    if (file.name.includes('\0')) {
        result.valid = false;
        result.errors.push('Filename contains null bytes');
        result.securityFlags.suspiciousName = true;
    }
}
/**
 * Validate file signature (magic numbers)
 */ async function validateFileSignature(file, config, result) {
    try {
        const buffer = await file.slice(0, 16).arrayBuffer(); // Read first 16 bytes
        const bytes = new Uint8Array(buffer);
        const magicNumber = Array.from(bytes.slice(0, 8)).map((b)=>b.toString(16).padStart(2, '0')).join(' ');
        result.fileInfo.magicNumber = magicNumber;
        // Get expected magic numbers for file type
        const extension = getFileExtension(file.name).toLowerCase().replace('.', '');
        const expectedMagicNumbers = config.allowedMagicNumbers[extension];
        if (expectedMagicNumbers && expectedMagicNumbers.length > 0) {
            const isValidMagic = expectedMagicNumbers.some((expectedBytes)=>{
                return expectedBytes.every((expectedByte, index)=>{
                    return index < bytes.length && bytes[index] === expectedByte;
                });
            });
            if (!isValidMagic && expectedMagicNumbers[0].length > 0) {
                result.valid = false;
                result.errors.push(`File signature doesn't match expected type. Expected: ${extension}`);
                result.securityFlags.potentialMalware = true;
            }
        }
    } catch  {
        result.warnings.push('Could not validate file signature');
    }
}
/**
 * Validate file content for malicious patterns
 */ async function validateFileContent(file, config, result) {
    try {
        // For text-based files, scan content
        if (file.type.startsWith('text/') || file.name.endsWith('.svg')) {
            const text = await file.text();
            // Check for script injection
            const scriptPatterns = [
                /<script[\s\S]*?>/gi,
                /javascript:/gi,
                /vbscript:/gi,
                /on\w+\s*=/gi,
                /<iframe[\s\S]*?>/gi,
                /<object[\s\S]*?>/gi,
                /<embed[\s\S]*?>/gi
            ];
            if (scriptPatterns.some((pattern)=>pattern.test(text))) {
                result.valid = false;
                result.errors.push('File contains potentially malicious script content');
                result.securityFlags.containsScript = true;
            }
            // Check for SQL injection attempts
            const sqlPatterns = [
                /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b)/gi,
                /(\bor\b\s+\d+\s*=\s*\d+)/gi
            ];
            if (sqlPatterns.some((pattern)=>pattern.test(text))) {
                result.warnings.push('File contains SQL-like patterns');
            }
        }
        // For Office documents, check for macros (simplified)
        if (file.type.includes('officedocument') || file.type.includes('ms-')) {
            // In a real implementation, you would use a library to parse Office documents
            // and check for VBA macros, embedded objects, etc.
            result.securityFlags.containsMacros = await checkForMacros(file);
            if (result.securityFlags.containsMacros) {
                result.warnings.push('Document may contain macros or embedded content');
            }
        }
    } catch  {
        result.warnings.push('Could not fully validate file content');
    }
}
/**
 * Simplified malware scanning (in production, integrate with proper antivirus)
 */ async function scanForMalware(file, config, result) {
    // This is a simplified implementation
    // In production, integrate with services like:
    // - VirusTotal API
    // - ClamAV
    // - Windows Defender
    // - Cloud-based scanning services
    try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        // Simple pattern matching for known malware signatures
        const malwarePatterns = [
            // EICAR test signature
            [
                0x58,
                0x35,
                0x4F,
                0x21,
                0x50,
                0x25,
                0x40,
                0x41,
                0x50,
                0x5B,
                0x34,
                0x5C,
                0x50,
                0x5A,
                0x58,
                0x35,
                0x34
            ]
        ];
        for (const pattern of malwarePatterns){
            for(let i = 0; i <= bytes.length - pattern.length; i++){
                if (pattern.every((byte, j)=>bytes[i + j] === byte)) {
                    result.valid = false;
                    result.errors.push('File contains known malware signature');
                    result.securityFlags.potentialMalware = true;
                    return;
                }
            }
        }
        // Check for PE header (Windows executables)
        if (bytes.length > 64) {
            const peOffset = bytes[60] | bytes[61] << 8 | bytes[62] << 16 | bytes[63] << 24;
            if (peOffset < bytes.length - 4) {
                const peSignature = bytes.slice(peOffset, peOffset + 4);
                if (peSignature[0] === 0x50 && peSignature[1] === 0x45 && peSignature[2] === 0x00 && peSignature[3] === 0x00) {
                    result.valid = false;
                    result.errors.push('Windows executable files are not allowed');
                    result.securityFlags.potentialMalware = true;
                }
            }
        }
    } catch  {
        result.warnings.push('Malware scan could not be completed');
    }
}
/**
 * Check for macros in Office documents (simplified)
 */ async function checkForMacros(file) {
    try {
        // This is a very simplified check
        // In production, use proper Office document parsing libraries
        const text = await file.text();
        return /vba|macro|activex/gi.test(text);
    } catch  {
        return false;
    }
}
/**
 * Analyze security flags and update validation result
 */ function analyzeSecurityFlags(result) {
    const { securityFlags } = result;
    // If multiple security flags are triggered, increase suspicion
    const flagCount = Object.values(securityFlags).filter(Boolean).length;
    if (flagCount >= 3) {
        result.valid = false;
        result.errors.push('File triggers multiple security concerns');
    } else if (flagCount >= 2) {
        result.warnings.push('File has multiple security flags - proceed with caution');
    }
    // Critical flags that should always fail validation
    if (securityFlags.potentialMalware || securityFlags.containsScript) {
        result.valid = false;
    }
}
/**
 * Generate SHA-256 hash of file for integrity verification
 */ async function generateFileHash(file) {
    try {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b)=>b.toString(16).padStart(2, '0')).join('');
    } catch  {
        return 'hash-generation-failed';
    }
}
/**
 * Log file upload security events
 */ async function logFileUploadEvent(file, result, context, userId) {
    const eventType = result.valid ? __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$security$2f$security$2d$logger$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SecurityEventType"].PII_ACCESS : __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$security$2f$security$2d$logger$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SecurityEventType"].MALICIOUS_FILE_UPLOAD;
    await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$security$2f$security$2d$logger$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["securityLogger"].logSecurityEvent({
        type: eventType,
        timestamp: new Date().toISOString(),
        userId,
        reason: result.valid ? 'File upload successful' : result.errors.join(', '),
        additionalData: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            context,
            hash: result.fileInfo.hash,
            securityFlags: result.securityFlags,
            validationErrors: result.errors,
            validationWarnings: result.warnings
        }
    });
}
/**
 * Helper functions
 */ function getFileExtension(filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex === -1 ? '' : filename.slice(lastDotIndex);
}
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = [
        'Bytes',
        'KB',
        'MB',
        'GB'
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
async function quarantineFile(file, reason, userId) {
    // In production, move file to quarantine storage
    // Send alerts to security team
    // Log detailed forensic information
    await __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$security$2f$security$2d$logger$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["securityLogger"].logSecurityEvent({
        type: __TURBOPACK__imported__module__$5b$project$5d2f$apps$2f$frontend$2f$src$2f$lib$2f$security$2f$security$2d$logger$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["SecurityEventType"].MALICIOUS_FILE_UPLOAD,
        timestamp: new Date().toISOString(),
        userId,
        reason: `File quarantined: ${reason}`,
        additionalData: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            quarantineReason: reason
        }
    });
}
async function validateMultipleFiles(files, context = 'documents', userId) {
    const results = [];
    for (const file of files){
        const result = await validateFile(file, context, userId);
        results.push(result);
        // If any file fails validation with high security risk, reject the entire batch
        if (!result.valid && (result.securityFlags.potentialMalware || result.securityFlags.containsScript)) {
            // Quarantine all files in batch
            for (const batchFile of files){
                await quarantineFile(batchFile, 'Batch contained malicious file', userId);
            }
            break;
        }
    }
    return results;
}
function getFileConfig(context) {
    return {
        ...FILE_CONFIGS[context]
    };
}
function updateFileConfig(context, updates) {
    FILE_CONFIGS[context] = {
        ...FILE_CONFIGS[context],
        ...updates
    };
}
}),

};

//# sourceMappingURL=apps_frontend_src_lib_a8ee2625._.js.map
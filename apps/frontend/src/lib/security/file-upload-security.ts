/**
 * Enterprise File Upload Security System
 * Comprehensive protection against malicious file uploads
 * Multi-layer validation with virus scanning and content analysis
 */

import { securityLogger, SecurityEventType } from './security-logger';

interface FileValidationConfig {
  maxFileSize: number; // bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  allowedMagicNumbers: { [key: string]: number[][] }; // File signature validation
  scanForMalware: boolean;
  validateContent: boolean;
  quarantineOnSuspicion: boolean;
}

interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    name: string;
    size: number;
    type: string;
    extension: string;
    magicNumber?: string;
    hash?: string;
  };
  securityFlags: {
    containsScript: boolean;
    containsMacros: boolean;
    potentialMalware: boolean;
    suspiciousName: boolean;
    oversized: boolean;
  };
}

// File type configurations for different contexts
const FILE_CONFIGS: { [context: string]: FileValidationConfig } = {
  // Property documents (contracts, leases, etc.)
  documents: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'],
    allowedMagicNumbers: {
      'pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
      'docx': [[0x50, 0x4B, 0x03, 0x04]], // ZIP format
      'doc': [[0xD0, 0xCF, 0x11, 0xE0]], // MS Office
      'txt': [[]], // Text files can have various or no magic numbers
    },
    scanForMalware: true,
    validateContent: true,
    quarantineOnSuspicion: true,
  },
  
  // Property images
  images: {
    maxFileSize: 20 * 1024 * 1024, // 20MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'],
    allowedMagicNumbers: {
      'jpeg': [[0xFF, 0xD8, 0xFF]],
      'png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
      'webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF
      'gif': [[0x47, 0x49, 0x46, 0x38]], // GIF8
      'svg': [], // XML-based, validated differently
    },
    scanForMalware: true,
    validateContent: true,
    quarantineOnSuspicion: true,
  },
  
  // User profile pictures (stricter)
  avatar: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    allowedMagicNumbers: {
      'jpeg': [[0xFF, 0xD8, 0xFF]],
      'png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
      'webp': [[0x52, 0x49, 0x46, 0x46]],
    },
    scanForMalware: true,
    validateContent: true,
    quarantineOnSuspicion: true,
  },
  
  // Maintenance request attachments
  maintenance: {
    maxFileSize: 25 * 1024 * 1024, // 25MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.mp4', '.mov', '.avi'],
    allowedMagicNumbers: {
      'jpeg': [[0xFF, 0xD8, 0xFF]],
      'png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
      'webp': [[0x52, 0x49, 0x46, 0x46]],
      'pdf': [[0x25, 0x50, 0x44, 0x46]],
      'mp4': [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]],
    },
    scanForMalware: true,
    validateContent: true,
    quarantineOnSuspicion: true,
  },
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
  /\.\w+\s+\.(exe|bat|cmd|scr|pif|com)$/i,
];

// Suspicious filename patterns
const SUSPICIOUS_NAME_PATTERNS = [
  /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i, // Windows reserved names
  /[<>:"|?*\\\/]/g, // Invalid filename characters
  /^\./, // Hidden files
  /\s{2,}/, // Multiple spaces
  /[\x00-\x1f\x7f-\x9f]/, // Control characters
];

// Using the singleton securityLogger imported above

/**
 * Main file validation function
 */
export async function validateFile(
  file: File,
  context: keyof typeof FILE_CONFIGS = 'documents',
  userId?: string
): Promise<FileValidationResult> {
  const config = FILE_CONFIGS[context];
  const result: FileValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      extension: getFileExtension(file.name),
    },
    securityFlags: {
      containsScript: false,
      containsMacros: false,
      potentialMalware: false,
      suspiciousName: false,
      oversized: false,
    },
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
    
    await securityLogger.logSecurityEvent({
      type: SecurityEventType.FILE_TYPE_VIOLATION,
      timestamp: new Date().toISOString(),
      userId,
      reason: `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      additionalData: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        context,
      },
    });
  }

  return result;
}

/**
 * Validate basic file information
 */
async function validateBasicInfo(
  file: File,
  config: FileValidationConfig,
  result: FileValidationResult
): Promise<void> {
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
  if (DANGEROUS_PATTERNS.some(pattern => pattern.test(file.name))) {
    result.valid = false;
    result.errors.push('File type is potentially dangerous and not allowed');
    result.securityFlags.potentialMalware = true;
  }
  
  // Suspicious filename check
  if (SUSPICIOUS_NAME_PATTERNS.some(pattern => pattern.test(file.name))) {
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
 */
async function validateFileSignature(
  file: File,
  config: FileValidationConfig,
  result: FileValidationResult
): Promise<void> {
  try {
    const buffer = await file.slice(0, 16).arrayBuffer(); // Read first 16 bytes
    const bytes = new Uint8Array(buffer);
    const magicNumber = Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    
    result.fileInfo.magicNumber = magicNumber;
    
    // Get expected magic numbers for file type
    const extension = getFileExtension(file.name).toLowerCase().replace('.', '');
    const expectedMagicNumbers = config.allowedMagicNumbers[extension];
    
    if (expectedMagicNumbers && expectedMagicNumbers.length > 0) {
      const isValidMagic = expectedMagicNumbers.some(expectedBytes => {
        return expectedBytes.every((expectedByte, index) => {
          return index < bytes.length && bytes[index] === expectedByte;
        });
      });
      
      if (!isValidMagic && expectedMagicNumbers[0].length > 0) { // Some files like txt may not have magic numbers
        result.valid = false;
        result.errors.push(`File signature doesn't match expected type. Expected: ${extension}`);
        result.securityFlags.potentialMalware = true;
      }
    }
  } catch {
    result.warnings.push('Could not validate file signature');
  }
}

/**
 * Validate file content for malicious patterns
 */
async function validateFileContent(
  file: File,
  config: FileValidationConfig,
  result: FileValidationResult
): Promise<void> {
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
        /<embed[\s\S]*?>/gi,
      ];
      
      if (scriptPatterns.some(pattern => pattern.test(text))) {
        result.valid = false;
        result.errors.push('File contains potentially malicious script content');
        result.securityFlags.containsScript = true;
      }
      
      // Check for SQL injection attempts
      const sqlPatterns = [
        /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b)/gi,
        /(\bor\b\s+\d+\s*=\s*\d+)/gi,
      ];
      
      if (sqlPatterns.some(pattern => pattern.test(text))) {
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
    
  } catch {
    result.warnings.push('Could not fully validate file content');
  }
}

/**
 * Simplified malware scanning (in production, integrate with proper antivirus)
 */
async function scanForMalware(
  file: File,
  config: FileValidationConfig,
  result: FileValidationResult
): Promise<void> {
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
      [0x58, 0x35, 0x4F, 0x21, 0x50, 0x25, 0x40, 0x41, 0x50, 0x5B, 0x34, 0x5C, 0x50, 0x5A, 0x58, 0x35, 0x34],
    ];
    
    for (const pattern of malwarePatterns) {
      for (let i = 0; i <= bytes.length - pattern.length; i++) {
        if (pattern.every((byte, j) => bytes[i + j] === byte)) {
          result.valid = false;
          result.errors.push('File contains known malware signature');
          result.securityFlags.potentialMalware = true;
          return;
        }
      }
    }
    
    // Check for PE header (Windows executables)
    if (bytes.length > 64) {
      const peOffset = bytes[60] | (bytes[61] << 8) | (bytes[62] << 16) | (bytes[63] << 24);
      if (peOffset < bytes.length - 4) {
        const peSignature = bytes.slice(peOffset, peOffset + 4);
        if (peSignature[0] === 0x50 && peSignature[1] === 0x45 && peSignature[2] === 0x00 && peSignature[3] === 0x00) {
          result.valid = false;
          result.errors.push('Windows executable files are not allowed');
          result.securityFlags.potentialMalware = true;
        }
      }
    }
    
  } catch {
    result.warnings.push('Malware scan could not be completed');
  }
}

/**
 * Check for macros in Office documents (simplified)
 */
async function checkForMacros(file: File): Promise<boolean> {
  try {
    // This is a very simplified check
    // In production, use proper Office document parsing libraries
    const text = await file.text();
    return /vba|macro|activex/gi.test(text);
  } catch {
    return false;
  }
}

/**
 * Analyze security flags and update validation result
 */
function analyzeSecurityFlags(result: FileValidationResult): void {
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
 */
async function generateFileHash(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'hash-generation-failed';
  }
}

/**
 * Log file upload security events
 */
async function logFileUploadEvent(
  file: File,
  result: FileValidationResult,
  context: string,
  userId?: string
): Promise<void> {
  const eventType = result.valid ? SecurityEventType.PII_ACCESS : SecurityEventType.MALICIOUS_FILE_UPLOAD;
  
  await securityLogger.logSecurityEvent({
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
      validationWarnings: result.warnings,
    },
  });
}

/**
 * Helper functions
 */
function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex === -1 ? '' : filename.slice(lastDotIndex);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Quarantine suspicious files (placeholder for production implementation)
 */
export async function quarantineFile(
  file: File,
  reason: string,
  userId?: string
): Promise<void> {
  // In production, move file to quarantine storage
  // Send alerts to security team
  // Log detailed forensic information
  
  await securityLogger.logSecurityEvent({
    type: SecurityEventType.MALICIOUS_FILE_UPLOAD,
    timestamp: new Date().toISOString(),
    userId,
    reason: `File quarantined: ${reason}`,
    additionalData: {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      quarantineReason: reason,
    },
  });
}

/**
 * Batch file validation for multiple uploads
 */
export async function validateMultipleFiles(
  files: File[],
  context: keyof typeof FILE_CONFIGS = 'documents',
  userId?: string
): Promise<FileValidationResult[]> {
  const results: FileValidationResult[] = [];
  
  for (const file of files) {
    const result = await validateFile(file, context, userId);
    results.push(result);
    
    // If any file fails validation with high security risk, reject the entire batch
    if (!result.valid && (result.securityFlags.potentialMalware || result.securityFlags.containsScript)) {
      // Quarantine all files in batch
      for (const batchFile of files) {
        await quarantineFile(batchFile, 'Batch contained malicious file', userId);
      }
      break;
    }
  }
  
  return results;
}

/**
 * Get file validation configuration for context
 */
export function getFileConfig(context: keyof typeof FILE_CONFIGS): FileValidationConfig {
  return { ...FILE_CONFIGS[context] };
}

/**
 * Update file validation configuration (admin only)
 */
export function updateFileConfig(
  context: keyof typeof FILE_CONFIGS,
  updates: Partial<FileValidationConfig>
): void {
  FILE_CONFIGS[context] = { ...FILE_CONFIGS[context], ...updates };
}
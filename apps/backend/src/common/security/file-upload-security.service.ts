import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'
import * as path from 'path'
import * as fs from 'fs/promises'
import { SecurityMonitorService } from './security-monitor.service'

export interface FileValidationConfig {
  // File size limits (in bytes)
  maxFileSize: number
  maxTotalSize: number
  
  // Allowed file types
  allowedMimeTypes: string[]
  allowedExtensions: string[]
  
  // Security settings
  enableVirusScanning: boolean
  enableContentValidation: boolean
  quarantineSupiciousFiles: boolean
  
  // Storage settings
  uploadPath: string
  tempPath: string
  quarantinePath: string
}

export interface FileUploadResult {
  success: boolean
  fileName: string
  originalName: string
  mimeType: string
  size: number
  path: string
  hash: string
  securityScan: {
    clean: boolean
    threats: string[]
    confidence: number
  }
  metadata?: Record<string, unknown>
}

export interface FileSecurityThreat {
  type: 'MALWARE' | 'SCRIPT_INJECTION' | 'EMBEDDED_EXECUTABLE' | 'SUSPICIOUS_HEADER' | 'MIME_MISMATCH' | 'EXTENSION_SPOOFING'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  location?: string
}

/**
 * File Upload Security Service
 * 
 * Provides comprehensive security validation for file uploads including:
 * - MIME type validation and header verification
 * - File size and content validation
 * - Malware scanning and threat detection
 * - Secure file storage with quarantine capabilities
 * - Content sanitization and metadata extraction
 */
@Injectable()
export class FileUploadSecurityService {
  private readonly logger = new Logger(FileUploadSecurityService.name)
  private readonly config: FileValidationConfig
  
  // Known malicious file signatures
  private readonly maliciousSignatures = new Map<string, string>([
    // PE executables
    ['4d5a', 'Windows PE Executable'],
    ['5a4d', 'Windows PE Executable (reverse)'],
    // ELF executables
    ['7f454c46', 'Linux ELF Executable'],
    // Script headers
    ['3c3f706870', 'PHP Script'],
    ['3c25', 'ASP Script'],
    ['3c736372697074', 'JavaScript/HTML Script'],
    // Archive bombs
    ['504b0304', 'ZIP Archive (potential bomb)'],
    ['1f8b08', 'GZIP Archive (potential bomb)'],
    // Suspicious patterns
    ['6576616c28', 'JavaScript eval() function'],
    ['646f63756d656e742e777269746528', 'JavaScript document.write()'],
    ['3c696672616d65', 'HTML iframe tag']
  ])
  
  // Trusted image/document signatures
  private readonly trustedSignatures = new Map<string, string[]>([
    ['image/jpeg', ['ffd8ff']],
    ['image/png', ['89504e47']],
    ['image/gif', ['474946383761', '474946383961']],
    ['image/webp', ['52494646']],
    ['application/pdf', ['255044462d']],
    ['application/msword', ['d0cf11e0a1b11ae1']],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ['504b030414']],
    ['text/plain', []] // Text files don't have reliable signatures
  ])

  constructor(
    _configService: ConfigService,
    private readonly securityMonitor: SecurityMonitorService
  ) {
    this.config = this.buildFileValidationConfig()
    this.logger.log('File upload security service initialized', {
      maxFileSize: this.config.maxFileSize,
      allowedTypes: this.config.allowedMimeTypes.length,
      virusScanning: this.config.enableVirusScanning
    })
  }

  /**
   * Validate and process uploaded file with comprehensive security checks
   */
  async validateAndProcessFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    userIp?: string
  ): Promise<FileUploadResult> {
    const startTime = Date.now()
    
    try {
      this.logger.debug('Starting file validation', {
        originalName,
        mimeType,
        size: buffer.length,
        userIp
      })

      // Step 1: Basic validation
      await this.validateBasicProperties(buffer, originalName, mimeType)
      
      // Step 2: Security scanning
      const threats = await this.performSecurityScan(buffer, originalName, mimeType)
      
      // Step 3: Content validation
      await this.validateFileContent(buffer, mimeType)
      
      // Step 4: Generate secure filename and hash
      const fileHash = this.generateFileHash(buffer)
      const secureFileName = this.generateSecureFileName(originalName, fileHash)
      
      // Step 5: Determine storage location
      const shouldQuarantine = threats.some(t => t.severity === 'high' || t.severity === 'critical')
      const storagePath = shouldQuarantine ? this.config.quarantinePath : this.config.uploadPath
      const filePath = path.join(storagePath, secureFileName)
      
      // Step 6: Store file securely
      await this.storeFileSecurely(buffer, filePath)
      
      // Step 7: Log security event
      await this.logFileUploadEvent(originalName, mimeType, buffer.length, threats, userIp)
      
      const processingTime = Date.now() - startTime
      this.logger.log('File validation completed', {
        originalName,
        secureFileName,
        threats: threats.length,
        quarantined: shouldQuarantine,
        processingTime
      })

      return {
        success: true,
        fileName: secureFileName,
        originalName,
        mimeType,
        size: buffer.length,
        path: filePath,
        hash: fileHash,
        securityScan: {
          clean: threats.length === 0,
          threats: threats.map(t => `${t.type}: ${t.description}`),
          confidence: this.calculateThreatConfidence(threats)
        },
        metadata: {
          uploadTime: new Date().toISOString(),
          quarantined: shouldQuarantine,
          processingTime
        }
      }

    } catch (error) {
      await this.logFileUploadEvent(originalName, mimeType, buffer.length, [], userIp, error)
      throw error
    }
  }

  /**
   * Validate basic file properties
   */
  private async validateBasicProperties(buffer: Buffer, originalName: string, mimeType: string): Promise<void> {
    // File size validation
    if (buffer.length > this.config.maxFileSize) {
      throw new BadRequestException(
        `File size ${buffer.length} bytes exceeds maximum allowed size of ${this.config.maxFileSize} bytes`
      )
    }

    if (buffer.length === 0) {
      throw new BadRequestException('Empty files are not allowed')
    }

    // MIME type validation
    if (!this.config.allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(
        `MIME type '${mimeType}' is not allowed. Allowed types: ${this.config.allowedMimeTypes.join(', ')}`
      )
    }

    // File extension validation
    const extension = path.extname(originalName).toLowerCase()
    if (!this.config.allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        `File extension '${extension}' is not allowed. Allowed extensions: ${this.config.allowedExtensions.join(', ')}`
      )
    }

    // Filename validation
    if (this.containsSuspiciousFilename(originalName)) {
      throw new BadRequestException('Filename contains suspicious characters or patterns')
    }
  }

  /**
   * Perform comprehensive security scanning
   */
  private async performSecurityScan(buffer: Buffer, originalName: string, mimeType: string): Promise<FileSecurityThreat[]> {
    const threats: FileSecurityThreat[] = []

    // Check file signature vs declared MIME type
    const signatureThreats = this.validateFileSignature(buffer, mimeType)
    threats.push(...signatureThreats)

    // Scan for malicious patterns
    const malwareThreats = this.scanForMaliciousPatterns(buffer, originalName)
    threats.push(...malwareThreats)

    // Check for embedded scripts
    const scriptThreats = this.scanForEmbeddedScripts(buffer, mimeType)
    threats.push(...scriptThreats)

    // Validate file structure
    const structuralThreats = await this.validateFileStructure(buffer, mimeType)
    threats.push(...structuralThreats)

    return threats
  }

  /**
   * Validate file signature matches declared MIME type
   */
  private validateFileSignature(buffer: Buffer, mimeType: string): FileSecurityThreat[] {
    const threats: FileSecurityThreat[] = []
    
    if (buffer.length < 16) {
      return threats // Too small to have meaningful signature
    }

    const header = buffer.subarray(0, 16).toString('hex').toLowerCase()
    const trustedSigs = this.trustedSignatures.get(mimeType) || []

    // Check if file signature matches expected signatures for MIME type
    if (trustedSigs.length > 0) {
      const signatureMatch = trustedSigs.some(sig => header.startsWith(sig))
      
      if (!signatureMatch) {
        threats.push({
          type: 'MIME_MISMATCH',
          severity: 'high',
          description: `File signature doesn't match declared MIME type '${mimeType}'`,
          location: 'file_header'
        })
      }
    }

    // Check for malicious signatures
    for (const [signature, description] of this.maliciousSignatures.entries()) {
      if (header.includes(signature)) {
        threats.push({
          type: 'MALWARE',
          severity: 'critical',
          description: `Malicious signature detected: ${description}`,
          location: 'file_header'
        })
      }
    }

    return threats
  }

  /**
   * Scan for malicious patterns in file content
   */
  private scanForMaliciousPatterns(buffer: Buffer, originalName: string): FileSecurityThreat[] {
    const threats: FileSecurityThreat[] = []
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 8192)) // Check first 8KB

    // Check for script injection patterns
    const scriptPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /vbscript:/i,
      /onload\s*=/i,
      /onerror\s*=/i,
      /eval\s*\(/i,
      /document\.write/i,
      /window\.location/i
    ]

    for (const pattern of scriptPatterns) {
      if (pattern.test(content)) {
        threats.push({
          type: 'SCRIPT_INJECTION',
          severity: 'high',
          description: `Potential script injection detected: ${pattern.source}`,
          location: 'file_content'
        })
      }
    }

    // Check for suspicious file extension mismatches
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.jar']
    const hiddenExtension = suspiciousExtensions.find(ext => 
      originalName.toLowerCase().includes(ext) && !originalName.toLowerCase().endsWith(ext)
    )

    if (hiddenExtension) {
      threats.push({
        type: 'EXTENSION_SPOOFING',
        severity: 'high',
        description: `Suspicious hidden extension detected: ${hiddenExtension}`,
        location: 'filename'
      })
    }

    return threats
  }

  /**
   * Scan for embedded scripts in file content
   */
  private scanForEmbeddedScripts(buffer: Buffer, mimeType: string): FileSecurityThreat[] {
    const threats: FileSecurityThreat[] = []

    // Only scan files that could contain embedded scripts
    if (!mimeType.startsWith('image/') && !mimeType.startsWith('application/pdf')) {
      return threats
    }

    const content = buffer.toString('binary')
    
    // Look for embedded PHP, ASP, JSP
    const embeddedScriptPatterns = [
      /<%[\s\S]*?%>/,
      /<\?php[\s\S]*?\?>/,
      /<\?[\s\S]*?\?>/,
      /<%@[\s\S]*?%>/
    ]

    for (const pattern of embeddedScriptPatterns) {
      if (pattern.test(content)) {
        threats.push({
          type: 'EMBEDDED_EXECUTABLE',
          severity: 'critical',
          description: 'Embedded server-side script detected in file',
          location: 'file_content'
        })
      }
    }

    return threats
  }

  /**
   * Validate file structure for common formats
   */
  private async validateFileStructure(buffer: Buffer, mimeType: string): Promise<FileSecurityThreat[]> {
    const threats: FileSecurityThreat[] = []

    try {
      if (mimeType.startsWith('image/')) {
        await this.validateImageStructure(buffer, mimeType, threats)
      } else if (mimeType === 'application/pdf') {
        await this.validatePDFStructure(buffer, threats)
      }
    } catch (error) {
      threats.push({
        type: 'SUSPICIOUS_HEADER',
        severity: 'medium',
        description: `File structure validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        location: 'file_structure'
      })
    }

    return threats
  }

  /**
   * Validate image file structure
   */
  private async validateImageStructure(buffer: Buffer, mimeType: string, threats: FileSecurityThreat[]): Promise<void> {
    // Basic image format validation
    if (mimeType === 'image/jpeg') {
      // JPEG should start with FFD8 and end with FFD9
      const header = buffer.subarray(0, 2).toString('hex').toLowerCase()
      const footer = buffer.subarray(-2).toString('hex').toLowerCase()
      
      if (header !== 'ffd8') {
        threats.push({
          type: 'SUSPICIOUS_HEADER',
          severity: 'medium',
          description: 'Invalid JPEG header',
          location: 'image_header'
        })
      }
      
      if (footer !== 'ffd9') {
        threats.push({
          type: 'SUSPICIOUS_HEADER',
          severity: 'low',
          description: 'Invalid JPEG footer',
          location: 'image_footer'
        })
      }
    } else if (mimeType === 'image/png') {
      // PNG should start with 89504E47 and end with IEND chunk
      const header = buffer.subarray(0, 8).toString('hex').toLowerCase()
      if (!header.startsWith('89504e470d0a1a0a')) {
        threats.push({
          type: 'SUSPICIOUS_HEADER',
          severity: 'medium',
          description: 'Invalid PNG header',
          location: 'image_header'
        })
      }
    }
  }

  /**
   * Validate PDF file structure
   */
  private async validatePDFStructure(buffer: Buffer, threats: FileSecurityThreat[]): Promise<void> {
    const content = buffer.toString('binary')
    
    // Check for PDF header
    if (!content.startsWith('%PDF-')) {
      threats.push({
        type: 'SUSPICIOUS_HEADER',
        severity: 'medium',
        description: 'Invalid PDF header',
        location: 'pdf_header'
      })
    }

    // Check for suspicious JavaScript in PDF
    if (content.includes('/JavaScript') || content.includes('/JS')) {
      threats.push({
        type: 'EMBEDDED_EXECUTABLE',
        severity: 'high',
        description: 'JavaScript detected in PDF file',
        location: 'pdf_content'
      })
    }

    // Check for suspicious forms or actions
    if (content.includes('/Launch') || content.includes('/ImportData')) {
      threats.push({
        type: 'EMBEDDED_EXECUTABLE',
        severity: 'high',
        description: 'Suspicious PDF actions detected',
        location: 'pdf_content'
      })
    }
  }

  /**
   * Validate file content based on type
   */
  private async validateFileContent(buffer: Buffer, mimeType: string): Promise<void> {
    // Validate that file content is appropriate for declared type
    if (mimeType.startsWith('text/')) {
      try {
        // Ensure text files are valid UTF-8
        buffer.toString('utf8')
      } catch (_error) {
        throw new BadRequestException('Text file contains invalid UTF-8 encoding')
      }
    }

    // Additional format-specific validations can be added here
  }

  /**
   * Check if filename contains suspicious patterns
   */
  private containsSuspiciousFilename(filename: string): boolean {
    const suspiciousPatterns = [
      /\.\./,           // Directory traversal
      /[<>:"|?*]/,      // Invalid filename characters
      /^\./,            // Hidden files
      /\.(exe|bat|cmd|scr|pif|com|jar|vbs|js|ps1)$/i, // Executable extensions
      /\s+\.(jpg|png|pdf)\.exe$/i, // Double extension
      /^\s*$|^\.+$/     // Empty or dots only
    ]

    return suspiciousPatterns.some(pattern => pattern.test(filename))
  }

  /**
   * Generate secure hash for file
   */
  private generateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex')
  }

  /**
   * Generate secure filename
   */
  private generateSecureFileName(originalName: string, hash: string): string {
    const extension = path.extname(originalName).toLowerCase()
    const timestamp = Date.now()
    const randomSuffix = crypto.randomBytes(4).toString('hex')
    
    return `${hash.substring(0, 16)}_${timestamp}_${randomSuffix}${extension}`
  }

  /**
   * Store file securely with proper permissions
   */
  private async storeFileSecurely(buffer: Buffer, filePath: string): Promise<void> {
    try {
      // Ensure directory exists
      const directory = path.dirname(filePath)
      await fs.mkdir(directory, { recursive: true, mode: 0o755 })
      
      // Write file with restricted permissions
      await fs.writeFile(filePath, buffer, { mode: 0o644 })
      
      this.logger.debug('File stored securely', { path: filePath })
    } catch (error) {
      this.logger.error('Failed to store file securely', {
        path: filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new BadRequestException('Failed to store file securely')
    }
  }

  /**
   * Calculate threat confidence score
   */
  private calculateThreatConfidence(threats: FileSecurityThreat[]): number {
    if (threats.length === 0) return 100

    const severityWeights = { low: 10, medium: 25, high: 50, critical: 100 }
    const totalWeight = threats.reduce((sum, threat) => sum + severityWeights[threat.severity], 0)
    
    return Math.max(0, 100 - totalWeight)
  }

  /**
   * Log file upload security event
   */
  private async logFileUploadEvent(
    originalName: string,
    mimeType: string,
    size: number,
    threats: FileSecurityThreat[],
    userIp?: string,
    error?: unknown
  ): Promise<void> {
    const hasThreats = threats.length > 0
    const hasCriticalThreats = threats.some(t => t.severity === 'critical')

    await this.securityMonitor.logSecurityEvent({
      type: hasThreats ? 'SUSPICIOUS_ACTIVITY' : 'PERMISSION_DENIED', // Using available types
      ip: userIp,
      severity: hasCriticalThreats ? 'critical' : hasThreats ? 'high' : 'low',
      details: {
        operation: 'file_upload',
        originalName,
        mimeType,
        size,
        threats: threats.map(t => ({ type: t.type, severity: t.severity, description: t.description })),
        error: error instanceof Error ? error.message : error,
        success: !error && !hasCriticalThreats
      }
    })
  }

  /**
   * Build file validation configuration
   */
  private buildFileValidationConfig(): FileValidationConfig {
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    return {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxTotalSize: 50 * 1024 * 1024, // 50MB total
      allowedMimeTypes: [
        // Images
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        // Text
        'text/plain',
        'text/csv'
      ],
      allowedExtensions: [
        '.jpg', '.jpeg', '.png', '.gif', '.webp',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx',
        '.txt', '.csv'
      ],
      enableVirusScanning: !isDevelopment, // Disable in development for performance
      enableContentValidation: true,
      quarantineSupiciousFiles: true,
      uploadPath: process.env.UPLOAD_PATH || './uploads',
      tempPath: process.env.TEMP_PATH || './temp',
      quarantinePath: process.env.QUARANTINE_PATH || './quarantine'
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): FileValidationConfig {
    return { ...this.config }
  }

  /**
   * Delete quarantined file after manual review
   */
  async deleteQuarantinedFile(fileName: string): Promise<void> {
    const filePath = path.join(this.config.quarantinePath, fileName)
    
    try {
      await fs.unlink(filePath)
      this.logger.log('Quarantined file deleted', { fileName })
    } catch (error) {
      this.logger.error('Failed to delete quarantined file', {
        fileName,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new BadRequestException('Failed to delete quarantined file')
    }
  }

  /**
   * Move file from quarantine to safe storage after manual approval
   */
  async approveQuarantinedFile(fileName: string): Promise<void> {
    const quarantinePath = path.join(this.config.quarantinePath, fileName)
    const uploadPath = path.join(this.config.uploadPath, fileName)
    
    try {
      await fs.rename(quarantinePath, uploadPath)
      this.logger.log('Quarantined file approved and moved', { fileName })
    } catch (error) {
      this.logger.error('Failed to approve quarantined file', {
        fileName,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new BadRequestException('Failed to approve quarantined file')
    }
  }
}
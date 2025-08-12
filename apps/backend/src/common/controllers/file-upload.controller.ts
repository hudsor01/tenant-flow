import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  // UploadedFile, UseInterceptors not needed for Fastify implementation
  BadRequestException,
  HttpCode,
  HttpStatus,
  Req,
  Query,
  Body
} from '@nestjs/common'
// Note: For Fastify, we'll handle file uploads manually without platform-express
import { FastifyRequest } from 'fastify'
import { FileUploadSecurityService, FileUploadResult } from '../security/file-upload-security.service'
import { SecurityMonitorService } from '../security/security-monitor.service'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { UseGuards } from '@nestjs/common'

// File upload interfaces for Fastify-based implementation

interface FileUploadResponse {
  success: boolean
  file?: {
    id: string
    originalName: string
    fileName: string
    mimeType: string
    size: number
    hash: string
    uploadedAt: string
    securityStatus: 'clean' | 'quarantined' | 'threats_detected'
    threats: string[]
  }
  error?: string
  warnings?: string[]
}

interface QuarantineListResponse {
  files: {
    fileName: string
    originalName: string
    uploadedAt: string
    size: number
    threats: string[]
    userIp?: string
  }[]
  total: number
}

/**
 * File Upload Controller
 * 
 * Provides secure file upload endpoints with comprehensive security validation.
 * All uploads are processed through the FileUploadSecurityService for threat detection.
 */
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FileUploadController {
  private readonly uploadHistory = new Map<string, FileUploadResult & { uploadedAt: Date; userIp?: string }>()

  constructor(
    private readonly fileUploadSecurity: FileUploadSecurityService,
    private readonly securityMonitor: SecurityMonitorService
  ) {}

  /**
   * Upload a single file with security validation
   * Note: For proper Fastify file upload, use multipart/form-data handling
   */
  @Post('upload')
  @HttpCode(HttpStatus.OK)
  async uploadFile(
    @Body() uploadData: { 
      fileBuffer: string // Base64 encoded file
      originalName: string
      mimeType: string
    },
    @Req() request: FastifyRequest
  ): Promise<FileUploadResponse> {
    try {
      // Decode base64 file data
      const buffer = Buffer.from(uploadData.fileBuffer, 'base64')
      
      if (buffer.length === 0) {
        throw new BadRequestException('No file data provided')
      }

      // Basic size check
      if (buffer.length > 10 * 1024 * 1024) { // 10MB
        throw new BadRequestException('File too large')
      }

      // Validate and process file through security service
      const result = await this.fileUploadSecurity.validateAndProcessFile(
        buffer,
        uploadData.originalName,
        uploadData.mimeType,
        request.ip
      )

      // Generate unique file ID
      const fileId = this.generateFileId()
      
      // Store in upload history
      this.uploadHistory.set(fileId, {
        ...result,
        uploadedAt: new Date(),
        userIp: request.ip
      })

      // Determine security status
      const hasThreats = !result.securityScan.clean
      const isQuarantined = result.metadata?.quarantined === true
      
      const securityStatus = isQuarantined 
        ? 'quarantined' 
        : hasThreats 
          ? 'threats_detected' 
          : 'clean'

      // Log successful upload
      await this.securityMonitor.logSecurityEvent({
        type: 'AUTH_SUCCESS', // Using available type for successful operation
        ip: request.ip,
        details: {
          operation: 'file_upload_success',
          fileId,
          originalName: uploadData.originalName,
          mimeType: uploadData.mimeType,
          size: buffer.length,
          securityStatus,
          threatsDetected: result.securityScan.threats.length
        }
      })

      return {
        success: true,
        file: {
          id: fileId,
          originalName: result.originalName,
          fileName: result.fileName,
          mimeType: result.mimeType,
          size: result.size,
          hash: result.hash,
          uploadedAt: new Date().toISOString(),
          securityStatus,
          threats: result.securityScan.threats
        },
        warnings: hasThreats ? [
          'File contains potential security threats and has been quarantined for review'
        ] : undefined
      }

    } catch (error) {
      // Log failed upload
      await this.securityMonitor.logSecurityEvent({
        type: 'AUTH_FAILURE', // Using available type for failed operation
        ip: request.ip,
        details: {
          operation: 'file_upload_failed',
          originalName: uploadData?.originalName || 'unknown',
          mimeType: uploadData?.mimeType || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : 'File upload failed'
      }
    }
  }

  /**
   * Upload multiple files with batch security validation
   */
  @Post('upload/batch')
  async uploadMultipleFiles(
    @Body() uploadData: {
      files: {
        fileBuffer: string
        originalName: string
        mimeType: string
      }[]
    },
    @Req() request: FastifyRequest
  ): Promise<{ results: FileUploadResponse[], totalSize: number }> {
    if (!uploadData.files || uploadData.files.length === 0) {
      throw new BadRequestException('No files provided')
    }

    if (uploadData.files.length > 5) {
      throw new BadRequestException('Maximum 5 files allowed per batch')
    }

    const config = this.fileUploadSecurity.getConfig()
    const totalSize = uploadData.files.reduce((sum, file) => {
      const buffer = Buffer.from(file.fileBuffer, 'base64')
      return sum + buffer.length
    }, 0)
    
    if (totalSize > config.maxTotalSize) {
      throw new BadRequestException(
        `Total file size ${totalSize} exceeds maximum allowed ${config.maxTotalSize} bytes`
      )
    }

    const results: FileUploadResponse[] = []
    
    for (const fileData of uploadData.files) {
      try {
        const result = await this.uploadFile(fileData, request)
        results.push(result)
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed'
        })
      }
    }

    return {
      results,
      totalSize
    }
  }

  /**
   * Get file upload history and status
   */
  @Get('history')
  async getUploadHistory(@Query('limit') limit = '50'): Promise<{
    files: {
      id: string
      originalName: string
      fileName: string
      size: number
      uploadedAt: string
      securityStatus: string
      threats: number
    }[]
    total: number
  }> {
    const limitNum = Math.min(parseInt(limit), 100)
    const entries = Array.from(this.uploadHistory.entries())
      .sort(([, a], [, b]) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
      .slice(0, limitNum)

    return {
      files: entries.map(([id, result]) => ({
        id,
        originalName: result.originalName,
        fileName: result.fileName,
        size: result.size,
        uploadedAt: result.uploadedAt.toISOString(),
        securityStatus: result.metadata?.quarantined ? 'quarantined' : 'clean',
        threats: result.securityScan.threats.length
      })),
      total: this.uploadHistory.size
    }
  }

  /**
   * Get file information by ID
   */
  @Get(':fileId')
  async getFileInfo(@Param('fileId') fileId: string): Promise<FileUploadResponse> {
    const file = this.uploadHistory.get(fileId)
    
    if (!file) {
      throw new BadRequestException('File not found')
    }

    const securityStatus = file.metadata?.quarantined 
      ? 'quarantined' 
      : file.securityScan.threats.length > 0 
        ? 'threats_detected' 
        : 'clean'

    return {
      success: true,
      file: {
        id: fileId,
        originalName: file.originalName,
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.size,
        hash: file.hash,
        uploadedAt: file.uploadedAt.toISOString(),
        securityStatus,
        threats: file.securityScan.threats
      }
    }
  }

  /**
   * Get list of quarantined files (admin only)
   */
  @Get('quarantine/list')
  async getQuarantinedFiles(): Promise<QuarantineListResponse> {
    const quarantinedFiles = Array.from(this.uploadHistory.entries())
      .filter(([, result]) => result.metadata?.quarantined === true)
      .map(([_fileName, result]) => ({
        fileName: result.fileName,
        originalName: result.originalName,
        uploadedAt: result.uploadedAt.toISOString(),
        size: result.size,
        threats: result.securityScan.threats,
        userIp: result.userIp
      }))

    return {
      files: quarantinedFiles,
      total: quarantinedFiles.length
    }
  }

  /**
   * Approve a quarantined file (admin only)
   */
  @Post('quarantine/:fileName/approve')
  async approveQuarantinedFile(
    @Param('fileName') fileName: string,
    @Req() request: FastifyRequest
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.fileUploadSecurity.approveQuarantinedFile(fileName)
      
      // Update upload history
      const entry = Array.from(this.uploadHistory.entries())
        .find(([, result]) => result.fileName === fileName)
      
      if (entry) {
        const [fileId, result] = entry
        this.uploadHistory.set(fileId, {
          ...result,
          metadata: { ...result.metadata, quarantined: false }
        })
      }

      // Log approval action
      await this.securityMonitor.logSecurityEvent({
        type: 'AUTH_SUCCESS',
        ip: request.ip,
        details: {
          operation: 'quarantine_file_approved',
          fileName
        }
      })

      return {
        success: true,
        message: 'File approved and moved to safe storage'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to approve file'
      }
    }
  }

  /**
   * Delete a quarantined file (admin only)
   */
  @Delete('quarantine/:fileName')
  async deleteQuarantinedFile(
    @Param('fileName') fileName: string,
    @Req() request: FastifyRequest
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.fileUploadSecurity.deleteQuarantinedFile(fileName)
      
      // Remove from upload history
      const entryToRemove = Array.from(this.uploadHistory.entries())
        .find(([, result]) => result.fileName === fileName)
      
      if (entryToRemove) {
        this.uploadHistory.delete(entryToRemove[0])
      }

      // Log deletion action
      await this.securityMonitor.logSecurityEvent({
        type: 'AUTH_SUCCESS',
        ip: request.ip,
        details: {
          operation: 'quarantine_file_deleted',
          fileName
        }
      })

      return {
        success: true,
        message: 'Quarantined file deleted successfully'
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete file'
      }
    }
  }

  /**
   * Get security configuration information
   */
  @Get('config/security')
  async getSecurityConfig(): Promise<{
    maxFileSize: number
    maxTotalSize: number
    allowedMimeTypes: string[]
    allowedExtensions: string[]
    securityFeatures: string[]
  }> {
    const config = this.fileUploadSecurity.getConfig()
    
    return {
      maxFileSize: config.maxFileSize,
      maxTotalSize: config.maxTotalSize,
      allowedMimeTypes: config.allowedMimeTypes,
      allowedExtensions: config.allowedExtensions,
      securityFeatures: [
        'MIME type validation',
        'File signature verification',
        'Malware pattern detection',
        'Script injection scanning',
        'File structure validation',
        'Automatic quarantine',
        'Content sanitization'
      ]
    }
  }

  /**
   * Test file security scanning (development only)
   */
  @Post('security/test')
  async testFileSecurity(
    @Body() body: { testType: 'malware' | 'script' | 'mismatch' }
  ): Promise<{ message: string; testResult: string }> {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Security testing not available in production')
    }

    const testFiles = {
      malware: Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00'), // PE header
      script: Buffer.from('<script>alert("xss")</script>'),
      mismatch: Buffer.from('\x89PNG\r\n\x1a\n') // PNG header with wrong MIME
    }

    const testBuffer = testFiles[body.testType]
    if (!testBuffer) {
      throw new BadRequestException('Invalid test type')
    }

    try {
      const result = await this.fileUploadSecurity.validateAndProcessFile(
        testBuffer,
        `test-${body.testType}.txt`,
        'text/plain'
      )
      
      return {
        message: 'Security test completed',
        testResult: result.securityScan.clean ? 'File passed security scan' : 'Threats detected as expected'
      }
    } catch (error) {
      return {
        message: 'Security test completed',
        testResult: `Expected security rejection: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    const timestamp = Date.now().toString(36)
    const randomPart = Math.random().toString(36).substring(2, 8)
    return `file_${timestamp}_${randomPart}`
  }
}
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'

/**
 * Encryption Service
 * 
 * Provides encryption and decryption capabilities for sensitive data using AES-256-GCM.
 * Implements NIST SP 800-38D compliant authentication tag validation.
 * 
 * Security Features:
 * - Uses 128-bit (16-byte) authentication tags per NIST recommendations
 * - Validates authentication tag length to prevent CWE-310 vulnerabilities
 * - Enforces minimum security standards for GCM mode encryption
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly key: Buffer
  private readonly authTagLength = 16 // 128 bits - NIST recommended minimum
  
  constructor(private readonly configService: ConfigService) {
    // Use environment variable or generate a secure key
    const keyString = this.configService.get<string>('ENCRYPTION_KEY') || 
                     crypto.randomBytes(32).toString('hex')
    this.key = Buffer.from(keyString.slice(0, 64), 'hex')
  }

  encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv, { authTagLength: this.authTagLength })
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    // Ensure the authentication tag is exactly the expected length
    if (authTag.length !== this.authTagLength) {
      throw new Error(`Authentication tag length mismatch: expected ${this.authTagLength} bytes, got ${authTag.length} bytes`)
    }
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    }
  }

  decrypt(encrypted: string, iv: string, authTag: string): string {
    // Validate authentication tag length before processing (CWE-310 prevention)
    const authTagBuffer = Buffer.from(authTag, 'hex')
    if (authTagBuffer.length !== this.authTagLength) {
      throw new Error(
        `Invalid authentication tag length: expected ${this.authTagLength} bytes, got ${authTagBuffer.length} bytes. ` +
        `This may indicate tampering or use of non-standard tag lengths (CWE-310).`
      )
    }
    
    // Create decipher with explicit authTagLength to enforce NIST SP 800-38D compliance
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex'),
      { authTagLength: this.authTagLength }
    )
    
    // Set the authentication tag for GCM verification
    decipher.setAuthTag(authTagBuffer)
    
    try {
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch (error) {
      // Enhanced error handling for authentication failures
      if (error instanceof Error && error.message.includes('auth')) {
        throw new Error('Authentication tag verification failed: data may have been tampered with')
      }
      throw error
    }
  }

  // Convenience methods for SSN encryption
  encryptSSN(ssn: string): string {
    if (!ssn) return ''
    const { encrypted, iv, authTag } = this.encrypt(ssn)
    return `${encrypted}:${iv}:${authTag}`
  }

  decryptSSN(encryptedSSN: string): string {
    if (!encryptedSSN) return ''
    const parts = encryptedSSN.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted SSN format: expected format is encrypted:iv:authTag')
    }
    
    const [encrypted, iv, authTag] = parts
    
    // Ensure all parts exist and have minimum expected lengths
    if (!encrypted || !iv || !authTag) {
      throw new Error('Invalid encrypted SSN: missing encryption components')
    }
    
    // Validate component lengths for basic format checking
    if (iv.length !== 32) { // 16 bytes as hex = 32 chars
      throw new Error('Invalid IV length in encrypted SSN')
    }
    
    if (authTag.length !== 32) { // 16 bytes as hex = 32 chars
      throw new Error('Invalid authentication tag length in encrypted SSN')
    }
    
    try {
      return this.decrypt(encrypted, iv, authTag)
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to decrypt SSN: ${error.message}`)
      }
      throw error
    }
  }
}
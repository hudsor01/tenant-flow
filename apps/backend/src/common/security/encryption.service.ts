import { Injectable, Logger } from '@nestjs/common'
import * as crypto from 'crypto'

/**
 * Minimal Data Encryption Service for MVP
 * 
 * Provides basic field-level encryption for sensitive tenant data
 * Uses AES-256-GCM for security with environment-based key
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name)
  private readonly algorithm = 'aes-256-gcm'
  private readonly keyLength = 32
  private readonly ivLength = 16

  // In production, this should come from a secure key management system
  private readonly encryptionKey: Buffer

  constructor() {
    const keyString = process.env.ENCRYPTION_KEY || 'default-key-change-in-production'
    // Create a consistent 32-byte key from the environment variable
    this.encryptionKey = crypto.scryptSync(keyString, 'salt', this.keyLength)
  }

  /**
   * Encrypt sensitive field data
   */
  encrypt(data: string): string {
    try {
      if (!data || data.length === 0) return data

      const iv = crypto.randomBytes(this.ivLength)
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv)
      cipher.setAAD(Buffer.from('tenantflow-data'))

      let encrypted = cipher.update(data, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const tag = cipher.getAuthTag()
      
      // Return format: iv:tag:encrypted
      return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`
    } catch (error) {
      this.logger.error('Encryption failed', error)
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypt sensitive field data
   */
  decrypt(encryptedData: string): string {
    try {
      if (!encryptedData || encryptedData.length === 0) return encryptedData

      // Handle unencrypted data (backward compatibility)
      if (!encryptedData.includes(':')) {
        return encryptedData
      }

      const parts = encryptedData.split(':')
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format')
      }

      const [ivHex, tagHex, encrypted] = parts
      const iv = Buffer.from(ivHex!, 'hex')
      const tag = Buffer.from(tagHex!, 'hex')

      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv)
      decipher.setAuthTag(tag)
      decipher.setAAD(Buffer.from('tenantflow-data'))

      let decrypted = decipher.update(encrypted!, 'hex', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      this.logger.error('Decryption failed', error)
      // Return original data if decryption fails (for backward compatibility)
      return encryptedData
    }
  }

  /**
   * Encrypt an object's sensitive fields
   */
  encryptSensitiveFields<T extends Record<string, unknown>>(data: T, sensitiveFields: string[]): T {
    if (!data || typeof data !== 'object') return data

    const encrypted = { ...data } as Record<string, unknown>
    
    for (const field of sensitiveFields) {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        encrypted[field] = this.encrypt(encrypted[field])
      }
    }

    return encrypted as T
  }

  /**
   * Decrypt an object's sensitive fields
   */
  decryptSensitiveFields<T extends Record<string, unknown>>(data: T, sensitiveFields: string[]): T {
    if (!data || typeof data !== 'object') return data

    const decrypted = { ...data } as Record<string, unknown>
    
    for (const field of sensitiveFields) {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        decrypted[field] = this.decrypt(decrypted[field])
      }
    }

    return decrypted as T
  }

  /**
   * Hash data for indexing (one-way)
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  /**
   * Create a secure token
   */
  generateSecureToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }
}
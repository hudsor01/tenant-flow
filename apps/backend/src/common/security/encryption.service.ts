import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'

/**
 * Encryption Service
 * 
 * Provides encryption and decryption capabilities for sensitive data.
 * This is a basic implementation - enhance for production use.
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly key: Buffer

  constructor(private readonly configService: ConfigService) {
    // Use environment variable or generate a secure key
    const keyString = this.configService.get<string>('ENCRYPTION_KEY') || 
                     crypto.randomBytes(32).toString('hex')
    this.key = Buffer.from(keyString.slice(0, 64), 'hex')
  }

  encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    }
  }

  decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    )
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'))
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
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
    if (parts.length !== 3) return ''
    const [encrypted, iv, authTag] = parts
    
    // Ensure all parts exist before decryption
    if (!encrypted || !iv || !authTag) return ''
    
    return this.decrypt(encrypted, iv, authTag)
  }
}
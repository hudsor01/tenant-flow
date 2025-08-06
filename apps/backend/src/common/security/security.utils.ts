import { Injectable, Logger } from '@nestjs/common'
import * as crypto from 'crypto'
import * as bcrypt from 'bcrypt'

/**
 * Security utility functions for enhanced validation and protection
 */
@Injectable()
export class SecurityUtils {
    private readonly logger = new Logger(SecurityUtils.name)
    
    /**
     * Calculate Shannon entropy of a string
     * Higher entropy indicates more randomness/complexity
     */
    private calculateEntropy(str: string): number {
        const frequency: Record<string, number> = {}
        
        // Calculate character frequency
        for (const char of str) {
            frequency[char] = (frequency[char] || 0) + 1
        }
        
        // Calculate entropy
        let entropy = 0
        const length = str.length
        
        for (const char in frequency) {
            const count = frequency[char]
            if (count) {
                const probability = count / length
                entropy -= probability * Math.log2(probability)
            }
        }
        
        return entropy
    }
    
    /**
     * Validate JWT secret complexity with user-friendly warnings
     * Requirements:
     * - Minimum 32 characters (enforced - security critical)
     * - Entropy and character diversity (warnings only for better UX)
     * - Provides helpful guidance instead of blocking startup
     */
    validateJwtSecret(secret: string | undefined): { 
        valid: boolean; 
        errors: string[]; 
        warnings: string[];
        canProceed: boolean;
        suggestions: string[];
    } {
        const errors: string[] = []
        const warnings: string[] = []
        const suggestions: string[] = []
        
        // Critical length check - must be enforced for security
        if (!secret || secret.length < 32) {
            errors.push('JWT secret must be at least 32 characters long')
            suggestions.push('Generate with: openssl rand -base64 64')
            suggestions.push('Or use: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'base64\'))"')
        }
        
        // Only perform validation checks if secret exists and has minimum length
        if (secret && secret.length >= 32) {
            // Entropy check - now a warning instead of error
            const entropy = this.calculateEntropy(secret)
            const bitsPerChar = entropy
            if (bitsPerChar < 4.0) {
                warnings.push(`JWT secret has low entropy (${bitsPerChar.toFixed(2)} bits/char, recommended: 4.0+)`)
                suggestions.push('Consider using a more random secret for better security')
            }
            
            // Character diversity check - now a warning
            const hasUppercase = /[A-Z]/.test(secret)
            const hasLowercase = /[a-z]/.test(secret)
            const hasNumbers = /[0-9]/.test(secret)
            const hasSpecial = /[^A-Za-z0-9]/.test(secret)
        
            const diversityCount = [hasUppercase, hasLowercase, hasNumbers, hasSpecial].filter(Boolean).length
        
            if (diversityCount < 3) {
                warnings.push('JWT secret should contain at least 3 of: uppercase, lowercase, numbers, special characters')
                suggestions.push('Mix different character types for stronger security')
            }
        
        // Pattern checks - now warnings
            if (/(.)\1{3,}/.test(secret)) {
                warnings.push('JWT secret contains repeated characters')
                suggestions.push('Avoid patterns and repeated characters')
            }
        
            if (/^[a-zA-Z]+$/.test(secret) || /^[0-9]+$/.test(secret)) {
                warnings.push('JWT secret uses only one character type')
                suggestions.push('Use a mix of letters, numbers, and special characters')
            }
        }
        
        // System can proceed if minimum length is met
        const canProceed = !secret ? false : secret.length >= 32
        
        return {
            valid: errors.length === 0 && warnings.length === 0,
            errors,
            warnings,
            canProceed,
            suggestions
        }
    }
    
    /**
     * Generate a cryptographically secure JWT secret
     */
    generateSecureJwtSecret(length = 64): string {
        // Use a character set that provides good entropy
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
        const bytes = crypto.randomBytes(length)
        let secret = ''
        
        for (let i = 0; i < length; i++) {
            const byte = bytes[i]
            if (byte !== undefined) {
                secret += charset[byte % charset.length]
            }
        }
        
        return secret
    }
    
    /**
     * Validate password complexity
     * Requirements:
     * - Minimum 8 characters (user-friendly length)
     * - At least one uppercase letter
     * - At least one lowercase letter
     * - At least one number
     * - At least one special character
     * - No common passwords
     * - No sequential characters
     * - No repeated characters (3+ in a row)
     */
    validatePassword(password: string | undefined): { valid: boolean; errors: string[]; score: number } {
        const errors: string[] = []
        let score = 0
        
        if (!password) {
            errors.push('Password is required')
            return { valid: false, errors, score: 0 }
        }
        
        // Length check - reduced from 12 to 8 for better usability
        if (password.length < 8) {
            errors.push('Password must be at least 8 characters long')
        } else {
            score += 1
            if (password.length >= 12) score += 1
            if (password.length >= 16) score += 1
            if (password.length >= 20) score += 1
        }
        
        // Character requirements
        const hasUppercase = /[A-Z]/.test(password)
        const hasLowercase = /[a-z]/.test(password)
        const hasNumbers = /[0-9]/.test(password)
        const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
        
        if (!hasUppercase) errors.push('Password must contain at least one uppercase letter')
        else score += 1
        
        if (!hasLowercase) errors.push('Password must contain at least one lowercase letter')
        else score += 1
        
        if (!hasNumbers) errors.push('Password must contain at least one number')
        else score += 1
        
        if (!hasSpecial) errors.push('Password must contain at least one special character')
        else score += 1
        
        // Pattern checks
        if (/(.)\1{2,}/.test(password)) {
            errors.push('Password must not contain 3 or more repeated characters in a row')
            score -= 1
        }
        
        // Sequential characters check
        const sequentialPatterns = [
            'abc', 'bcd', 'cde', 'def', 'efg', 'fgh', 'ghi', 'hij', 'ijk', 'jkl',
            'klm', 'lmn', 'mno', 'nop', 'opq', 'pqr', 'qrs', 'rst', 'stu', 'tuv',
            'uvw', 'vwx', 'wxy', 'xyz', '012', '123', '234', '345', '456', '567',
            '678', '789', '890'
        ]
        
        const lowerPassword = password.toLowerCase()
        for (const pattern of sequentialPatterns) {
            if (lowerPassword.includes(pattern) || lowerPassword.includes(pattern.split('').reverse().join(''))) {
                errors.push('Password must not contain sequential characters')
                score -= 1
                break
            }
        }
        
        // Common password check
        const commonPasswords = [
            'password', 'password123', 'admin', 'letmein', 'welcome', 'monkey',
            'dragon', 'baseball', 'football', 'qwerty', 'asdfgh', 'zxcvbn',
            'trustno1', 'superman', 'iloveyou', 'sunshine', 'master', 'shadow'
        ]
        
        for (const common of commonPasswords) {
            if (lowerPassword.includes(common)) {
                errors.push('Password is too common or contains common words')
                score -= 2
                break
            }
        }
        
        // Entropy check
        const entropy = this.calculateEntropy(password)
        if (entropy < 3.0) {
            errors.push('Password has insufficient randomness')
            score -= 1
        } else if (entropy > 4.5) {
            score += 2
        }
        
        // Normalize score to 0-10
        score = Math.max(0, Math.min(10, score))
        
        return {
            valid: errors.length === 0,
            errors,
            score
        }
    }
    
    /**
     * Hash a password using bcrypt with appropriate cost factor
     */
    async hashPassword(password: string): Promise<string> {
        const saltRounds = 12 // OWASP recommended minimum for 2024
        return bcrypt.hash(password, saltRounds)
    }
    
    /**
     * Compare a plain text password with a bcrypt hash
     */
    async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash)
    }
    
    /**
     * Generate a secure random token
     */
    generateSecureToken(length = 32): string {
        return crypto.randomBytes(length).toString('hex')
    }
    
    /**
     * Sanitize user input to prevent injection attacks
     */
    sanitizeInput(input: string): string {
        // Remove null bytes
        let sanitized = input.replace(/\0/g, '')
        
        // Trim whitespace
        sanitized = sanitized.trim()
        
        // Remove control characters except newlines and tabs
        // REQUIRED: This regex intentionally uses control character ranges for security sanitization.
        // The no-control-regex rule is disabled because we specifically need to match control chars.
        // Do NOT remove this disable - it's essential for proper input sanitization.
        sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')  // eslint-disable-line no-control-regex
        
        return sanitized
    }
    
    /**
     * Validate email format with strict rules
     */
    validateEmail(email: string): boolean {
        // RFC 5322 compliant email regex
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
        
        if (!emailRegex.test(email)) {
            return false
        }
        
        // Additional checks
        const [localPart] = email.split('@');
        if (!localPart) {
            return false;
        }
        
        // Check local part length (max 64 chars per RFC)
        if (localPart.length > 64) {
            return false
        }
        
        // Check total length (max 254 chars)
        if (email.length > 254) {
            return false
        }
        
        // Check for consecutive dots
        if (email.includes('..')) {
            return false
        }
        
        return true
    }
    
    /**
     * Create a security audit log entry
     */
    createSecurityAuditLog(event: {
        type: 'AUTH_ATTEMPT' | 'AUTH_SUCCESS' | 'AUTH_FAILURE' | 'PASSWORD_CHANGE' | 
              'PERMISSION_DENIED' | 'SUSPICIOUS_ACTIVITY' | 'RATE_LIMIT_EXCEEDED' |
              'SESSION_INVALIDATED' | 'TOKEN_REFRESH' | 'ACCOUNT_LOCKED'
        userId?: string
        email?: string
        ip?: string
        userAgent?: string
        details?: Record<string, unknown>
    }) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            ...event,
            severity: this.getEventSeverity(event.type)
        }
        
        // Log with appropriate level based on severity
        switch (logEntry.severity) {
            case 'critical':
            case 'high':
                this.logger.error(`SECURITY EVENT: ${JSON.stringify(logEntry)}`)
                break
            case 'medium':
                this.logger.warn(`SECURITY EVENT: ${JSON.stringify(logEntry)}`)
                break
            default:
                this.logger.log(`SECURITY EVENT: ${JSON.stringify(logEntry)}`)
        }
        
        return logEntry
    }
    
    private getEventSeverity(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
        const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
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
        }
        
        return severityMap[eventType] || 'low'
    }
}
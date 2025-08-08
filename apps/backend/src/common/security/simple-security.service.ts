import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

/**
 * Simplified Security Service for MVP
 * Essential security functions without enterprise complexity
 */
@Injectable()
export class SimpleSecurityService {
  /**
   * Validate password strength with practical requirements
   */
  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for obvious weak patterns
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password must not contain 3 or more repeated characters');
    }

    const commonPasswords = [
      'password', 'password123', 'admin', 'letmein', 'welcome',
      'qwerty', 'asdfgh', '123456789'
    ];

    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      errors.push('Password is too common');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate JWT secret meets minimum requirements
   */
  validateJwtSecret(secret: string): { valid: boolean; error?: string } {
    if (!secret || secret.length < 32) {
      return {
        valid: false,
        error: 'JWT secret must be at least 32 characters long'
      };
    }

    return { valid: true };
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Basic input sanitization
   */
  sanitizeInput(input: string): string {
    if (!input) return '';

    // Remove control characters - this is intentional for security sanitization
    return input
      .replace(/\0/g, '') // Remove null bytes
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // Remove control characters
      .trim();
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    const emailParts = email.split('@');
    const localPart = emailParts[0];
    
    return emailRegex.test(email) && 
           email.length <= 254 && 
           !email.includes('..') &&
           localPart !== undefined && localPart.length <= 64;
  }

  /**
   * Check if request contains suspicious patterns
   */
  isSuspiciousInput(input: string): boolean {
    const suspiciousPatterns = [
      /union.*select/i,
      /insert.*into/i,
      /delete.*from/i,
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i, // Event handlers like onclick=
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
  }
}
/**
 * Authentication Service
 * 
 * Encapsulates authentication business logic and orchestrates auth operations.
 * Provides a framework-agnostic interface for all authentication concerns.
 */

import type { Result, User } from '@repo/shared';
import type { AuthRepository, SignUpData, AuthResult } from '@/repositories/interfaces';
import { Email, ValidationError } from '@repo/shared';

export interface AuthenticationService {
  signIn(credentials: SignInCredentials): Promise<Result<AuthResult>>;
  signUp(userData: SignUpData): Promise<Result<AuthResult>>;
  signOut(): Promise<Result<void>>;
  resetPassword(email: string): Promise<Result<void>>;
  updatePassword(currentPassword: string, newPassword: string): Promise<Result<void>>;
  getCurrentUser(): Promise<Result<User | null>>;
  refreshSession(): Promise<Result<AuthResult>>;
  validateSession(): Promise<Result<boolean>>;
  getPasswordStrength(password: string): { score: number; feedback: string[]; isStrong: boolean };
  isEmailValid(email: string): boolean;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface PasswordValidationRules {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

export class DefaultAuthenticationService implements AuthenticationService {
  private readonly passwordRules: PasswordValidationRules = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  };

  constructor(private readonly authRepository: AuthRepository) {}

  async signIn(credentials: SignInCredentials): Promise<Result<AuthResult>> {
    // Validate input
    const validation = this.validateSignInCredentials(credentials);
    if (!validation.success) {
      return validation;
    }

    // Normalize email
    const normalizedEmail = credentials.email.toLowerCase().trim();

    // Attempt sign in
    return this.authRepository.signIn(normalizedEmail, credentials.password);
  }

  async signUp(userData: SignUpData): Promise<Result<AuthResult>> {
    // Validate input
    const validation = this.validateSignUpData(userData);
    if (!validation.success) {
      return validation;
    }

    // Normalize data
    const normalizedUserData: SignUpData = {
      email: userData.email.toLowerCase().trim(),
      password: userData.password,
      fullName: userData.fullName.trim(),
      companyName: userData.companyName?.trim() || undefined,
    };

    // Attempt sign up
    return this.authRepository.signUp(normalizedUserData);
  }

  async signOut(): Promise<Result<void>> {
    return this.authRepository.signOut();
  }

  async resetPassword(email: string): Promise<Result<void>> {
    // Validate email
    try {
      new Email(email);
    } catch {
      return {
        success: false,
        error: new ValidationError('Please enter a valid email address', 'email'),
      };
    }

    const normalizedEmail = email.toLowerCase().trim();
    return this.authRepository.resetPassword(normalizedEmail);
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<Result<void>> {
    // Validate new password
    const validation = this.validatePassword(newPassword);
    if (!validation.success) {
      return validation;
    }

    // Check if passwords are different
    if (currentPassword === newPassword) {
      return {
        success: false,
        error: new ValidationError('New password must be different from current password', 'newPassword'),
      };
    }

    return this.authRepository.updatePassword(newPassword);
  }

  async getCurrentUser(): Promise<Result<User | null>> {
    return this.authRepository.getCurrentUser();
  }

  async refreshSession(): Promise<Result<AuthResult>> {
    return this.authRepository.refreshToken();
  }

  async validateSession(): Promise<Result<boolean>> {
    const userResult = await this.getCurrentUser();
    
    if (!userResult.success) {
      return {
        success: true,
        value: false,
      };
    }

    return {
      success: true,
      value: userResult.value !== null,
    };
  }

  // Private validation methods

  private validateSignInCredentials(credentials: SignInCredentials): Result<void> {
    const errors: string[] = [];

    // Validate email
    try {
      new Email(credentials.email);
    } catch {
      errors.push('Please enter a valid email address');
    }

    // Validate password presence
    if (!credentials.password || credentials.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: new ValidationError(errors.join('; ')),
      };
    }

    return { success: true, value: undefined };
  }

  private validateSignUpData(userData: SignUpData): Result<void> {
    const errors: string[] = [];

    // Validate email
    try {
      new Email(userData.email);
    } catch {
      errors.push('Please enter a valid email address');
    }

    // Validate password
    const passwordValidation = this.validatePassword(userData.password);
    if (!passwordValidation.success) {
      errors.push(passwordValidation.error.message);
    }

    // Validate full name
    if (!userData.fullName || userData.fullName.trim().length < 2) {
      errors.push('Full name must be at least 2 characters');
    }

    // Validate company name if provided
    if (userData.companyName && userData.companyName.trim().length < 2) {
      errors.push('Company name must be at least 2 characters when provided');
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: new ValidationError(errors.join('; ')),
      };
    }

    return { success: true, value: undefined };
  }

  private validatePassword(password: string): Result<void> {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return {
        success: false,
        error: new ValidationError(errors.join('; ')),
      };
    }

    if (password.length < this.passwordRules.minLength) {
      errors.push(`Password must be at least ${this.passwordRules.minLength} characters`);
    }

    if (this.passwordRules.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.passwordRules.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.passwordRules.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.passwordRules.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: new ValidationError(errors.join('; ')),
      };
    }

    return { success: true, value: undefined };
  }

  // Business rule methods

  public getPasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= this.passwordRules.minLength) {
      score += 20;
    } else {
      feedback.push(`Use at least ${this.passwordRules.minLength} characters`);
    }

    if (/[A-Z]/.test(password)) {
      score += 20;
    } else {
      feedback.push('Add uppercase letters');
    }

    if (/[a-z]/.test(password)) {
      score += 20;
    } else {
      feedback.push('Add lowercase letters');
    }

    if (/\d/.test(password)) {
      score += 20;
    } else {
      feedback.push('Add numbers');
    }

    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(password)) {
      score += 20;
    } else {
      feedback.push('Add special characters');
    }

    // Bonus points for length
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    return {
      score: Math.min(100, score),
      feedback,
      isStrong: score >= 80,
    };
  }

  public isEmailValid(email: string): boolean {
    try {
      new Email(email);
      return true;
    } catch {
      return false;
    }
  }

  public normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }
}
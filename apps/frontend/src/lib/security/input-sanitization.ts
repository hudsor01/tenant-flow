/**
 * Enterprise Input Sanitization and XSS Prevention
 * Comprehensive protection against injection attacks
 */

import DOMPurify from 'isomorphic-dompurify';

interface SanitizationConfig {
  allowedTags: string[];
  allowedAttributes: Record<string, string[]>;
  allowedSchemes: string[];
  forbiddenTags: string[];
  forbiddenAttributes: string[];
}

// Default configuration for different contexts
const SANITIZATION_CONFIGS: Record<string, SanitizationConfig> = {
  // Strict: No HTML allowed at all
  strict: {
    allowedTags: [],
    allowedAttributes: {},
    allowedSchemes: [],
    forbiddenTags: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'textarea'],
    forbiddenAttributes: ['on*', 'javascript:', 'vbscript:', 'data:'],
  },
  
  // Basic: Only basic formatting
  basic: {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'span'],
    allowedAttributes: {
      '*': ['class'],
    },
    allowedSchemes: [],
    forbiddenTags: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'textarea', 'style'],
    forbiddenAttributes: ['on*', 'javascript:', 'vbscript:', 'data:', 'style'],
  },
  
  // Rich: Rich text editing (controlled)
  rich: {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'span', 'div',
      'b', 'i', 'u', 'em', 'strong',
      'ul', 'ol', 'li',
      'a', 'img',
      'blockquote', 'code', 'pre',
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'target'],
      'img': ['src', 'alt', 'title', 'width', 'height'],
      '*': ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    forbiddenTags: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'textarea', 'style'],
    forbiddenAttributes: ['on*', 'javascript:', 'vbscript:', 'data:'],
  },
};

/**
 * Comprehensive XSS patterns for detection
 */
const XSS_PATTERNS = [
  // Script injection
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi,
  
  // Data URLs with executable content
  /data:text\/html/gi,
  /data:text\/javascript/gi,
  /data:application\/javascript/gi,
  
  // Expression and CSS injection
  /expression\s*\(/gi,
  /behaviour\s*:/gi,
  /-moz-binding\s*:/gi,
  
  // Common XSS vectors
  /<iframe[\s\S]*?>/gi,
  /<object[\s\S]*?>/gi,
  /<embed[\s\S]*?>/gi,
  /<form[\s\S]*?>/gi,
  /<input[\s\S]*?>/gi,
  /<textarea[\s\S]*?>/gi,
  
  // SVG XSS vectors
  /<svg[\s\S]*?on\w+[\s\S]*?>/gi,
  
  // Meta refresh redirects
  /<meta[\s\S]*?http-equiv[\s\S]*?refresh/gi,
];

/**
 * SQL Injection patterns for detection
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
  /(\b(or|and)\b\s+\d+\s*=\s*\d+)/gi,
  /(['"])\s*;\s*(drop|delete|insert|update)/gi,
  /(\bor\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/gi,
  /(\/\*[\s\S]*?\*\/)/gi,
  /(--\s*[\r\n])/gi,
];

/**
 * Path traversal patterns
 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.[\\/]/g,
  /~[\\/]/g,
  /\%2e\%2e[\\/]/gi,
  /\%252e\%252e[\\/]/gi,
];

/**
 * Command injection patterns
 */
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$()]/g,
  /\b(cat|ls|pwd|id|whoami|uname|wget|curl|nc|netcat)\b/gi,
];

/**
 * Sanitize HTML content using DOMPurify with custom configuration
 */
export function sanitizeHTML(
  input: string,
  profile: keyof typeof SANITIZATION_CONFIGS = 'basic'
): string {
  if (typeof input !== 'string' || !input.trim()) {
    return '';
  }
  
  const config = SANITIZATION_CONFIGS[profile];
  
  // Configure DOMPurify
  const cleanConfig = {
    ALLOWED_TAGS: config.allowedTags,
    ALLOWED_ATTR: Object.keys(config.allowedAttributes).reduce((acc, tag) => {
      return [...acc, ...config.allowedAttributes[tag]];
    }, [] as string[]),
    ALLOWED_URI_REGEXP: config.allowedSchemes.length > 0 
      ? new RegExp(`^(?:${config.allowedSchemes.join('|')}):`, 'i')
      : /^$/,
    FORBID_TAGS: config.forbiddenTags,
    FORBID_ATTR: config.forbiddenAttributes,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
  };
  
  return DOMPurify.sanitize(input, cleanConfig);
}

/**
 * Sanitize plain text (escape HTML entities)
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize URLs to prevent javascript: and data: schemes
 */
export function sanitizeURL(url: string): string {
  if (typeof url !== 'string' || !url.trim()) {
    return '';
  }
  
  const trimmedUrl = url.trim();
  
  // Block dangerous schemes
  const dangerousSchemes = /^(javascript|vbscript|data|file|ftp):/i;
  if (dangerousSchemes.test(trimmedUrl)) {
    return '';
  }
  
  // Only allow http, https, mailto, and relative URLs
  const allowedSchemes = /^(https?|mailto):/i;
  const isRelative = /^[\/\.\w-]/.test(trimmedUrl);
  
  if (!allowedSchemes.test(trimmedUrl) && !isRelative) {
    return '';
  }
  
  return encodeURI(decodeURI(trimmedUrl));
}

/**
 * Detect XSS attempts in input
 */
export function detectXSS(input: string): {
  isXSS: boolean;
  patterns: string[];
  severity: 'low' | 'medium' | 'high';
} {
  if (typeof input !== 'string') {
    return { isXSS: false, patterns: [], severity: 'low' };
  }
  
  const detectedPatterns: string[] = [];
  
  for (const pattern of XSS_PATTERNS) {
    const matches = input.match(pattern);
    if (matches) {
      detectedPatterns.push(pattern.source);
    }
  }
  
  const severity = detectedPatterns.length > 2 ? 'high' : 
                  detectedPatterns.length > 0 ? 'medium' : 'low';
  
  return {
    isXSS: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    severity,
  };
}

/**
 * Detect SQL injection attempts
 */
export function detectSQLInjection(input: string): {
  isSQLI: boolean;
  patterns: string[];
  severity: 'low' | 'medium' | 'high';
} {
  if (typeof input !== 'string') {
    return { isSQLI: false, patterns: [], severity: 'low' };
  }
  
  const detectedPatterns: string[] = [];
  
  for (const pattern of SQL_INJECTION_PATTERNS) {
    const matches = input.match(pattern);
    if (matches) {
      detectedPatterns.push(pattern.source);
    }
  }
  
  const severity = detectedPatterns.length > 2 ? 'high' : 
                  detectedPatterns.length > 0 ? 'medium' : 'low';
  
  return {
    isSQLI: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    severity,
  };
}

/**
 * Detect path traversal attempts
 */
export function detectPathTraversal(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  
  return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Detect command injection attempts
 */
export function detectCommandInjection(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  
  return COMMAND_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Comprehensive input validation and sanitization
 */
export function validateAndSanitizeInput(
  input: unknown,
  options: {
    type?: 'text' | 'html' | 'url' | 'email' | 'phone' | 'number';
    maxLength?: number;
    allowEmpty?: boolean;
    htmlProfile?: keyof typeof SANITIZATION_CONFIGS;
    strict?: boolean;
  } = {}
): {
  valid: boolean;
  sanitized: string;
  errors: string[];
  warnings: string[];
} {
  const {
    type = 'text',
    maxLength = 10000,
    allowEmpty = false,
    htmlProfile = 'basic',
    strict = false
  } = options;
  
  const errors: string[] = [];
  const warnings: string[] = [];
  let sanitized = '';
  
  // Type validation
  if (typeof input !== 'string') {
    if (input === null || input === undefined) {
      if (!allowEmpty) {
        errors.push('Input is required');
      }
      return { valid: allowEmpty, sanitized: '', errors, warnings };
    } else {
      input = String(input);
    }
  }
  
  const stringInput = input as string;
  
  // Length validation
  if (stringInput.length > maxLength) {
    errors.push(`Input exceeds maximum length of ${maxLength} characters`);
    return { valid: false, sanitized: '', errors, warnings };
  }
  
  if (!allowEmpty && stringInput.trim().length === 0) {
    errors.push('Input cannot be empty');
    return { valid: false, sanitized: '', errors, warnings };
  }
  
  // Security checks
  const xssCheck = detectXSS(stringInput);
  const sqliCheck = detectSQLInjection(stringInput);
  const pathTraversalCheck = detectPathTraversal(stringInput);
  const commandInjectionCheck = detectCommandInjection(stringInput);
  
  if (strict) {
    if (xssCheck.isXSS) {
      errors.push('Potential XSS content detected');
    }
    if (sqliCheck.isSQLI) {
      errors.push('Potential SQL injection detected');
    }
    if (pathTraversalCheck) {
      errors.push('Path traversal attempt detected');
    }
    if (commandInjectionCheck) {
      errors.push('Command injection attempt detected');
    }
  } else {
    // Non-strict mode: warn but sanitize
    if (xssCheck.isXSS && xssCheck.severity === 'high') {
      warnings.push('Potentially malicious content was sanitized');
    }
    if (sqliCheck.isSQLI) {
      warnings.push('SQL-like patterns were detected and sanitized');
    }
  }
  
  // Type-specific sanitization
  switch (type) {
    case 'html':
      sanitized = sanitizeHTML(stringInput, htmlProfile);
      break;
    case 'url':
      sanitized = sanitizeURL(stringInput);
      break;
    case 'email':
      // Basic email sanitization (additional validation should be done with schema)
      sanitized = sanitizeText(stringInput.toLowerCase().trim());
      break;
    case 'phone':
      // Remove all non-numeric characters except +, spaces, hyphens, parentheses
      sanitized = stringInput.replace(/[^\d\s\-\(\)\+]/g, '');
      break;
    case 'number':
      // Remove all non-numeric characters except decimal point and minus
      sanitized = stringInput.replace(/[^\d\.\-]/g, '');
      break;
    case 'text':
    default:
      sanitized = sanitizeText(stringInput);
      break;
  }
  
  return {
    valid: errors.length === 0,
    sanitized,
    errors,
    warnings,
  };
}

/**
 * Sanitize form data object
 */
export function sanitizeFormData<T extends Record<string, unknown>>(
  formData: T,
  fieldConfigs: Partial<Record<keyof T, Parameters<typeof validateAndSanitizeInput>[1]>> = {}
): {
  valid: boolean;
  sanitized: Partial<T>;
  errors: Record<keyof T, string[]>;
  warnings: Record<keyof T, string[]>;
} {
  const sanitized: Partial<T> = {};
  const errors: Record<keyof T, string[]> = {} as Record<keyof T, string[]>;
  const warnings: Record<keyof T, string[]> = {} as Record<keyof T, string[]>;
  let valid = true;
  
  for (const [key, value] of Object.entries(formData)) {
    const config = fieldConfigs[key as keyof T] || {};
    const result = validateAndSanitizeInput(value, config);
    
    if (!result.valid) {
      valid = false;
      errors[key as keyof T] = result.errors;
    }
    
    if (result.warnings.length > 0) {
      warnings[key as keyof T] = result.warnings;
    }
    
    sanitized[key as keyof T] = result.sanitized as T[keyof T];
  }
  
  return { valid, sanitized, errors, warnings };
}

/**
 * Create a sanitization middleware for API routes
 */
export function createSanitizationMiddleware(
  fieldConfigs: Record<string, Parameters<typeof validateAndSanitizeInput>[1]>
) {
  return (req: { headers: { get: (key: string) => string | null }; body?: unknown }, res: { status: (code: number) => { json: (data: unknown) => void }; setHeader: (key: string, value: string) => void }, next: () => void) => {
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json') && req.body) {
      const result = sanitizeFormData(req.body as Record<string, unknown>, fieldConfigs);
      
      if (!result.valid) {
        res.status(400).json({
          error: 'Invalid input data',
          details: result.errors,
        });
        return;
      }
      
      if (req.body) {
        (req as { body: unknown }).body = result.sanitized;
      }
      
      if (Object.keys(result.warnings).length > 0) {
        res.setHeader('X-Input-Warnings', JSON.stringify(result.warnings));
      }
    }
    
    next();
  };
}
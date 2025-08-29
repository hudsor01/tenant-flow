/**
 * ESLint Rule: no-manual-validation-schemas
 * 
 * Prevents manual creation of authentication validation schemas when auto-generated ones exist.
 * Enforces single source of truth by requiring imports from generated-auth-schemas.ts.
 * 
 * CLAUDE.md Compliance: DRY principle - eliminates schema duplication
 * 
 * Examples of violations:
 * - const loginSchema = z.object({ email: z.string().email(), password: z.string() })
 * - export const signupSchema = z.object({ ... })
 * 
 * Correct usage:
 * - import { loginSchema } from './generated-auth-schemas'
 */

// Simple rule creation without TypeScript utils to avoid version conflicts
const createRule = (config) => config

const FORBIDDEN_AUTH_SCHEMAS = [
  'loginSchema',
  'signupSchema', 
  'registerSchema',
  'forgotPasswordSchema',
  'resetPasswordSchema',
  'changePasswordSchema',
  'refreshTokenSchema',
  'authResponseSchema',
  'userProfileResponseSchema'
]

const AUTH_SCHEMA_PATTERNS = [
  /login.*schema/i,
  /signup.*schema/i,
  /register.*schema/i,
  /auth.*schema/i,
  /password.*schema/i,
  /user.*schema/i
]

export default createRule({
  name: 'no-manual-validation-schemas',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevents manual creation of authentication schemas when auto-generated ones exist',
      recommended: 'error'
    },
    messages: {
      manualAuthSchema: 'Manual authentication schema "{{schemaName}}" is forbidden. Import from generated-auth-schemas.ts instead.',
      suspiciousSchema: 'Schema "{{schemaName}}" appears to be authentication-related. Consider using generated schemas.',
      missingImport: 'Authentication schema detected but no import from generated-auth-schemas.ts found in this file.'
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const filename = context.getFilename()
    const sourceCode = context.getSourceCode()
    
    // Skip generated files and test files
    if (filename.includes('generated-auth-schemas.ts') || 
        filename.includes('.test.') || 
        filename.includes('.spec.')) {
      return {}
    }

    let hasGeneratedImport = false
    const manualSchemas = []

    return {
      // Check for imports from generated-auth-schemas
      ImportDeclaration(node) {
        if (node.source.value && node.source.value.includes('generated-auth-schemas')) {
          hasGeneratedImport = true
        }
      },

      // Check variable declarations for manual schema creation
      VariableDeclarator(node) {
        if (!node.id || node.id.type !== 'Identifier' || !node.init) return

        const schemaName = node.id.name
        
        // Check if this is a forbidden auth schema name
        if (FORBIDDEN_AUTH_SCHEMAS.includes(schemaName)) {
          // Check if it's a Zod schema (has z.object, z.string, etc.)
          const initCode = sourceCode.getText(node.init)
          if (initCode.includes('z.object') || initCode.includes('z.string')) {
            manualSchemas.push({
              node,
              schemaName,
              isForbidden: true
            })
          }
        }
        
        // Check for suspicious schema patterns
        else if (AUTH_SCHEMA_PATTERNS.some(pattern => pattern.test(schemaName))) {
          const initCode = sourceCode.getText(node.init)
          if (initCode.includes('z.object') || initCode.includes('z.string')) {
            manualSchemas.push({
              node,
              schemaName,
              isSuspicious: true
            })
          }
        }
      },

      // Check export declarations
      ExportNamedDeclaration(node) {
        if (node.declaration && node.declaration.type === 'VariableDeclaration') {
          for (const declarator of node.declaration.declarations) {
            if (declarator.id && declarator.id.type === 'Identifier') {
              const schemaName = declarator.id.name
              
              if (FORBIDDEN_AUTH_SCHEMAS.includes(schemaName)) {
                const initCode = sourceCode.getText(declarator.init || {})
                if (initCode.includes('z.object') || initCode.includes('z.string')) {
                  manualSchemas.push({
                    node: declarator,
                    schemaName,
                    isForbidden: true
                  })
                }
              }
            }
          }
        }
      },

      // After processing all nodes, report violations
      'Program:exit'(node) {
        for (const schema of manualSchemas) {
          if (schema.isForbidden) {
            context.report({
              node: schema.node,
              messageId: 'manualAuthSchema',
              data: { schemaName: schema.schemaName }
            })
          } else if (schema.isSuspicious && !hasGeneratedImport) {
            context.report({
              node: schema.node,
              messageId: 'suspiciousSchema', 
              data: { schemaName: schema.schemaName }
            })
          }
        }

        // If we found manual auth schemas but no generated import, suggest it
        if (manualSchemas.some(s => s.isForbidden) && !hasGeneratedImport) {
          context.report({
            node,
            messageId: 'missingImport'
          })
        }
      }
    }
  }
})
/**
 * ESLint Rule: enforce-schema-generation
 * 
 * Ensures schemas are imported from generated files instead of being manually defined.
 * Enforces single source of truth by requiring use of generated schemas.
 * 
 * CLAUDE.md Compliance: DRY principle + Single Source of Truth
 * 
 * Examples of violations:
 * - import { z } from 'zod' followed by manual z.object definitions
 * - Creating schemas that already exist in generated files
 * 
 * Correct usage:
 * - import { loginSchema } from './generated-auth-schemas'
 * - import { propertySchema } from '@repo/shared/validation'
 */

// Simple rule creation without TypeScript utils to avoid version conflicts
const createRule = (config) => config

const GENERATED_SCHEMA_FILES = [
  'generated-auth-schemas',
  '@repo/shared/validation'
]

const GENERATED_SCHEMA_NAMES = [
  // Auth schemas (should come from generated-auth-schemas)
  'loginSchema',
  'signupSchema',
  'registerSchema',
  'forgotPasswordSchema',
  'resetPasswordSchema',
  'changePasswordSchema',
  'refreshTokenSchema',
  'authResponseSchema',
  'userProfileResponseSchema',

  // Shared schemas (should come from @repo/shared/validation)
  'propertyInputSchema',
  'propertyFormSchema',
  'propertySchema',
  'editPropertySchema',
  'tenantInputSchema',
  'tenantFormSchema',
  'tenantSchema',
  'editTenantSchema',
  'unitInputSchema',
  'unitFormSchema',
  'unitEditFormSchema',
  'maintenanceRequestInputSchema',
  'maintenanceRequestFormSchema',
  'maintenanceSchema',
  'updateMaintenanceSchema',
  'statusUpdateSchema',
  'leaseInputSchema',
  'leaseSchema',
  'editLeaseSchema',
  'contactFormZodSchema',
  'contactFormResponseZodSchema',
  'loginZodSchema',
  'registerZodSchema',
  'propertyZodSchema'
]

export default createRule({
  name: 'enforce-schema-generation',
  meta: {
    type: 'problem',
    docs: {
      description: 'ALL Zod schemas MUST be centralized - zero exceptions allowed',
      recommended: 'error'
    },
    messages: {
      useGeneratedSchema: 'ERROR: Schema "{{schemaName}}" MUST be imported from {{sourceFile}}. ALL schemas must be centralized - no exceptions.',
      missingGeneratedImport: 'ERROR: File uses Zod schemas but missing imports from centralized files. Import from {{suggestedFiles}}.',
      manualSchemaDetected: 'ERROR: Manual schema definition detected. ALL Zod schemas MUST be centralized in @repo/shared/validation or generated files.',
      allSchemasMustBeCentralized: 'ERROR: ALL Zod schemas MUST be centralized. Move this schema to @repo/shared/validation immediately.'
    },
    schema: [{
      type: 'object',
      properties: {
        requireGeneratedImports: {
          type: 'boolean'
        }
      },
      additionalProperties: false
    }]
  },
  defaultOptions: [{
    requireGeneratedImports: true
  }],
  create(context, options = [{}]) {
    const [config = {}] = Array.isArray(options) ? options : [options];
    const filename = context.getFilename()
    const sourceCode = context.getSourceCode()
    const { requireGeneratedImports = true } = config

    // Skip generated files and test files
    if (filename.includes('generated-') || 
        filename.includes('.test.') || 
        filename.includes('.spec.') ||
        filename.includes('validate-env.ts')) {
      return {}
    }

    let hasZodImport = false
    let hasGeneratedImports = false
    const generatedImportSources = new Set()
    const manualSchemas = []
    const schemaUsage = []

    return {
      // Track imports
      ImportDeclaration(node) {
        const source = node.source.value

        // Check for Zod import
        if (source === 'zod') {
          hasZodImport = true
        }

        // Check for generated schema imports
        if (GENERATED_SCHEMA_FILES.some(file => source.includes(file))) {
          hasGeneratedImports = true
          generatedImportSources.add(source)
        }
      },

      // Also check export declarations that re-export from generated files
      ExportNamedDeclaration(node) {
        if (node.source && node.source.value) {
          const source = node.source.value
          if (GENERATED_SCHEMA_FILES.some(file => source.includes(file))) {
            hasGeneratedImports = true
            generatedImportSources.add(source)
          }
        }

        if (node.declaration && node.declaration.type === 'VariableDeclaration') {
          for (const declarator of node.declaration.declarations) {
            if (declarator.id && declarator.id.type === 'Identifier') {
              const schemaName = declarator.id.name

              if (GENERATED_SCHEMA_NAMES.includes(schemaName)) {
                const initCode = sourceCode.getText(declarator.init || {})
                if (initCode.includes('z.object') || initCode.includes('z.string')) {
                  const sourceFile = getExpectedSourceFile(schemaName)
                  context.report({
                    node: declarator,
                    messageId: 'useGeneratedSchema',
                    data: { schemaName, sourceFile }
                  })
                }
              }
            }
          }
        }
      },

      // Check variable declarations for schemas that should be centralized
      VariableDeclarator(node) {
        if (!node.id || node.id.type !== 'Identifier' || !node.init) return

        const schemaName = node.id.name

        // Check if this looks like a schema definition
        const initCode = sourceCode.getText(node.init)
        if (initCode.includes('z.object') || initCode.includes('z.string') || initCode.includes('z.number') || initCode.includes('z.enum') || initCode.includes('z.array') || initCode.includes('z.union') || initCode.includes('z.literal')) {

          // IMMEDIATE ERROR: Known schemas that should be centralized
          if (GENERATED_SCHEMA_NAMES.includes(schemaName)) {
            const sourceFile = getExpectedSourceFile(schemaName)
            context.report({
              node,
              messageId: 'useGeneratedSchema',
              data: { schemaName, sourceFile }
            })
            return
          }

          // SMART DETECTION: Only flag schemas that should be centralized
          const shouldBeCentralized = isSchemaComplexOrReusable(initCode, schemaName, filename)

          if (shouldBeCentralized) {
            context.report({
              node,
              messageId: 'allSchemasMustBeCentralized'
            })
          }
        }
      },

      // Also check const declarations with object patterns - SMART DETECTION
      ObjectExpression(node) {
        // Check if this is inside a variable declarator that looks like a schema
        const parent = node.parent
        if (parent && parent.type === 'VariableDeclarator' && parent.id && parent.id.type === 'Identifier') {
          const schemaName = parent.id.name
          if (schemaName.endsWith('Schema') || schemaName.includes('schema')) {
            // Check if the object has schema-like properties
            const hasSchemaProps = node.properties.some(prop => {
              if (prop.type === 'Property' && prop.key && prop.key.type === 'Identifier') {
                const propName = prop.key.name
                return ['email', 'password', 'name', 'id', 'title', 'description'].includes(propName)
              }
              return false
            })

            if (hasSchemaProps) {
              if (GENERATED_SCHEMA_NAMES.includes(schemaName)) {
                const sourceFile = getExpectedSourceFile(schemaName)
                context.report({
                  node: parent,
                  messageId: 'useGeneratedSchema',
                  data: { schemaName, sourceFile }
                })
              } else {
                // Use smart detection for object schemas too
                const objectCode = sourceCode.getText(node)
                const shouldBeCentralized = isSchemaComplexOrReusable(objectCode, schemaName, filename)

                if (shouldBeCentralized) {
                  context.report({
                    node: parent,
                    messageId: 'allSchemasMustBeCentralized'
                  })
                }
              }
            }
          }
        }
      },


      // Track schema usage (identifiers that end with Schema)
      Identifier(node) {
        if (node.name.endsWith('Schema') && GENERATED_SCHEMA_NAMES.includes(node.name)) {
          schemaUsage.push(node.name)
        }
      },

      'Program:exit'(node) {
        // If file uses Zod but no generated imports, suggest adding them
        // BUT skip files that re-export from generated schemas (they're doing it right!)
        const hasReExportsFromGenerated = sourceCode.getText().includes('} from \'./generated-auth-schemas\'')
        
        if (hasZodImport && !hasGeneratedImports && requireGeneratedImports && !hasReExportsFromGenerated) {
          const usedGeneratedSchemas = schemaUsage.filter(name => 
            GENERATED_SCHEMA_NAMES.includes(name)
          )
          
          if (usedGeneratedSchemas.length > 0) {
            const suggestedFiles = GENERATED_SCHEMA_FILES.join(', ')
            context.report({
              node,
              messageId: 'missingGeneratedImport',
              data: { suggestedFiles }
            })
          }
        }

        // ALL manual schemas are forbidden - zero tolerance
        for (const schema of manualSchemas) {
          context.report({
            node: schema.node,
            messageId: 'allSchemasMustBeCentralized'
          })
        }
      }
    }

    function isSchemaComplexOrReusable(initCode, schemaName, filename) {
      // SMART RULES: Only centralize schemas that are actually worth centralizing

      // 1. Simple component-only schemas can stay local (2 fields or less)
      const fieldCount = (initCode.match(/:\s*z\./g) || []).length
      if (fieldCount <= 2) return false

      // 2. Test schemas can stay local
      if (filename.includes('.test.') || filename.includes('.spec.')) return false

      // 3. Component-specific prop schemas can stay local
      if (schemaName.includes('Props') && fieldCount <= 5) return false

      // 4. Domain/business schemas should be centralized
      const domainPatterns = [
        'user', 'property', 'tenant', 'lease', 'maintenance', 'payment',
        'auth', 'login', 'register', 'contact', 'billing'
      ]
      const isDomainSchema = domainPatterns.some(domain =>
        schemaName.toLowerCase().includes(domain)
      )

      // 5. Complex schemas (5+ fields) should be centralized
      const isComplex = fieldCount >= 5

      // 6. Schemas with business logic patterns should be centralized
      const hasBusinessPatterns = /email|password|phone|address|amount|currency|date/i.test(initCode)

      // 7. Form schemas that might be reused should be centralized
      const isReusableForm = schemaName.includes('Form') && fieldCount >= 3

      return isDomainSchema || isComplex || hasBusinessPatterns || isReusableForm
    }

    function getExpectedSourceFile(schemaName) {
      // Auth schemas should come from generated-auth-schemas
      const authSchemas = [
        'loginSchema', 'signupSchema', 'registerSchema', 'forgotPasswordSchema',
        'resetPasswordSchema', 'changePasswordSchema', 'refreshTokenSchema',
        'authResponseSchema', 'userProfileResponseSchema'
      ]

      if (authSchemas.includes(schemaName)) {
        return 'generated-auth-schemas.ts'
      }

      // Other schemas should come from shared validation
      return '@repo/shared/validation'
    }
  }
})
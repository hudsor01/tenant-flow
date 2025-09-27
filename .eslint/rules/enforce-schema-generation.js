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
      description: 'Ensures schemas are imported from generated files instead of being manually defined',
      recommended: 'error'
    },
    messages: {
      useGeneratedSchema: 'Schema "{{schemaName}}" should be imported from {{sourceFile}} instead of being manually defined.',
      missingGeneratedImport: 'File uses Zod schemas but is missing imports from generated schema files. Consider importing from {{suggestedFiles}}.',
      manualSchemaDetected: 'Manual schema definition detected. Check if this schema exists in generated files.',
      preferSharedValidation: 'Consider moving this schema to @repo/shared/validation for reusability.'
    },
    schema: [{
      type: 'object',
      properties: {
        allowManualSchemas: {
          type: 'array',
          items: { type: 'string' }
        },
        requireGeneratedImports: {
          type: 'boolean'
        }
      },
      additionalProperties: false
    }]
  },
  defaultOptions: [{
    allowManualSchemas: [
      'searchInputSchema',
      'dateInputSchema', 
      'futureDateSchema',
      'currencyInputSchema'
    ],
    requireGeneratedImports: true
  }],
  create(context, options = [{}]) {
    const [config = {}] = Array.isArray(options) ? options : [options];
    const filename = context.getFilename()
    const sourceCode = context.getSourceCode()
    const { allowManualSchemas = [], requireGeneratedImports = true } = config

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
              
              if (allowManualSchemas.includes(schemaName)) continue

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

      // Check variable declarations for manual schemas
      VariableDeclarator(node) {
        if (!node.id || node.id.type !== 'Identifier' || !node.init) return

        const schemaName = node.id.name

        // Skip allowed manual schemas
        if (allowManualSchemas.includes(schemaName)) return

        // Check if this looks like a schema definition
        const initCode = sourceCode.getText(node.init)
        if (initCode.includes('z.object') || initCode.includes('z.string') || initCode.includes('z.number') || initCode.includes('z.enum') || initCode.includes('z.array') || initCode.includes('z.union') || initCode.includes('z.literal')) {
          // Check if this schema name should be generated
          if (GENERATED_SCHEMA_NAMES.includes(schemaName)) {
            const sourceFile = getExpectedSourceFile(schemaName)
            context.report({
              node,
              messageId: 'useGeneratedSchema',
              data: { schemaName, sourceFile }
            })
          } else if (schemaName.endsWith('Schema') || schemaName.includes('schema') || schemaName.endsWith('ZodSchema') || initCode.includes('email') || initCode.includes('password') || initCode.includes('name')) {
            // Flag any schema-like patterns that might need to be centralized
            context.report({
              node,
              messageId: 'preferSharedValidation'
            })
          }
        }
      },

      // Also check const declarations with object patterns
      ObjectExpression(node) {
        // Check if this is inside a variable declarator that looks like a schema
        const parent = node.parent
        if (parent && parent.type === 'VariableDeclarator' && parent.id && parent.id.type === 'Identifier') {
          const schemaName = parent.id.name
          if ((schemaName.endsWith('Schema') || schemaName.includes('schema')) && !allowManualSchemas.includes(schemaName)) {
            // Check if the object has schema-like properties
            const hasSchemaProps = node.properties.some(prop => {
              if (prop.type === 'Property' && prop.key && prop.key.type === 'Identifier') {
                const propName = prop.key.name
                return ['email', 'password', 'name', 'id', 'title', 'description'].includes(propName)
              }
              return false
            })

            if (hasSchemaProps && GENERATED_SCHEMA_NAMES.includes(schemaName)) {
              const sourceFile = getExpectedSourceFile(schemaName)
              context.report({
                node: parent,
                messageId: 'useGeneratedSchema',
                data: { schemaName, sourceFile }
              })
            } else if (hasSchemaProps) {
              context.report({
                node: parent,
                messageId: 'preferSharedValidation'
              })
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

        // Report on manual schemas that might be duplicated
        for (const schema of manualSchemas) {
          // Check if it's a simple schema that could be shared
          if (schema.initCode.length > 100 && 
              (schema.schemaName.includes('Form') || 
               schema.schemaName.includes('Input') ||
               schema.schemaName.includes('Request'))) {
            context.report({
              node: schema.node,
              messageId: 'preferSharedValidation'
            })
          } else if (schema.initCode.includes('email') || 
                     schema.initCode.includes('password') ||
                     schema.initCode.includes('user')) {
            context.report({
              node: schema.node,
              messageId: 'manualSchemaDetected'
            })
          }
        }
      }
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
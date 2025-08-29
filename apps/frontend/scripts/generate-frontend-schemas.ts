#!/usr/bin/env tsx

/**
 * Generate Frontend Zod Schemas from Backend JSON Schemas
 * 
 * This script converts the backend's JSON Schema definitions into 
 * frontend Zod schemas, maintaining single source of truth for validation.
 * 
 * Benefits:
 * - Eliminates schema duplication between frontend and backend
 * - Ensures frontend/backend validation stays in sync
 * - Preserves native Fastify JSON Schema performance in backend
 * - Provides type-safe Zod validation for frontend forms
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { jsonSchemaToZod } from 'json-schema-to-zod'
import { z } from 'zod'

type JSONSchema = any // Permissive typing for JSON Schema objects

/**
 * Generate all frontend schemas using native features only
 */
async function generateSchemas() {
  console.log('🔄 Generating frontend Zod schemas from backend JSON schemas...')
  
  // Use native Node.js import from built backend files
  let backendSchemas: any
  try {
    backendSchemas = await import('../../backend/dist/schemas/auth.schemas.js')
    console.log('✅ Backend schemas imported successfully')
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ Backend schemas not found')
      console.error('💡 Solution: Run `turbo build --filter=@repo/backend` first')
      console.error('This ensures proper build dependency order.')
      process.exit(1)
    }
    // Re-throw unexpected errors (network, permissions, etc.)
    throw error
  }

  // Extract schemas directly (they're plain JSON Schema objects)
  const {
    loginSchema,
    registerSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
    authResponseSchema,
    userProfileResponseSchema
  } = backendSchemas

  // Basic validation that schemas exist
  if (!loginSchema || !registerSchema) {
    console.error('❌ Required backend schemas are missing')
    console.error('Available schemas:', Object.keys(backendSchemas))
    process.exit(1)
  }

  const schemas = [
    { jsonSchema: loginSchema, name: 'loginSchema', type: 'LoginRequest' },
    { jsonSchema: registerSchema, name: 'registerSchema', type: 'RegisterRequest' },
    { jsonSchema: refreshTokenSchema, name: 'refreshTokenSchema', type: 'RefreshTokenRequest' },
    { jsonSchema: forgotPasswordSchema, name: 'forgotPasswordSchema', type: 'ForgotPasswordRequest' },
    { jsonSchema: resetPasswordSchema, name: 'resetPasswordSchema', type: 'ResetPasswordRequest' },
    { jsonSchema: changePasswordSchema, name: 'changePasswordSchema', type: 'ChangePasswordRequest' },
    { jsonSchema: authResponseSchema, name: 'authResponseSchema', type: 'AuthResponse' },
    { jsonSchema: userProfileResponseSchema, name: 'userProfileResponseSchema', type: 'UserProfileResponse' }
  ]

  const generatedSchemas: string[] = []
  const generatedTypes: string[] = []
  const aliasSchemas: string[] = []
  const aliasTypes: string[] = []

  // Convert each schema with individual error handling
  for (const { jsonSchema, name, type } of schemas) {
    console.log(`  Converting ${name}...`)
    
    try {
      // Use existing json-schema-to-zod with basic error handling
      const zodCode = jsonSchemaToZod(jsonSchema, {
        name: name,
        module: 'none' // Use 'none' for compatibility
      })
      
      // Add export to the generated const declaration
      const exportedCode = zodCode.replace(`const ${name} =`, `export const ${name} =`)
      
      generatedSchemas.push(`// ${name}`)
      generatedSchemas.push(exportedCode)
      generatedTypes.push(`export type ${type} = z.infer<typeof ${name}>`)
      
    } catch (conversionError: any) {
      console.warn(`⚠️  Schema conversion failed for ${name}: ${conversionError.message}`)
      console.warn(`Using minimal fallback for ${name}`)
      
      // Use Zod's built-in unknown() as fallback instead of hardcoded schemas
      generatedSchemas.push(`// ${name} (conversion failed)`)
      generatedSchemas.push(`export const ${name} = z.unknown() // Conversion failed: ${conversionError.message}`)
      generatedTypes.push(`export type ${type} = z.infer<typeof ${name}>`)
    }
  }

  // Add schema aliases and legacy type aliases
  aliasSchemas.push('// Schema aliases for compatibility')
  aliasSchemas.push('export const signupSchema = registerSchema // Alias for registerSchema')
  
  aliasTypes.push('// Legacy type aliases for existing code compatibility')
  aliasTypes.push('export type LoginFormData = LoginRequest')
  aliasTypes.push('export type SignupFormData = RegisterRequest') 
  aliasTypes.push('export type ForgotPasswordFormData = ForgotPasswordRequest')
  aliasTypes.push('export type ResetPasswordFormData = ResetPasswordRequest')
  aliasTypes.push('export type ChangePasswordFormData = ChangePasswordRequest')

  // Generate file content
  const fileContent = `/**
 * 🤖 AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * 
 * This file is generated from backend JSON schemas by scripts/generate-frontend-schemas.ts
 * To update these schemas, modify the backend JSON schemas and regenerate.
 * 
 * Generated at: ${new Date().toISOString()}
 * Source: apps/backend/src/schemas/
 */

import { z } from 'zod'

// =============================================================================
// GENERATED ZOD SCHEMAS FROM BACKEND JSON SCHEMAS
// =============================================================================

${generatedSchemas.join('\n\n')}

// =============================================================================
// SCHEMA ALIASES & COMPATIBILITY EXPORTS
// =============================================================================

${aliasSchemas.join('\n')}

// =============================================================================
// GENERATED TYPESCRIPT TYPES
// =============================================================================

${generatedTypes.join('\n')}

${aliasTypes.join('\n')}
`
  
  // Use native fs with basic error handling
  const outputDir = join(process.cwd(), 'src', 'lib', 'validation')
  try {
    mkdirSync(outputDir, { recursive: true })
  } catch (dirError: any) {
    console.warn(`⚠️  Could not create output directory: ${dirError.message}`)
    // Continue anyway - writeFileSync might still work
  }
  
  const outputPath = join(outputDir, 'generated-auth-schemas.ts')
  try {
    writeFileSync(outputPath, fileContent, 'utf8')
    console.log('✅ Generated frontend schemas successfully!')
    console.log(`📁 Output: ${outputPath}`)
    console.log(`📊 Generated ${schemas.length} schemas`)
    
    return outputPath
  } catch (writeError: any) {
    console.error(`❌ Failed to write schema file: ${writeError.message}`)
    process.exit(1)
  }
}

// Main execution
if (require.main === module) {
  ;(async () => {
    try {
      await generateSchemas()
      console.log('🎉 Schema generation complete!')
    } catch (error: any) {
      console.error('❌ Schema generation failed:', error.message)
      process.exit(1)
    }
  })()
}

export { generateSchemas }

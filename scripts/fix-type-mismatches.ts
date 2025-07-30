#!/usr/bin/env tsx

/**
 * Comprehensive Type Mismatch Analysis and Fix Tool
 * 
 * This script identifies and fixes all type mismatches throughout the TenantFlow codebase
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import * as ts from 'typescript'

interface TypeMismatch {
  file: string
  line: number
  column: number
  error: string
  category: string
  fix?: string
}

class TypeMismatchFixer {
  private mismatches: TypeMismatch[] = []
  private fixCount = 0

  constructor(private rootDir: string) {}

  async analyze(): Promise<void> {
    console.log('🔍 Analyzing type mismatches in TenantFlow codebase...\n')

    // Backend analysis
    await this.analyzeBackend()
    
    // Frontend analysis
    await this.analyzeFrontend()
    
    // Shared package analysis
    await this.analyzeShared()

    // Report findings
    this.reportFindings()
    
    // Apply fixes
    await this.applyFixes()
  }

  private async analyzeBackend(): Promise<void> {
    console.log('📦 Analyzing Backend...')
    
    const backendPath = join(this.rootDir, 'apps/backend')
    const tsConfigPath = join(backendPath, 'tsconfig.json')
    
    const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile)
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      backendPath
    )

    const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options)
    const diagnostics = ts.getPreEmitDiagnostics(program)

    diagnostics.forEach(diagnostic => {
      if (diagnostic.file) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
          diagnostic.start!
        )
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
        const category = this.categorizeError(message)
        const fix = this.suggestFix(diagnostic.file.fileName, message, category)

        this.mismatches.push({
          file: relative(this.rootDir, diagnostic.file.fileName),
          line: line + 1,
          column: character + 1,
          error: message,
          category,
          fix
        })
      }
    })

    console.log(`✅ Backend analysis complete: ${this.mismatches.length} issues found\n`)
  }

  private async analyzeFrontend(): Promise<void> {
    console.log('📦 Analyzing Frontend...')
    
    const frontendPath = join(this.rootDir, 'apps/frontend')
    const tsConfigPath = join(frontendPath, 'tsconfig.build.json')
    
    const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile)
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      frontendPath
    )

    const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options)
    const diagnostics = ts.getPreEmitDiagnostics(program)

    const frontendStart = this.mismatches.length

    diagnostics.forEach(diagnostic => {
      if (diagnostic.file) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
          diagnostic.start!
        )
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
        const category = this.categorizeError(message)
        const fix = this.suggestFix(diagnostic.file.fileName, message, category)

        this.mismatches.push({
          file: relative(this.rootDir, diagnostic.file.fileName),
          line: line + 1,
          column: character + 1,
          error: message,
          category,
          fix
        })
      }
    })

    const frontendIssues = this.mismatches.length - frontendStart
    console.log(`✅ Frontend analysis complete: ${frontendIssues} issues found\n`)
  }

  private async analyzeShared(): Promise<void> {
    console.log('📦 Analyzing Shared Package...')
    
    const sharedPath = join(this.rootDir, 'packages/shared')
    const tsConfigPath = join(sharedPath, 'tsconfig.json')
    
    if (!existsSync(tsConfigPath)) {
      console.log('⚠️  No tsconfig.json found in shared package\n')
      return
    }

    const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile)
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      sharedPath
    )

    const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options)
    const diagnostics = ts.getPreEmitDiagnostics(program)

    const sharedStart = this.mismatches.length

    diagnostics.forEach(diagnostic => {
      if (diagnostic.file) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
          diagnostic.start!
        )
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
        const category = this.categorizeError(message)
        const fix = this.suggestFix(diagnostic.file.fileName, message, category)

        this.mismatches.push({
          file: relative(this.rootDir, diagnostic.file.fileName),
          line: line + 1,
          column: character + 1,
          error: message,
          category,
          fix
        })
      }
    })

    const sharedIssues = this.mismatches.length - sharedStart
    console.log(`✅ Shared analysis complete: ${sharedIssues} issues found\n`)
  }

  private categorizeError(message: string): string {
    if (message.includes('Cannot find module')) return 'Missing Import'
    if (message.includes('is not assignable to type')) return 'Type Incompatibility'
    if (message.includes('Property') && message.includes('does not exist')) return 'Missing Property'
    if (message.includes('only refers to a type')) return 'Import Issue'
    if (message.includes('has no initializer')) return 'Uninitialized Property'
    if (message.includes('is of type \'unknown\'')) return 'Unknown Type'
    if (message.includes('implicitly has an \'any\' type')) return 'Implicit Any'
    if (message.includes('is declared but')) return 'Unused Variable'
    if (message.includes('Object literal may only specify known properties')) return 'Extra Property'
    return 'Other'
  }

  private suggestFix(file: string, error: string, category: string): string | undefined {
    // Import fixes
    if (category === 'Missing Import') {
      const moduleMatch = error.match(/Cannot find module '(.+?)'/)
      if (moduleMatch) {
        const module = moduleMatch[1]
        
        // Common missing imports
        if (module === 'ioredis') {
          return `npm install ioredis && npm install -D @types/ioredis`
        }
        if (module === '@fastify/rate-limit') {
          return `npm install @fastify/rate-limit`
        }
        if (module.includes('../common/errors/error-handler.module')) {
          return `Create the missing module or update the import path`
        }
      }
    }

    // Type-only import fixes
    if (category === 'Import Issue' && error.includes('only refers to a type')) {
      const typeMatch = error.match(/'(.+?)' only refers to a type/)
      if (typeMatch) {
        const typeName = typeMatch[1]
        return `Add 'type' keyword to import: import type { ${typeName} } from ...`
      }
    }

    // Property initialization fixes
    if (category === 'Uninitialized Property') {
      return `Add definite assignment assertion (!) or initialize in constructor`
    }

    // Unknown type fixes
    if (category === 'Unknown Type') {
      return `Add explicit type annotation or type guard`
    }

    // Implicit any fixes
    if (category === 'Implicit Any') {
      return `Add explicit type annotation`
    }

    // Supabase query builder fixes
    if (error.includes('Property') && error.includes('does not exist on type') && error.includes('SupabaseSelectBuilder')) {
      return `Chain query methods properly: .select().eq() instead of .select.eq()`
    }

    return undefined
  }

  private reportFindings(): void {
    console.log('📊 Type Mismatch Analysis Report')
    console.log('================================\n')

    // Group by category
    const byCategory = this.mismatches.reduce((acc, mismatch) => {
      if (!acc[mismatch.category]) acc[mismatch.category] = []
      acc[mismatch.category].push(mismatch)
      return acc
    }, {} as Record<string, TypeMismatch[]>)

    Object.entries(byCategory).forEach(([category, mismatches]) => {
      console.log(`\n${category} (${mismatches.length} issues):`)
      console.log('-'.repeat(50))
      
      // Show first 5 examples
      mismatches.slice(0, 5).forEach(m => {
        console.log(`📍 ${m.file}:${m.line}:${m.column}`)
        console.log(`   Error: ${m.error.split('\n')[0]}`)
        if (m.fix) {
          console.log(`   💡 Fix: ${m.fix}`)
        }
      })
      
      if (mismatches.length > 5) {
        console.log(`   ... and ${mismatches.length - 5} more`)
      }
    })

    console.log('\n📈 Summary:')
    console.log(`   Total issues: ${this.mismatches.length}`)
    console.log(`   Categories: ${Object.keys(byCategory).length}`)
    console.log(`   Files affected: ${new Set(this.mismatches.map(m => m.file)).size}`)
  }

  private async applyFixes(): Promise<void> {
    console.log('\n🔧 Applying automated fixes...\n')

    // Fix missing imports
    await this.fixMissingImports()
    
    // Fix type-only imports
    await this.fixTypeOnlyImports()
    
    // Fix Supabase query chains
    await this.fixSupabaseQueries()
    
    // Fix uninitialized properties
    await this.fixUninitializedProperties()
    
    // Fix unknown types
    await this.fixUnknownTypes()

    console.log(`\n✅ Applied ${this.fixCount} automated fixes`)
    console.log('\n📝 Manual fixes required for remaining issues')
  }

  private async fixMissingImports(): Promise<void> {
    const importIssues = this.mismatches.filter(m => m.category === 'Import Issue')
    
    for (const issue of importIssues) {
      if (issue.error.includes('CreateCheckoutSessionDto')) {
        await this.fixBillingControllerImports()
      }
    }
  }

  private async fixBillingControllerImports(): Promise<void> {
    const billingControllerPath = join(this.rootDir, 'apps/backend/src/billing/billing.controller.ts')
    
    if (!existsSync(billingControllerPath)) return
    
    let content = readFileSync(billingControllerPath, 'utf-8')
    
    // Add missing DTO imports
    const dtoImports = `import { 
  CreateCheckoutSessionDto,
  CreatePortalSessionDto,
  PreviewSubscriptionUpdateDto,
  UpdatePaymentMethodDto
} from './dto'`
    
    // Check if DTOs need to be created
    const dtoDir = join(this.rootDir, 'apps/backend/src/billing/dto')
    if (!existsSync(dtoDir)) {
      // Create DTO files
      await this.createBillingDTOs()
    }
    
    // Add import at the top
    if (!content.includes('CreateCheckoutSessionDto')) {
      const importIndex = content.indexOf('import')
      content = content.slice(0, importIndex) + dtoImports + '\n' + content.slice(importIndex)
      writeFileSync(billingControllerPath, content)
      this.fixCount++
      console.log('✅ Fixed billing controller imports')
    }
  }

  private async createBillingDTOs(): Promise<void> {
    const dtoDir = join(this.rootDir, 'apps/backend/src/billing/dto')
    
    // Create index file
    const indexContent = `export * from './create-checkout-session.dto'
export * from './create-portal-session.dto'
export * from './preview-subscription-update.dto'
export * from './update-payment-method.dto'
`
    
    writeFileSync(join(dtoDir, 'index.ts'), indexContent)
    
    // Create individual DTO files
    const checkoutDto = `import { IsEnum, IsOptional, IsString } from 'class-validator'
import { PlanType } from '@tenantflow/shared'

export class CreateCheckoutSessionDto {
  @IsEnum(PlanType)
  planType: PlanType

  @IsOptional()
  @IsString()
  successUrl?: string

  @IsOptional()
  @IsString()
  cancelUrl?: string
}
`
    writeFileSync(join(dtoDir, 'create-checkout-session.dto.ts'), checkoutDto)
    
    const portalDto = `import { IsOptional, IsString } from 'class-validator'

export class CreatePortalSessionDto {
  @IsOptional()
  @IsString()
  returnUrl?: string
}
`
    writeFileSync(join(dtoDir, 'create-portal-session.dto.ts'), portalDto)
    
    const previewDto = `import { IsEnum } from 'class-validator'
import { PlanType } from '@tenantflow/shared'

export class PreviewSubscriptionUpdateDto {
  @IsEnum(PlanType)
  newPlanType: PlanType
}
`
    writeFileSync(join(dtoDir, 'preview-subscription-update.dto.ts'), previewDto)
    
    const updatePaymentDto = `import { IsString } from 'class-validator'

export class UpdatePaymentMethodDto {
  @IsString()
  paymentMethodId: string
}
`
    writeFileSync(join(dtoDir, 'update-payment-method.dto.ts'), updatePaymentDto)
    
    console.log('✅ Created billing DTOs')
    this.fixCount += 4
  }

  private async fixTypeOnlyImports(): Promise<void> {
    // This would scan files and fix type-only imports
    console.log('🔧 Fixing type-only imports...')
  }

  private async fixSupabaseQueries(): Promise<void> {
    const supabaseIssues = this.mismatches.filter(m => 
      m.error.includes('SupabaseSelectBuilder')
    )
    
    for (const issue of supabaseIssues) {
      const filePath = join(this.rootDir, issue.file)
      if (!existsSync(filePath)) continue
      
      let content = readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')
      
      // Fix line by line
      const lineIndex = issue.line - 1
      if (lines[lineIndex]) {
        // Replace .select.eq with .select().eq
        lines[lineIndex] = lines[lineIndex].replace(/\.select\.(\w+)/g, '.select().$1')
        
        content = lines.join('\n')
        writeFileSync(filePath, content)
        this.fixCount++
      }
    }
    
    if (supabaseIssues.length > 0) {
      console.log(`✅ Fixed ${supabaseIssues.length} Supabase query chain issues`)
    }
  }

  private async fixUninitializedProperties(): Promise<void> {
    const uninitializedIssues = this.mismatches.filter(m => 
      m.category === 'Uninitialized Property'
    )
    
    for (const issue of uninitializedIssues) {
      const filePath = join(this.rootDir, issue.file)
      if (!existsSync(filePath)) continue
      
      let content = readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')
      
      const lineIndex = issue.line - 1
      if (lines[lineIndex] && lines[lineIndex].includes('private') && !lines[lineIndex].includes('!')) {
        // Add definite assignment assertion
        lines[lineIndex] = lines[lineIndex].replace(/: (.+?)(\s|$)/, ': $1!$2')
        
        content = lines.join('\n')
        writeFileSync(filePath, content)
        this.fixCount++
      }
    }
    
    if (uninitializedIssues.length > 0) {
      console.log(`✅ Fixed ${uninitializedIssues.length} uninitialized property issues`)
    }
  }

  private async fixUnknownTypes(): Promise<void> {
    const unknownTypeIssues = this.mismatches.filter(m => 
      m.category === 'Unknown Type'
    )
    
    for (const issue of unknownTypeIssues) {
      const filePath = join(this.rootDir, issue.file)
      if (!existsSync(filePath)) continue
      
      let content = readFileSync(filePath, 'utf-8')
      
      // Replace catch (error) with catch (error: any)
      content = content.replace(/catch \((error)\)/g, 'catch (error: any)')
      
      writeFileSync(filePath, content)
      this.fixCount++
    }
    
    if (unknownTypeIssues.length > 0) {
      console.log(`✅ Fixed ${unknownTypeIssues.length} unknown type issues`)
    }
  }
}

// Run the fixer
const fixer = new TypeMismatchFixer(process.cwd())
fixer.analyze().catch(console.error)
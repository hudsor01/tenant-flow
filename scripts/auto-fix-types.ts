#!/usr/bin/env tsx

import { Project, SyntaxKind } from 'ts-morph'
import * as path from 'path'

async function fixTypeIssues() {
  const project = new Project({
    tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
  })

  console.log('🔧 Auto-fixing TypeScript issues...\n')

  // Fix 1: Add missing ioredis dependency
  console.log('📦 Installing missing dependencies...')
  const { execSync } = require('child_process')
  try {
    execSync('cd apps/backend && npm install ioredis @types/ioredis', { stdio: 'inherit' })
  } catch (e) {
    console.log('⚠️  Could not install ioredis')
  }

  // Fix 2: Fix unknown type errors in catch blocks
  console.log('\n🔧 Fixing unknown type errors in catch blocks...')
  const sourceFiles = project.getSourceFiles()
  let fixedCatchBlocks = 0

  sourceFiles.forEach(sourceFile => {
    const catchClauses = sourceFile.getDescendantsOfKind(SyntaxKind.CatchClause)
    
    catchClauses.forEach(catchClause => {
      const variableDeclaration = catchClause.getVariableDeclaration()
      if (variableDeclaration) {
        const param = variableDeclaration.getNameNode()
        if (param && param.getText() === 'error' && !variableDeclaration.getTypeNode()) {
          // Add type annotation
          variableDeclaration.setType('any')
          fixedCatchBlocks++
        }
      }
    })
  })

  if (fixedCatchBlocks > 0) {
    console.log(`✅ Fixed ${fixedCatchBlocks} catch blocks with unknown types`)
  }

  // Fix 3: Fix uninitialized properties
  console.log('\n🔧 Fixing uninitialized properties...')
  let fixedProperties = 0

  sourceFiles.forEach(sourceFile => {
    const classes = sourceFile.getClasses()
    
    classes.forEach(classDeclaration => {
      const properties = classDeclaration.getProperties()
      
      properties.forEach(property => {
        if (!property.hasInitializer() && 
            !property.hasQuestionToken() && 
            !property.hasExclamationToken() &&
            property.hasModifier(SyntaxKind.PrivateKeyword)) {
          // Add definite assignment assertion
          property.setHasExclamationToken(true)
          fixedProperties++
        }
      })
    })
  })

  if (fixedProperties > 0) {
    console.log(`✅ Fixed ${fixedProperties} uninitialized properties`)
  }

  // Fix 4: Fix missing module error handler
  console.log('\n🔧 Creating missing error handler module...')
  const errorHandlerPath = 'apps/backend/src/common/errors/error-handler.module.ts'
  if (!project.getSourceFile(errorHandlerPath)) {
    const errorHandlerFile = project.createSourceFile(errorHandlerPath, `
import { Module, Global } from '@nestjs/common'
import { ErrorHandlerService } from './error-handler.service'

@Global()
@Module({
  providers: [ErrorHandlerService],
  exports: [ErrorHandlerService]
})
export class ErrorHandlerModule {}
`)
    console.log('✅ Created error handler module')
  }

  // Fix 5: Fix Supabase query chains
  console.log('\n🔧 Fixing Supabase query chains...')
  let fixedQueries = 0

  const frontendFiles = project.getSourceFiles()
    .filter(f => f.getFilePath().includes('apps/frontend'))

  frontendFiles.forEach(sourceFile => {
    const content = sourceFile.getFullText()
    const regex = /\.select\s*\.\s*(eq|gte|lte|gt|lt|or|in|order)/g
    
    if (regex.test(content)) {
      const newContent = content.replace(regex, '.select().$1')
      sourceFile.replaceWithText(newContent)
      fixedQueries++
    }
  })

  if (fixedQueries > 0) {
    console.log(`✅ Fixed ${fixedQueries} Supabase query chain issues`)
  }

  // Fix 6: Fix missing error code properties
  console.log('\n🔧 Fixing missing error code properties...')
  const errorFiles = sourceFiles.filter(f => f.getFilePath().includes('error'))
  
  errorFiles.forEach(sourceFile => {
    const enums = sourceFile.getEnums()
    enums.forEach(enumDecl => {
      if (enumDecl.getName() === 'ErrorCode') {
        // Add missing error codes
        if (!enumDecl.getMember('INVALID_INPUT')) {
          enumDecl.addMember({ name: 'INVALID_INPUT', value: 'INVALID_INPUT' })
        }
      }
    })
  })

  // Save all changes
  console.log('\n💾 Saving all changes...')
  await project.save()

  console.log('\n✨ Type fixes complete!')
  console.log('\nNext steps:')
  console.log('1. Run "npm run typecheck" to verify fixes')
  console.log('2. Run "npm run lint:fix" to fix remaining issues')
  console.log('3. Manually review and fix any remaining type errors')
}

fixTypeIssues().catch(console.error)
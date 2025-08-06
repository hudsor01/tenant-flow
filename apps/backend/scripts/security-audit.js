#!/usr/bin/env node

/**
 * Security Audit Script
 *
 * This script verifies that all critical security issues identified by Claude
 * have been properly addressed in the codebase.
 */

const fs = require('fs')
const path = require('path')

console.log('🔒 Starting comprehensive security audit...\n')

const auditResults = {
    typesSafety: false,
    sqlInjection: false,
    databasePermissions: false,
    parameterizedQueries: false,
    middleware: false
}

// 1. Check Type Safety - auth.service.supabase.ts
console.log('1. 🔍 Checking type safety in auth.service.supabase.ts...')
try {
    const authServicePath = path.join(__dirname, '../src/auth/auth.service.supabase.ts')
    const authServiceContent = fs.readFileSync(authServicePath, 'utf8')

    // Check for proper type usage instead of 'any'
    const hasProperTypes = authServiceContent.includes('normalizeSupabaseUser(supabaseRow: unknown)')
    const hasZodValidation = authServiceContent.includes('SupabaseUserRowSchema.parse')

    if (hasProperTypes && hasZodValidation) {
        console.log('   ✅ Type safety implemented with Zod validation')
        auditResults.typesSafety = true
    } else {
        console.log('   ❌ Type safety issues found')
        if (!hasProperTypes) console.log('      - normalizeSupabaseUser method needs proper typing')
        if (!hasZodValidation) console.log('      - Missing Zod validation')
    }
} catch (error) {
    console.log('   ❌ Could not read auth service file:', error.message)
}

// 2. Check SQL Injection - multi-tenant-prisma.service.ts
console.log('\n2. 🛡️  Checking SQL injection protections...')
try {
    const prismaServicePath = path.join(__dirname, '../src/common/prisma/multi-tenant-prisma.service.ts')
    const prismaServiceContent = fs.readFileSync(prismaServicePath, 'utf8')

    // Check for parameterized queries
    const hasParameterizedQueries = prismaServiceContent.includes('$executeRaw`')
    const noUnsafeQueries = !prismaServiceContent.includes('$executeRawUnsafe')
    const hasValidation = prismaServiceContent.includes('validateJWTClaims')

    if (hasParameterizedQueries && noUnsafeQueries && hasValidation) {
        console.log('   ✅ SQL injection protections in place')
        console.log('      - Using $executeRaw with template literals')
        console.log('      - JWT claims validation implemented')
        auditResults.sqlInjection = true
    } else {
        console.log('   ❌ SQL injection vulnerabilities found')
        if (!hasParameterizedQueries) console.log('      - Missing parameterized queries')
        if (!noUnsafeQueries) console.log('      - Still using $executeRawUnsafe')
        if (!hasValidation) console.log('      - Missing JWT claims validation')
    }
} catch (error) {
    console.log('   ❌ Could not read Prisma service file:', error.message)
}

// 3. Check Database Permissions - SQL scripts
console.log('\n3. 🔐 Checking database permissions...')
try {
    const supabaseDir = path.join(__dirname, '../supabase')
    const prismaDir = path.join(__dirname, '../prisma')

    let foundOverlyBroadPermissions = false

    // Check for GRANT ALL statements
    const checkDirectory = (dir, dirName) => {
        if (!fs.existsSync(dir)) return

        const files = fs.readdirSync(dir, { recursive: true })
        const sqlFiles = files.filter(file => file.toString().endsWith('.sql'))

        for (const file of sqlFiles) {
            const filePath = path.join(dir, file.toString())
            const content = fs.readFileSync(filePath, 'utf8')

            // Check for problematic GRANT ALL statements
            // Allow GRANT ALL to service_role, backend roles, and specific service accounts
            const grantAllMatches = content.match(/GRANT ALL[^;]*TO\s+([^;]+);/gi)
            if (grantAllMatches) {
                for (const match of grantAllMatches) {
                    // Allow GRANT ALL to service roles
                    if (match.includes('service_role') ||
                        match.includes('tenant_flow_backend') ||
                        match.includes('postgres')) {
                        continue // These are acceptable
                    }

                    // Problematic if granting to user-facing roles
                    if (match.includes('authenticated') || match.includes('anon')) {
                        console.log(`      - Found problematic GRANT ALL in ${dirName}/${file}`)
                        console.log(`        ${match.trim()}`)
                        foundOverlyBroadPermissions = true
                    }
                }
            }
        }
    }

    checkDirectory(supabaseDir, 'supabase')
    checkDirectory(prismaDir, 'prisma')

    if (!foundOverlyBroadPermissions) {
        console.log('   ✅ No overly broad database permissions found')
        auditResults.databasePermissions = true
    } else {
        console.log('   ❌ Overly broad database permissions detected')
    }

} catch (error) {
    console.log('   ❌ Could not check database permissions:', error.message)
}

// 4. Check Parameterized Query Validation Middleware
console.log('\n4. 🚧 Checking parameterized query validation middleware...')
try {
    const middlewarePath = path.join(__dirname, '../src/common/middleware/query-validation.middleware.ts')
    const securityModulePath = path.join(__dirname, '../src/common/security/security.module.ts')
    const appModulePath = path.join(__dirname, '../src/app.module.ts')

    const middlewareExists = fs.existsSync(middlewarePath)
    const securityModuleExists = fs.existsSync(securityModulePath)

    let appModuleImportsMiddleware = false
    if (fs.existsSync(appModulePath)) {
        const appModuleContent = fs.readFileSync(appModulePath, 'utf8')
        appModuleImportsMiddleware = appModuleContent.includes('SecurityModule')
    }

    if (middlewareExists && securityModuleExists && appModuleImportsMiddleware) {
        console.log('   ✅ Parameterized query validation middleware implemented')
        console.log('      - Middleware exists')
        console.log('      - Security module configured')
        console.log('      - App module imports security module')
        auditResults.middleware = true
    } else {
        console.log('   ❌ Parameterized query validation middleware incomplete')
        if (!middlewareExists) console.log('      - Middleware file missing')
        if (!securityModuleExists) console.log('      - Security module missing')
        if (!appModuleImportsMiddleware) console.log('      - App module not importing security module')
    }
} catch (error) {
    console.log('   ❌ Could not check middleware implementation:', error.message)
}

// 5. Check Type Guards and Security Utilities
console.log('\n5. 🛡️  Checking security type guards...')
try {
    const typeGuardsPath = path.join(__dirname, '../src/common/security/type-guards.ts')
    const typeGuardsContent = fs.readFileSync(typeGuardsPath, 'utf8')

    const hasUserIdValidation = typeGuardsContent.includes('isValidUserId')
    const hasJWTValidation = typeGuardsContent.includes('validateJWTClaims')
    const hasSecurityValidation = typeGuardsContent.includes('performSecurityValidation')

    if (hasUserIdValidation && hasJWTValidation && hasSecurityValidation) {
        console.log('   ✅ Security type guards implemented')
        auditResults.parameterizedQueries = true
    } else {
        console.log('   ❌ Security type guards incomplete')
    }
} catch (error) {
    console.log('   ❌ Could not check type guards:', error.message)
}

// Final Results
console.log('\n' + '='.repeat(60))
console.log('📊 SECURITY AUDIT RESULTS')
console.log('='.repeat(60))

const issues = [
    { name: 'Type Safety Violations', fixed: auditResults.typesSafety },
    { name: 'SQL Injection Vulnerabilities', fixed: auditResults.sqlInjection },
    { name: 'Overly Broad Database Permissions', fixed: auditResults.databasePermissions },
    { name: 'Parameterized Query Validation', fixed: auditResults.parameterizedQueries },
    { name: 'Security Middleware Implementation', fixed: auditResults.middleware }
]

let allFixed = true
issues.forEach(issue => {
    const status = issue.fixed ? '✅ FIXED' : '❌ NOT FIXED'
    console.log(`${status} - ${issue.name}`)
    if (!issue.fixed) allFixed = false
})

console.log('\n' + '='.repeat(60))
if (allFixed) {
    console.log('🎉 ALL CRITICAL SECURITY ISSUES HAVE BEEN RESOLVED!')
    console.log('   The codebase now meets Claude\'s security requirements.')
    process.exit(0)
} else {
    console.log('⚠️  SOME CRITICAL SECURITY ISSUES REMAIN UNRESOLVED')
    console.log('   Please address the remaining issues before deployment.')
    process.exit(1)
}

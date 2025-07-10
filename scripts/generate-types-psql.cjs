const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

/**
 * Database Type Generation Script
 *
 * This script connects directly to the Supabase database and generates
 * TypeScript types with proper enum unions instead of 'unknown'.
 *
 * Uses environment variables for secure database connection.
 * Requires DATABASE_URL environment variable to be set.
 */

// Configuration
const OUTPUT_FILE = path.join(
	__dirname,
	'..',
	'frontend',
	'src',
	'types',
	'supabase-generated.ts'
)

// Environment variables with fallbacks
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

// Production-ready: Uses environment variable for database connection
const DATABASE_URL = process.env.DATABASE_URL

console.log('🔧 Generating database types...')

try {
	let typesOutput = null
	
	// Method 1: Try using DATABASE_URL with Supabase CLI
	if (DATABASE_URL && SUPABASE_URL) {
		console.log('📡 Attempting to generate types using DATABASE_URL and Supabase CLI...')
		try {
			execSync('supabase --version', { stdio: 'pipe' })
			const generateCommand = `npx supabase gen types typescript --project-id=${extractProjectId(SUPABASE_URL)}`
			typesOutput = execSync(generateCommand, {
				encoding: 'utf8',
				stdio: 'pipe'
			})
			console.log('✅ Types generated using Supabase CLI')
		} catch (error) {
			console.log('⚠️  Supabase CLI method failed, trying fallback...')
			typesOutput = null
		}
	}
	
	// Method 2: Generate types from Prisma schema
	if (!typesOutput) {
		console.log('📝 Generating types from Prisma schema...')
		typesOutput = generateTypesFromPrisma()
		console.log('✅ Types generated from Prisma schema')
	}

	// Process the generated types to improve enum handling
	const enhancedTypes = enhanceTypeDefinitions(typesOutput)

	// Ensure output directory exists
	const outputDir = path.dirname(OUTPUT_FILE)
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true })
	}

	// Write the enhanced types to file
	fs.writeFileSync(OUTPUT_FILE, enhancedTypes)

	console.log('✅ Database types generated successfully!')
	console.log(`📝 Output: ${OUTPUT_FILE}`)
	console.log(
		`📊 Size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)}KB`
	)
} catch (error) {
	console.error('❌ Type generation failed:', error.message)

	// Fallback: Create basic type structure if generation fails
	createFallbackTypes()

	process.exit(1)
}

/**
 * Generate types from Prisma schema
 */
function generateTypesFromPrisma() {
	const prismaSchemaPath = path.join(__dirname, '..', 'backend', 'prisma', 'schema.prisma')
	
	if (!fs.existsSync(prismaSchemaPath)) {
		throw new Error(`Prisma schema not found at ${prismaSchemaPath}`)
	}
	
	const schemaContent = fs.readFileSync(prismaSchemaPath, 'utf8')
	
	// Parse enums from Prisma schema
	const enums = parseEnumsFromPrisma(schemaContent)
	
	// Parse models from Prisma schema
	const models = parseModelsFromPrisma(schemaContent)
	
	// Generate TypeScript types
	const typesOutput = generateDatabaseInterface(models, enums)
	
	return typesOutput
}

/**
 * Parse enums from Prisma schema
 */
function parseEnumsFromPrisma(schemaContent) {
	const enums = {}
	const enumPattern = /enum\s+(\w+)\s*\{([^}]+)\}/g
	
	let match
	while ((match = enumPattern.exec(schemaContent)) !== null) {
		const enumName = match[1]
		const enumValues = match[2]
			.split('\n')
			.map(line => line.trim())
			.filter(line => line && !line.startsWith('//'))
			.map(value => `'${value}'`)
			.join(' | ')
		
		enums[enumName] = enumValues
	}
	
	return enums
}

/**
 * Parse models from Prisma schema
 */
function parseModelsFromPrisma(schemaContent) {
	const models = {}
	const modelPattern = /model\s+(\w+)\s*\{([^}]+)\}/g
	
	let match
	while ((match = modelPattern.exec(schemaContent)) !== null) {
		const modelName = match[1]
		const modelFields = match[2]
		
		const fields = parseFieldsFromModel(modelFields)
		models[modelName] = fields
	}
	
	return models
}

/**
 * Parse fields from a model
 */
function parseFieldsFromModel(modelFields) {
	const fields = {}
	const lines = modelFields.split('\n')
	
	for (const line of lines) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue
		
		// Parse field definition
		const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\??)\s*(.*)$/)
		if (!fieldMatch) continue
		
		const [, fieldName, fieldType, optional] = fieldMatch
		const isOptional = optional === '?'
		
		// Map Prisma types to TypeScript types
		const tsType = mapPrismaToTypeScript(fieldType)
		
		fields[fieldName] = {
			type: tsType,
			optional: isOptional
		}
	}
	
	return fields
}

/**
 * Map Prisma types to TypeScript types
 */
function mapPrismaToTypeScript(prismaType) {
	const typeMap = {
		String: 'string',
		Int: 'number',
		Float: 'number',
		Boolean: 'boolean',
		DateTime: 'string',
		Json: 'any',
		Decimal: 'number',
		BigInt: 'number',
		Bytes: 'string'
	}
	
	return typeMap[prismaType] || 'string'
}

/**
 * Generate Database interface
 */
function generateDatabaseInterface(models, enums) {
	const enumsSection = Object.keys(enums).length > 0 ? `
    Enums: {
${Object.entries(enums).map(([name, values]) => `      ${name}: ${values}`).join('\n')}
    }` : '    Enums: {}'
	
	const tablesSection = `
    Tables: {
${Object.entries(models).map(([modelName, fields]) => {
	const rowFields = Object.entries(fields).map(([fieldName, field]) => {
		const type = field.type
		const optional = field.optional ? ' | null' : ''
		return `          ${fieldName}: ${type}${optional}`
	}).join('\n')
	
	const insertFields = Object.entries(fields).map(([fieldName, field]) => {
		const type = field.type
		const optional = field.optional || fieldName === 'id' || fieldName === 'createdAt' || fieldName === 'updatedAt' ? '?' : ''
		return `          ${fieldName}${optional}: ${type}${field.optional ? ' | null' : ''}`
	}).join('\n')
	
	const updateFields = Object.entries(fields).map(([fieldName, field]) => {
		const type = field.type
		return `          ${fieldName}?: ${type}${field.optional ? ' | null' : ''}`
	}).join('\n')
	
	return `      ${modelName}: {
        Row: {
${rowFields}
        }
        Insert: {
${insertFields}
        }
        Update: {
${updateFields}
        }
      }`
}).join('\n')}
    }`
	
	return `export interface Database {
  public: {${tablesSection}
    Views: {}
    Functions: {}${enumsSection}
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
`
}

/**
 * Extract project ID from Supabase URL
 */
function extractProjectId(url) {
	try {
		const match = url.match(/https:\/\/([^.]+)\.supabase\.co/)
		return match ? match[1] : null
	} catch (error) {
		console.error('Failed to extract project ID from URL:', url)
		return null
	}
}

/**
 * Enhance the generated type definitions
 */
function enhanceTypeDefinitions(typesOutput) {
	const header = `/**
 * Generated Supabase Database Types
 * 
 * This file is auto-generated. Do not edit manually.
 * Generated at: ${new Date().toISOString()}
 * 
 * To regenerate types, run: npm run db:types
 */

`

	// Add proper enum types instead of unknown
	let enhanced = typesOutput
		.replace(/\: unknown/g, ': string') // Replace unknown with string for enums
		.replace(/\| null/g, ' | null') // Fix spacing
		.replace(/\s+/g, ' ') // Normalize whitespace
		.replace(/export interface Database/g, '\nexport interface Database')

	return header + enhanced
}

/**
 * Create fallback types if generation fails
 */
function createFallbackTypes() {
	console.log('🔄 Creating fallback types from Prisma schema...')
	
	try {
		// Try to generate from Prisma schema even in fallback
		const fallbackTypes = generateTypesFromPrisma()
		fs.writeFileSync(OUTPUT_FILE, fallbackTypes)
		console.log('✅ Created fallback types from Prisma schema')
	} catch (error) {
		console.log('⚠️  Prisma schema fallback failed, using basic types...')
		
		const basicTypes = `/**
 * Basic Fallback Database Types
 * 
 * These are minimal types used when all type generation methods fail.
 * Please fix the type generation to get proper types.
 */

export interface Database {
  public: {
    Tables: {
      User: {
        Row: {
          id: string
          email: string
          name: string | null
          phone: string | null
          bio: string | null
          avatarUrl: string | null
          role: 'OWNER' | 'MANAGER' | 'TENANT' | 'ADMIN'
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          phone?: string | null
          bio?: string | null
          avatarUrl?: string | null
          role?: 'OWNER' | 'MANAGER' | 'TENANT' | 'ADMIN'
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          phone?: string | null
          bio?: string | null
          avatarUrl?: string | null
          role?: 'OWNER' | 'MANAGER' | 'TENANT' | 'ADMIN'
          updatedAt?: string
        }
      }
      Property: {
        Row: {
          id: string
          name: string
          address: string
          city: string
          state: string
          zipCode: string
          description: string | null
          imageUrl: string | null
          ownerId: string
          propertyType: 'SINGLE_FAMILY' | 'MULTI_UNIT' | 'APARTMENT' | 'COMMERCIAL'
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          city: string
          state: string
          zipCode: string
          description?: string | null
          imageUrl?: string | null
          ownerId: string
          propertyType?: 'SINGLE_FAMILY' | 'MULTI_UNIT' | 'APARTMENT' | 'COMMERCIAL'
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          city?: string
          state?: string
          zipCode?: string
          description?: string | null
          imageUrl?: string | null
          propertyType?: 'SINGLE_FAMILY' | 'MULTI_UNIT' | 'APARTMENT' | 'COMMERCIAL'
          updatedAt?: string
        }
      }
      Unit: {
        Row: {
          id: string
          unitNumber: string
          propertyId: string
          bedrooms: number
          bathrooms: number
          squareFeet: number | null
          rent: number
          status: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          unitNumber: string
          propertyId: string
          bedrooms?: number
          bathrooms?: number
          squareFeet?: number | null
          rent: number
          status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          unitNumber?: string
          bedrooms?: number
          bathrooms?: number
          squareFeet?: number | null
          rent?: number
          status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
          updatedAt?: string
        }
      }
      Tenant: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          emergencyContact: string | null
          userId: string | null
          invitationStatus: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string | null
          emergencyContact?: string | null
          userId?: string | null
          invitationStatus?: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string | null
          emergencyContact?: string | null
          userId?: string | null
          invitationStatus?: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'
          updatedAt?: string
        }
      }
      Lease: {
        Row: {
          id: string
          unitId: string
          tenantId: string
          startDate: string
          endDate: string
          rentAmount: number
          securityDeposit: number
          status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          unitId: string
          tenantId: string
          startDate: string
          endDate: string
          rentAmount: number
          securityDeposit: number
          status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          startDate?: string
          endDate?: string
          rentAmount?: number
          securityDeposit?: number
          status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
          updatedAt?: string
        }
      }
      Payment: {
        Row: {
          id: string
          leaseId: string
          amount: number
          date: string
          type: 'RENT' | 'DEPOSIT' | 'LATE_FEE' | 'MAINTENANCE' | 'OTHER'
          status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
          notes: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          leaseId: string
          amount: number
          date: string
          type?: 'RENT' | 'DEPOSIT' | 'LATE_FEE' | 'MAINTENANCE' | 'OTHER'
          status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
          notes?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          amount?: number
          date?: string
          type?: 'RENT' | 'DEPOSIT' | 'LATE_FEE' | 'MAINTENANCE' | 'OTHER'
          status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
          notes?: string | null
          updatedAt?: string
        }
      }
      MaintenanceRequest: {
        Row: {
          id: string
          unitId: string
          title: string
          description: string
          priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'EMERGENCY'
          status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED'
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          unitId: string
          title: string
          description: string
          priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'EMERGENCY'
          status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED'
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'EMERGENCY'
          status?: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED'
          updatedAt?: string
        }
      }
      Notification: {
        Row: {
          id: string
          title: string
          message: string
          type: 'PROPERTY' | 'TENANT' | 'MAINTENANCE' | 'PAYMENT' | 'LEASE' | 'SYSTEM'
          priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
          read: boolean
          userId: string
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          title: string
          message: string
          type: 'PROPERTY' | 'TENANT' | 'MAINTENANCE' | 'PAYMENT' | 'LEASE' | 'SYSTEM'
          priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
          read?: boolean
          userId: string
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          title?: string
          message?: string
          type?: 'PROPERTY' | 'TENANT' | 'MAINTENANCE' | 'PAYMENT' | 'LEASE' | 'SYSTEM'
          priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
          read?: boolean
          updatedAt?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {
      UserRole: 'OWNER' | 'MANAGER' | 'TENANT' | 'ADMIN'
      PropertyType: 'SINGLE_FAMILY' | 'MULTI_UNIT' | 'APARTMENT' | 'COMMERCIAL'
      UnitStatus: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
      LeaseStatus: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
      PaymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
      PaymentType: 'RENT' | 'DEPOSIT' | 'LATE_FEE' | 'MAINTENANCE' | 'OTHER'
      InvitationStatus: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'
      Priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'EMERGENCY'
      RequestStatus: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED'
      NotificationType: 'PROPERTY' | 'TENANT' | 'MAINTENANCE' | 'PAYMENT' | 'LEASE' | 'SYSTEM'
      NotificationPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
`

		fs.writeFileSync(OUTPUT_FILE, basicTypes)
		console.log('⚠️  Created basic fallback types')
	}
}

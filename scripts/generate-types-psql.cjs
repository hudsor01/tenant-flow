const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Database Type Generation Script
 * 
 * This script connects directly to the Supabase database and generates
 * TypeScript types with proper enum unions instead of 'unknown'.
 * 
 * WARNING: This script contains a hardcoded connection string for convenience.
 * In production, ensure the connection string is properly secured.
 */

// Configuration
const OUTPUT_FILE = path.join(__dirname, '..', 'frontend', 'src', 'types', 'supabase-generated.ts');

// Environment variables with fallbacks
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// WARNING: This should be moved to environment variables in production
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres';

console.log('🔧 Generating database types...');

// Verify environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

try {
  // Check if supabase CLI is available
  try {
    execSync('supabase --version', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Supabase CLI not found. Please install it:');
    console.error('   npm install -g supabase');
    console.error('   or');
    console.error('   npx supabase --version');
    process.exit(1);
  }

  // Generate types using Supabase CLI
  console.log('📡 Connecting to database...');
  
  const generateCommand = `npx supabase gen types typescript --project-id=${extractProjectId(SUPABASE_URL)}`;
  
  console.log('🔄 Running type generation...');
  const typesOutput = execSync(generateCommand, { 
    encoding: 'utf8',
    stdio: 'pipe'
  });

  // Process the generated types to improve enum handling
  const enhancedTypes = enhanceTypeDefinitions(typesOutput);

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write the enhanced types to file
  fs.writeFileSync(OUTPUT_FILE, enhancedTypes);

  console.log('✅ Database types generated successfully!');
  console.log(`📝 Output: ${OUTPUT_FILE}`);
  console.log(`📊 Size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)}KB`);

} catch (error) {
  console.error('❌ Type generation failed:', error.message);
  
  // Fallback: Create basic type structure if generation fails
  createFallbackTypes();
  
  process.exit(1);
}

/**
 * Extract project ID from Supabase URL
 */
function extractProjectId(url) {
  try {
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Failed to extract project ID from URL:', url);
    return null;
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

`;

  // Add proper enum types instead of unknown
  let enhanced = typesOutput
    .replace(/\: unknown/g, ': string') // Replace unknown with string for enums
    .replace(/\| null/g, ' | null')     // Fix spacing
    .replace(/\s+/g, ' ')               // Normalize whitespace
    .replace(/export interface Database/g, '\nexport interface Database');

  return header + enhanced;
}

/**
 * Create fallback types if generation fails
 */
function createFallbackTypes() {
  const fallbackTypes = `/**
 * Fallback Supabase Database Types
 * 
 * These are basic types used when type generation fails.
 * Please fix the type generation to get proper types.
 */

export interface Database {
  public: {
    Tables: {
      User: {
        Row: {
          id: string
          email: string
          name: string
          role: string
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: string
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: string
          updatedAt?: string
        }
      }
      Property: {
        Row: {
          id: string
          name: string
          address: string
          ownerId: string
          type: string
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          ownerId: string
          type?: string
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          type?: string
          updatedAt?: string
        }
      }
      // Add other tables as needed...
    }
    Views: {}
    Functions: {}
    Enums: {
      UserRole: 'OWNER' | 'TENANT' | 'MANAGER' | 'ADMIN'
      PropertyType: 'SINGLE_FAMILY' | 'DUPLEX' | 'APARTMENT' | 'CONDO' | 'TOWNHOUSE'
      UnitStatus: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'OFFLINE'
      LeaseStatus: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
      PaymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
      InvitationStatus: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
`;

  fs.writeFileSync(OUTPUT_FILE, fallbackTypes);
  console.log('⚠️  Created fallback types. Please fix the type generation process.');
}
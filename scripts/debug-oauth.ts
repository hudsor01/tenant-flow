#!/usr/bin/env tsx

/**
 * OAuth Debugging Script
 * Run this to verify your OAuth configuration is correct
 *
 * Usage: npx tsx scripts/debug-oauth.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL ||
	'https://bshjmbshupiibfiewpxb.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const PRODUCTION_URL = 'https://tenantflow.app'

console.log('🔍 OAuth Configuration Debugger\n')
console.log('================================\n')

// Check environment variables
console.log('1. Environment Variables:')
console.log(`   - SUPABASE_URL: ${SUPABASE_URL}`)
console.log(`   - ANON_KEY: ${SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`)
console.log('')

// Check redirect URL format
console.log('2. Expected OAuth Configuration:')
console.log(`   - Production redirect URL: ${PRODUCTION_URL}/auth/callback`)
console.log(`   - Supabase callback URL: ${SUPABASE_URL}/auth/v1/callback`)
console.log('')

// Test OAuth URL generation
if (SUPABASE_ANON_KEY) {
	const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

	console.log('3. OAuth URL Generation Test:')

	// Generate OAuth URL to inspect
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: `${PRODUCTION_URL}/auth/callback`,
			skipBrowserRedirect: true // Don't actually redirect
		}
	})

	if (error) {
		console.log(`   ❌ Error: ${error.message}`)
		console.log(`   - Error code: ${error.code || 'N/A'}`)
		console.log(`   - Error name: ${error.name || 'N/A'}`)
	} else if (data?.url) {
		const authUrl = new URL(data.url)
		console.log(`   ✅ OAuth URL generated successfully`)
		console.log(`   - Provider URL: ${authUrl.origin}`)
		console.log(
			`   - Redirect URI param: ${authUrl.searchParams.get('redirect_uri')}`
		)
		console.log(
			`   - Response type: ${authUrl.searchParams.get('response_type')}`
		)
		console.log(`   - Flow type: ${authUrl.searchParams.get('flow_type')}`)
	}
	console.log('')
}

// Checklist for manual verification
console.log('4. Manual Verification Checklist:')
console.log('   □ Remove malformed URLs from Supabase Dashboard:')
console.log('     - http://localhost: 3000/** (has space)')
console.log('     - http://localhost: 3001/** (has space)')
console.log('     - htttps://... (typo)')
console.log('     - https: //... (has space)')
console.log('')
console.log('   □ Keep these URLs in Dashboard:')
console.log('     - https://tenantflow.app/auth/callback')
console.log('     - https://tenantflow.app/**')
console.log('')
console.log('   □ Site URL should be: https://tenantflow.app')
console.log('')
console.log('   □ Google Cloud Console should have:')
console.log(`     - Authorized redirect: ${SUPABASE_URL}/auth/v1/callback`)
console.log('     - OAuth consent screen: Published (not Testing)')
console.log('')

console.log('5. Quick SQL Queries to Run:')
console.log('   Check recent OAuth attempts:')
console.log(`
   SELECT created_at, ip, path, status, method
   FROM auth.audit_log_entries
   WHERE created_at > NOW() - INTERVAL '1 hour'
   AND path LIKE '%callback%'
   ORDER BY created_at DESC;
`)

console.log('   Check Google OAuth users:')
console.log(`
   SELECT COUNT(*) as google_users
   FROM auth.users
   WHERE raw_app_meta_data->>'provider' = 'google';
`)

console.log('\n✨ Next Steps:')
console.log('1. Clean up malformed URLs in Supabase Dashboard')
console.log('2. Save changes (takes effect immediately)')
console.log('3. Test at https://tenantflow.app/login')
console.log('4. If still failing, check browser console for specific error')

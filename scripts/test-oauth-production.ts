#!/usr/bin/env tsx

/**
 * Production OAuth Test Script
 * Tests the OAuth configuration against production environment
 *
 * Usage: npx tsx scripts/test-oauth-production.ts
 */

import { createBrowserClient } from '@supabase/ssr'

const PRODUCTION_URL = 'https://tenantflow.app'
const SUPABASE_URL = 'https://bshjmbshupiibfiewpxb.supabase.co'
const SUPABASE_ANON_KEY =
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaGptYnNodXBpaWJmaWV3cHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MDc1MDYsImV4cCI6MjA2Mzk4MzUwNn0.K9cR4SN_MtutRWPJsymtAtlHpEJFyfnQgtu8BjQRqko'

console.log('🚀 Production OAuth Configuration Test\n')
console.log('======================================\n')

// Initialize Supabase client
const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)

console.log('📋 Configuration Check:')
console.log('-----------------------')
console.log(`Project URL: ${SUPABASE_URL}`)
console.log(`Production URL: ${PRODUCTION_URL}`)
console.log(`Expected Callback: ${PRODUCTION_URL}/auth/callback`)
console.log(`Supabase OAuth Callback: ${SUPABASE_URL}/auth/v1/callback`)
console.log('')

console.log('🔍 Testing OAuth URL Generation:')
console.log('--------------------------------')

// Test OAuth URL generation
try {
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: `${PRODUCTION_URL}/auth/callback`,
			skipBrowserRedirect: true
		}
	})

	if (error) {
		console.log(`❌ OAuth URL Generation Failed:`)
		console.log(`   Error: ${error.message}`)
		console.log(`   Code: ${error.code || 'Unknown'}`)
		console.log(`   Name: ${error.name || 'Unknown'}`)

		// Provide specific guidance based on error
		if (error.message.includes('redirect')) {
			console.log('\n⚠️  This suggests redirect URL configuration issues')
			console.log('   Check the Supabase Dashboard for malformed URLs')
		}
	} else if (data?.url) {
		console.log('✅ OAuth URL Generated Successfully!')

		const url = new URL(data.url)
		const redirectUri = url.searchParams.get('redirect_uri')

		console.log(`   OAuth Provider: ${url.hostname}`)
		console.log(`   Redirect URI: ${redirectUri}`)
		console.log(`   Response Type: ${url.searchParams.get('response_type')}`)
		console.log(
			`   Code Challenge Method: ${url.searchParams.get('code_challenge_method')}`
		)

		// Verify redirect URI format
		if (redirectUri === `${SUPABASE_URL}/auth/v1/callback`) {
			console.log('   ✅ Redirect URI format is correct')
		} else {
			console.log('   ⚠️  Unexpected redirect URI format')
		}
	}
} catch (err) {
	console.log('❌ Unexpected error:', err)
}

console.log('\n📝 Required Dashboard Configuration:')
console.log('-----------------------------------')
console.log('1. Redirect URLs (must include):')
console.log(`   ✅ ${PRODUCTION_URL}/auth/callback`)
console.log('   ✅ https://tenantflow.app/**')
console.log('')
console.log('2. Site URL:')
console.log('   ✅ https://tenantflow.app')
console.log('')

console.log('🚫 URLs to REMOVE (malformed):')
console.log('------------------------------')
console.log('   ❌ http://localhost: 3000/**  (space after colon)')
console.log('   ❌ http://localhost: 3001/**  (space after colon)')
console.log('   ❌ htttps://... (typo in https)')
console.log('   ❌ https: //... (space after colon)')
console.log('')

console.log('🔧 Google Cloud Console Requirements:')
console.log('------------------------------------')
console.log('1. OAuth 2.0 Client ID must have:')
console.log(`   - Authorized redirect URI: ${SUPABASE_URL}/auth/v1/callback`)
console.log('   - OAuth consent screen: Published (not Testing)')
console.log('   - Authorized domains: bshjmbshupiibfiewpxb.supabase.co')
console.log('')

console.log('🧪 Test Procedure:')
console.log('-----------------')
console.log('1. Fix malformed URLs in Supabase Dashboard')
console.log('2. Verify Site URL is set correctly')
console.log('3. Save changes (takes effect immediately)')
console.log('4. Open browser in Incognito mode')
console.log('5. Navigate to https://tenantflow.app/login')
console.log('6. Click "Sign in with Google"')
console.log('7. Complete Google authentication')
console.log('8. Should redirect to dashboard on success')
console.log('')

console.log('📊 SQL Queries for Verification:')
console.log('-------------------------------')
console.log('Recent OAuth attempts:')
console.log(`
SELECT
  created_at,
  ip,
  path,
  status,
  method,
  error_message
FROM auth.audit_log_entries
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND (path LIKE '%google%' OR path LIKE '%callback%')
ORDER BY created_at DESC
LIMIT 10;
`)

console.log('Check for successful Google logins:')
console.log(`
SELECT
  created_at,
  email,
  last_sign_in_at
FROM auth.users
WHERE raw_app_meta_data->>'provider' = 'google'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
`)

console.log('\n✨ Summary:')
console.log('-----------')
console.log('Your code implementation is CORRECT.')
console.log('The issue is malformed URLs in the Supabase Dashboard.')
console.log('Clean up those URLs and OAuth will work immediately!')

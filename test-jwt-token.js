/**
 * JWT Token Diagnostic Script
 * Tests if we can get a valid JWT token from Supabase and decode it
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY

// Test credentials
const TEST_EMAIL = 'rhudson42@yahoo.com'
const TEST_PASSWORD = process.env.E2E_OWNER_PASSWORD

async function testJwtToken() {
	console.log('🔍 JWT Token Diagnostic')
	console.log('=' .repeat(50))
	console.log(`Supabase URL: ${SUPABASE_URL}`)
	console.log(`Using publishable key: ${SUPABASE_PUBLISHABLE_KEY?.substring(0, 20)}...`)
	console.log(`Test email: ${TEST_EMAIL}`)
	console.log('')

	if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !TEST_PASSWORD) {
		console.error('❌ Missing environment variables')
		console.error('Required: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, E2E_OWNER_PASSWORD')
		process.exit(1)
	}

	// Create Supabase client
	const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)

	try {
		console.log('📝 Attempting login...')
		const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
			email: TEST_EMAIL,
			password: TEST_PASSWORD
		})

		if (authError) {
			console.error('❌ Login failed:', authError.message)
			process.exit(1)
		}

		console.log('✅ Login successful')
		console.log('')

		// Get session
		const { data: { session }, error: sessionError } = await supabase.auth.getSession()

		if (sessionError || !session) {
			console.error('❌ Failed to get session:', sessionError?.message)
			process.exit(1)
		}

		console.log('📋 Session Information:')
		console.log(`  User ID: ${session.user.id}`)
		console.log(`  Email: ${session.user.email}`)
		console.log(`  Token expires at: ${new Date(session.expires_at * 1000).toISOString()}`)
		console.log('')

		// Decode JWT token (base64 decode the payload)
		const token = session.access_token
		console.log('🔑 JWT Token (first 50 chars):')
		console.log(`  ${token.substring(0, 50)}...`)
		console.log('')

		// Decode JWT payload
		const parts = token.split('.')
		if (parts.length !== 3) {
			console.error('❌ Invalid JWT format')
			process.exit(1)
		}

		const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
		console.log('📦 JWT Payload:')
		console.log(JSON.stringify(payload, null, 2))
		console.log('')

		// Test JWKS endpoint
		console.log('🔐 Testing JWKS endpoint...')
		const jwksUrl = `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`
		console.log(`  URL: ${jwksUrl}`)
		
		const jwksResponse = await fetch(jwksUrl)
		const jwksData = await jwksResponse.json()
		
		console.log('✅ JWKS endpoint accessible')
		console.log(`  Algorithm: ${jwksData.keys[0].alg}`)
		console.log(`  Key ID: ${jwksData.keys[0].kid}`)
		console.log('')

		// Test backend API with token
		const backendUrl = process.env.API_BASE_URL || 'https://api.tenantflow.app'
		console.log(`🚀 Testing backend API: ${backendUrl}/api/v1/properties`)
		
		const apiResponse = await fetch(`${backendUrl}/api/v1/properties`, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		})

		console.log(`  Response status: ${apiResponse.status}`)
		
		if (apiResponse.ok) {
			console.log('✅ Backend API accessible with token')
			const data = await apiResponse.json()
			console.log(`  Properties count: ${data?.data?.length || 0}`)
		} else {
			console.error('❌ Backend API returned error')
			const errorText = await apiResponse.text()
			console.error(`  Error: ${errorText.substring(0, 200)}`)
		}

	} catch (error) {
		console.error('❌ Error:', error.message)
		console.error(error.stack)
		process.exit(1)
	}
}

testJwtToken()

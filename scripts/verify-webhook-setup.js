#!/usr/bin/env node

// Script to verify webhook setup and test connectivity

const WEBHOOK_URL =
	'https://bshjmbshupiibfiewpxb.supabase.co/functions/v1/stripe-webhook'

async function testWebhook() {
	console.log('🔍 Testing Stripe webhook endpoint...\n')

	// Test 1: Basic connectivity
	console.log('1️⃣ Testing basic connectivity...')
	try {
		const response = await fetch(WEBHOOK_URL, {
			method: 'OPTIONS',
			headers: {
				Origin: 'https://stripe.com'
			}
		})

		if (response.ok) {
			console.log('✅ CORS preflight successful')
		} else {
			console.log(`❌ CORS preflight failed: ${response.status}`)
		}
	} catch (error) {
		console.log('❌ Failed to connect:', error.message)
	}

	// Test 2: Method not allowed
	console.log('\n2️⃣ Testing GET rejection (should fail)...')
	try {
		const response = await fetch(WEBHOOK_URL, {
			method: 'GET'
		})

		if (response.status === 405) {
			console.log('✅ Correctly rejects GET requests')
		} else {
			console.log(`❌ Unexpected response: ${response.status}`)
		}
	} catch (error) {
		console.log('❌ Failed:', error.message)
	}

	// Test 3: Missing signature
	console.log('\n3️⃣ Testing POST without signature (should fail)...')
	try {
		const response = await fetch(WEBHOOK_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ test: true })
		})

		if (response.status === 400) {
			console.log('✅ Correctly rejects unsigned requests')
		} else {
			console.log(`❌ Unexpected response: ${response.status}`)
			const text = await response.text()
			console.log('Response:', text)
		}
	} catch (error) {
		console.log('❌ Failed:', error.message)
	}

	console.log('\n📋 Summary:')
	console.log('- Webhook URL:', WEBHOOK_URL)
	console.log(
		'- The webhook should only accept POST requests with valid Stripe signatures'
	)
	console.log('- Check Stripe Dashboard for webhook attempts and responses')
	console.log('\n🔗 Stripe Webhook Dashboard:')
	console.log('https://dashboard.stripe.com/webhooks')
}

testWebhook()

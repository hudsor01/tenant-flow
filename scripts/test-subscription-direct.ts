#!/usr/bin/env tsx
/**
 * Direct test of subscription endpoints with JWT token
 */

import fetch from 'node-fetch'
import { config } from 'dotenv'
import { resolve } from 'path'
import jwt from 'jsonwebtoken'

// Load environment variables
config({ path: resolve(__dirname, '../apps/backend/.env') })

const API_URL = 'http://localhost:3002/api/v1'
const TRPC_URL = `${API_URL}/trpc`

// Create a test JWT token
function createTestToken() {
    const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'test-secret'
    
    // Create a test user payload
    const payload = {
        sub: 'test-user-123',
        id: 'test-user-123',
        email: 'test@example.com',
        role: 'OWNER',
        aud: 'authenticated',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    }
    
    return jwt.sign(payload, jwtSecret)
}

async function testTRPCEndpoint(endpoint: string, method: string = 'GET', body?: any, token?: string) {
    console.log(`\n🔍 Testing ${endpoint}...`)
    
    const headers: any = {
        'Content-Type': 'application/json'
    }
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }
    
    const options: any = {
        method,
        headers
    }
    
    if (body) {
        options.body = JSON.stringify(body)
    }
    
    try {
        const response = await fetch(`${TRPC_URL}/${endpoint}`, options)
        const responseText = await response.text()
        
        console.log(`📊 Status: ${response.status}`)
        console.log(`📋 Headers:`, Object.fromEntries(response.headers))
        
        if (responseText) {
            try {
                const data = JSON.parse(responseText)
                console.log(`✅ Response:`, JSON.stringify(data, null, 2))
            } catch {
                console.log(`📝 Response (text):`, responseText)
            }
        }
        
        return response
    } catch (error) {
        console.error(`❌ Error:`, error)
        return null
    }
}

async function main() {
    console.log('🚀 Starting direct subscription test...\n')
    console.log(`🔗 API URL: ${API_URL}`)
    console.log(`🔗 TRPC URL: ${TRPC_URL}`)
    
    // Create test token
    const token = createTestToken()
    console.log(`\n🔑 Test JWT token created`)
    console.log(`📝 Token (first 50 chars): ${token.substring(0, 50)}...`)
    
    // Test endpoints
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Testing subscription endpoints with authentication')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // 1. Test without auth first
    await testTRPCEndpoint('subscriptions.current')
    
    // 2. Test with auth
    await testTRPCEndpoint('subscriptions.current', 'GET', null, token)
    
    // 3. Test other endpoints
    await testTRPCEndpoint('subscriptions.getPlans', 'GET', null, token)
    await testTRPCEndpoint('subscriptions.canAccessPremiumFeatures', 'GET', null, token)
    
    // 4. Test mutations
    await testTRPCEndpoint('subscriptions.startFreeTrial', 'POST', { json: {} }, token)
    
    await testTRPCEndpoint('subscriptions.createCheckoutSession', 'POST', {
        json: {
            planType: 'STARTER',
            billingInterval: 'monthly',
            collectPaymentMethod: false,
            successUrl: 'http://localhost:5173/billing/success',
            cancelUrl: 'http://localhost:5173/billing',
            uiMode: 'hosted'
        }
    }, token)
    
    await testTRPCEndpoint('subscriptions.createPortalSession', 'POST', {
        json: {
            returnUrl: 'http://localhost:5173/billing'
        }
    }, token)
    
    console.log('\n✨ Direct test completed!')
}

// Run the test
main().catch(console.error)
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from backend
dotenv.config({ path: resolve(__dirname, '../apps/backend/.env') })

const API_URL = process.env.BACKEND_URL || 'http://tenantflow.app'

// Test user with active subscription
const TEST_USER = {
    id: 'c3a5e780-4d3f-4b73-9b6f-74b6a8e0d2c1',
    email: 'test@tenantflow.app',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjM2E1ZTc4MC00ZDNmLTRiNzMtOWI2Zi03NGI2YThlMGQyYzEiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3MDA1MzM0OTd9.EuxlH0NyXlO3qvqFl95TQU4qY0p-J_-6m7bFQo9XwXw'
}

async function testSubscriptionEndpoints() {
    console.log('🚀 Testing subscription endpoints...')
    console.log(`📡 API URL: ${API_URL}`)
    
    try {
        // Test 1: Get current subscription status
        console.log('\n1️⃣ Testing subscriptions.current endpoint...')
        const statusResponse = await fetch(`${API_URL}/api/v1/trpc/subscriptions.current?batch=1&input=${encodeURIComponent(JSON.stringify({"0":{}}))}`, {
            method: 'GET',
            headers: {
                'authorization': `Bearer ${TEST_USER.token}`,
                'content-type': 'application/json',
            },
        })
        
        console.log('Status Response:', statusResponse.status)
        const statusText = await statusResponse.text()
        console.log('Status Body:', statusText)
        
        if (statusResponse.ok) {
            const statusData = JSON.parse(statusText)
            console.log('✅ Current subscription:', JSON.stringify(statusData, null, 2))
        }
        
        // Test 2: Create checkout session
        console.log('\n2️⃣ Testing subscriptions.createCheckoutSession endpoint...')
        const checkoutResponse = await fetch(`${API_URL}/api/v1/trpc/subscriptions.createCheckoutSession`, {
            method: 'POST',
            headers: {
                'authorization': `Bearer ${TEST_USER.token}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                planType: 'PROFESSIONAL',
                billingInterval: 'monthly',
                successUrl: 'http://tenantflow.app/subscription/success',
                cancelUrl: 'http://tenantflow.app/subscription/cancel'
            })
        })
        
        console.log('Checkout Response:', checkoutResponse.status)
        const checkoutText = await checkoutResponse.text()
        console.log('Checkout Body:', checkoutText)
        
        if (checkoutResponse.ok) {
            const checkoutData = JSON.parse(checkoutText)
            console.log('✅ Checkout session created:', checkoutData.result?.data?.url)
        }
        
        // Test 3: Get subscription plans
        console.log('\n3️⃣ Testing subscriptions.getPlans endpoint...')
        const plansResponse = await fetch(`${API_URL}/api/v1/trpc/subscriptions.getPlans?batch=1&input=${encodeURIComponent(JSON.stringify({"0":{}}))}`, {
            method: 'GET',
            headers: {
                'authorization': `Bearer ${TEST_USER.token}`,
                'content-type': 'application/json',
            },
        })
        
        console.log('Plans Response:', plansResponse.status)
        const plansText = await plansResponse.text()
        console.log('Plans Body:', plansText)
        
        if (plansResponse.ok) {
            const plansData = JSON.parse(plansText)
            console.log('✅ Available plans:', JSON.stringify(plansData, null, 2))
        }
        
        // Test 4: Check premium features access
        console.log('\n4️⃣ Testing subscriptions.canAccessPremiumFeatures endpoint...')
        const premiumResponse = await fetch(`${API_URL}/api/v1/trpc/subscriptions.canAccessPremiumFeatures?batch=1&input=${encodeURIComponent(JSON.stringify({"0":{}}))}`, {
            method: 'GET',
            headers: {
                'authorization': `Bearer ${TEST_USER.token}`,
                'content-type': 'application/json',
            },
        })
        
        console.log('Premium Response:', premiumResponse.status)
        const premiumText = await premiumResponse.text()
        console.log('Premium Body:', premiumText)
        
        console.log('\n✅ All subscription endpoint tests completed\!')
        
    } catch (error) {
        console.error('❌ Test failed:', error)
        process.exit(1)
    }
}

// Run the test
testSubscriptionEndpoints().catch(console.error)
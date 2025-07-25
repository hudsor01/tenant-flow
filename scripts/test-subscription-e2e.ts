import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from project root
dotenv.config({ path: resolve(__dirname, '../.env') })
dotenv.config({ path: resolve(__dirname, '../.env.local') })

// Debug env vars
console.log('Environment variables loaded:')
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'NOT FOUND')
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY ? 'FOUND' : 'NOT FOUND')

const API_URL = process.env.BACKEND_URL || 'http://tenantflow.app'
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing required environment variables!')
    console.error('Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in .env or .env.local')
    process.exit(1)
}

// Test user credentials
const TEST_EMAIL = `test_${Date.now()}@tenantflow.app`
const TEST_PASSWORD = 'TestPassword123!'

// Initialize Supabase client (use service key if available to bypass email confirmation)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function testSubscriptionE2E() {
    console.log('🚀 Starting End-to-End Subscription Test...')
    console.log(`📡 API URL: ${API_URL}`)
    console.log(`🔑 Test email: ${TEST_EMAIL}`)
    
    try {
        // Step 1: Create a new user
        console.log('\n1️⃣ Creating test user...')
        
        let userId: string
        
        if (SUPABASE_SERVICE_KEY) {
            // Use admin API to create user without email confirmation
            const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            })
            
            const { data: createUserData, error: createUserError } = await adminClient.auth.admin.createUser({
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
                email_confirm: true,
                user_metadata: {
                    name: 'Test User'
                }
            })
            
            if (createUserError) {
                throw new Error(`Failed to create user: ${createUserError.message}`)
            }
            
            userId = createUserData.user.id
            console.log('✅ User created with admin API:', userId)
        } else {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
                options: {
                    data: {
                        name: 'Test User',
                    }
                }
            })
            
            if (signUpError) {
                throw new Error(`Failed to create user: ${signUpError.message}`)
            }
            
            userId = signUpData.user!.id
            console.log('✅ User created:', userId)
        }
        
        // Step 2: Sign in to get a valid token
        console.log('\n2️⃣ Signing in...')
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        })
        
        if (signInError) {
            throw new Error(`Failed to sign in: ${signInError.message}`)
        }
        
        const accessToken = signInData.session?.access_token
        if (!accessToken) {
            throw new Error('No access token received')
        }
        
        console.log('✅ Signed in successfully')
        console.log('🔐 Access token:', accessToken.substring(0, 50) + '...')
        
        // Step 3: Ensure user exists in our database
        console.log('\n3️⃣ Ensuring user exists in database...')
        const ensureResponse = await fetch(`${API_URL}/api/v1/users/ensure-exists`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: signInData.user.id,
                email: signInData.user.email,
                name: 'Test User'
            })
        })
        
        if (!ensureResponse.ok) {
            const errorText = await ensureResponse.text()
            console.error('Failed to ensure user exists:', errorText)
        } else {
            console.log('✅ User exists in database')
        }
        
        // Step 4: Test subscription endpoints with valid token
        console.log('\n4️⃣ Testing subscription endpoints...')
        
        // Test current subscription status
        console.log('\n📊 Getting current subscription status...')
        const statusResponse = await fetch(`${API_URL}/api/v1/trpc/subscriptions.current?batch=1&input=${encodeURIComponent(JSON.stringify({"0":{}}))}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        })
        
        console.log('Status Response:', statusResponse.status)
        const statusData = await statusResponse.json()
        console.log('Current subscription:', JSON.stringify(statusData, null, 2))
        
        // Test getting subscription plans
        console.log('\n📋 Getting available plans...')
        const plansResponse = await fetch(`${API_URL}/api/v1/trpc/subscriptions.getPlans?batch=1&input=${encodeURIComponent(JSON.stringify({"0":{}}))}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        })
        
        console.log('Plans Response:', plansResponse.status)
        const plansData = await plansResponse.json()
        console.log('Available plans:', JSON.stringify(plansData, null, 2))
        
        // Test creating checkout session
        console.log('\n💳 Creating checkout session...')
        const checkoutResponse = await fetch(`${API_URL}/api/v1/trpc/subscriptions.createCheckoutSession`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                planType: 'PROFESSIONAL',
                billingInterval: 'monthly',
                successUrl: 'http://tenantflow.app/subscription/success',
                cancelUrl: 'http://tenantflow.app/subscription/cancel'
            })
        })
        
        console.log('Checkout Response:', checkoutResponse.status)
        const checkoutData = await checkoutResponse.json()
        console.log('Checkout session:', JSON.stringify(checkoutData, null, 2))
        
        if (checkoutData.result?.data?.url) {
            console.log('\n🔗 Checkout URL:', checkoutData.result.data.url)
            console.log('   You can open this URL to complete the subscription')
        }
        
        // Test premium features access
        console.log('\n🔒 Checking premium features access...')
        const premiumResponse = await fetch(`${API_URL}/api/v1/trpc/subscriptions.canAccessPremiumFeatures?batch=1&input=${encodeURIComponent(JSON.stringify({"0":{}}))}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        })
        
        console.log('Premium Response:', premiumResponse.status)
        const premiumData = await premiumResponse.json()
        console.log('Premium access:', JSON.stringify(premiumData, null, 2))
        
        // Test starting free trial
        console.log('\n🎁 Starting free trial...')
        const trialResponse = await fetch(`${API_URL}/api/v1/trpc/subscriptions.startFreeTrial`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
        })
        
        console.log('Trial Response:', trialResponse.status)
        const trialData = await trialResponse.json()
        console.log('Free trial result:', JSON.stringify(trialData, null, 2))
        
        // Check subscription status again after trial
        console.log('\n📊 Checking subscription status after trial...')
        const statusAfterTrialResponse = await fetch(`${API_URL}/api/v1/trpc/subscriptions.current?batch=1&input=${encodeURIComponent(JSON.stringify({"0":{}}))}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        })
        
        const statusAfterTrialData = await statusAfterTrialResponse.json()
        console.log('Updated subscription:', JSON.stringify(statusAfterTrialData, null, 2))
        
        console.log('\n✅ End-to-End subscription test completed successfully!')
        
        // Cleanup: Sign out
        console.log('\n🧹 Cleaning up...')
        await supabase.auth.signOut()
        console.log('✅ Signed out')
        
    } catch (error) {
        console.error('❌ Test failed:', error)
        process.exit(1)
    }
}

// Run the test
testSubscriptionE2E().catch(console.error)
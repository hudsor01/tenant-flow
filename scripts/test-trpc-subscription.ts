#!/usr/bin/env node
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../apps/backend/src/trpc/app-router'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from backend
dotenv.config({ path: resolve(__dirname, '../apps/backend/.env') })

const API_URL = process.env.BACKEND_URL || 'http://tenantflow.app'
const TEST_TOKEN = 'test-token-123'

// Create TRPC client
const client = createTRPCProxyClient<AppRouter>({
    links: [
        httpBatchLink({
            url: `${API_URL}/api/v1/trpc`,
            headers: {
                authorization: `Bearer ${TEST_TOKEN}`,
            },
        }),
    ],
})

async function testSubscriptionFlow() {
    console.log('🚀 Testing TRPC subscription endpoints...')
    console.log(`📡 API URL: ${API_URL}/api/v1/trpc`)
    console.log(`🔑 Using test token: ${TEST_TOKEN}`)
    
    try {
        // Test 1: Get current subscription
        console.log('\n📊 Testing current subscription status...')
        try {
            const status = await client.subscriptions.current.query()
            console.log('✅ Current subscription:', JSON.stringify(status, null, 2))
        } catch (error: any) {
            console.error('❌ Failed to get current subscription:', error.message)
        }
        
        // Test 2: Get available plans
        console.log('\n📋 Testing get available plans...')
        try {
            const plans = await client.subscriptions.getPlans.query()
            console.log('✅ Available plans:', JSON.stringify(plans, null, 2))
        } catch (error: any) {
            console.error('❌ Failed to get plans:', error.message)
        }
        
        // Test 3: Check premium access
        console.log('\n🔐 Testing premium access check...')
        try {
            const access = await client.subscriptions.canAccessPremiumFeatures.query()
            console.log('✅ Premium access:', JSON.stringify(access, null, 2))
        } catch (error: any) {
            console.error('❌ Failed to check premium access:', error.message)
        }
        
        // Test 4: Create checkout session
        console.log('\n💳 Testing checkout session creation...')
        try {
            const checkout = await client.subscriptions.createCheckoutSession.mutate({
                planType: 'PROFESSIONAL',
                billingInterval: 'monthly',
                successUrl: 'http://tenantflow.app/subscription/success',
                cancelUrl: 'http://tenantflow.app/subscription/cancel'
            })
            console.log('✅ Checkout session created:', JSON.stringify(checkout, null, 2))
        } catch (error: any) {
            console.error('❌ Failed to create checkout session:', error.message)
        }
        
        // Test 5: Create customer portal session
        console.log('\n🔧 Testing customer portal session creation...')
        try {
            const portal = await client.subscriptions.createPortalSession.mutate({
                returnUrl: 'http://tenantflow.app/subscription'
            })
            console.log('✅ Customer portal URL:', portal.url)
        } catch (error: any) {
            console.error('❌ Failed to create portal session:', error.message)
        }
        
        // Test 6: Start free trial
        console.log('\n🆓 Testing free trial start...')
        try {
            const trial = await client.subscriptions.startFreeTrial.mutate()
            console.log('✅ Free trial started:', JSON.stringify(trial, null, 2))
        } catch (error: any) {
            console.error('❌ Failed to start free trial:', error.message)
        }
        
        console.log('\n✨ All tests completed!')
        
    } catch (error) {
        console.error('❌ Test suite failed:', error)
        process.exit(1)
    }
}

// Run the test
testSubscriptionFlow().catch(console.error)
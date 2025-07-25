#!/usr/bin/env tsx
/**
 * Test subscription endpoints using Supabase authentication
 */

import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(__dirname, '../apps/backend/.env') })

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const API_URL = 'http://tenantflow.app/api/v1/trpc'

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function getOrCreateTestUser() {
    console.log('🔐 Getting or creating test user...')
    
    // Try to sign in with existing user
    const { data: signInData, error: signInError } = await supabase.auth.admin.listUsers()
    
    const existingUser = signInData?.users?.find(u => u.email === 'test@tenantflow.app')
    
    if (existingUser) {
        console.log('✅ Found existing test user')
        // Generate a new access token for the user
        const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: 'test@tenantflow.app'
        })
        
        // Sign in as the user
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'test@tenantflow.app',
            password: 'testpassword123'
        })
        
        if (error) {
            // If password login fails, try to update the password
            console.log('🔄 Password login failed, updating user password...')
            const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
                existingUser.id,
                { password: 'testpassword123' }
            )
            
            if (updateError) {
                throw new Error(`Failed to update password: ${updateError.message}`)
            }
            
            // Try signing in again
            const { data: newSession, error: newSignInError } = await supabase.auth.signInWithPassword({
                email: 'test@tenantflow.app',
                password: 'testpassword123'
            })
            
            if (newSignInError) {
                throw new Error(`Failed to sign in after password update: ${newSignInError.message}`)
            }
            
            return newSession.session!.access_token
        }
        
        return data.session!.access_token
    } else {
        console.log('👤 Creating new test user...')
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: 'test@tenantflow.app',
            password: 'testpassword123',
            email_confirm: true
        })
        
        if (createError) {
            throw new Error(`Failed to create user: ${createError.message}`)
        }
        
        // Sign in with the new user
        const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
            email: 'test@tenantflow.app',
            password: 'testpassword123'
        })
        
        if (signInError) {
            throw new Error(`Failed to sign in: ${signInError.message}`)
        }
        
        return session.session!.access_token
    }
}

async function testEndpoint(name: string, endpoint: string, method: string = 'GET', body?: any, token?: string) {
    console.log(`\n${name}`)
    
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
        const response = await fetch(`${API_URL}/${endpoint}`, options)
        const responseText = await response.text()
        
        console.log(`📊 Status: ${response.status}`)
        
        if (responseText) {
            try {
                const data = JSON.parse(responseText)
                if (response.ok) {
                    console.log('✅ Success:', JSON.stringify(data.result?.data || data, null, 2))
                } else {
                    console.log('❌ Error:', JSON.stringify(data.error || data, null, 2))
                }
            } catch {
                console.log('📝 Response:', responseText)
            }
        }
    } catch (error) {
        console.error('❌ Request failed:', error)
    }
}

async function main() {
    try {
        console.log('🚀 Testing Subscription Endpoints with Supabase Auth')
        console.log('===================================================\n')
        
        // Get auth token
        const token = await getOrCreateTestUser()
        console.log('🔑 Got access token')
        console.log('📝 Token preview:', token.substring(0, 50) + '...')
        
        // Test all subscription endpoints
        await testEndpoint('1️⃣ Get current subscription', 'subscriptions.current', 'GET', null, token)
        
        await testEndpoint('2️⃣ Get available plans', 'subscriptions.getPlans', 'GET', null, token)
        
        await testEndpoint('3️⃣ Check premium features access', 'subscriptions.canAccessPremiumFeatures', 'GET', null, token)
        
        await testEndpoint('4️⃣ Start free trial', 'subscriptions.startFreeTrial', 'POST', { json: {} }, token)
        
        await testEndpoint('5️⃣ Create checkout session', 'subscriptions.createCheckoutSession', 'POST', {
            json: {
                planType: 'STARTER',
                billingInterval: 'monthly',
                collectPaymentMethod: false,
                successUrl: 'http://tenantflow.app/billing/success',
                cancelUrl: 'http://tenantflow.app/billing',
                uiMode: 'hosted'
            }
        }, token)
        
        await testEndpoint('6️⃣ Create portal session', 'subscriptions.createPortalSession', 'POST', {
            json: {
                returnUrl: 'http://tenantflow.app/billing'
            }
        }, token)
        
        console.log('\n✨ Testing completed!')
        
    } catch (error) {
        console.error('\n❌ Test failed:', error)
        process.exit(1)
    }
}

// Run the test
main().catch(console.error)
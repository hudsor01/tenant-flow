#!/usr/bin/env node

/**
 * Authentication Diagnostic Tool
 * Tests the complete authentication flow to identify issues
 */

const { createClient } = require('@supabase/supabase-js')

// Configuration (use environment variables in production)
const SUPABASE_URL = 'https://bshjmbshupiibfiewpxb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaGptYnNodXBpaWJmaWV3cHhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MDc1MDYsImV4cCI6MjA2Mzk4MzUwNn0.K9cR4SN_MtutRWPJsymtAtlHpEJFyfnQgtu8BjQRqko'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testAuthFlow() {
  console.log('🔍 Starting Authentication Diagnostic...\n')
  
  try {
    // Test 1: Check Supabase connection
    console.log('1. Testing Supabase connection...')
    const { data: { session: initialSession } } = await supabase.auth.getSession()
    console.log(`   ✅ Connection successful`)
    console.log(`   📊 Initial session: ${initialSession ? 'Active' : 'None'}\n`)
    
    // Test 2: Test login with test credentials
    console.log('2. Testing login flow...')
    const testEmail = 'test@tenantflow.app'
    const testPassword = 'TestPassword123!'
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })
    
    if (signInError) {
      console.log(`   ❌ Login failed: ${signInError.message}`)
      
      // Test 3: Try creating test user if login fails
      console.log('3. Attempting to create test user...')
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            full_name: 'Test User',
          }
        }
      })
      
      if (signUpError) {
        console.log(`   ❌ Signup failed: ${signUpError.message}`)
        return
      }
      
      console.log(`   ✅ Test user created successfully`)
      console.log(`   📊 User ID: ${signUpData.user?.id}`)
      console.log(`   📊 Email confirmed: ${signUpData.user?.email_confirmed_at ? 'Yes' : 'No (check email)'}`)
    } else {
      console.log(`   ✅ Login successful`)
      console.log(`   📊 User ID: ${signInData.user?.id}`)
      console.log(`   📊 Email: ${signInData.user?.email}`)
      console.log(`   📊 Session: ${signInData.session?.access_token ? 'Active' : 'None'}`)
    }
    
    // Test 4: Check current session status
    console.log('\n4. Checking session persistence...')
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    if (currentSession) {
      console.log(`   ✅ Session persisted successfully`)
      console.log(`   📊 Access token present: ${currentSession.access_token ? 'Yes' : 'No'}`)
      console.log(`   📊 Refresh token present: ${currentSession.refresh_token ? 'Yes' : 'No'}`)
      console.log(`   📊 Expires at: ${new Date(currentSession.expires_at * 1000).toLocaleString()}`)
    } else {
      console.log(`   ❌ Session not persisted`)
    }
    
    // Test 5: Test backend API connection
    console.log('\n5. Testing backend API connection...')
    try {
      const response = await fetch('https://api.tenantflow.app/health')
      const healthData = await response.json()
      console.log(`   ✅ Backend API accessible`)
      console.log(`   📊 Status: ${healthData.status}`)
      console.log(`   📊 Uptime: ${Math.floor(healthData.uptime / 60)} minutes`)
    } catch (error) {
      console.log(`   ❌ Backend API error: ${error.message}`)
    }
    
    // Test 6: Test authenticated API endpoint
    if (currentSession) {
      console.log('\n6. Testing authenticated API endpoint...')
      try {
        const response = await fetch('https://api.tenantflow.app/api/v1/auth/me', {
          headers: {
            'Authorization': `Bearer ${currentSession.access_token}`,
            'Content-Type': 'application/json',
          },
        })
        const authData = await response.json()
        
        if (response.ok && authData.success) {
          console.log(`   ✅ Backend authentication working`)
          console.log(`   📊 User: ${authData.data?.user?.email}`)
        } else {
          console.log(`   ❌ Backend authentication failed: ${authData.message}`)
        }
      } catch (error) {
        console.log(`   ❌ API request error: ${error.message}`)
      }
    }
    
    // Cleanup: Sign out
    console.log('\n7. Cleaning up...')
    await supabase.auth.signOut()
    console.log(`   ✅ Signed out successfully`)
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message)
  }
  
  console.log('\n🎯 Diagnostic complete!')
}

// Run diagnostic
testAuthFlow().catch(console.error)
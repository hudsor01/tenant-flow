#!/usr/bin/env node
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from backend
dotenv.config({ path: resolve(__dirname, '../apps/backend/.env') })

const API_URL = process.env.BACKEND_URL || 'http://tenantflow.app'
const TEST_TOKEN = 'test-token-123'

async function testAuthInjection() {
    console.log('🚀 Testing auth injection issue...')
    console.log(`📡 API URL: ${API_URL}`)
    
    try {
        // Test a simple TRPC query that uses authentication
        console.log('\n🔍 Testing properties.list endpoint (uses auth)...')
        const response = await fetch(`${API_URL}/api/v1/trpc/properties.list`, {
            method: 'GET',
            headers: {
                'authorization': `Bearer ${TEST_TOKEN}`,
                'content-type': 'application/json',
            },
        })
        
        const text = await response.text()
        console.log('Response status:', response.status)
        console.log('Response body:', text)
        
        if (text.includes('AuthService not injected')) {
            console.error('\n❌ AuthService is still not being injected properly!')
            console.log('\nThis means the dependency injection issue persists.')
            console.log('The AuthService needs to be properly injected into AppContext.')
        } else if (response.ok) {
            console.log('\n✅ AuthService injection appears to be working!')
            try {
                const json = JSON.parse(text)
                console.log('Parsed response:', JSON.stringify(json, null, 2))
            } catch (e) {
                console.log('Could not parse response as JSON')
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error)
        process.exit(1)
    }
}

// Run the test
testAuthInjection().catch(console.error)
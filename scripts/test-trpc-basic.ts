#!/usr/bin/env node
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from backend
dotenv.config({ path: resolve(__dirname, '../apps/backend/.env') })

const API_URL = process.env.BACKEND_URL || 'http://localhost:3002'
const TEST_TOKEN = 'test-token-123'

async function testBasicTRPC() {
    console.log('🚀 Testing basic TRPC endpoint...')
    console.log(`📡 API URL: ${API_URL}/api/v1/trpc`)
    console.log(`🔑 Using test token: ${TEST_TOKEN}`)
    
    try {
        // Test raw HTTP request to TRPC endpoint
        console.log('\n📡 Testing raw HTTP request to TRPC...')
        const response = await fetch(`${API_URL}/api/v1/trpc/subscriptions.getStatus`, {
            method: 'GET',
            headers: {
                'authorization': `Bearer ${TEST_TOKEN}`,
                'content-type': 'application/json',
            },
        })
        
        console.log('Response status:', response.status)
        console.log('Response headers:', Object.fromEntries(response.headers.entries()))
        
        const text = await response.text()
        console.log('Response body:', text)
        
        if (response.ok) {
            try {
                const json = JSON.parse(text)
                console.log('Parsed JSON:', JSON.stringify(json, null, 2))
            } catch (e) {
                console.log('Failed to parse as JSON')
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error)
        process.exit(1)
    }
}

// Run the test
testBasicTRPC().catch(console.error)
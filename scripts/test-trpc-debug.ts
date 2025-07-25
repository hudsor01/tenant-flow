#!/usr/bin/env node
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from backend
dotenv.config({ path: resolve(__dirname, '../apps/backend/.env') })

const API_URL = process.env.BACKEND_URL || 'http://tenantflow.app'
const TEST_TOKEN = 'test-token-123'

async function testTRPCDebug() {
    console.log('🚀 Testing TRPC debug...')
    console.log(`📡 API URL: ${API_URL}`)
    
    try {
        // Test 1: Base TRPC URL
        console.log('\n1️⃣ Testing base TRPC URL...')
        const baseResponse = await fetch(`${API_URL}/api/v1/trpc`, {
            method: 'GET',
            headers: {
                'authorization': `Bearer ${TEST_TOKEN}`,
            },
        })
        console.log('Base response:', baseResponse.status, await baseResponse.text())
        
        // Test 2: Health check
        console.log('\n2️⃣ Testing health check...')
        const healthResponse = await fetch(`${API_URL}/health`)
        console.log('Health response:', await healthResponse.json())
        
        // Test 3: Try different TRPC paths
        console.log('\n3️⃣ Testing various TRPC paths...')
        const paths = [
            'subscriptions.getStatus',
            'subscription.getStatus',  
            'auth.getStatus',
            'properties.list',
            '_health'
        ]
        
        for (const path of paths) {
            console.log(`\nTesting path: ${path}`)
            const response = await fetch(`${API_URL}/api/v1/trpc/${path}`, {
                method: 'GET',
                headers: {
                    'authorization': `Bearer ${TEST_TOKEN}`,
                    'content-type': 'application/json',
                },
            })
            const text = await response.text()
            console.log(`  Status: ${response.status}`)
            console.log(`  Body: ${text.substring(0, 200)}...`)
        }
        
        // Test 4: POST request
        console.log('\n4️⃣ Testing POST request...')
        const postResponse = await fetch(`${API_URL}/api/v1/trpc/subscriptions.getStatus`, {
            method: 'POST',
            headers: {
                'authorization': `Bearer ${TEST_TOKEN}`,
                'content-type': 'application/json',
            },
            body: JSON.stringify({ '0': {} })
        })
        console.log('POST response:', postResponse.status, await postResponse.text())
        
    } catch (error) {
        console.error('❌ Test failed:', error)
        process.exit(1)
    }
}

// Run the test
testTRPCDebug().catch(console.error)
#!/usr/bin/env node

// Load environment variables before anything else
require('dotenv-flow').config({
	path: process.cwd(),
	node_env: process.env.NODE_ENV || 'production'
})

console.log('Environment variables loaded successfully')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET')

// Now register tsx and run the application
require('tsx/cjs')
require('./src/main.ts')

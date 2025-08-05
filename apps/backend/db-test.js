const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '../../.env.local' });

console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DIRECT_URL exists:', !!process.env.DIRECT_URL);

const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL }
  }
});

console.log('Testing database connection...');

// Set timeout for connection test
const timeout = setTimeout(() => {
  console.error('❌ Database connection timeout after 10 seconds');
  process.exit(1);
}, 10000);

prisma.$connect()
  .then(() => {
    clearTimeout(timeout);
    console.log('✅ Database connection successful');
    return prisma.$disconnect();
  })
  .then(() => {
    console.log('✅ Database disconnection successful');
    process.exit(0);  
  })
  .catch((error) => {
    clearTimeout(timeout);
    console.error('❌ Database connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error type:', error.constructor.name);
    process.exit(1);
  });
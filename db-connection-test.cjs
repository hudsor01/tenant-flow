
const { PrismaClient } = require('@repo/database');
const prisma = new PrismaClient();
async function testConnection() {
  try {
    console.log('Testing database connection...')
    await prisma.$connect()
    console.log('✅ Database connection successful')
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Query test successful:', result)
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    console.error('Error code:', error.code)
  } finally {
    await prisma.$disconnect()
  }
}
testConnection()


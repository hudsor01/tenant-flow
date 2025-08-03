#!/usr/bin/env node

/**
 * Generate Vercel serverless endpoints from NestJS controllers
 * This script helps migrate from NestJS/Fastify to pure serverless functions
 */

const fs = require('fs')
const path = require('path')

// List of controllers to migrate
const controllers = [
  { name: 'tenants', path: 'src/tenants/tenants.controller.ts' },
  { name: 'units', path: 'src/units/units.controller.ts' },
  { name: 'leases', path: 'src/leases/leases.controller.ts' },
  { name: 'maintenance', path: 'src/maintenance/maintenance.controller.ts' },
  { name: 'billing', path: 'src/billing/billing.controller.ts' },
  { name: 'subscriptions', path: 'src/subscriptions/subscriptions.controller.ts' },
  { name: 'stripe/webhook', path: 'src/stripe/webhook.controller.ts' }
]

// Template for serverless endpoint
const endpointTemplate = (resourceName, serviceName, repositoryName) => `import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ${serviceName} } from '../../apps/backend/src/${resourceName}/${resourceName}.service'
import { ${repositoryName} } from '../../apps/backend/src/${resourceName}/${resourceName}.repository'
import { ErrorHandlerService } from '../../apps/backend/src/common/errors/error-handler.service'
import { PrismaService } from '../../apps/backend/src/prisma/prisma.service'
import { AuthService } from '../../apps/backend/src/auth/auth.service'
import { ConfigService } from '@nestjs/config'

// Lightweight ${resourceName} endpoint
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'https://tenantflow.app')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    // Extract JWT token
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization required' })
      return
    }

    const token = authHeader.split(' ')[1]
    
    // Create minimal service instances
    const configService = new ConfigService()
    const errorHandler = new ErrorHandlerService()
    const authService = new AuthService(configService, errorHandler)
    const prismaService = new PrismaService(configService)
    const repository = new ${repositoryName}(prismaService)
    const service = new ${serviceName}(repository, errorHandler)

    // Validate token and get user
    const user = await authService.validateTokenAndGetUser(token)
    
    switch (req.method) {
      case 'GET':
        const items = await service.getByOwner(user.organizationId, req.query as any)
        res.status(200).json({ data: items })
        break
        
      case 'POST':
        const newItem = await service.create(req.body, user.organizationId)
        res.status(201).json({ data: newItem })
        break
        
      case 'PUT':
        const { id } = req.query
        if (!id) {
          res.status(400).json({ error: 'ID is required' })
          return
        }
        const updatedItem = await service.update(id as string, req.body, user.organizationId)
        res.status(200).json({ data: updatedItem })
        break
        
      case 'DELETE':
        const { id: deleteId } = req.query
        if (!deleteId) {
          res.status(400).json({ error: 'ID is required' })
          return
        }
        await service.delete(deleteId as string, user.organizationId)
        res.status(204).end()
        break
        
      default:
        res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('${resourceName} API error:', error)
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      res.status(401).json({ error: 'Invalid or expired token' })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}`

// Generate endpoints
controllers.forEach(controller => {
  const serviceName = controller.name.charAt(0).toUpperCase() + controller.name.slice(1) + 'Service'
  const repositoryName = controller.name.charAt(0).toUpperCase() + controller.name.slice(1) + 'Repository'
  
  // Create directory if it doesn't exist
  const dirPath = path.join(__dirname, '..', 'api', controller.name)
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
  
  // Generate endpoint file
  const endpointPath = path.join(dirPath, 'index.ts')
  const content = endpointTemplate(controller.name, serviceName, repositoryName)
  
  fs.writeFileSync(endpointPath, content)
  console.log(`Generated: ${endpointPath}`)
})

console.log('\n✅ Serverless endpoints generated!')
console.log('\n📝 Next steps:')
console.log('1. Update vercel.json rewrites for new endpoints')
console.log('2. Test each endpoint individually')
console.log('3. Update frontend API calls to use new endpoints')
console.log('4. Remove the old NestJS /api/index.ts when ready')
const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, 'src/tenants/tenants.service.comprehensive.test.ts')
const content = fs.readFileSync(filePath, 'utf-8')

const updatedContent = content
  // Fix the import structure - add TenantsRepository
  .replace(
    `import { TenantsService } from './tenants.service'
import { PrismaService } from 'nestjs-prisma'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'`,
    `import { TenantsService } from './tenants.service'
import { TenantsRepository } from './tenants.repository'
import { ErrorHandlerService, ErrorCode } from '../common/errors/error-handler.service'`
  )
  
  // Fix the mock structure
  .replace(
    `// Mock the dependencies
vi.mock('nestjs-prisma')
vi.mock('../common/errors/error-handler.service')`,
    `// Mock the dependencies
vi.mock('./tenants.repository')
vi.mock('../common/errors/error-handler.service')`
  )
  
  // Fix the service setup to use TenantsRepository instead of PrismaService
  .replace(
    `describe('TenantsService - Comprehensive Test Suite', () => {
  let service: TenantsService
  let mockPrisma: PrismaService & any
  let mockErrorHandler: ErrorHandlerService & any

  beforeEach(() => {
    mockPrisma = {
      tenant: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn()
      },
      $transaction: vi.fn()
    } as any

    mockErrorHandler = {
      createValidationError: vi.fn((message) => new Error(\`Validation: \${message}\`)),
      createNotFoundError: vi.fn((resource) => new Error(\`\${resource} not found\`)),
      createBusinessError: vi.fn((code, message) => new Error(message)),
      handleErrorEnhanced: vi.fn((error) => { throw error })
    } as any

    service = new TenantsService(mockPrisma, mockErrorHandler)
  })`,
    `describe('TenantsService - Comprehensive Test Suite', () => {
  let service: TenantsService
  let mockRepository: TenantsRepository & any
  let mockErrorHandler: ErrorHandlerService & any

  beforeEach(() => {
    mockRepository = {
      findByOwnerWithLeases: vi.fn(),
      findByIdAndOwner: vi.fn(),
      getStatsByOwner: vi.fn(),
      hasActiveLeases: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn()
    } as any

    mockErrorHandler = {
      createValidationError: vi.fn((message) => new Error(\`Validation: \${message}\`)),
      createNotFoundError: vi.fn((resource) => new Error(\`\${resource} not found\`)),
      createBusinessError: vi.fn((code, message) => new Error(message)),
      handleErrorEnhanced: vi.fn((error) => { throw error })
    } as any

    service = new TenantsService(mockRepository, mockErrorHandler)
  })`
  )
  
  // Fix the test expectations to use repository methods
  .replace(
    /mockPrisma\.tenant\.findMany/g,
    'mockRepository.findByOwnerWithLeases'
  )
  .replace(
    /expect\(mockPrisma\.tenant\.findMany\)/g,
    'expect(mockRepository.findByOwnerWithLeases)'
  )
  .replace(
    /mockPrisma\.tenant\.findFirst/g,
    'mockRepository.findByIdAndOwner'
  )
  .replace(
    /expect\(mockPrisma\.tenant\.findFirst\)/g,
    'expect(mockRepository.findByIdAndOwner)'
  )
  .replace(
    /mockPrisma\.tenant\.create/g,
    'mockRepository.create'
  )
  .replace(
    /expect\(mockPrisma\.tenant\.create\)/g,
    'expect(mockRepository.create)'
  )
  .replace(
    /mockPrisma\.tenant\.update/g,
    'mockRepository.update'
  )
  .replace(
    /expect\(mockPrisma\.tenant\.update\)/g,
    'expect(mockRepository.update)'
  )
  .replace(
    /mockPrisma\.tenant\.delete/g,
    'mockRepository.delete'
  )
  .replace(
    /expect\(mockPrisma\.tenant\.delete\)/g,
    'expect(mockRepository.delete)'
  )
  .replace(
    /mockPrisma\.tenant\.count/g,
    'mockRepository.getStatsByOwner'
  )
  
  // Fix the test to call the repository method for active leases check
  .replace(
    /mockPrisma\.\$transaction\.mockImplementation\(\(callback\) => callback\(mockPrisma\)\)/g,
    'mockRepository.hasActiveLeases.mockResolvedValue(true)'
  )
  
  // Fix error handler calls to match BaseCrudService pattern - use handleErrorEnhanced that throws
  .replace(
    /expect\(mockErrorHandler\.createValidationError\)\.toHaveBeenCalledWith\(/g,
    'expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith('
  )
  .replace(
    /expect\(mockErrorHandler\.createNotFoundError\)\.toHaveBeenCalledWith\(/g,
    'expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith('
  )
  .replace(
    /expect\(mockErrorHandler\.createBusinessError\)\.toHaveBeenCalledWith\(/g,
    'expect(mockErrorHandler.handleErrorEnhanced).toHaveBeenCalledWith('
  )

console.log('Updated TenantsService comprehensive test to use BaseCrudService pattern')
fs.writeFileSync(filePath, updatedContent)
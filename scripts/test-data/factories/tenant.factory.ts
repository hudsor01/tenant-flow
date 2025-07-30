import { faker } from '@faker-js/faker'
import { PrismaClient } from '@prisma/client'
import type { Tenant, User } from '@prisma/client'

export interface TenantFactoryOptions {
  userId?: string
  createUserAccount?: boolean
  invitationStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED'
  hasDocuments?: boolean
  emergencyContactInfo?: boolean
}

export interface TenantDocumentOptions {
  includeID?: boolean
  includeIncomeProof?: boolean
  includeReferences?: boolean
  includeBackground?: boolean
}

export class TenantFactory {
  constructor(private prisma: PrismaClient) {}

  async createTenant(options: TenantFactoryOptions = {}): Promise<Tenant & { 
    user?: User
    documents?: { id: string; type: string; url: string; verified: boolean; uploadedAt: Date }[]
  }> {
    const {
      userId,
      createUserAccount = !userId,
      invitationStatus = faker.helpers.arrayElement(['PENDING', 'ACCEPTED', 'DECLINED']),
      hasDocuments = faker.datatype.boolean({ probability: 0.7 }),
      emergencyContactInfo = faker.datatype.boolean({ probability: 0.8 })
    } = options

    let user: User | undefined
    let finalUserId = userId

    // Create user account if needed
    if (createUserAccount && !userId) {
      const firstName = faker.person.firstName()
      const lastName = faker.person.lastName()
      const domain = faker.helpers.arrayElement(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'])
      
      user = await this.prisma.user.create({
        data: {
          id: faker.string.uuid(),
          supabaseId: faker.string.uuid(),
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
          name: `${firstName} ${lastName}`,
          phone: faker.phone.number(),
          bio: null,
          avatarUrl: faker.datatype.boolean({ probability: 0.3 }) ? faker.image.avatar() : null,
          role: 'TENANT',
          stripeCustomerId: null,
          createdAt: faker.date.past({ years: 1 }),
          updatedAt: new Date()
        }
      })
      finalUserId = user.id
    }

    // Generate tenant profile data
    const tenantData = {
      id: faker.string.uuid(),
      name: user?.name || faker.person.fullName(),
      email: user?.email || faker.internet.email().toLowerCase(),
      phone: user?.phone || faker.phone.number(),
      emergencyContact: emergencyContactInfo ? this.generateEmergencyContact() : null,
      avatarUrl: user?.avatarUrl || (faker.datatype.boolean({ probability: 0.3 }) ? faker.image.avatar() : null),
      userId: finalUserId,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date()
    }

    const tenant = await this.prisma.tenant.create({
      data: tenantData
    })

    // Create tenant documents if requested
    let documents: { id: string; type: string; url: string; verified: boolean; uploadedAt: Date }[] = []
    if (hasDocuments) {
      documents = await this.createTenantDocuments(tenant.id, {
        includeID: faker.datatype.boolean({ probability: 0.9 }),
        includeIncomeProof: faker.datatype.boolean({ probability: 0.8 }),
        includeReferences: faker.datatype.boolean({ probability: 0.6 }),
        includeBackground: faker.datatype.boolean({ probability: 0.4 })
      })
    }

    return { ...tenant, user, documents }
  }

  private generateEmergencyContact(): string {
    const relationship = faker.helpers.arrayElement([
      'Mother', 'Father', 'Spouse', 'Partner', 'Sibling', 
      'Friend', 'Colleague', 'Relative'
    ])
    const name = faker.person.fullName()
    const phone = faker.phone.number()
    
    return `${name} (${relationship}) - ${phone}`
  }

  private async createTenantDocuments(tenantId: string, options: TenantDocumentOptions = {}) {
    const documents = []

    if (options.includeID) {
      documents.push(await this.prisma.document.create({
        data: {
          id: faker.string.uuid(),
          name: 'Government ID',
          filename: `tenant_${tenantId}_id.pdf`,
          url: faker.internet.url(),
          type: 'OTHER',
          mimeType: 'application/pdf',
          size: BigInt(faker.number.int({ min: 500000, max: 2000000 })),
          fileSizeBytes: BigInt(faker.number.int({ min: 500000, max: 2000000 })),
          createdAt: faker.date.recent(),
          updatedAt: new Date()
        }
      }))
    }

    if (options.includeIncomeProof) {
      documents.push(await this.prisma.document.create({
        data: {
          id: faker.string.uuid(),
          name: 'Proof of Income',
          filename: `tenant_${tenantId}_income.pdf`,
          url: faker.internet.url(),
          type: 'OTHER',
          mimeType: 'application/pdf',
          size: BigInt(faker.number.int({ min: 300000, max: 1500000 })),
          fileSizeBytes: BigInt(faker.number.int({ min: 300000, max: 1500000 })),
          createdAt: faker.date.recent(),
          updatedAt: new Date()
        }
      }))
    }

    if (options.includeReferences) {
      documents.push(await this.prisma.document.create({
        data: {
          id: faker.string.uuid(),
          name: 'References',
          filename: `tenant_${tenantId}_references.pdf`,
          url: faker.internet.url(),
          type: 'OTHER',
          mimeType: 'application/pdf',
          size: BigInt(faker.number.int({ min: 200000, max: 800000 })),
          fileSizeBytes: BigInt(faker.number.int({ min: 200000, max: 800000 })),
          createdAt: faker.date.recent(),
          updatedAt: new Date()
        }
      }))
    }

    if (options.includeBackground) {
      documents.push(await this.prisma.document.create({
        data: {
          id: faker.string.uuid(),
          name: 'Background Check',
          filename: `tenant_${tenantId}_background.pdf`,
          url: faker.internet.url(),
          type: 'OTHER',
          mimeType: 'application/pdf',
          size: BigInt(faker.number.int({ min: 400000, max: 1200000 })),
          fileSizeBytes: BigInt(faker.number.int({ min: 400000, max: 1200000 })),
          createdAt: faker.date.recent(),
          updatedAt: new Date()
        }
      }))
    }

    return documents
  }

  // Create tenant with application history
  async createTenantWithHistory(options: TenantFactoryOptions & {
    applicationHistory?: Array<{
      propertyName: string
      applicationDate: Date
      status: 'pending' | 'approved' | 'rejected'
      notes?: string
    }>
  } = {}): Promise<Tenant & { user?: User; applicationHistory?: { propertyName: string; applicationDate: Date; status: 'pending' | 'approved' | 'rejected'; notes?: string }[] }> {
    const tenant = await this.createTenant(options)
    
    const applicationHistory = options.applicationHistory || this.generateApplicationHistory()
    
    // Note: In a real implementation, you'd store this in an ApplicationHistory table
    // For now, we'll just return it as metadata
    
    return { ...tenant, applicationHistory }
  }

  private generateApplicationHistory() {
    const historyCount = faker.number.int({ min: 0, max: 3 })
    
    return Array.from({ length: historyCount }, () => ({
      propertyName: faker.company.name() + ' Property',
      applicationDate: faker.date.past({ years: 2 }),
      status: faker.helpers.arrayElement(['pending', 'approved', 'rejected']),
      notes: faker.datatype.boolean({ probability: 0.6 }) ? faker.lorem.sentence() : undefined
    }))
  }

  // Create tenant families (multiple tenants living together)
  async createTenantFamily(size: number = 2, options: TenantFactoryOptions = {}): Promise<{
    primaryTenant: Tenant & { user?: User }
    familyMembers: (Tenant & { user?: User })[]
    allTenants: (Tenant & { user?: User })[]
  }> {
    // Create primary tenant (lease holder)
    const primaryTenant = await this.createTenant({
      ...options,
      createUserAccount: true,
      hasDocuments: true,
      emergencyContactInfo: true
    })

    // Create family members
    const familyMembers = await Promise.all(
      Array.from({ length: size - 1 }, () =>
        this.createTenant({
          ...options,
          createUserAccount: faker.datatype.boolean({ probability: 0.7 }),
          hasDocuments: faker.datatype.boolean({ probability: 0.5 }),
          emergencyContactInfo: faker.datatype.boolean({ probability: 0.3 })
        })
      )
    )

    return {
      primaryTenant,
      familyMembers,
      allTenants: [primaryTenant, ...familyMembers]
    }
  }

  // Create tenant with realistic rental history
  async createExperiencedTenant(yearsOfHistory: number = 3): Promise<Tenant & { 
    user?: User
    rentalHistory: Array<{
      propertyAddress: string
      landlordName: string
      landlordPhone: string
      moveInDate: Date
      moveOutDate?: Date
      monthlyRent: number
      reasonForLeaving?: string
      reference: 'excellent' | 'good' | 'fair' | 'poor'
    }>
  }> {
    const tenant = await this.createTenant({
      hasDocuments: true,
      emergencyContactInfo: true
    })

    // Generate rental history
    const historyCount = faker.number.int({ min: 1, max: yearsOfHistory })
    const rentalHistory = []
    
    let currentDate = new Date()
    currentDate.setFullYear(currentDate.getFullYear() - yearsOfHistory)

    for (let i = 0; i < historyCount; i++) {
      const moveInDate = new Date(currentDate)
      const tenancyLength = faker.number.int({ min: 6, max: 36 }) // 6 months to 3 years
      const moveOutDate = new Date(moveInDate)
      moveOutDate.setMonth(moveInDate.getMonth() + tenancyLength)

      // Don't create a move-out date for the most recent rental if it's current
      const isCurrent = i === historyCount - 1 && moveOutDate > new Date()
      
      rentalHistory.push({
        propertyAddress: faker.location.streetAddress() + ', ' + faker.location.city() + ', ' + faker.location.state({ abbreviated: true }),
        landlordName: faker.person.fullName(),
        landlordPhone: faker.phone.number(),
        moveInDate,
        moveOutDate: isCurrent ? undefined : moveOutDate,
        monthlyRent: faker.number.int({ min: 800, max: 3500 }),
        reasonForLeaving: isCurrent ? undefined : faker.helpers.arrayElement([
          'Relocation for work',
          'Downsizing',
          'Upsizing',
          'Wanted different neighborhood',
          'Rent increase',
          'Property sold',
          'End of lease term'
        ]),
        reference: faker.helpers.arrayElement(['excellent', 'excellent', 'good', 'good', 'fair'])
      })

      // Move to next period
      currentDate = moveOutDate
    }

    return { ...tenant, rentalHistory }
  }

  // Create tenant prospects (not yet tenants)
  async createTenantProspects(count: number = 10): Promise<Array<{
    id: string
    name: string
    email: string
    phone: string
    interestedInBedrooms: number
    maxBudget: number
    preferredMoveInDate: Date
    hasDocuments: boolean
    applicationStatus: 'inquiry' | 'scheduled_viewing' | 'viewed' | 'applied' | 'approved' | 'rejected'
    notes?: string
  }>> {
    return Array.from({ length: count }, () => ({
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      phone: faker.phone.number(),
      interestedInBedrooms: faker.number.int({ min: 1, max: 4 }),
      maxBudget: faker.number.int({ min: 800, max: 4000 }),
      preferredMoveInDate: faker.date.future({ years: 0.5 }),
      hasDocuments: faker.datatype.boolean({ probability: 0.4 }),
      applicationStatus: faker.helpers.arrayElement([
        'inquiry', 'inquiry', 'scheduled_viewing', 'viewed', 'applied', 'approved', 'rejected'
      ]),
      notes: faker.datatype.boolean({ probability: 0.6 }) ? faker.lorem.sentence() : undefined
    }))
  }
}
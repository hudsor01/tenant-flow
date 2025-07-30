import { faker } from '@faker-js/faker'
import { PrismaClient, LeaseStatus } from '@prisma/client'
import type { Lease, ReminderLog } from '@prisma/client'

export interface LeaseFactoryOptions {
  unitId: string
  tenantId: string
  status?: LeaseStatus
  termLength?: 6 | 12 | 18 | 24 | 36
  startDate?: Date
  rentAmount?: number
  securityDeposit?: number
  withDocuments?: boolean
  withReminders?: boolean
  customTerms?: string[]
}

export class LeaseFactory {
  constructor(private prisma: PrismaClient) {}

  async createLease(options: LeaseFactoryOptions): Promise<Lease & {
    documents?: { id: string; type: string; url: string; createdAt: Date }[]
    reminders?: ReminderLog[]
  }> {
    const {
      unitId,
      tenantId,
      status = faker.helpers.arrayElement(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED']),
      termLength = faker.helpers.arrayElement([6, 12, 18, 24]),
      startDate = faker.date.recent({ days: 90 }),
      rentAmount = faker.number.int({ min: 800, max: 4000 }),
      securityDeposit = rentAmount, // Typically equal to rent
      withDocuments = faker.datatype.boolean({ probability: 0.8 }),
      withReminders = faker.datatype.boolean({ probability: 0.6 }),
      customTerms = []
    } = options

    // Calculate end date based on term length
    const endDate = new Date(startDate)
    endDate.setMonth(startDate.getMonth() + termLength)

    // Generate lease terms
    const terms = this.generateLeaseTerms(rentAmount, securityDeposit, customTerms)

    const leaseData = {
      id: faker.string.uuid(),
      unitId,
      tenantId,
      startDate,
      endDate,
      rentAmount,
      securityDeposit,
      terms,
      status,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date()
    }

    const lease = await this.prisma.lease.create({
      data: leaseData
    })

    let documents: any[] = []
    let reminders: ReminderLog[] = []

    // Create lease documents
    if (withDocuments) {
      documents = await this.createLeaseDocuments(lease.id, unitId)
    }

    // Create reminder logs
    if (withReminders && status === 'ACTIVE') {
      reminders = await this.createLeaseReminders(lease.id, lease.tenantId)
    }

    return { ...lease, documents, reminders }
  }

  private generateLeaseTerms(rentAmount: number, securityDeposit: number, customTerms: string[] = []): string {
    const standardTerms = [
      `Monthly rent: $${rentAmount.toLocaleString()}`,
      `Security deposit: $${securityDeposit.toLocaleString()}`,
      'Rent is due on the 1st of each month',
      'Late fees apply after the 5th of the month',
      'No pets allowed without written permission',
      'Tenant is responsible for utilities unless otherwise specified',
      'Property must be maintained in good condition',
      '30-day notice required for lease termination',
      'No subletting without landlord approval',
      'Smoking is prohibited on the premises'
    ]

    const optionalTerms = [
      'Lawn maintenance included',
      'Snow removal provided',
      'Garage parking included',
      'Storage unit included',
      'Pool and fitness center access',
      'Pet deposit required: $500',
      'Renter\'s insurance required',
      'Background check renewal annually'
    ]

    const selectedOptional = faker.helpers.arrayElements(optionalTerms, { min: 2, max: 5 })
    const allTerms = [...standardTerms, ...selectedOptional, ...customTerms]

    return allTerms.map((term, index) => `${index + 1}. ${term}`).join('\n')
  }

  private async createLeaseDocuments(leaseId: string, unitId: string) {
    const documents = []

    // Signed lease document
    documents.push(await this.prisma.document.create({
      data: {
        id: faker.string.uuid(),
        name: 'Signed Lease Agreement',
        filename: `lease_${leaseId}_signed.pdf`,
        url: faker.internet.url(),
        type: 'LEASE',
        mimeType: 'application/pdf',
        size: BigInt(faker.number.int({ min: 1000000, max: 5000000 })),
        fileSizeBytes: BigInt(faker.number.int({ min: 1000000, max: 5000000 })),
        leaseId,
        createdAt: faker.date.recent(),
        updatedAt: new Date()
      }
    }))

    // Move-in inspection
    if (faker.datatype.boolean({ probability: 0.7 })) {
      documents.push(await this.prisma.document.create({
        data: {
          id: faker.string.uuid(),
          name: 'Move-in Inspection Report',
          filename: `inspection_${leaseId}_movein.pdf`,
          url: faker.internet.url(),
          type: 'INSPECTION',
          mimeType: 'application/pdf',
          size: BigInt(faker.number.int({ min: 500000, max: 2000000 })),
          fileSizeBytes: BigInt(faker.number.int({ min: 500000, max: 2000000 })),
          leaseId,
          createdAt: faker.date.recent(),
          updatedAt: new Date()
        }
      }))
    }

    // Security deposit receipt
    if (faker.datatype.boolean({ probability: 0.8 })) {
      documents.push(await this.prisma.document.create({
        data: {
          id: faker.string.uuid(),
          name: 'Security Deposit Receipt',
          filename: `deposit_receipt_${leaseId}.pdf`,
          url: faker.internet.url(),
          type: 'RECEIPT',
          mimeType: 'application/pdf',
          size: BigInt(faker.number.int({ min: 200000, max: 800000 })),
          fileSizeBytes: BigInt(faker.number.int({ min: 200000, max: 800000 })),
          leaseId,
          createdAt: faker.date.recent(),
          updatedAt: new Date()
        }
      }))
    }

    return documents
  }

  private async createLeaseReminders(leaseId: string, tenantId: string): Promise<ReminderLog[]> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant?.userId) return []

    const reminders: ReminderLog[] = []

    // Rent reminders
    if (faker.datatype.boolean({ probability: 0.8 })) {
      reminders.push(await this.prisma.reminderLog.create({
        data: {
          id: faker.string.uuid(),
          leaseId,
          userId: tenant.userId,
          type: 'RENT_REMINDER',
          status: faker.helpers.arrayElement(['SENT', 'DELIVERED', 'OPENED', 'FAILED']),
          recipientEmail: tenant.email,
          recipientName: tenant.name,
          subject: 'Rent Reminder - Due Tomorrow',
          content: 'This is a friendly reminder that your rent payment is due tomorrow.',
          sentAt: faker.date.recent(),
          deliveredAt: faker.datatype.boolean({ probability: 0.9 }) ? faker.date.recent() : null,
          openedAt: faker.datatype.boolean({ probability: 0.6 }) ? faker.date.recent() : null,
          errorMessage: null,
          retryCount: 0
        }
      }))
    }

    // Lease expiration reminders
    if (faker.datatype.boolean({ probability: 0.4 })) {
      reminders.push(await this.prisma.reminderLog.create({
        data: {
          id: faker.string.uuid(),
          leaseId,
          userId: tenant.userId,
          type: 'LEASE_EXPIRATION',
          status: faker.helpers.arrayElement(['SENT', 'DELIVERED', 'OPENED']),
          recipientEmail: tenant.email,
          recipientName: tenant.name,
          subject: 'Lease Expiration Notice - 60 Days',
          content: 'Your lease will expire in 60 days. Please contact us to discuss renewal options.',
          sentAt: faker.date.past({ days: 30 }),
          deliveredAt: faker.date.past({ days: 30 }),
          openedAt: faker.datatype.boolean({ probability: 0.7 }) ? faker.date.past({ days: 29 }) : null,
          errorMessage: null,
          retryCount: 0
        }
      }))
    }

    return reminders
  }

  // Create lease with payment history
  async createLeaseWithPayments(options: LeaseFactoryOptions & {
    monthsOfHistory?: number
    paymentReliability?: 'excellent' | 'good' | 'fair' | 'poor'
  }): Promise<Lease & { paymentHistory: any[] }> {
    const lease = await this.createLease(options)
    
    const {
      monthsOfHistory = faker.number.int({ min: 3, max: 12 }),
      paymentReliability = 'good'
    } = options

    const paymentHistory = this.generatePaymentHistory(
      lease.rentAmount,
      monthsOfHistory,
      paymentReliability
    )

    return { ...lease, paymentHistory }
  }

  private generatePaymentHistory(
    rentAmount: number,
    months: number,
    reliability: 'excellent' | 'good' | 'fair' | 'poor'
  ) {
    const reliabilityRates = {
      excellent: { onTime: 0.98, late: 0.02, missed: 0 },
      good: { onTime: 0.85, late: 0.13, missed: 0.02 },
      fair: { onTime: 0.70, late: 0.25, missed: 0.05 },
      poor: { onTime: 0.50, late: 0.35, missed: 0.15 }
    }

    const rates = reliabilityRates[reliability]
    const history = []

    for (let i = 0; i < months; i++) {
      const dueDate = new Date()
      dueDate.setMonth(dueDate.getMonth() - i)
      dueDate.setDate(1)

      const random = Math.random()
      let status: 'paid_on_time' | 'paid_late' | 'missed'
      let paidDate: Date | null = null
      let lateFee = 0

      if (random < rates.onTime) {
        status = 'paid_on_time'
        paidDate = new Date(dueDate)
        paidDate.setDate(faker.number.int({ min: 1, max: 3 }))
      } else if (random < rates.onTime + rates.late) {
        status = 'paid_late'
        paidDate = new Date(dueDate)
        paidDate.setDate(faker.number.int({ min: 6, max: 15 }))
        lateFee = faker.number.int({ min: 25, max: 100 })
      } else {
        status = 'missed'
        paidDate = null
      }

      history.push({
        dueDate,
        amount: rentAmount,
        lateFee,
        totalPaid: status === 'missed' ? 0 : rentAmount + lateFee,
        paidDate,
        status,
        paymentMethod: faker.helpers.arrayElement(['online', 'check', 'cash', 'bank_transfer'])
      })
    }

    return history.reverse() // Oldest first
  }

  // Create expiring leases for testing renewal workflows
  async createExpiringLeases(count: number = 5): Promise<Lease[]> {
    const expiredLeases = []

    for (let i = 0; i < count; i++) {
      // Create a fake unit and tenant for each lease
      const fakeUnitId = faker.string.uuid()
      const fakeTenantId = faker.string.uuid()

      const daysUntilExpiry = faker.number.int({ min: -30, max: 90 })
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 12) // Started a year ago
      
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + daysUntilExpiry)

      const lease = await this.createLease({
        unitId: fakeUnitId,
        tenantId: fakeTenantId,
        status: daysUntilExpiry < 0 ? 'EXPIRED' : 'ACTIVE',
        startDate,
        withReminders: true
      })

      // Update the end date
      const updatedLease = await this.prisma.lease.update({
        where: { id: lease.id },
        data: { endDate }
      })

      expiredLeases.push(updatedLease)
    }

    return expiredLeases
  }

  // Create lease renewals (original + renewed lease)
  async createLeaseRenewal(originalLeaseOptions: LeaseFactoryOptions): Promise<{
    originalLease: Lease
    renewedLease: Lease
  }> {
    // Create original lease (expired)
    const originalLease = await this.createLease({
      ...originalLeaseOptions,
      status: 'EXPIRED'
    })

    // Create renewed lease
    const renewedStartDate = new Date(originalLease.endDate)
    renewedStartDate.setDate(renewedStartDate.getDate() + 1)

    const renewedLease = await this.createLease({
      ...originalLeaseOptions,
      startDate: renewedStartDate,
      status: 'ACTIVE',
      rentAmount: originalLease.rentAmount * faker.number.float({ min: 1.0, max: 1.15 }), // 0-15% increase
      withDocuments: true,
      withReminders: true
    })

    return { originalLease, renewedLease }
  }

  // Create lease with maintenance history
  async createLeaseWithMaintenance(options: LeaseFactoryOptions): Promise<Lease & {
    maintenanceRequests: any[]
  }> {
    const lease = await this.createLease(options)
    
    const requestCount = faker.number.int({ min: 0, max: 8 })
    const maintenanceRequests = []

    for (let i = 0; i < requestCount; i++) {
      maintenanceRequests.push({
        id: faker.string.uuid(),
        title: faker.helpers.arrayElement([
          'Leaky Faucet', 'Broken Light', 'AC Not Working', 
          'Clogged Drain', 'Paint Touch-up', 'Door Lock Issue'
        ]),
        description: faker.lorem.paragraph(),
        priority: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']),
        status: faker.helpers.arrayElement(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELED']),
        createdAt: faker.date.between({ 
          from: lease.startDate, 
          to: new Date() 
        }),
        estimatedCost: faker.number.int({ min: 50, max: 2000 }),
        actualCost: faker.datatype.boolean({ probability: 0.7 }) 
          ? faker.number.int({ min: 50, max: 2000 }) 
          : null
      })
    }

    return { ...lease, maintenanceRequests }
  }
}
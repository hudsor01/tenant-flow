import { faker } from '@faker-js/faker'
import { PrismaClient, Priority, RequestStatus } from '@prisma/client'
import type { MaintenanceRequest, File } from '@prisma/client'

export interface MaintenanceFactoryOptions {
  unitId: string
  priority?: Priority
  status?: RequestStatus
  withFiles?: boolean
  withExpenses?: boolean
  assignedTo?: string
  requestedBy?: string
  category?: string
}

export interface MaintenanceCategory {
  name: string
  commonIssues: string[]
  estimatedCostRange: { min: number; max: number }
  urgencyDistribution: Record<Priority, number>
}

export class MaintenanceFactory {
  constructor(private prisma: PrismaClient) {}

  private readonly categories: Record<string, MaintenanceCategory> = {
    plumbing: {
      name: 'Plumbing',
      commonIssues: [
        'Leaky Faucet', 'Clogged Drain', 'Running Toilet', 'Low Water Pressure',
        'Pipe Leak', 'Water Heater Issue', 'Garbage Disposal Problem'
      ],
      estimatedCostRange: { min: 75, max: 800 },
      urgencyDistribution: { LOW: 0.3, MEDIUM: 0.4, HIGH: 0.25, EMERGENCY: 0.05 }
    },
    electrical: {
      name: 'Electrical',
      commonIssues: [
        'Light Not Working', 'Outlet Not Working', 'Circuit Breaker Tripping',
        'Flickering Lights', 'Ceiling Fan Issue', 'Smoke Detector Beeping'
      ],
      estimatedCostRange: { min: 100, max: 1200 },
      urgencyDistribution: { LOW: 0.2, MEDIUM: 0.5, HIGH: 0.25, EMERGENCY: 0.05 }
    },
    hvac: {
      name: 'HVAC',
      commonIssues: [
        'AC Not Working', 'Heater Not Working', 'Poor Air Quality',
        'Strange Noises from HVAC', 'Thermostat Issue', 'Vent Blockage'
      ],
      estimatedCostRange: { min: 150, max: 2500 },
      urgencyDistribution: { LOW: 0.15, MEDIUM: 0.35, HIGH: 0.4, EMERGENCY: 0.1 }
    },
    appliances: {
      name: 'Appliances',
      commonIssues: [
        'Refrigerator Not Cooling', 'Dishwasher Not Working', 'Washer/Dryer Issue',
        'Oven Not Heating', 'Microwave Problem', 'Garbage Disposal Jam'
      ],
      estimatedCostRange: { min: 100, max: 1500 },
      urgencyDistribution: { LOW: 0.4, MEDIUM: 0.4, HIGH: 0.18, EMERGENCY: 0.02 }
    },
    structural: {
      name: 'Structural',
      commonIssues: [
        'Door Won\'t Close', 'Window Won\'t Open', 'Cabinet Door Loose',
        'Floor Squeaking', 'Wall Damage', 'Ceiling Stain'
      ],
      estimatedCostRange: { min: 50, max: 1000 },
      urgencyDistribution: { LOW: 0.5, MEDIUM: 0.35, HIGH: 0.13, EMERGENCY: 0.02 }
    },
    exterior: {
      name: 'Exterior',
      commonIssues: [
        'Roof Leak', 'Gutter Issue', 'Siding Damage', 'Fence Repair',
        'Driveway Crack', 'Landscaping Issue', 'Exterior Light Out'
      ],
      estimatedCostRange: { min: 100, max: 3000 },
      urgencyDistribution: { LOW: 0.3, MEDIUM: 0.4, HIGH: 0.25, EMERGENCY: 0.05 }
    },
    safety: {
      name: 'Safety & Security',
      commonIssues: [
        'Lock Not Working', 'Security System Issue', 'Broken Window',
        'Loose Handrail', 'Smoke Detector Not Working', 'Carbon Monoxide Detector Issue'
      ],
      estimatedCostRange: { min: 75, max: 800 },
      urgencyDistribution: { LOW: 0.1, MEDIUM: 0.3, HIGH: 0.4, EMERGENCY: 0.2 }
    },
    cosmetic: {
      name: 'Cosmetic',
      commonIssues: [
        'Paint Touch-up', 'Carpet Stain', 'Tile Repair', 'Drywall Hole',
        'Cabinet Touch-up', 'Floor Scratches', 'Wallpaper Peeling'
      ],
      estimatedCostRange: { min: 25, max: 400 },
      urgencyDistribution: { LOW: 0.8, MEDIUM: 0.18, HIGH: 0.02, EMERGENCY: 0 }
    }
  }

  async createMaintenanceRequest(options: MaintenanceFactoryOptions): Promise<MaintenanceRequest & {
    files?: File[]
    expenses?: { id: string; amount: number; description: string; category: string; date: Date }[]
  }> {
    const {
      unitId,
      priority,
      status = faker.helpers.arrayElement(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'ON_HOLD']),
      withFiles = faker.datatype.boolean({ probability: 0.6 }),
      withExpenses = faker.datatype.boolean({ probability: 0.4 }),
      assignedTo,
      requestedBy,
      category: requestedCategory
    } = options

    // Select category and issue
    const categoryKey = requestedCategory || faker.helpers.arrayElement(Object.keys(this.categories))
    const category = this.categories[categoryKey]
    const issue = faker.helpers.arrayElement(category.commonIssues)
    
    // Determine priority based on category distribution if not specified
    const finalPriority = priority || this.selectPriorityForCategory(category)

    // Generate realistic timestamps
    const createdAt = faker.date.past({ years: 1 })
    const completedAt = status === 'COMPLETED' 
      ? faker.date.between({ from: createdAt, to: new Date() })
      : null

    const maintenanceData = {
      id: faker.string.uuid(),
      unitId,
      title: issue,
      description: this.generateDescription(issue, finalPriority),
      category: category.name,
      priority: finalPriority,
      status,
      preferredDate: faker.datatype.boolean({ probability: 0.7 }) ? faker.date.future() : null,
      allowEntry: faker.datatype.boolean({ probability: 0.85 }),
      contactPhone: faker.datatype.boolean({ probability: 0.6 }) ? faker.phone.number() : null,
      requestedBy: requestedBy || faker.string.uuid(),
      notes: faker.datatype.boolean({ probability: 0.4 }) ? faker.lorem.sentence() : null,
      photos: withFiles ? this.generatePhotoUrls() : [],
      assignedTo: status !== 'OPEN' ? (assignedTo || faker.string.uuid()) : null,
      estimatedCost: faker.number.int(category.estimatedCostRange),
      actualCost: status === 'COMPLETED' 
        ? faker.number.int({ 
            min: Math.floor(category.estimatedCostRange.min * 0.8),
            max: Math.ceil(category.estimatedCostRange.max * 1.2)
          })
        : null,
      createdAt,
      updatedAt: new Date(),
      completedAt
    }

    const maintenanceRequest = await this.prisma.maintenanceRequest.create({
      data: maintenanceData
    })

    let files: File[] = []
    let expenses: { id: string; amount: number; description: string; category: string; date: Date }[] = []

    // Create maintenance files
    if (withFiles) {
      files = await this.createMaintenanceFiles(maintenanceRequest.id, finalPriority)
    }

    // Create expense records
    if (withExpenses && (status === 'COMPLETED' || status === 'IN_PROGRESS')) {
      expenses = await this.createMaintenanceExpenses(maintenanceRequest.id, unitId, maintenanceRequest.actualCost || maintenanceRequest.estimatedCost)
    }

    return { ...maintenanceRequest, files, expenses }
  }

  private selectPriorityForCategory(category: MaintenanceCategory): Priority {
    const random = Math.random()
    const distribution = category.urgencyDistribution
    
    if (random < distribution.LOW) return 'LOW'
    if (random < distribution.LOW + distribution.MEDIUM) return 'MEDIUM'
    if (random < distribution.LOW + distribution.MEDIUM + distribution.HIGH) return 'HIGH'
    return 'EMERGENCY'
  }

  private generateDescription(issue: string, priority: Priority): string {
    const baseDescriptions = {
      'Leaky Faucet': 'Kitchen faucet is dripping constantly. Water is pooling around the base.',
      'Clogged Drain': 'Bathroom sink is draining very slowly. Water backs up during use.',
      'AC Not Working': 'Air conditioning unit is not cooling. System turns on but no cold air.',
      'Light Not Working': 'Ceiling light in living room stopped working. Bulb was replaced but still no light.',
      'Door Won\'t Close': 'Front door is not closing properly. Appears to be warped or frame shifted.',
      'Broken Window': 'Window in bedroom has a crack. May need full replacement.',
      'Paint Touch-up': 'Several scuff marks and small holes in living room walls need touch-up.'
    }

    let description = baseDescriptions[issue] || `Issue with ${issue.toLowerCase()}. Needs attention.`

    // Add urgency context based on priority
    switch (priority) {
      case 'EMERGENCY':
        description += ' THIS IS URGENT - affecting safety or causing property damage.'
        break
      case 'HIGH':
        description += ' This needs to be addressed soon as it\'s affecting daily life.'
        break
      case 'MEDIUM':
        description += ' Would like this fixed within the next week or two.'
        break
      case 'LOW':
        description += ' Not urgent, can be scheduled at convenience.'
        break
    }

    return description
  }

  private generatePhotoUrls(): string[] {
    const count = faker.number.int({ min: 1, max: 4 })
    return Array.from({ length: count }, () => 
      faker.image.urlLoremFlickr({ category: 'building', width: 800, height: 600 })
    )
  }

  private async createMaintenanceFiles(maintenanceRequestId: string, priority: Priority): Promise<File[]> {
    const fileCount = priority === 'EMERGENCY' || priority === 'HIGH' 
      ? faker.number.int({ min: 2, max: 5 })
      : faker.number.int({ min: 1, max: 3 })

    return Promise.all(
      Array.from({ length: fileCount }, (_, index) =>
        this.prisma.file.create({
          data: {
            id: faker.string.uuid(),
            filename: `maintenance_${maintenanceRequestId}_${index + 1}.jpg`,
            originalName: `Issue Photo ${index + 1}.jpg`,
            mimeType: 'image/jpeg',
            size: faker.number.int({ min: 300000, max: 2000000 }),
            url: faker.image.urlLoremFlickr({ category: 'building' }),
            maintenanceRequestId,
            uploadedById: null // Tenant uploads
          }
        })
      )
    )
  }

  private async createMaintenanceExpenses(maintenanceRequestId: string, unitId: string, totalCost: number): Promise<any[]> {
    // Get property ID for the unit
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      select: { propertyId: true }
    })

    if (!unit) return []

    const expenseCount = faker.number.int({ min: 1, max: 3 })
    const expenses = []

    for (let i = 0; i < expenseCount; i++) {
      const isLast = i === expenseCount - 1
      const amount = isLast 
        ? totalCost - expenses.reduce((sum, exp) => sum + exp.amount, 0)
        : faker.number.int({ min: 25, max: Math.floor(totalCost * 0.6) })

      expenses.push(await this.prisma.expense.create({
        data: {
          id: faker.string.uuid(),
          propertyId: unit.propertyId,
          maintenanceId: maintenanceRequestId,
          amount,
          category: faker.helpers.arrayElement(['Labor', 'Parts', 'Materials', 'Service Call', 'Emergency Fee']),
          description: this.generateExpenseDescription(amount),
          date: faker.date.recent(),
          receiptUrl: faker.datatype.boolean({ probability: 0.7 }) ? faker.internet.url() : null,
          vendorName: faker.company.name(),
          vendorContact: faker.phone.number()
        }
      }))
    }

    return expenses
  }

  private generateExpenseDescription(amount: number): string {
    if (amount < 100) {
      return faker.helpers.arrayElement([
        'Small parts and materials',
        'Basic service call',
        'Minor repair supplies',
        'Hardware and fasteners'
      ])
    } else if (amount < 500) {
      return faker.helpers.arrayElement([
        'Labor and parts for repair',
        'Replacement component',
        'Professional service',
        'Diagnostic and repair'
      ])
    } else {
      return faker.helpers.arrayElement([
        'Major repair or replacement',
        'Emergency service call',
        'Specialist contractor work',
        'Complete system repair'
      ])
    }
  }

  // Create maintenance requests with work orders
  async createMaintenanceWithWorkOrder(options: MaintenanceFactoryOptions): Promise<MaintenanceRequest & {
    workOrder: {
      id: string
      scheduledDate: Date
      assignedContractor: string
      contractorPhone: string
      estimatedDuration: number
      specialInstructions?: string
    }
  }> {
    const maintenanceRequest = await this.createMaintenanceRequest({
      ...options,
      status: 'IN_PROGRESS',
      withFiles: true
    })

    const workOrder = {
      id: faker.string.uuid(),
      scheduledDate: faker.date.future({ days: 7 }),
      assignedContractor: faker.person.fullName(),
      contractorPhone: faker.phone.number(),
      estimatedDuration: faker.number.int({ min: 30, max: 480 }), // 30 minutes to 8 hours
      specialInstructions: faker.datatype.boolean({ probability: 0.6 }) 
        ? faker.lorem.sentence() 
        : undefined
    }

    return { ...maintenanceRequest, workOrder }
  }

  // Create seasonal maintenance requests
  async createSeasonalMaintenance(propertyId: string, season: 'spring' | 'summer' | 'fall' | 'winter'): Promise<MaintenanceRequest[]> {
    const seasonalIssues = {
      spring: [
        { category: 'hvac', issue: 'AC Maintenance Check', priority: 'MEDIUM' },
        { category: 'exterior', issue: 'Gutter Cleaning', priority: 'LOW' },
        { category: 'exterior', issue: 'Landscaping Issue', priority: 'LOW' }
      ],
      summer: [
        { category: 'hvac', issue: 'AC Not Working', priority: 'HIGH' },
        { category: 'exterior', issue: 'Sprinkler System Issue', priority: 'MEDIUM' },
        { category: 'structural', issue: 'Window Won\'t Open', priority: 'MEDIUM' }
      ],
      fall: [
        { category: 'hvac', issue: 'Heater Not Working', priority: 'HIGH' },
        { category: 'exterior', issue: 'Gutter Issue', priority: 'MEDIUM' },
        { category: 'exterior', issue: 'Roof Leak', priority: 'HIGH' }
      ],
      winter: [
        { category: 'hvac', issue: 'Heater Not Working', priority: 'EMERGENCY' },
        { category: 'plumbing', issue: 'Pipe Leak', priority: 'HIGH' },
        { category: 'electrical', issue: 'Heating System Issue', priority: 'HIGH' }
      ]
    }

    // Get units for the property
    const units = await this.prisma.unit.findMany({
      where: { propertyId },
      select: { id: true }
    })

    if (units.length === 0) return []

    const requests = []
    const issues = seasonalIssues[season]

    for (const issueConfig of issues) {
      const randomUnit = faker.helpers.arrayElement(units)
      
      const request = await this.createMaintenanceRequest({
        unitId: randomUnit.id,
        category: issueConfig.category,
        priority: issueConfig.priority as Priority,
        status: faker.helpers.arrayElement(['OPEN', 'IN_PROGRESS', 'COMPLETED']),
        withFiles: faker.datatype.boolean({ probability: 0.8 }),
        withExpenses: faker.datatype.boolean({ probability: 0.6 })
      })

      // Override the title to match seasonal issue
      await this.prisma.maintenanceRequest.update({
        where: { id: request.id },
        data: { title: issueConfig.issue }
      })

      requests.push(request)
    }

    return requests
  }

  // Create emergency maintenance scenario
  async createEmergencyScenario(unitId: string): Promise<{
    request: MaintenanceRequest
    timeline: Array<{
      timestamp: Date
      event: string
      actor: string
    }>
  }> {
    const emergencyIssues = [
      'Water Heater Leak - Flooding',
      'Electrical Fire Hazard',
      'Gas Leak Detected',
      'Burst Pipe - Water Damage',
      'Heating System Failure - Winter',
      'Security System Breach'
    ]

    const issue = faker.helpers.arrayElement(emergencyIssues)
    
    const request = await this.createMaintenanceRequest({
      unitId,
      priority: 'EMERGENCY',
      status: 'IN_PROGRESS',
      withFiles: true,
      withExpenses: true
    })

    // Override with emergency issue
    await this.prisma.maintenanceRequest.update({
      where: { id: request.id },
      data: { 
        title: issue,
        description: `EMERGENCY: ${issue}. Immediate attention required. Tenant safety and property at risk.`
      }
    })

    // Generate emergency response timeline
    const timeline = [
      {
        timestamp: request.createdAt,
        event: 'Emergency reported by tenant',
        actor: 'Tenant'
      },
      {
        timestamp: new Date(request.createdAt.getTime() + 10 * 60000), // 10 minutes later
        event: 'Emergency acknowledged by property manager',
        actor: 'Property Manager'
      },
      {
        timestamp: new Date(request.createdAt.getTime() + 30 * 60000), // 30 minutes later
        event: 'Emergency contractor dispatched',
        actor: 'System'
      },
      {
        timestamp: new Date(request.createdAt.getTime() + 90 * 60000), // 90 minutes later
        event: 'Contractor arrived on scene',
        actor: 'Contractor'
      }
    ]

    return { request, timeline }
  }
}
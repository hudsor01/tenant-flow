import { faker } from '@faker-js/faker'
import { PrismaClient, PropertyType } from '@prisma/client'
import type { Property, Unit, File } from '@prisma/client'

export interface PropertyFactoryOptions {
  ownerId: string
  propertyType?: PropertyType
  hasImages?: boolean
  withUnits?: number
  unitConfiguration?: {
    minBedrooms?: number
    maxBedrooms?: number
    minBathrooms?: number
    maxBathrooms?: number
    minRent?: number
    maxRent?: number
  }
  location?: {
    state?: string
    city?: string
    zipCode?: string
  }
}

export class PropertyFactory {
  constructor(private prisma: PrismaClient) {}

  async createProperty(options: PropertyFactoryOptions): Promise<Property & { 
    units?: (Unit & { files?: File[] })[]
    files?: File[]
  }> {
    const {
      ownerId,
      propertyType = faker.helpers.arrayElement(['SINGLE_FAMILY', 'MULTI_UNIT', 'APARTMENT', 'COMMERCIAL']),
      hasImages = true,
      withUnits = 0,
      unitConfiguration = {},
      location = {}
    } = options

    // Generate realistic property data
    const state = location.state || faker.location.state({ abbreviated: true })
    const city = location.city || faker.location.city()
    const zipCode = location.zipCode || faker.location.zipCode()

    const propertyData = {
      id: faker.string.uuid(),
      name: this.generatePropertyName(propertyType),
      address: faker.location.streetAddress(),
      city,
      state,
      zipCode,
      description: this.generatePropertyDescription(propertyType),
      imageUrl: hasImages ? faker.image.urlLoremFlickr({ category: 'house' }) : null,
      propertyType,
      ownerId,
      createdAt: faker.date.past({ years: 2 }),
      updatedAt: new Date()
    }

    const property = await this.prisma.property.create({
      data: propertyData
    })

    let units: (Unit & { files?: File[] })[] = []
    let files: File[] = []

    // Create property images/files if requested
    if (hasImages) {
      const imageCount = faker.number.int({ min: 3, max: 8 })
      files = await Promise.all(
        Array.from({ length: imageCount }, (_, index) =>
          this.prisma.file.create({
            data: {
              id: faker.string.uuid(),
              filename: `property_${property.id}_${index + 1}.jpg`,
              originalName: `Property Photo ${index + 1}.jpg`,
              mimeType: 'image/jpeg',
              size: faker.number.int({ min: 500000, max: 5000000 }),
              url: faker.image.urlLoremFlickr({ category: 'house' }),
              propertyId: property.id,
              uploadedById: ownerId
            }
          })
        )
      )
    }

    // Create units if requested
    if (withUnits > 0) {
      units = await Promise.all(
        Array.from({ length: withUnits }, (_, index) =>
          this.createUnit(property.id, {
            unitNumber: this.generateUnitNumber(propertyType, index),
            ...unitConfiguration
          })
        )
      )
    }

    return { ...property, units, files }
  }

  async createUnit(propertyId: string, options: {
    unitNumber?: string
    minBedrooms?: number
    maxBedrooms?: number
    minBathrooms?: number
    maxBathrooms?: number
    minRent?: number
    maxRent?: number
    status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
    withFiles?: boolean
  } = {}): Promise<Unit & { files?: File[] }> {
    const {
      unitNumber = faker.string.alphanumeric(3).toUpperCase(),
      minBedrooms = 1,
      maxBedrooms = 4,
      minBathrooms = 1,
      maxBathrooms = 3,
      minRent = 800,
      maxRent = 4000,
      status = faker.helpers.arrayElement(['VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED']),
      withFiles = faker.datatype.boolean()
    } = options

    const bedrooms = faker.number.int({ min: minBedrooms, max: maxBedrooms })
    const bathrooms = faker.number.float({ min: minBathrooms, max: maxBathrooms, fractionDigits: 1 })
    const squareFeet = this.calculateSquareFeet(bedrooms, bathrooms)
    const rent = faker.number.int({ min: minRent, max: maxRent })

    const unitData = {
      id: faker.string.uuid(),
      unitNumber,
      propertyId,
      bedrooms,
      bathrooms,
      squareFeet,
      rent,
      status,
      lastInspectionDate: faker.datatype.boolean() ? faker.date.past() : null,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date()
    }

    const unit = await this.prisma.unit.create({
      data: unitData
    })

    let files: File[] = []

    if (withFiles) {
      const fileCount = faker.number.int({ min: 2, max: 6 })
      files = await Promise.all(
        Array.from({ length: fileCount }, (_, index) =>
          this.prisma.file.create({
            data: {
              id: faker.string.uuid(),
              filename: `unit_${unit.id}_${index + 1}.jpg`,
              originalName: `Unit ${unitNumber} Photo ${index + 1}.jpg`,
              mimeType: 'image/jpeg',
              size: faker.number.int({ min: 300000, max: 3000000 }),
              url: faker.image.urlLoremFlickr({ category: 'room' }),
              propertyId,
              uploadedById: null // Unit photos might not have specific uploaders
            }
          })
        )
      )
    }

    return { ...unit, files }
  }

  private generatePropertyName(type: PropertyType): string {
    const names = {
      SINGLE_FAMILY: [
        `${faker.location.street()} Family Home`,
        `${faker.person.lastName()} Residence`,
        `${faker.number.int({ min: 100, max: 9999 })} ${faker.location.street()}`,
        `${faker.location.streetName()} House`
      ],
      MULTI_UNIT: [
        `${faker.location.street()} Duplex`,
        `${faker.location.streetName()} Multi-Family`,
        `${faker.person.lastName()} Properties`,
        `Twin ${faker.location.street()}`
      ],
      APARTMENT: [
        `${faker.location.streetName()} Apartments`,
        `${faker.location.cityName()} Gardens`,
        `${faker.location.street()} Complex`,
        `The ${faker.person.lastName()} Building`,
        `${faker.location.cardinalDirection()} ${faker.location.streetName()} Towers`
      ],
      COMMERCIAL: [
        `${faker.location.street()} Business Center`,
        `${faker.location.cityName()} Commerce Plaza`,
        `${faker.company.name()} Building`,
        `${faker.location.streetName()} Office Complex`
      ]
    }

    return faker.helpers.arrayElement(names[type])
  }

  private generateUnitNumber(propertyType: PropertyType, index: number): string {
    switch (propertyType) {
      case 'APARTMENT':
        const floor = Math.floor(index / 10) + 1
        const unit = (index % 10) + 1
        return `${floor}${unit.toString().padStart(2, '0')}`
      
      case 'MULTI_UNIT':
        return faker.helpers.arrayElement(['A', 'B', 'C', 'D', 'E', 'F'])[index] || `Unit ${index + 1}`
      
      case 'COMMERCIAL':
        return `Suite ${(index + 1).toString().padStart(3, '0')}`
      
      default:
        return faker.string.alphanumeric(3).toUpperCase()
    }
  }

  private calculateSquareFeet(bedrooms: number, bathrooms: number): number {
    // Realistic square footage calculation
    const baseSqFt = 400
    const bedroomSqFt = bedrooms * 150
    const bathroomSqFt = bathrooms * 50
    const commonAreaSqFt = 300
    
    const calculated = baseSqFt + bedroomSqFt + bathroomSqFt + commonAreaSqFt
    const variance = faker.number.int({ min: -100, max: 200 })
    
    return Math.max(400, calculated + variance)
  }

  private generatePropertyDescription(type: PropertyType): string {
    const commonFeatures = [
      'Recently renovated',
      'Great neighborhood',
      'Close to public transportation',
      'Near shopping centers',
      'Quiet area',
      'Family-friendly community',
      'Pet-friendly',
      'Professional management'
    ]

    const typeSpecificFeatures = {
      SINGLE_FAMILY: [
        'Private driveway',
        'Fenced backyard',
        'Garage parking',
        'Hardwood floors',
        'Updated kitchen',
        'Central air conditioning'
      ],
      MULTI_UNIT: [
        'Separate entrances',
        'Individual utilities',
        'Private outdoor space',
        'On-site parking'
      ],
      APARTMENT: [
        'In-unit laundry',
        'Fitness center',
        'Swimming pool',
        'Concierge service',
        'Rooftop deck',
        'Balcony/patio'
      ],
      COMMERCIAL: [
        'High-speed internet',
        'Conference rooms',
        'Elevator access',
        'Reception area',
        'Parking included',
        'Security system'
      ]
    }

    const selectedCommon = faker.helpers.arrayElements(commonFeatures, { min: 2, max: 4 })
    const selectedSpecific = faker.helpers.arrayElements(typeSpecificFeatures[type], { min: 2, max: 3 })
    
    const allFeatures = [...selectedCommon, ...selectedSpecific]
    
    return `Beautiful ${type.toLowerCase().replace('_', ' ')} property featuring ${allFeatures.join(', ')}.`
  }

  // Create properties with realistic geographic distribution
  async createPropertiesByState(ownerId: string, stateConfig: Record<string, number>): Promise<Property[]> {
    const properties: Property[] = []

    for (const [state, count] of Object.entries(stateConfig)) {
      const stateProperties = await Promise.all(
        Array.from({ length: count }, () =>
          this.createProperty({
            ownerId,
            location: { state },
            hasImages: faker.datatype.boolean({ probability: 0.8 }),
            withUnits: faker.number.int({ min: 1, max: 6 })
          })
        )
      )
      properties.push(...stateProperties)
    }

    return properties
  }

  // Create complete property portfolio for a landlord
  async createPropertyPortfolio(ownerId: string, size: 'small' | 'medium' | 'large' = 'medium'): Promise<{
    properties: Property[]
    totalUnits: number
    occupancyRate: number
  }> {
    const portfolioSizes = {
      small: { properties: 2, maxUnitsPerProperty: 4 },
      medium: { properties: 5, maxUnitsPerProperty: 8 },
      large: { properties: 12, maxUnitsPerProperty: 20 }
    }

    const config = portfolioSizes[size]
    let totalUnits = 0

    const properties = await Promise.all(
      Array.from({ length: config.properties }, async () => {
        const unitCount = faker.number.int({ min: 1, max: config.maxUnitsPerProperty })
        totalUnits += unitCount

        return this.createProperty({
          ownerId,
          withUnits: unitCount,
          hasImages: faker.datatype.boolean({ probability: 0.9 }),
          propertyType: faker.helpers.arrayElement(['SINGLE_FAMILY', 'MULTI_UNIT', 'APARTMENT'])
        })
      })
    )

    // Calculate realistic occupancy rate (typically 85-95% for good properties)
    const occupancyRate = faker.number.float({ min: 0.82, max: 0.96, fractionDigits: 2 })

    return {
      properties,
      totalUnits,
      occupancyRate
    }
  }
}
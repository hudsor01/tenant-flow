import { faker } from '@faker-js/faker'
import {
	type Lease,
	LEASE_STATUS,
	type MaintenanceRequest,
	PRIORITY,
	type Property,
	PROPERTY_TYPE,
	REQUEST_STATUS,
	type Tenant,
	type Unit,
	UNIT_STATUS,
	type User
} from '@repo/shared'

// Import TenantFlowOrganization from supabase types
import type { TenantFlowOrganization } from '@repo/shared/types/supabase'

/**
 * Factory for generating consistent test data across all tests
 * Uses faker for realistic data generation
 */
export class TestDataFactory {
	/**
	 * Creates a base entity with common fields
	 */
	static createBaseEntity(
		overrides: Partial<{
			id: string
			createdAt: Date
			updatedAt: Date
		}> = {}
	) {
		return {
			id: faker.string.uuid(),
			createdAt: faker.date.past(),
			updatedAt: faker.date.recent(),
			...overrides
		}
	}

	/**
	 * Creates a test organization
	 */
	static createOrganization(
		overrides: Partial<TenantFlowOrganization> = {}
	): TenantFlowOrganization {
		return {
			...this.createBaseEntity(),
			name: faker.company.name(),
			slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
			subscriptionStatus: 'ACTIVE',
			subscriptionPlan: 'STARTER',
			subscriptionCurrentPeriodEnd: faker.date.future(),
			stripeCustomerId: `cus_${faker.string.alphanumeric(14)}`,
			stripeSubscriptionId: `sub_${faker.string.alphanumeric(14)}`,
			...overrides
		} as TenantFlowOrganization
	}

	/**
	 * Creates a test user
	 */
	static createUser(overrides: Partial<User> = {}): User {
		const firstName = faker.person.firstName()
		const lastName = faker.person.lastName()
		const email = faker.internet
			.email({ firstName, lastName })
			.toLowerCase()

		return {
			...this.createBaseEntity(),
			email,
			firstName,
			lastName,
			organizationId: faker.string.uuid(),
			role: 'OWNER',
			isActive: true,
			emailVerified: true,
			...overrides
		} as User
	}

	/**
	 * Creates a test property
	 */
	static createProperty(overrides: Partial<Property> = {}): Property {
		return {
			...this.createBaseEntity(),
			name: faker.company.name() + ' Property',
			address: faker.location.streetAddress(),
			city: faker.location.city(),
			state: faker.location.state({ abbreviated: true }),
			zipCode: faker.location.zipCode(),
			country: 'USA',
			propertyType: faker.helpers.arrayElement(
				Object.values(PROPERTY_TYPE)
			),
			units: faker.number.int({ min: 1, max: 50 }),
			yearBuilt: faker.number.int({ min: 1950, max: 2023 }),
			description: faker.lorem.paragraph(),
			ownerId: faker.string.uuid(),
			organizationId: faker.string.uuid(),
			...overrides
		} as Property
	}

	/**
	 * Creates a test unit
	 */
	static createUnit(overrides: Partial<Unit> = {}): Unit {
		const bedrooms = faker.number.int({ min: 0, max: 4 })
		const bathrooms = faker.number.float({
			min: 1,
			max: 3,
			fractionDigits: 1
		})

		return {
			...this.createBaseEntity(),
			unitNumber: faker.string.alphanumeric(4).toUpperCase(),
			propertyId: faker.string.uuid(),
			bedrooms,
			bathrooms,
			squareFeet: faker.number.int({ min: 500, max: 3000 }),
			rent: faker.number.int({ min: 800, max: 5000 }),
			deposit: faker.number.int({ min: 500, max: 5000 }),
			status: faker.helpers.arrayElement(Object.values(UnitStatus)),
			features: faker.lorem.words(5).split(' '),
			amenities: faker.lorem.words(3).split(' '),
			floor: faker.number.int({ min: 1, max: 10 }),
			description: faker.lorem.sentence(),
			lastInspectionDate: faker.date.recent(),
			...overrides
		} as Unit
	}

	/**
	 * Creates a test tenant
	 */
	static createTenant(overrides: Partial<Tenant> = {}): Tenant {
		const firstName = faker.person.firstName()
		const lastName = faker.person.lastName()

		return {
			...this.createBaseEntity(),
			firstName,
			lastName,
			email: faker.internet.email({ firstName, lastName }).toLowerCase(),
			phone: faker.phone.number(),
			dateOfBirth: faker.date
				.birthdate({ min: 18, max: 80, mode: 'age' })
				.toISOString(),
			ssn: faker.string.numeric(9),
			emergencyContactName: faker.person.fullName(),
			emergencyContactPhone: faker.phone.number(),
			employerName: faker.company.name(),
			employerPhone: faker.phone.number(),
			monthlyIncome: faker.number.int({ min: 2000, max: 15000 }),
			moveInDate: faker.date.past().toISOString(),
			moveOutDate: null,
			notes: faker.lorem.sentence(),
			organizationId: faker.string.uuid(),
			...overrides
		} as Tenant
	}

	/**
	 * Creates a test lease
	 */
	static createLease(overrides: Partial<Lease> = {}): Lease {
		const startDate = faker.date.soon()
		const endDate = faker.date.future({ years: 1, refDate: startDate })

		return {
			...this.createBaseEntity(),
			unitId: faker.string.uuid(),
			tenantId: faker.string.uuid(),
			startDate,
			endDate,
			rentAmount: faker.number.int({ min: 800, max: 5000 }),
			securityDeposit: faker.number.int({ min: 500, max: 5000 }),
			paymentDueDay: faker.number.int({ min: 1, max: 28 }),
			status: faker.helpers.arrayElement(Object.values(LeaseStatus)),
			terms: faker.lorem.paragraphs(2),
			notes: faker.lorem.sentence(),
			autoRenew: faker.datatype.boolean(),
			renewalTermMonths: faker.helpers.arrayElement([6, 12, 24]),
			...overrides
		} as Lease
	}

	/**
	 * Creates a test maintenance request
	 */
	static createMaintenanceRequest(
		overrides: Partial<MaintenanceRequest> = {}
	): MaintenanceRequest {
		return {
			...this.createBaseEntity(),
			unitId: faker.string.uuid(),
			tenantId: faker.string.uuid(),
			title: faker.lorem.sentence(),
			description: faker.lorem.paragraph(),
			priority: faker.helpers.arrayElement(
				Object.values(PRIORITY)
			),
			status: faker.helpers.arrayElement(
				Object.values(REQUEST_STATUS)
			),
			category: faker.helpers.arrayElement([
				'PLUMBING',
				'ELECTRICAL',
				'HVAC',
				'APPLIANCE',
				'OTHER'
			]),
			scheduledDate: faker.date.future(),
			completedDate: null,
			cost: faker.number.int({ min: 50, max: 5000 }),
			notes: faker.lorem.sentence(),
			images: [],
			assignedTo: faker.person.fullName(),
			...overrides
		} as MaintenanceRequest
	}

	/**
	 * Creates a collection of related entities
	 */
	static createPropertyWithUnits(
		propertyOverrides: Partial<Property> = {},
		unitCount = 3
	): { property: Property; units: Unit[] } {
		const property = this.createProperty(propertyOverrides)
		const units = Array.from({ length: unitCount }, (_, i) =>
			this.createUnit({
				propertyId: property.id,
				unitNumber: `${i + 1}`
			})
		)

		return { property, units }
	}

	/**
	 * Creates a complete lease with all relationships
	 */
	static createCompleteLeaseScenario(): {
		property: Property
		unit: Unit
		tenant: Tenant
		lease: Lease
	} {
		const property = this.createProperty()
		const unit = this.createUnit({
			propertyId: property.id,
			status: UNIT_STATUS.OCCUPIED
		})
		const tenant = this.createTenant()
		const lease = this.createLease({
			unitId: unit.id,
			tenantId: tenant.id,
			status: LEASE_STATUS.ACTIVE,
			rentAmount: unit.rent
		})

		return { property, unit, tenant, lease }
	}

	/**
	 * Creates test request/response DTOs
	 */
	static createApiResponse<T>(data: T, success = true) {
		return {
			success,
			data,
			message: success ? 'Operation successful' : 'Operation failed',
			timestamp: new Date().toISOString()
		}
	}

	/**
	 * Creates pagination metadata
	 */
	static createPaginationMeta(total: number, limit = 20, offset = 0) {
		return {
			total,
			limit,
			offset,
			hasMore: offset + limit < total,
			page: Math.floor(offset / limit) + 1,
			totalPages: Math.ceil(total / limit)
		}
	}
}

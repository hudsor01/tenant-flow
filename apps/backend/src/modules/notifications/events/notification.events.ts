/**
 * Native NestJS EventEmitter Events for Notifications
 * No custom abstractions - direct event classes following NestJS patterns
 */

export class MaintenanceUpdatedEvent {
	constructor(
		public readonly user_id: string,
		public readonly maintenanceId: string,
		public readonly title: string,
		public readonly status: string,
		public readonly priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
		public readonly propertyName: string,
		public readonly unit_number: string,
		public readonly description: string
	) {}
}

export class PaymentReceivedEvent {
	constructor(
		public readonly user_id: string,
		public readonly subscriptionId: string,
		public readonly amount: number,
		public readonly currency: string,
		public readonly invoiceUrl: string,
		public readonly description: string
	) {}
}

export class PaymentFailedEvent {
	constructor(
		public readonly user_id: string,
		public readonly subscriptionId: string,
		public readonly amount: number,
		public readonly currency: string,
		public readonly invoiceUrl: string,
		public readonly reason: string
	) {}
}

export class TenantCreatedEvent {
	constructor(
		public readonly user_id: string,
		public readonly tenant_id: string,
		public readonly tenantName: string,
		public readonly tenantEmail: string,
		public readonly description: string
	) {}
}

export class LeaseExpiringEvent {
	constructor(
		public readonly user_id: string,
		public readonly tenantName: string,
		public readonly propertyName: string,
		public readonly unit_number: string,
		public readonly expirationDate: string,
		public readonly daysUntilExpiry: number
	) {}
}

// Main API client that combines all service clients
import { HttpClient } from './http-client'
import { AuthClient } from './auth-client'
import { PropertyClient } from './property-client'
import { TenantClient } from './tenant-client'
import { MaintenanceClient } from './maintenance-client'
import { PaymentClient } from './payment-client'
import { NotificationClient } from './notification-client'
import { UserClient } from './user-client'
import { SubscriptionClient } from './subscription-client'
import { ActivityClient } from './activity-client'
import { HealthClient } from './health-client'

// Re-export the error class and token manager for backwards compatibility
export { ApiClientError, TokenManager } from './base-client'

// Main API client class
export class ApiClient {
	public http: HttpClient
	
	// Service clients
	public auth: AuthClient
	public properties: PropertyClient['properties']
	public units: PropertyClient['units']
	public leases: PropertyClient['leases']
	public tenants: TenantClient
	public maintenance: MaintenanceClient
	public payments: PaymentClient
	public notifications: NotificationClient
	public users: UserClient
	public subscriptions: SubscriptionClient
	public activity: ActivityClient
	public health: HealthClient
	
	constructor() {
		this.http = new HttpClient()
		
		// Initialize service clients
		const authClient = new AuthClient(this.http)
		const propertyClient = new PropertyClient(this.http)
		const tenantClient = new TenantClient(this.http)
		const maintenanceClient = new MaintenanceClient(this.http)
		const paymentClient = new PaymentClient(this.http)
		const notificationClient = new NotificationClient(this.http)
		const userClient = new UserClient(this.http)
		const subscriptionClient = new SubscriptionClient(this.http)
		const activityClient = new ActivityClient(this.http)
		const healthClient = new HealthClient(this.http)
		
		// Expose service methods
		this.auth = authClient
		this.properties = propertyClient.properties
		this.units = propertyClient.units
		this.leases = propertyClient.leases
		this.tenants = tenantClient
		this.maintenance = maintenanceClient
		this.payments = paymentClient
		this.notifications = notificationClient
		this.users = userClient
		this.subscriptions = subscriptionClient
		this.activity = activityClient
		this.health = healthClient
	}

}

// Create and export a default instance
export const apiClient = new ApiClient()
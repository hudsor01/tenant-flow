import { lazy } from '@trpc/server'
import { createRouter } from './trpc'
import type { AuthService } from '../auth/auth.service'
import type { EmailService } from '../email/email.service'
import type { PropertiesService } from '../properties/properties.service'
import type { TenantsService } from '../tenants/tenants.service'
import type { MaintenanceService } from '../maintenance/maintenance.service'
import type { SubscriptionsService } from '../subscriptions/subscriptions.service'
import type { SubscriptionService } from '../stripe/subscription.service'
import type { StorageService } from '../storage/storage.service'
import type { UsersService } from '../users/users.service'
import type { UnitsService } from '../units/units.service'
import type { LeasesService } from '../leases/leases.service'

export const createAppRouter = (services: {
	authService: AuthService
	emailService: EmailService
	propertiesService: PropertiesService
	tenantsService: TenantsService
	maintenanceService: MaintenanceService
	subscriptionsService: SubscriptionsService
	subscriptionService: SubscriptionService
	storageService: StorageService
	usersService: UsersService
	unitsService: UnitsService
	leasesService: LeasesService
}) => {
	return createRouter({
		// Lazy load routers to reduce cold start times
		auth: lazy(() => 
			import('./routers/auth.router').then(m => 
				m.createAuthRouter(services.authService, services.emailService)
			)
		),
		properties: lazy(() => 
			import('./routers/properties.router').then(m => 
				m.createPropertiesRouter(services.propertiesService, services.storageService)
			)
		),
		tenants: lazy(() => 
			import('./routers/tenants.router').then(m => 
				m.createTenantsRouter(services.tenantsService, services.storageService)
			)
		),
		maintenance: lazy(() => 
			import('./routers/maintenance.router').then(m => 
				m.createMaintenanceRouter(services.maintenanceService)
			)
		),
		units: lazy(() => 
			import('./routers/units.router').then(m => 
				m.createUnitsRouter(services.unitsService)
			)
		),
		leases: lazy(() => 
			import('./routers/leases.router').then(m => 
				m.createLeasesRouter(services.leasesService)
			)
		),
		subscriptions: lazy(() => 
			import('./routers/subscriptions.router').then(m => 
				m.createSubscriptionsRouter({
					subscriptionService: services.subscriptionService,
					subscriptionsService: services.subscriptionsService
				})
			)
		)
	})
}

// Export the inferred AppRouter type from the router function
export type AppRouter = ReturnType<typeof createAppRouter>

// Export an AppRouter instance type explicitly for better type inference
// This helps TRPC React properly resolve the router type instead of collision detection
export interface IAppRouter extends AppRouter {}

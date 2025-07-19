import { router } from './trpc'
import { createPropertiesRouter } from './routers/properties.router'
import { createTenantsRouter } from './routers/tenants.router'
import { createAuthRouter } from './routers/auth.router'
import { createMaintenanceRouter } from './routers/maintenance.router'
import { createUnitsRouter } from './routers/units.router'
import { createLeasesRouter } from './routers/leases.router'
import { createSubscriptionsRouter } from './routers/subscriptions.router'
import type { AuthService } from '../auth/auth.service'
import type { PropertiesService } from '../properties/properties.service'
import type { TenantsService } from '../tenants/tenants.service'
import type { MaintenanceService } from '../maintenance/maintenance.service'
import type { SubscriptionsService } from '../subscriptions/subscriptions.service'
import type { PortalService } from '../stripe/services/portal.service'
import type { StripeService } from '../stripe/services/stripe.service'
import type { WebhookService } from '../stripe/services/webhook.service'
import type { StorageService } from '../storage/storage.service'
import type { UsersService } from '../users/users.service'
import type { UnitsService } from '../units/units.service'
import type { LeasesService } from '../leases/leases.service'

export const createAppRouter = (services: {
	authService: AuthService
	propertiesService: PropertiesService
	tenantsService: TenantsService
	maintenanceService: MaintenanceService
	subscriptionsService: SubscriptionsService
	portalService: PortalService
	stripeService: StripeService
	webhookService: WebhookService
	storageService: StorageService
	usersService: UsersService
	unitsService: UnitsService
	leasesService: LeasesService
}) => {
	// Create individual routers
	const authRouter = createAuthRouter(services.authService)

	const propertiesRouter = createPropertiesRouter(
		services.propertiesService,
		services.storageService
	)

	const tenantsRouter = createTenantsRouter(
		services.tenantsService,
		services.storageService
	)

	const maintenanceRouter = createMaintenanceRouter(
		services.maintenanceService
	)


	const unitsRouter = createUnitsRouter(services.unitsService)

	const leasesRouter = createLeasesRouter(services.leasesService)


	const subscriptionsRouter = createSubscriptionsRouter(
		services.subscriptionsService,
		services.portalService,
		services.usersService,
		services.authService
	)

	const appRouter = router({
		auth: authRouter,
		properties: propertiesRouter,
		tenants: tenantsRouter,
		maintenance: maintenanceRouter,
		units: unitsRouter,
		leases: leasesRouter,
		subscriptions: subscriptionsRouter
	})

	// App router created successfully with all procedures

	return appRouter
}

export type AppRouter = ReturnType<typeof createAppRouter>

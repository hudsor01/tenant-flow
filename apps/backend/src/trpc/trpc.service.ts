import { Injectable } from '@nestjs/common'
import { PropertiesService } from '../properties/properties.service'
import { TenantsService } from '../tenants/tenants.service'
import { AuthService } from '../auth/auth.service'
import { MaintenanceService } from '../maintenance/maintenance.service'
import { SubscriptionsService } from '../subscriptions/subscriptions.service'
import { PortalService } from '../stripe/services/portal.service'
import { StripeService } from '../stripe/services/stripe.service'
// EnhancedStripeService removed for current release
import { WebhookService } from '../stripe/services/webhook.service'
import { StorageService } from '../storage/storage.service'
import { UsersService } from '../users/users.service'
import { UnitsService } from '../units/units.service'
import { LeasesService } from '../leases/leases.service'
import { createAppRouter } from './app-router'
import { AppContext } from './context/app.context' 

@Injectable()
export class TrpcService {
  constructor(
    private readonly appContext: AppContext,
    private readonly propertiesService: PropertiesService,
    private readonly tenantsService: TenantsService,
    private readonly authService: AuthService,
    private readonly maintenanceService: MaintenanceService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly portalService: PortalService,
    private readonly stripeService: StripeService,
    // enhancedStripeService removed for current release
    private readonly webhookService: WebhookService,
    private readonly storageService: StorageService,
    private readonly usersService: UsersService,
    private readonly unitsService: UnitsService,
    private readonly leasesService: LeasesService,
  ) {}

  getAppRouter() {
    return createAppRouter({
      propertiesService: this.propertiesService,
      tenantsService: this.tenantsService,
      authService: this.authService,
      maintenanceService: this.maintenanceService,
      subscriptionsService: this.subscriptionsService,
      portalService: this.portalService,
      stripeService: this.stripeService,
      // enhancedStripeService removed for current release
      webhookService: this.webhookService,
      storageService: this.storageService,
      usersService: this.usersService,
      unitsService: this.unitsService,
      leasesService: this.leasesService,
    })
  }

  // Context creation is now handled directly in main.ts with Fastify adapter
}
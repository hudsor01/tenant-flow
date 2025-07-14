import { Injectable } from '@nestjs/common'
import { TRPCError } from '@trpc/server'
import * as trpcExpress from '@trpc/server/adapters/express'
import { PropertiesService } from '../properties/properties.service'
import { TenantsService } from '../tenants/tenants.service'
import { PaymentsService } from '../payments/payments.service'
import { AuthService } from '../auth/auth.service'
import { MaintenanceService } from '../maintenance/maintenance.service'
import { SubscriptionsService } from '../subscriptions/subscriptions.service'
import { SubscriptionService } from '../stripe/services/subscription.service'
import { PortalService } from '../stripe/services/portal.service'
import { createAppRouter } from './app-router'
import { AppContext } from './context/app.context'

@Injectable()
export class TrpcService {
  constructor(
    private readonly appContext: AppContext,
    private readonly propertiesService: PropertiesService,
    private readonly tenantsService: TenantsService,
    private readonly paymentsService: PaymentsService,
    private readonly authService: AuthService,
    private readonly maintenanceService: MaintenanceService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly subscriptionService: SubscriptionService,
    private readonly portalService: PortalService,
  ) {}

  getAppRouter() {
    return createAppRouter({
      propertiesService: this.propertiesService,
      tenantsService: this.tenantsService,
      paymentsService: this.paymentsService,
      authService: this.authService,
      maintenanceService: this.maintenanceService,
      subscriptionsService: this.subscriptionsService,
      subscriptionService: this.subscriptionService,
      portalService: this.portalService,
    })
  }

  createContext = async (opts: trpcExpress.CreateExpressContextOptions) => {
    return this.appContext.create({
      req: opts.req,
      res: opts.res,
    })
  }
}
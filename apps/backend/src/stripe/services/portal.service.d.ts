import Stripe from 'stripe';
import { StripeService } from './stripe.service';
export declare class PortalService {
    private readonly stripeService;
    constructor(stripeService: StripeService);
    createPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session>;
}
//# sourceMappingURL=portal.service.d.ts.map
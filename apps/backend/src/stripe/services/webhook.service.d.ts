import { PrismaService } from 'nestjs-prisma';
import Stripe from 'stripe';
export declare class WebhookService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    handleWebhook(event: Stripe.Event): Promise<void>;
    private handleSubscriptionCreated;
    private handleSubscriptionUpdated;
    private handlePaymentSucceeded;
    private handlePaymentFailed;
    isHealthy(): boolean;
}
//# sourceMappingURL=webhook.service.d.ts.map
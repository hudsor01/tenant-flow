// Purpose: Extend Fastify Request type to include additional properties for webhooks and custom functionality.
import 'fastify'

declare module 'fastify' {
    interface FastifyRequest {
        rawBody?: Buffer
        stripeEvent?: import('stripe').Stripe.Event
    }
}

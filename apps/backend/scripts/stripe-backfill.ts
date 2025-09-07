import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { StripeSyncService } from '../src/billing/stripe-sync.service'

async function backfillStripeData() {
  console.log('STARTING: Starting Stripe data backfill...')
  
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log']
  })

  try {
    const stripeSyncService = app.get(StripeSyncService)
    await stripeSyncService.backfillData()
    console.log('SUCCESS: Stripe data backfill completed successfully')
  } catch (error) {
    console.error('ERROR: Stripe data backfill failed:', error)
    process.exit(1)
  } finally {
    await app.close()
  }
}

backfillStripeData()
import { Injectable, Logger } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { FeatureAccessService } from './feature-access.service'
import {
  SubscriptionEventType,
  FeatureAccessRestrictEvent,
  FeatureAccessRestoreEvent
} from '../common/events/subscription.events'

@Injectable()
export class FeatureAccessEventListener {
  private readonly logger = new Logger(FeatureAccessEventListener.name)

  constructor(
    private readonly featureAccessService: FeatureAccessService
  ) {}

  @OnEvent(SubscriptionEventType.FEATURE_ACCESS_RESTRICT)
  async handleFeatureAccessRestrict(event: FeatureAccessRestrictEvent) {
    try {
      this.logger.debug('Handling feature access restrict event', { event })
      
      await this.featureAccessService.restrictUserAccess(event.userId, event.reason)
      
      this.logger.debug('Feature access restricted successfully', {
        userId: event.userId,
        reason: event.reason
      })
    } catch (error) {
      this.logger.error('Failed to handle feature access restrict event', error)
    }
  }

  @OnEvent(SubscriptionEventType.FEATURE_ACCESS_RESTORE)
  async handleFeatureAccessRestore(event: FeatureAccessRestoreEvent) {
    try {
      this.logger.debug('Handling feature access restore event', { event })
      
      await this.featureAccessService.restoreUserAccess(event.userId, event.planType)
      
      this.logger.debug('Feature access restored successfully', {
        userId: event.userId,
        planType: event.planType
      })
    } catch (error) {
      this.logger.error('Failed to handle feature access restore event', error)
    }
  }
}
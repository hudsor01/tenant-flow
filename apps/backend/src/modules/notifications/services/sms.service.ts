import { Injectable } from '@nestjs/common'
import { AppLogger } from '../../../logger/app-logger.service'

/**
 * SmsService
 * Stub implementation — Twilio integration not configured.
 * SMS notifications are silently skipped.
 */
@Injectable()
export class SmsService {
	constructor(private readonly logger: AppLogger) {}

	get isConfigured(): boolean {
		return false
	}

	async sendSms(to: string, _body: string): Promise<void> {
		this.logger.debug(`SmsService: skipping SMS to ${to} — Twilio not configured`)
	}
}

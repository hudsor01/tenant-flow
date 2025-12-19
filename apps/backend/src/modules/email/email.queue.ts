import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq'
import { Injectable } from '@nestjs/common'
import type { Job } from 'bullmq'
import type { ContactFormRequest } from '@repo/shared/types/domain'
import { AppLogger } from '../../logger/app-logger.service'
import { EmailService } from './email.service'

export type EmailJob =
	| {
			type: 'payment-success'
			data: {
				customerEmail: string
				amount: number
				currency: string
				invoiceUrl: string | null
				invoicePdf: string | null
			}
	  }
	| {
			type: 'payment-failed'
			data: {
				customerEmail: string
				amount: number
				currency: string
				attemptCount: number
				invoiceUrl: string | null
				isLastAttempt: boolean
			}
	  }
	| {
			type: 'subscription-canceled'
			data: {
				customerEmail: string
				subscriptionId: string
				cancelAtPeriodEnd: boolean
				currentPeriodEnd: string | null
			}
	  }
	| {
			type: 'contact-form'
			data: { contactFormData: ContactFormRequest }
	  }
	| {
			type: 'tenant-invitation'
			data: {
				tenantEmail: string
				invitationUrl: string
				propertyName?: string
				unitNumber?: string
				ownerName?: string
				expiresAt: string
			}
	  }
	| {
			type: 'lease-signature'
			data: {
				tenantEmail: string
				tenantName: string
				propertyName?: string
				unitNumber?: string
				ownerName?: string
				message?: string
				signUrl: string
			}
	  }

@Processor('emails', {
	concurrency: 5,
	limiter: {
		max: 100,
		duration: 60000
	}
})
@Injectable()
export class EmailProcessor extends WorkerHost {
	constructor(
		private readonly emailService: EmailService,
		private readonly logger: AppLogger
	) {
		super()
	}

	async process(job: Job<EmailJob>): Promise<void> {
		const { type, data } = job.data

		this.logger.log(`Processing email job: ${type}`, {
			jobId: job.id,
			attempt: job.attemptsMade + 1
		})

		try {
			switch (type) {
				case 'payment-success':
					await this.emailService.sendPaymentSuccessEmail({
						customerEmail: data.customerEmail,
						amount: data.amount,
						currency: data.currency,
						invoiceUrl: data.invoiceUrl,
						invoicePdf: data.invoicePdf
					})
					break

				case 'payment-failed':
					await this.emailService.sendPaymentFailedEmail({
						customerEmail: data.customerEmail,
						amount: data.amount,
						currency: data.currency,
						attemptCount: data.attemptCount,
						invoiceUrl: data.invoiceUrl,
						isLastAttempt: data.isLastAttempt
					})
					break

				case 'subscription-canceled':
					await this.emailService.sendSubscriptionCanceledEmail({
						customerEmail: data.customerEmail,
						subscriptionId: data.subscriptionId,
						cancelAtPeriodEnd: data.cancelAtPeriodEnd,
						currentPeriodEnd: data.currentPeriodEnd ? new Date(data.currentPeriodEnd) : null
					})
					break

				case 'contact-form':
					await this.emailService.sendContactFormEmail(data.contactFormData)
					break

				case 'tenant-invitation':
					await this.emailService.sendTenantInvitationEmail({
						tenantEmail: data.tenantEmail,
						invitationUrl: data.invitationUrl,
						...(data.propertyName !== undefined && { propertyName: data.propertyName }),
						...(data.unitNumber !== undefined && { unitNumber: data.unitNumber }),
						...(data.ownerName !== undefined && { ownerName: data.ownerName }),
						expiresAt: data.expiresAt
					})
					break

				case 'lease-signature':
					await this.emailService.sendLeaseSentForSignatureEmail({
						tenantEmail: data.tenantEmail,
						tenantName: data.tenantName,
						...(data.propertyName !== undefined && { propertyName: data.propertyName }),
						...(data.unitNumber !== undefined && { unitNumber: data.unitNumber }),
						...(data.ownerName !== undefined && { ownerName: data.ownerName }),
						...(data.message !== undefined && { message: data.message }),
						signUrl: data.signUrl
					})
					break

				default: {
					const exhaustive: never = type
					throw new Error(`Unknown email type: ${exhaustive}`)
				}
			}

			this.logger.log(`Email sent successfully: ${type}`, { jobId: job.id })
		} catch (error) {
			this.logger.error(`Email job failed: ${type}`, {
				jobId: job.id,
				error: error instanceof Error ? error.message : String(error),
				attempt: job.attemptsMade + 1
			})
			throw error
		}
	}

	@OnWorkerEvent('failed')
	onFailed(job: Job<EmailJob>, error: Error) {
		const email = this.getEmailForJob(job)

		this.logger.error(
			`Email job permanently failed after ${job.attemptsMade} attempts`,
			{
				jobId: job.id,
				type: job.data.type,
				email,
				error: error.message
			}
		)
	}

	private getEmailForJob(job: Job<EmailJob>): string | undefined {
		switch (job.data.type) {
			case 'payment-success':
			case 'payment-failed':
			case 'subscription-canceled':
				return job.data.data.customerEmail
			case 'tenant-invitation':
			case 'lease-signature':
				return job.data.data.tenantEmail
			case 'contact-form':
				return job.data.data.contactFormData.email
			default: {
				const exhaustive: never = job.data
				return exhaustive
			}
		}
	}
}


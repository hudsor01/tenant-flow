import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import type { Queue } from 'bullmq'
import type { ContactFormRequest } from '@repo/shared/types/domain'
import { AppLogger } from '../../logger/app-logger.service'
import type { EmailJob } from '../email/email.queue'

@Injectable()
export class ContactService {
	constructor(
		private readonly logger: AppLogger,
		@InjectQueue('emails') private readonly emailQueue: Queue<EmailJob>
	) {}

  async processContactForm(dto: ContactFormRequest) {
    try {
			await this.emailQueue.add('contact-form', {
				type: 'contact-form',
				data: { contactFormData: dto }
			})

      // Log the successful submission attempt regardless of email status
      this.logger.log(
        {
          contactForm: {
            name: dto.name,
            email: dto.email,
            company: dto.company,
            subject: dto.subject,
            type: dto.type,
            messageLength: dto.message.length
          }
        },
        `Contact form submission processed from ${dto.email}`
      )

      return {
        success: true,
        message:
          'Thank you for reaching out! Our team will review your message and get back to you within 4 hours.'
      }
    } catch (error) {
      // This catch block handles unexpected errors *before* attempting to send emails
      // Errors during email sending are handled by Promise.allSettled
      this.logger.error(
        'Unexpected error during contact form processing',
        {
          error: error instanceof Error ? error.message : String(error),
          email: dto.email,
          context: 'ContactService'
        }
      )
      throw new InternalServerErrorException(
        'Contact submission failed [CONTACT-001]'
      )
    }
  }
}

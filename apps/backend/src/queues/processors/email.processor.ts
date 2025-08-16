import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { QUEUE_NAMES } from '../queue.module'
import { BaseJobData, BaseProcessor, ProcessorResult } from '../base/base.processor'
import { ProcessorUtils } from '../utils/processor-utils'
import { QUEUE_PROCESSING_DELAYS } from '../config/queue.constants'

interface EmailJobData extends BaseJobData {
  to: string | string[]
  subject: string
  template?: string
  templateData?: Record<string, unknown>
  html?: string
  text?: string
  attachments?: { filename: string; content: Buffer }[]
}

@Processor(QUEUE_NAMES.EMAILS)
export class EmailProcessor extends BaseProcessor<EmailJobData> {
  constructor() {
    super(EmailProcessor.name)
  }

  @Process('send-email')
  async handleEmailSending(job: Job<EmailJobData>): Promise<ProcessorResult> {
    return this.handleJob(job)
  }

  protected async processJob(job: Job<EmailJobData>): Promise<ProcessorResult> {
    const { to, subject, template, html, text } = job.data
    const recipients = Array.isArray(to) ? to.join(', ') : to
    
    if (template) {
      await this.sendTemplatedEmail(job.data)
    } else if (html || text) {
      await this.sendDirectEmail(job.data)
    } else {
      throw new Error('Email must have either template or html/text content')
    }
    
    return {
      success: true,
      data: { recipients, subject },
      processingTime: 0,
      timestamp: new Date()
    }
  }

  private async sendTemplatedEmail(data: EmailJobData): Promise<void> {
    const { template, templateData } = data
    
    // TODO: Implement email template rendering
    // - Load template from email service
    // - Render template with data
    // - Send via email provider (Resend, SendGrid, etc.)
    
    if (!template) {
      throw new Error('Template name is required')
    }
    
    const renderedContent = await this.renderTemplate(template, templateData || {})
    
    // TODO: Send via actual email service
    await this.sendViaEmailProvider({
      ...data,
      html: renderedContent.html,
      text: renderedContent.text
    })
  }

  private async sendDirectEmail(data: EmailJobData): Promise<void> {
    // TODO: Send via actual email service
    await this.sendViaEmailProvider(data)
  }

  private async renderTemplate(templateName: string, data: Record<string, unknown>): Promise<{ html: string; text: string }> {
    // TODO: Implement template rendering
    // - Load template from file system or database
    // - Use template engine (Handlebars, Mustache, etc.)
    // - Render both HTML and text versions
    
    // Template rendering logic
    
    // Simulate template rendering
    await ProcessorUtils.simulateProcessing('template-rendering', 200)
    
    // Placeholder template rendering
    const html = `
      <html>
        <body>
          <h1>TenantFlow Notification</h1>
          <p>Template: ${templateName}</p>
          <p>Data: ${JSON.stringify(data)}</p>
        </body>
      </html>
    `
    
    const text = `TenantFlow Notification\\nTemplate: ${templateName}\\nData: ${JSON.stringify(data)}`
    
    return { html, text }
  }

  private async sendViaEmailProvider(data: EmailJobData): Promise<void> {
    // TODO: Implement actual email sending
    // - Configure email provider (Resend, SendGrid, SES, etc.)
    // - Handle authentication
    // - Send email with proper error handling
    // - Track delivery status
    
    // Send via email provider
    
    // Validate email data
    this.validateEmailData(data)
    
    // Simulate email sending
    await ProcessorUtils.simulateProcessing('email-sending', QUEUE_PROCESSING_DELAYS.EMAIL)
    
    // TODO: Replace with actual email service integration
    // Example for Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({
    //   from: 'noreply@tenantflow.app',
    //   to: data.to,
    //   subject: data.subject,
    //   html: data.html,
    //   text: data.text,
    //   attachments: data.attachments
    // })
  }

  private validateEmailData(data: EmailJobData): void {
    if (!data.to || (Array.isArray(data.to) && data.to.length === 0)) {
      throw new Error('Email recipient(s) required')
    }
    
    if (!data.subject) {
      throw new Error('Email subject required')
    }
    
    if (!data.html && !data.text) {
      throw new Error('Email must have either HTML or text content')
    }
    
    // Validate email addresses
    const recipients = Array.isArray(data.to) ? data.to : [data.to]
    for (const email of recipients) {
      if (!this.isValidEmail(email)) {
        throw new Error(`Invalid email address: ${email}`)
      }
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
    return emailRegex.test(email)
  }

}
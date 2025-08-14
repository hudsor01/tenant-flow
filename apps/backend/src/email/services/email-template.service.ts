import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as Handlebars from 'handlebars'
import * as fs from 'fs/promises'
import * as path from 'path'
import { z } from 'zod'

import { 
  EmailTemplateName, 
  EmailTemplateConfig,
  EmailDataSchemas,
  ExtractEmailData
} from '../types/email-templates.types'
import { EMAIL_TEMPLATES, generateSubject } from '../config/email-templates.config'

interface RenderedEmail {
  subject: string
  html: string
  text?: string
}

@Injectable()
export class EmailTemplateService implements OnModuleInit {
  private readonly logger = new Logger(EmailTemplateService.name)
  private readonly templateCache = new Map<string, HandlebarsTemplateDelegate>()
  private readonly templatesDir: string
  private baseTemplate: HandlebarsTemplateDelegate | null = null

  constructor(private readonly configService: ConfigService) {
    this.templatesDir = path.join(__dirname, '..', 'templates')
    this.registerHandlebarsHelpers()
  }

  /**
   * Initialize the template service by loading base template
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.loadBaseTemplate()
      this.logger.log('Email template service initialized successfully')
    } catch (error) {
      this.logger.error('Failed to initialize email template service', error)
      throw error
    }
  }

  /**
   * Render an email template with type safety
   */
  async renderEmail<T extends EmailTemplateName>(
    templateName: T,
    data: ExtractEmailData<T>
  ): Promise<RenderedEmail> {
    const startTime = Date.now()

    try {
      // Validate data against schema
      const validatedData = this.validateTemplateData(templateName, data)

      // Get template configuration
      const config = EMAIL_TEMPLATES[templateName]
      if (!config) {
        throw new Error(`Template configuration not found: ${templateName}`)
      }

      // Load and compile template
      const template = await this.loadTemplate(config.templateFile)

      // Generate subject line
      const subject = generateSubject(templateName, validatedData)

      // Render template with data
      const bodyHtml = template({
        ...validatedData,
        subject,
        // Add common variables
        appUrl: this.configService.get('FRONTEND_URL') || 'https://tenantflow.app',
        unsubscribeUrl: this.generateUnsubscribeUrl(templateName),
        currentYear: new Date().getFullYear(),
        // Helper functions available in templates
        formatDate: (date: Date, format?: string) => this.formatDate(date, format),
        formatCurrency: (amount: number) => this.formatCurrency(amount)
      })

      // Wrap in base template
      const html = this.baseTemplate ? this.baseTemplate({ 
        body: bodyHtml, 
        subject 
      }) : bodyHtml

      const processingTime = Date.now() - startTime
      this.logger.debug(`Rendered ${templateName} template in ${processingTime}ms`)

      return {
        subject,
        html,
        text: this.stripHtmlTags(html) // Simple text fallback
      }

    } catch (error) {
      const processingTime = Date.now() - startTime
      this.logger.error(`Failed to render ${templateName} template after ${processingTime}ms`, error)
      throw new Error(`Email template rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate template data against schema
   */
  private validateTemplateData<T extends EmailTemplateName>(
    templateName: T,
    data: ExtractEmailData<T>
  ): ExtractEmailData<T> {
    const schema = EmailDataSchemas[templateName]
    
    try {
      return schema.parse(data) as ExtractEmailData<T>
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')
        throw new Error(`Template data validation failed for ${templateName}: ${errorMessages}`)
      }
      throw error
    }
  }

  /**
   * Load and cache Handlebars template
   */
  private async loadTemplate(templateFile: string): Promise<HandlebarsTemplateDelegate> {
    const cacheKey = templateFile

    // Return cached template if available
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey) as HandlebarsTemplateDelegate
    }

    try {
      const templatePath = path.join(this.templatesDir, templateFile)
      const templateSource = await fs.readFile(templatePath, 'utf8')
      const compiled = Handlebars.compile(templateSource)
      
      // Cache the compiled template
      this.templateCache.set(cacheKey, compiled)
      
      this.logger.debug(`Loaded and cached template: ${templateFile}`)
      return compiled

    } catch (error) {
      this.logger.error(`Failed to load template file: ${templateFile}`, error)
      throw new Error(`Template file not found: ${templateFile}`)
    }
  }

  /**
   * Load base template wrapper
   */
  private async loadBaseTemplate(): Promise<void> {
    try {
      const baseTemplatePath = path.join(this.templatesDir, 'base.hbs')
      const baseTemplateSource = await fs.readFile(baseTemplatePath, 'utf8')
      this.baseTemplate = Handlebars.compile(baseTemplateSource)
    } catch (_error) {
      this.logger.warn('Base template not found, using templates without wrapper')
      this.baseTemplate = null
    }
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    // Equality helper
    Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b)
    
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: Date, format?: string) => {
      return this.formatDate(date, format)
    })
    
    // Currency formatting helper
    Handlebars.registerHelper('formatCurrency', (amount: number) => {
      return this.formatCurrency(amount)
    })

    // Conditional helpers with proper context typing
    type HandlebarsContext = Record<string, unknown>;
    
    Handlebars.registerHelper('if_eq', function(this: HandlebarsContext, a: unknown, b: unknown, opts: Handlebars.HelperOptions) {
      return (a === b) ? opts.fn(this) : opts.inverse(this)
    })

    Handlebars.registerHelper('if_gt', function(this: HandlebarsContext, a: number, b: number, opts: Handlebars.HelperOptions) {
      return (a > b) ? opts.fn(this) : opts.inverse(this)
    })

    // Array/object helpers
    Handlebars.registerHelper('length', (array: unknown[]) => {
      return Array.isArray(array) ? array.length : 0
    })

    this.logger.debug('Handlebars helpers registered')
  }

  /**
   * Format date for email templates
   */
  private formatDate(date: Date, format?: string): string {
    if (!date || !(date instanceof Date)) {
      return 'Invalid Date'
    }

    // Simple formatting - in production you might want to use a library like date-fns
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }

    if (format === 'short') {
      options.month = 'short'
    } else if (format === 'time') {
      options.hour = '2-digit'
      options.minute = '2-digit'
    }

    return new Intl.DateTimeFormat('en-US', options).format(date)
  }

  /**
   * Format currency for email templates
   */
  private formatCurrency(amount: number): string {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '$0.00'
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  /**
   * Strip HTML tags for text version
   */
  private stripHtmlTags(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Generate unsubscribe URL
   */
  private generateUnsubscribeUrl(templateName: EmailTemplateName): string {
    const baseUrl = this.configService.get('FRONTEND_URL') || 'https://tenantflow.app'
    return `${baseUrl}/unsubscribe?template=${templateName}`
  }

  /**
   * Get template configuration
   */
  getTemplateConfig(templateName: EmailTemplateName): EmailTemplateConfig {
    return EMAIL_TEMPLATES[templateName]
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): EmailTemplateConfig[] {
    return Object.values(EMAIL_TEMPLATES)
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache(): void {
    this.templateCache.clear()
    this.baseTemplate = null
    this.logger.debug('Template cache cleared')
  }
}
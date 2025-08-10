import { Injectable, Logger } from '@nestjs/common'
import puppeteer, { Browser } from 'puppeteer'
import { ErrorHandlerService } from '../errors/error-handler.service'

export interface PDFGenerationOptions {
  /** HTML content to convert to PDF */
  html: string
  /** PDF filename (without extension) */
  filename: string
  /** Page format */
  format?: 'A4' | 'Letter' | 'Legal'
  /** Print margins */
  margin?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
  /** Additional CSS for styling */
  css?: string
  /** Whether to include page numbers */
  includePageNumbers?: boolean
  /** Header HTML */
  headerTemplate?: string
  /** Footer HTML */
  footerTemplate?: string
  /** Scale factor */
  scale?: number
  /** Whether to print background graphics */
  printBackground?: boolean
}

export interface PDFGenerationResult {
  /** PDF buffer */
  buffer: Buffer
  /** Generated filename */
  filename: string
  /** File size in bytes */
  size: number
  /** MIME type */
  mimeType: string
}

/**
 * PDF Generator Service
 * 
 * Production-grade PDF generation service using Puppeteer
 * Optimized for server-side rendering and performance
 * 
 * Features:
 * - HTML to PDF conversion
 * - Custom CSS styling
 * - Headers and footers
 * - Page numbers
 * - Various page formats
 * - Memory management
 * - Error handling
 * 
 * References:
 * - https://pptr.dev/guides/pdf-generation
 * - https://github.com/puppeteer/puppeteer/blob/main/docs/api/puppeteer.pdfoptions.md
 */
@Injectable()
export class PDFGeneratorService {
  private readonly logger = new Logger(PDFGeneratorService.name)
  private browser: Browser | null = null
  private readonly isProduction: boolean

  constructor(
    private readonly errorHandler: ErrorHandlerService
  ) {
    this.isProduction = process.env.NODE_ENV === 'production'
  }

  /**
   * Initialize browser instance (lazy loading)
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process', // Required for some hosting environments
          '--disable-gpu'
        ],
        ...(this.isProduction && {
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser'
        })
      }

      this.browser = await puppeteer.launch(launchOptions)
      
      this.logger.log('PDF generator browser initialized', {
        version: await this.browser.version(),
        isProduction: this.isProduction
      })

      // Handle browser disconnect
      this.browser.on('disconnected', () => {
        this.logger.warn('PDF generator browser disconnected')
        this.browser = null
      })
    }

    return this.browser
  }

  /**
   * Generate PDF from HTML content
   */
  async generatePDF(options: PDFGenerationOptions): Promise<PDFGenerationResult> {
    const startTime = Date.now()
    
    try {
      const browser = await this.getBrowser()
      const page = await browser.newPage()

      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 1
      })

      // Construct complete HTML document
      const fullHtml = this.buildCompleteHTML(options.html, options.css)
      
      // Load content
      await page.setContent(fullHtml, {
        waitUntil: 'networkidle0',
        timeout: 30000
      })

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: options.format || 'Letter',
        printBackground: options.printBackground ?? true,
        margin: {
          top: '0.75in',
          right: '0.75in',
          bottom: '0.75in',
          left: '0.75in',
          ...options.margin
        },
        scale: options.scale || 1,
        preferCSSPageSize: true,
        displayHeaderFooter: !!(options.headerTemplate || options.footerTemplate || options.includePageNumbers),
        headerTemplate: options.headerTemplate || '',
        footerTemplate: options.footerTemplate || (
          options.includePageNumbers ? 
          `<div style="font-size: 10px; text-align: center; width: 100%;">
             <span class="pageNumber"></span> of <span class="totalPages"></span>
           </div>` : 
          ''
        )
      })

      await page.close()

      const generationTime = Date.now() - startTime
      const filename = `${options.filename}.pdf`
      
      this.logger.log('PDF generated successfully', {
        filename,
        size: pdfBuffer.length,
        generationTime: `${generationTime}ms`
      })

      return {
        buffer: Buffer.from(pdfBuffer),
        filename,
        size: pdfBuffer.length,
        mimeType: 'application/pdf'
      }

    } catch (error) {
      const generationTime = Date.now() - startTime
      
      this.logger.error('PDF generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filename: options.filename,
        generationTime: `${generationTime}ms`
      })

      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'generatePDF',
        resource: 'pdf',
        metadata: { filename: options.filename }
      })
    }
  }

  /**
   * Generate PDF from URL
   */
  async generatePDFFromURL(
    url: string,
    filename: string,
    pdfOptions: Omit<PDFGenerationOptions, 'html' | 'filename'> = {}
  ): Promise<PDFGenerationResult> {
    const startTime = Date.now()
    
    try {
      const browser = await this.getBrowser()
      const page = await browser.newPage()

      // Set viewport
      await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 1
      })

      // Navigate to URL
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000
      })

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: pdfOptions.format || 'Letter',
        printBackground: pdfOptions.printBackground ?? true,
        margin: {
          top: '0.75in',
          right: '0.75in',
          bottom: '0.75in',
          left: '0.75in',
          ...pdfOptions.margin
        },
        scale: pdfOptions.scale || 1,
        preferCSSPageSize: true,
        displayHeaderFooter: !!(pdfOptions.headerTemplate || pdfOptions.footerTemplate || pdfOptions.includePageNumbers),
        headerTemplate: pdfOptions.headerTemplate || '',
        footerTemplate: pdfOptions.footerTemplate || (
          pdfOptions.includePageNumbers ? 
          `<div style="font-size: 10px; text-align: center; width: 100%;">
             <span class="pageNumber"></span> of <span class="totalPages"></span>
           </div>` : 
          ''
        )
      })

      await page.close()

      const generationTime = Date.now() - startTime
      const pdfFilename = `${filename}.pdf`
      
      this.logger.log('PDF generated from URL successfully', {
        url,
        filename: pdfFilename,
        size: pdfBuffer.length,
        generationTime: `${generationTime}ms`
      })

      return {
        buffer: Buffer.from(pdfBuffer),
        filename: pdfFilename,
        size: pdfBuffer.length,
        mimeType: 'application/pdf'
      }

    } catch (error) {
      const generationTime = Date.now() - startTime
      
      this.logger.error('PDF generation from URL failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url,
        filename,
        generationTime: `${generationTime}ms`
      })

      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'generatePDFFromURL',
        resource: 'pdf',
        metadata: { url, filename }
      })
    }
  }

  /**
   * Build complete HTML document with proper structure
   */
  private buildCompleteHTML(htmlContent: string, css?: string): string {
    const defaultCSS = `
      @page {
        margin: 0.75in;
      }
      body {
        font-family: 'Times New Roman', Times, serif;
        font-size: 11pt;
        line-height: 1.5;
        color: #333;
        margin: 0;
        padding: 0;
      }
      h1, h2, h3, h4, h5, h6 {
        font-weight: bold;
        margin: 1em 0 0.5em 0;
      }
      h1 { font-size: 16pt; text-align: center; }
      h2 { font-size: 14pt; }
      h3 { font-size: 12pt; }
      p { margin: 0.5em 0; }
      .page-break { page-break-before: always; }
      .no-break { page-break-inside: avoid; }
      .text-center { text-align: center; }
      .text-bold { font-weight: bold; }
      .signature-line {
        border-bottom: 1px solid #333;
        width: 200px;
        margin: 20px 0 5px 0;
      }
      .signature-block {
        margin: 30px 0;
        page-break-inside: avoid;
      }
    `

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
        ${defaultCSS}
        ${css || ''}
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>
    `
  }

  /**
   * Close browser instance (cleanup)
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.logger.log('PDF generator browser closed')
    }
  }

  /**
   * Health check for PDF service
   */
  async healthCheck(): Promise<{ status: string; browserConnected: boolean }> {
    try {
      const browser = await this.getBrowser()
      const isConnected = browser.isConnected()
      
      return {
        status: isConnected ? 'healthy' : 'unhealthy',
        browserConnected: isConnected
      }
    } catch (error) {
      this.logger.error('PDF service health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return {
        status: 'unhealthy',
        browserConnected: false
      }
    }
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async onModuleDestroy() {
    await this.closeBrowser()
  }
}
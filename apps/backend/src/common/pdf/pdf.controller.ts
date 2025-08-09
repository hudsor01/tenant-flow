import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  ValidationPipe
} from '@nestjs/common'
import { Response } from 'express'
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger'
import { IsString, IsOptional, IsIn, IsBoolean, ValidateNested } from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { PDFGeneratorService, PDFGenerationOptions } from './pdf-generator.service'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { ErrorHandlerService } from '../errors/error-handler.service'

// DTOs for validation
class PDFMarginDto {
  @IsOptional()
  @IsString()
  top?: string

  @IsOptional()
  @IsString()
  right?: string

  @IsOptional()
  @IsString()
  bottom?: string

  @IsOptional()
  @IsString()
  left?: string
}

class GeneratePDFDto {
  @IsString()
  html!: string

  @IsString()
  filename!: string

  @IsOptional()
  @IsIn(['A4', 'Letter', 'Legal'])
  format?: 'A4' | 'Letter' | 'Legal'

  @IsOptional()
  @ValidateNested()
  @Type(() => PDFMarginDto)
  margin?: PDFMarginDto

  @IsOptional()
  @IsString()
  css?: string

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includePageNumbers?: boolean

  @IsOptional()
  @IsString()
  headerTemplate?: string

  @IsOptional()
  @IsString()
  footerTemplate?: string

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  scale?: number

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  printBackground?: boolean
}

class GeneratePDFFromURLDto {
  @IsString()
  url!: string

  @IsString()
  filename!: string

  @IsOptional()
  @IsIn(['A4', 'Letter', 'Legal'])
  format?: 'A4' | 'Letter' | 'Legal'

  @IsOptional()
  @ValidateNested()
  @Type(() => PDFMarginDto)
  margin?: PDFMarginDto

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includePageNumbers?: boolean

  @IsOptional()
  @IsString()
  headerTemplate?: string

  @IsOptional()
  @IsString()
  footerTemplate?: string

  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  scale?: number

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  printBackground?: boolean
}

/**
 * PDF Controller
 * 
 * RESTful API endpoints for PDF generation services
 * 
 * Features:
 * - HTML to PDF conversion endpoint
 * - URL to PDF conversion endpoint
 * - Health check endpoint
 * - Proper authentication and validation
 * - Streaming PDF responses
 * 
 * Security:
 * - JWT authentication required
 * - Input validation and sanitization
 * - Rate limiting through guards
 * 
 * References:
 * - https://docs.nestjs.com/controllers
 * - https://docs.nestjs.com/techniques/validation
 * - https://docs.nestjs.com/security/authentication
 */
@ApiTags('PDF Generation')
@Controller('pdf')
@UseGuards(JwtAuthGuard)
export class PDFController {
  constructor(
    private readonly pdfService: PDFGeneratorService,
    private readonly errorHandler: ErrorHandlerService
  ) {}

  /**
   * Generate PDF from HTML content
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate PDF from HTML content',
    description: 'Convert HTML content to PDF with customizable formatting options'
  })
  @ApiBody({ type: GeneratePDFDto })
  @ApiResponse({
    status: 200,
    description: 'PDF generated successfully',
    headers: {
      'Content-Type': { description: 'application/pdf' },
      'Content-Disposition': { description: 'attachment; filename="document.pdf"' }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid input parameters' })
  @ApiResponse({ status: 500, description: 'PDF generation failed' })
  async generatePDF(
    @Body(ValidationPipe) dto: GeneratePDFDto,
    @Res() response: Response
  ): Promise<void> {
    try {
      const options: PDFGenerationOptions = {
        html: dto.html,
        filename: dto.filename,
        format: dto.format,
        margin: dto.margin,
        css: dto.css,
        includePageNumbers: dto.includePageNumbers,
        headerTemplate: dto.headerTemplate,
        footerTemplate: dto.footerTemplate,
        scale: dto.scale,
        printBackground: dto.printBackground
      }

      const result = await this.pdfService.generatePDF(options)

      // Set response headers
      response.setHeader('Content-Type', result.mimeType)
      response.setHeader('Content-Length', result.size.toString())
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.filename}"`
      )
      response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      response.setHeader('Pragma', 'no-cache')
      response.setHeader('Expires', '0')

      // Stream the PDF buffer
      response.end(result.buffer)

    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'generatePDF',
        resource: 'pdf',
        metadata: { filename: dto.filename }
      })
    }
  }

  /**
   * Generate PDF from URL
   */
  @Post('generate-from-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate PDF from URL',
    description: 'Convert a web page to PDF by providing its URL'
  })
  @ApiBody({ type: GeneratePDFFromURLDto })
  @ApiResponse({
    status: 200,
    description: 'PDF generated successfully from URL',
    headers: {
      'Content-Type': { description: 'application/pdf' },
      'Content-Disposition': { description: 'attachment; filename="webpage.pdf"' }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid URL or parameters' })
  @ApiResponse({ status: 500, description: 'PDF generation failed' })
  async generatePDFFromURL(
    @Body(ValidationPipe) dto: GeneratePDFFromURLDto,
    @Res() response: Response
  ): Promise<void> {
    try {
      const pdfOptions = {
        format: dto.format,
        margin: dto.margin,
        includePageNumbers: dto.includePageNumbers,
        headerTemplate: dto.headerTemplate,
        footerTemplate: dto.footerTemplate,
        scale: dto.scale,
        printBackground: dto.printBackground
      }

      const result = await this.pdfService.generatePDFFromURL(
        dto.url,
        dto.filename,
        pdfOptions
      )

      // Set response headers
      response.setHeader('Content-Type', result.mimeType)
      response.setHeader('Content-Length', result.size.toString())
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${result.filename}"`
      )
      response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      response.setHeader('Pragma', 'no-cache')
      response.setHeader('Expires', '0')

      // Stream the PDF buffer
      response.end(result.buffer)

    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'generatePDFFromURL',
        resource: 'pdf',
        metadata: { url: dto.url, filename: dto.filename }
      })
    }
  }

  /**
   * Health check for PDF service
   */
  @Get('health')
  @ApiOperation({
    summary: 'PDF service health check',
    description: 'Check if the PDF generation service is healthy and browser is connected'
  })
  @ApiResponse({
    status: 200,
    description: 'Service health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'unhealthy'] },
        browserConnected: { type: 'boolean' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  async healthCheck() {
    try {
      const healthStatus = await this.pdfService.healthCheck()
      
      return {
        ...healthStatus,
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'healthCheck',
        resource: 'pdf'
      })
    }
  }
}
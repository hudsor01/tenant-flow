import {
  Body,
  Controller,
  Logger,
  Post,
  UsePipes,
  ValidationPipe
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator'
import { SuccessResponseUtil } from '../shared/utils/success-response.util'

// Contact form DTO
export class ContactFormDto {
  @IsNotEmpty()
  @IsString()
  name!: string

  @IsNotEmpty()
  @IsEmail()
  email!: string

  @IsNotEmpty()
  @IsString()
  subject!: string

  @IsNotEmpty()
  @IsString()
  message!: string

  @IsEnum(['sales', 'support', 'general'])
  type!: 'sales' | 'support' | 'general'
}

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  private readonly logger = new Logger(ContactController.name)

  @Post()
  @ApiOperation({
    summary: 'Submit contact form',
    description: 'Handles contact form submissions from the website'
  })
  @ApiResponse({
    status: 200,
    description: 'Contact form submitted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async submitContactForm(
    @Body() dto: ContactFormDto
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Contact form submission from ${dto.email}`)

    try {
      // Log the contact form submission
      this.logger.log({
        type: dto.type,
        name: dto.name,
        email: dto.email,
        subject: dto.subject,
        message: dto.message,
        timestamp: new Date().toISOString()
      })

      // In production, this would:
      // 1. Send email notification to support team
      // 2. Store in database for tracking
      // 3. Send auto-reply to user
      // 4. Create ticket in support system

      // For now, just log and return success
      return SuccessResponseUtil.withMessage(
        'Thank you for contacting us. We will get back to you within 4 hours.'
      )
    } catch (error: unknown) {
      this.logger.error(
        `Failed to process contact form: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : ''
      )
      throw new Error('Failed to submit contact form')
    }
  }
}
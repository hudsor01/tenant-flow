import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
  InternalServerErrorException
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Logger } from '@nestjs/common'
import type { ContactFormRequest, ContactFormResponse } from '../schemas/contact.schemas'

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly logger: Logger) {
    // Logger context handled automatically via app-level configuration
  }

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
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async submitContactForm(
    @Body() dto: ContactFormRequest
  ): Promise<ContactFormResponse> {
    this.logger.log(
      {
        contactForm: {
          type: dto.type,
          name: dto.name,
          email: dto.email,
          subject: dto.subject,
          messageLength: dto.message.length
        }
      },
      `Contact form submission from ${dto.email}`
    )

    try {
      // In production, this would:
      // 1. Send email notification to support team
      // 2. Store in database for tracking
      // 3. Send auto-reply to user
      // 4. Create ticket in support system

      // For now, just log and return success
      // Express middleware will automatically format this response
      return {
        message: 'Thank you for contacting us. We will get back to you within 4 hours.'
      }
    } catch (error: unknown) {
      this.logger.error(
        {
          error: {
            name: error instanceof Error ? error.constructor.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.stack : undefined
          },
          contactForm: {
            email: dto.email,
            type: dto.type
          }
        },
        'Failed to process contact form submission'
      )
      throw new InternalServerErrorException('Failed to submit contact form')
    }
  }
}
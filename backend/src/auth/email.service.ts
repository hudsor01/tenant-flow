import { Injectable, Logger } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

@Injectable()
export class EmailService {
	private readonly logger = new Logger(EmailService.name)
	private transporter: nodemailer.Transporter

	constructor(private configService: ConfigService) {
		this.transporter = nodemailer.createTransport({
			host: this.configService.get<string>('SMTP_HOST'),
			port: this.configService.get<number>('SMTP_PORT', 587),
			secure: this.configService.get<boolean>('SMTP_SECURE', false),
			auth: {
				user: this.configService.get<string>('SMTP_USER'),
				pass: this.configService.get<string>('SMTP_PASS')
			}
		})
	}

	async sendVerificationEmail(
		email: string,
		firstName: string,
		token: string
	): Promise<void> {
		const verificationUrl = `${this.configService.get<string>('FRONTEND_URL')}/auth/verify-email?token=${token}`

		const mailOptions = {
			from: this.configService.get<string>('SMTP_FROM'),
			to: email,
			subject: 'Verify Your Email Address',
			html: this.getVerificationEmailTemplate(firstName, verificationUrl)
		}

		try {
			await this.transporter.sendMail(mailOptions)
			this.logger.log(`Verification email sent to: ${email}`)
		} catch (error) {
			this.logger.error(
				`Failed to send verification email to ${email}:`,
				error
			)
			throw error
		}
	}

	async sendPasswordResetEmail(
		email: string,
		firstName: string,
		token: string
	): Promise<void> {
		const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/auth/reset-password?token=${token}`

		const mailOptions = {
			from: this.configService.get<string>('SMTP_FROM'),
			to: email,
			subject: 'Reset Your Password',
			html: this.getPasswordResetEmailTemplate(firstName, resetUrl)
		}

		try {
			await this.transporter.sendMail(mailOptions)
			this.logger.log(`Password reset email sent to: ${email}`)
		} catch (error) {
			this.logger.error(
				`Failed to send password reset email to ${email}:`,
				error
			)
			throw error
		}
	}

	private getVerificationEmailTemplate(
		firstName: string,
		verificationUrl: string
	): string {
		return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to TenantFlow, ${firstName}!</h2>
          <p>Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
            Verify Email Address
          </a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account with TenantFlow, please ignore this email.</p>
        </body>
      </html>
    `
	}

	private getPasswordResetEmailTemplate(
		firstName: string,
		resetUrl: string
	): string {
		return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hi ${firstName},</p>
          <p>We received a request to reset your password for your TenantFlow account.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
        </body>
      </html>
    `
	}
}

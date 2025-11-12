import { registerAs } from '@nestjs/config'

export default registerAs('email', () => ({
	resendApiKey: process.env.RESEND_API_KEY,
	supportEmail: process.env.SUPPORT_EMAIL || 'support@tenantflow.app',
	fromAddress: process.env.FROM_EMAIL || 'noreply@tenantflow.app'
}))

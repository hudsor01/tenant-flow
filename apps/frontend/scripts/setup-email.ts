#!/usr/bin/env node

/**
 * Setup Email Configuration Script
 * Configures Supabase to use Resend for email delivery
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_PROJECT_REF =
	process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')[0]?.replace(
		'https://',
		''
	) || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''

async function setupEmailConfiguration() {
	console.log('🚀 Setting up email configuration for TenantFlow\n')

	if (!RESEND_API_KEY) {
		console.error('❌ RESEND_API_KEY not found in .env.local')
		process.exit(1)
	}

	console.log(
		'✅ Resend API key found:',
		RESEND_API_KEY.substring(0, 10) + '...'
	)
	console.log('✅ Supabase project:', SUPABASE_PROJECT_REF)

	console.log('\n📧 Email Configuration Instructions:\n')
	console.log('====================================\n')

	console.log('Option 1: Configure Supabase to use Resend (Recommended)')
	console.log('---------------------------------------------------------')
	console.log(
		'1. Go to: https://supabase.com/dashboard/project/' +
			SUPABASE_PROJECT_REF +
			'/auth/providers'
	)
	console.log('2. Scroll down to "Email Settings"')
	console.log('3. Click "Enable Custom SMTP"')
	console.log('4. Enter these settings:\n')
	console.log('   Host: smtp.resend.com')
	console.log('   Port: 465')
	console.log('   Username: resend')
	console.log('   Password:', RESEND_API_KEY)
	console.log('   Sender email: noreply@tenantflow.app')
	console.log('   Sender name: TenantFlow')
	console.log('   Rate limit: 1000 (or higher)')
	console.log('\n5. Click "Save"\n')

	console.log('\nOption 2: Disable email confirmation for development')
	console.log('-----------------------------------------------------')
	console.log(
		'1. Go to: https://supabase.com/dashboard/project/' +
			SUPABASE_PROJECT_REF +
			'/auth/providers'
	)
	console.log('2. Under "Email", toggle OFF "Confirm email"')
	console.log('3. Click "Save"')
	console.log('⚠️  Remember to re-enable for production!\n')

	console.log('\nOption 3: Update email templates')
	console.log('---------------------------------')
	console.log(
		'1. Go to: https://supabase.com/dashboard/project/' +
			SUPABASE_PROJECT_REF +
			'/auth/templates'
	)
	console.log('2. Update the "Confirm signup" template')
	console.log(
		'3. Make sure it contains: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email\n'
	)

	console.log('\n📝 Current Status:')
	console.log('------------------')
	console.log('- Resend API Key: ✅ Configured')
	console.log('- Supabase Default Email: Limited to 4 emails/hour')
	console.log('- Custom SMTP: ❌ Not configured (follow instructions above)')

	console.log('\n🎯 Next Steps:')
	console.log('--------------')
	console.log('1. Configure custom SMTP (removes rate limits)')
	console.log('2. Test signup flow')
	console.log(
		'3. Monitor email delivery in Resend dashboard: https://resend.com/emails'
	)

	// Test Resend connection
	console.log('\n🧪 Testing Resend API...')
	try {
		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${RESEND_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: 'TenantFlow <onboarding@resend.dev>', // Use Resend's test domain
				to: ['delivered@resend.dev'], // Resend's test email
				subject: 'TenantFlow Email Test',
				html: '<p>Testing email configuration for TenantFlow</p>'
			})
		})

		if (response.ok) {
			const data = await response.json()
			console.log('✅ Resend API test successful! Email ID:', data.id)
			console.log('   View in dashboard: https://resend.com/emails')
		} else {
			const error = await response.text()
			console.error('❌ Resend API test failed:', error)
		}
	} catch (error) {
		console.error('❌ Failed to test Resend:', error)
	}

	console.log(
		'\n✨ Setup complete! Follow the instructions above to enable email delivery.'
	)
}

// Run the setup
setupEmailConfiguration().catch(console.error)

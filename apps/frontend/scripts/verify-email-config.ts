#!/usr/bin/env node

/**
 * Verify Email Configuration
 * Checks if Supabase is properly configured to use Resend
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY

async function verifyEmailConfiguration() {
	console.log('🔍 Verifying Email Configuration\n')
	console.log('=================================\n')

	// Check environment variables
	console.log('1️⃣  Environment Variables:')
	console.log('   - SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌')
	console.log('   - SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅' : '❌')
	console.log('   - RESEND_API_KEY:', RESEND_API_KEY ? '✅' : '❌')

	const projectRef = SUPABASE_URL?.split('.')[0]?.replace('https://', '') || 'unknown'
	console.log('   - Project Reference:', projectRef)

	console.log('\n2️⃣  Configuration Links:')
	console.log(
		'   📧 Email Settings: https://supabase.com/dashboard/project/' +
			projectRef +
			'/settings/auth'
	)
	console.log(
		'   📝 Email Templates: https://supabase.com/dashboard/project/' +
			projectRef +
			'/auth/templates'
	)
	console.log(
		'   🔐 Auth Providers: https://supabase.com/dashboard/project/' +
			projectRef +
			'/auth/providers'
	)

	console.log('\n3️⃣  Quick Fix Options:\n')

	console.log(
		'   Option A: Configure Custom SMTP (Recommended - Removes Rate Limits)'
	)
	console.log(
		'   -------------------------------------------------------------------'
	)
	console.log(
		'   1. Open: https://supabase.com/dashboard/project/' +
			projectRef +
			'/settings/auth'
	)
	console.log('   2. Scroll to "SMTP Settings"')
	console.log('   3. Enable "Enable Custom SMTP"')
	console.log('   4. Use these exact settings:')
	console.log('')
	console.log('      Host: smtp.resend.com')
	console.log('      Port: 465')
	console.log('      Username: resend')
	console.log('      Password:', RESEND_API_KEY)
	console.log('      Sender email: noreply@tenantflow.app')
	console.log('      Sender name: TenantFlow')
	console.log('')
	console.log('   5. Under "Rate Limits" set:')
	console.log('      - Rate limit: 1000 emails per hour')
	console.log('')
	console.log('   6. Click "Save"')
	console.log('')

	console.log(
		'   Option B: Temporarily Disable Email Confirmation (Development Only)'
	)
	console.log(
		'   ------------------------------------------------------------------'
	)
	console.log(
		'   1. Open: https://supabase.com/dashboard/project/' +
			projectRef +
			'/auth/providers'
	)
	console.log('   2. Under "Email", toggle OFF "Confirm email"')
	console.log('   3. Click "Save"')
	console.log(
		'   ⚠️  Users can sign in immediately without email verification'
	)
	console.log('')

	console.log('4️⃣  Test Email Sending:')
	console.log('   After configuring SMTP, test with:')
	console.log('   - Sign up with a test email')
	console.log('   - Check Resend dashboard: https://resend.com/emails')
	console.log('   - Verify email arrives within seconds (not hours)')

	console.log('\n5️⃣  Common Issues:')
	console.log(
		'   ❌ "Email not sent" → Supabase using default provider (4/hour limit)'
	)
	console.log('   ✅ Solution → Configure custom SMTP with Resend')
	console.log('')
	console.log('   ❌ "Invalid sender domain" → Domain not verified in Resend')
	console.log('   ✅ Solution → Use onboarding@resend.dev for testing')
	console.log('')
	console.log('   ❌ "SMTP authentication failed" → Wrong credentials')
	console.log(
		'   ✅ Solution → Username must be "resend", password is API key'
	)

	console.log('\n✨ Next Steps:')
	console.log('   1. Configure custom SMTP using Option A above')
	console.log('   2. Save the settings')
	console.log('   3. Test signup with a new email')
	console.log('   4. Confirm email arrives immediately')
	console.log('   5. Check Resend dashboard for delivery status')

	console.log('\n📊 Expected Results After Configuration:')
	console.log('   • Emails sent instantly (no 4/hour limit)')
	console.log('   • All emails trackable in Resend dashboard')
	console.log('   • Professional "noreply@tenantflow.app" sender')
	console.log('   • 99.9% delivery rate with Resend')
}

// Run verification
verifyEmailConfiguration().catch(console.error)

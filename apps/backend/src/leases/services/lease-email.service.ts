import { Injectable } from '@nestjs/common'

// Security utility for sanitizing email content
const sanitizeEmailContent = (content: string): string => {
    if (!content) return ''
    // Remove potential XSS and injection attempts
    return content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim()
        .substring(0, 1000) // Limit length
}

@Injectable()
export class LeaseEmailService {
    private isEmailServiceConfigured(): boolean {
        const supabaseUrl = process.env.SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        
        // Validate that service key is not empty and has expected format
        return !!(
            supabaseUrl && 
            supabaseKey && 
            supabaseKey.length > 20 && 
            supabaseKey.startsWith('eyJ')
        )
    }

    async sendLeaseNotification(
        to: string,
        subject: string,
        content: string,
        leaseId: string
    ): Promise<{ success: boolean; error?: string }> {
        if (!this.isEmailServiceConfigured()) {
            return {
                success: false,
                error: 'Email service not configured'
            }
        }

        try {
            const sanitizedContent = sanitizeEmailContent(content)
            
            // TODO: Implement actual email sending logic here
            // This would integrate with your email service (Supabase, SendGrid, etc.)
            
            return { success: true }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    async sendLeaseReminder(
        tenantEmail: string,
        tenantName: string,
        leaseId: string,
        daysUntilExpiry: number
    ): Promise<{ success: boolean; error?: string }> {
        const subject = `Lease Expiration Reminder - ${daysUntilExpiry} days remaining`
        const content = `
            Dear ${tenantName},
            
            This is a friendly reminder that your lease (ID: ${leaseId}) 
            will expire in ${daysUntilExpiry} days.
            
            Please contact your landlord to discuss renewal options.
            
            Best regards,
            TenantFlow Property Management
        `

        return this.sendLeaseNotification(tenantEmail, subject, content, leaseId)
    }

    async sendLeaseStatusUpdate(
        tenantEmail: string,
        tenantName: string,
        leaseId: string,
        newStatus: string
    ): Promise<{ success: boolean; error?: string }> {
        const subject = `Lease Status Update - ${newStatus}`
        const content = `
            Dear ${tenantName},
            
            Your lease (ID: ${leaseId}) status has been updated to: ${newStatus}
            
            If you have any questions, please contact your landlord.
            
            Best regards,
            TenantFlow Property Management
        `

        return this.sendLeaseNotification(tenantEmail, subject, content, leaseId)
    }
}
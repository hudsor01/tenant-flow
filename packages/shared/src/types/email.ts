/**
 * Email-related types shared between frontend and backend
 */

/**
 * Options for sending an email
 */
export interface EmailOptions {
    to: string
    subject: string
    html: string
    text?: string
    from?: string
}

/**
 * Response from email sending service
 */
export interface SendEmailResponse {
    success: boolean
    messageId?: string
    error?: string
}

/**
 * Email template data for various notifications
 */
export interface EmailTemplateData {
    recipientName?: string
    subject: string
    preheader?: string
    content: string
    actionUrl?: string
    actionText?: string
    footerText?: string
}
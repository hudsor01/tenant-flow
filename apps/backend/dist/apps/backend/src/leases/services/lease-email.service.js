"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaseEmailService = void 0;
const common_1 = require("@nestjs/common");
const sanitizeEmailContent = (content) => {
    if (!content)
        return '';
    return content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim()
        .substring(0, 1000);
};
let LeaseEmailService = class LeaseEmailService {
    isEmailServiceConfigured() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        return !!(supabaseUrl &&
            supabaseKey &&
            supabaseKey.length > 20 &&
            supabaseKey.startsWith('eyJ'));
    }
    async sendLeaseNotification(_to, _subject, content, _leaseId) {
        if (!this.isEmailServiceConfigured()) {
            return {
                success: false,
                error: 'Email service not configured'
            };
        }
        try {
            sanitizeEmailContent(content);
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async sendLeaseReminder(tenantEmail, tenantName, _leaseId, daysUntilExpiry) {
        const subject = `Lease Expiration Reminder - ${daysUntilExpiry} days remaining`;
        const content = `
            Dear ${tenantName},
            
            This is a friendly reminder that your lease (ID: ${_leaseId}) 
            will expire in ${daysUntilExpiry} days.
            
            Please contact your landlord to discuss renewal options.
            
            Best regards,
            TenantFlow Property Management
        `;
        return this.sendLeaseNotification(tenantEmail, subject, content, _leaseId);
    }
    async sendLeaseStatusUpdate(tenantEmail, tenantName, _leaseId, newStatus) {
        const subject = `Lease Status Update - ${newStatus}`;
        const content = `
            Dear ${tenantName},
            
            Your lease (ID: ${_leaseId}) status has been updated to: ${newStatus}
            
            If you have any questions, please contact your landlord.
            
            Best regards,
            TenantFlow Property Management
        `;
        return this.sendLeaseNotification(tenantEmail, subject, content, _leaseId);
    }
};
exports.LeaseEmailService = LeaseEmailService;
exports.LeaseEmailService = LeaseEmailService = __decorate([
    (0, common_1.Injectable)()
], LeaseEmailService);

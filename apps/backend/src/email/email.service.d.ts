import { ConfigService } from '@nestjs/config';
interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
}
interface SendEmailResponse {
    success: boolean;
    messageId?: string;
    error?: string;
}
export declare class EmailService {
    private configService;
    private readonly logger;
    private readonly resendApiKey;
    private readonly fromEmail;
    constructor(configService: ConfigService);
    private isConfigured;
    sendEmail(options: EmailOptions): Promise<SendEmailResponse>;
    sendWelcomeEmail(email: string, name: string): Promise<SendEmailResponse>;
    sendPasswordResetEmail(email: string, resetUrl: string): Promise<SendEmailResponse>;
}
export {};
//# sourceMappingURL=email.service.d.ts.map
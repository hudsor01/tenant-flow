/**
 * Simple HTML Email Templates
 * Production-ready email templates that don't depend on React Email
 */

export interface TenantInvitationData {
	tenantName: string
	propertyName: string
	propertyAddress: string
	landlordName: string
	invitationUrl: string
	expiresAt: string
}

export function createTenantInvitationHTML(data: TenantInvitationData): string {
	const {
		tenantName,
		propertyName,
		propertyAddress,
		landlordName,
		invitationUrl,
		expiresAt
	} = data

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tenant Invitation - TenantFlow</title>
  <style>
    /* Reset styles */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    /* Email-safe styles */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f8fafc;
      margin: 0;
      padding: 20px;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }
    
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 40px 20px;
      text-align: center;
    }
    
    .header h1 {
      color: #ffffff;
      font-size: 32px;
      font-weight: bold;
      margin: 0 0 8px 0;
    }
    
    .header p {
      color: #a7f3d0;
      font-size: 16px;
      margin: 0;
    }
    
    .content {
      padding: 40px 30px;
    }
    
    .welcome-title {
      color: #1f2937;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 24px 0;
    }
    
    .intro-text {
      color: #4b5563;
      font-size: 16px;
      margin: 0 0 24px 0;
    }
    
    .features-list {
      color: #4b5563;
      font-size: 16px;
      margin: 0 0 32px 20px;
    }
    
    .features-list li {
      margin: 8px 0;
    }
    
    .cta-container {
      text-align: center;
      margin: 32px 0;
    }
    
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s ease;
    }
    
    .cta-button:hover {
      transform: translateY(-2px);
    }
    
    .expiry-text {
      color: #6b7280;
      font-size: 14px;
      margin: 32px 0 0 0;
    }
    
    .footer-text {
      color: #9ca3af;
      font-size: 12px;
      margin: 24px 0 0 0;
    }
    
    .manual-link {
      color: #10b981;
      word-break: break-all;
      font-size: 14px;
      margin: 16px 0;
    }
    
    .footer {
      background-color: #f9fafb;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    
    /* Mobile responsive */
    @media (max-width: 600px) {
      body { padding: 10px; }
      .content { padding: 30px 20px; }
      .header { padding: 30px 20px; }
      .header h1 { font-size: 28px; }
      .welcome-title { font-size: 22px; }
      .cta-button { padding: 14px 24px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>TenantFlow</h1>
      <p>Property Management Made Simple</p>
    </div>

    <!-- Main Content -->
    <div class="content">
      <h2 class="welcome-title">Welcome to Your Tenant Portal</h2>
      
      <p class="intro-text">
        Hi <strong>${tenantName}</strong>,
      </p>
      
      <p class="intro-text">
        ${landlordName} has invited you to access your tenant portal for 
        <strong>${propertyName}</strong> located at ${propertyAddress}.
      </p>
      
      <p class="intro-text">
        Through your tenant portal, you'll be able to:
      </p>
      
      <ul class="features-list">
        <li>✓ View your lease agreement and important documents</li>
        <li>✓ Track payment history and upcoming rent payments</li>
        <li>✓ Submit maintenance requests online</li>
        <li>✓ Receive important notifications from your landlord</li>
        <li>✓ Update your contact information</li>
        <li>✓ Access 24/7 tenant support</li>
      </ul>
      
      <div class="cta-container">
        <a href="${invitationUrl}" class="cta-button">
          Accept Invitation & Access Portal
        </a>
      </div>
      
      <p class="expiry-text">
        <strong>Important:</strong> This invitation will expire on 
        <strong>${new Date(expiresAt).toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})}</strong>.
        If you don't accept by then, please contact ${landlordName} for a new invitation.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
      
      <p class="footer-text">
        If you have any questions about this invitation, please contact ${landlordName} directly.
      </p>
      
      <p class="footer-text">
        If the button above doesn't work, you can copy and paste this link into your browser:
      </p>
      
      <p class="manual-link">
        <a href="${invitationUrl}" style="color: #10b981; text-decoration: underline;">
          ${invitationUrl}
        </a>
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        This email was sent by TenantFlow on behalf of ${landlordName}.
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">
        © ${new Date().getFullYear()} TenantFlow. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`
}

export function createTenantInvitationText(data: TenantInvitationData): string {
	const {
		tenantName,
		propertyName,
		propertyAddress,
		landlordName,
		invitationUrl,
		expiresAt
	} = data

	return `TenantFlow - Tenant Portal Invitation

Hi ${tenantName},

${landlordName} has invited you to access your tenant portal for ${propertyName} located at ${propertyAddress}.

Through your tenant portal, you'll be able to:
• View your lease agreement and important documents
• Track payment history and upcoming rent payments  
• Submit maintenance requests online
• Receive important notifications from your landlord
• Update your contact information
• Access 24/7 tenant support

To accept your invitation and access your portal, visit:
${invitationUrl}

This invitation will expire on ${new Date(expiresAt).toLocaleDateString(
		'en-US',
		{
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		}
	)}. If you don't accept by then, please contact ${landlordName} for a new invitation.

If you have any questions about this invitation, please contact ${landlordName} directly.

---
This email was sent by TenantFlow on behalf of ${landlordName}.
© ${new Date().getFullYear()} TenantFlow. All rights reserved.`
}

// Test function to verify template rendering
export function testEmailTemplate(): { html: string; text: string } {
	const testData: TenantInvitationData = {
		tenantName: 'John Doe',
		propertyName: 'Sunset Apartments Unit 4B',
		propertyAddress: '123 Main Street, Springfield, IL 62701',
		landlordName: 'Jane Smith',
		invitationUrl:
			'https://app.tenantflow.com/tenant/accept-invitation?token=abc123',
		expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
	}

	return {
		html: createTenantInvitationHTML(testData),
		text: createTenantInvitationText(testData)
	}
}

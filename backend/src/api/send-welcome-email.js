// Welcome Email Sequence for Invoice Generator Lead Magnet
// Integrates with existing React Email system

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, firstName, invoiceNumber, total } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Send welcome email with invoice attachment info
    const emailData = {
      from: `TenantFlow Invoice Generator <invoices@${process.env.DOMAIN || 'tenantflow.app'}>`,
      to: email,
      subject: `Your Invoice ${invoiceNumber} is Ready!`,
      html: generateWelcomeEmailHtml({
        firstName: firstName || 'there',
        invoiceNumber,
        total,
      }),
    };

    const emailResult = await resend.emails.send(emailData);

    if (emailResult.error) {
      console.error('Failed to send welcome email:', emailResult.error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    // Mark email as sent in lead capture record
    await supabase
      .from('InvoiceLeadCapture')
      .update({ emailSent: true })
      .eq('email', email);

    // Schedule follow-up emails (could integrate with existing email automation)
    await scheduleFollowUpEmails(email, firstName);

    return res.status(200).json({
      success: true,
      emailId: emailResult.data.id,
    });
  } catch (error) {
    console.error('Welcome email error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

function generateWelcomeEmailHtml({ firstName, invoiceNumber, total }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Invoice is Ready!</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: white;
          padding: 30px;
          border: 1px solid #e1e5e9;
          border-top: none;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px;
          text-align: center;
          border: 1px solid #e1e5e9;
          border-top: none;
          border-radius: 0 0 8px 8px;
          font-size: 14px;
          color: #6c757d;
        }
        .cta-button {
          display: inline-block;
          background: #28a745;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .invoice-summary {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .tip-box {
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
          padding: 15px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Your Invoice is Ready!</h1>
        <p>Professional invoicing made simple</p>
      </div>
      
      <div class="content">
        <p>Hi ${firstName},</p>
        
        <p>Great news! Your professional invoice has been generated successfully and is ready for download.</p>
        
        <div class="invoice-summary">
          <h3>Invoice Summary</h3>
          <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p><strong>Total Amount:</strong> $${total?.toFixed(2) || '0.00'}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <p>Your invoice has been created with professional formatting and is ready to send to your client. The PDF should have downloaded automatically, but if you need another copy, you can always generate a new one using our tool.</p>
        
        <div class="tip-box">
          <h4>💡 Pro Tip:</h4>
          <p>Want to remove the watermark and unlock unlimited invoices? Upgrade to Pro for just $9.99/month and get access to custom branding, unlimited invoices, and priority support.</p>
          <a href="https://tenantflow.app/pricing" class="cta-button">Upgrade to Pro →</a>
        </div>
        
        <h3>What's Next?</h3>
        <ul>
          <li>📧 Send your invoice to your client</li>
          <li>📊 Keep track of payment status</li>
          <li>🔄 Create more invoices as needed</li>
          <li>⭐ Bookmark our tool for future use</li>
        </ul>
        
        <p>Over the next few days, I'll be sending you some helpful tips on:</p>
        <ul>
          <li>How to get paid faster</li>
          <li>Professional invoicing best practices</li>
          <li>Growing your business with better billing</li>
          <li>Exclusive templates and resources</li>
        </ul>
        
        <p>Thanks for choosing TenantFlow's Invoice Generator!</p>
        
        <p>Best regards,<br>
        The TenantFlow Team</p>
        
        <p><a href="https://tenantflow.app/invoice-generator">Create Another Invoice →</a></p>
      </div>
      
      <div class="footer">
        <p>You're receiving this email because you generated an invoice using TenantFlow's Invoice Generator.</p>
        <p>Don't want these helpful tips? <a href="{{unsubscribe_url}}">Unsubscribe here</a></p>
        <p>TenantFlow • Making property management simple</p>
      </div>
    </body>
    </html>
  `;
}

async function scheduleFollowUpEmails(email, firstName) {
  // This could integrate with your existing email automation system
  // For now, we'll just log the intent
  console.log(`Scheduling follow-up emails for ${email}`);

  // You could integrate with:
  // - Your existing email service
  // - A scheduling service like Vercel Cron
  // - Supabase Edge Functions with pg_cron
  // - External services like ConvertKit, Mailchimp, etc.

  return true;
}

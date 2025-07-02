// Customer Invoice Generation API
// Handles lead magnet invoice generation with email capture

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { invoice, emailCapture, userTier = 'FREE_TIER' } = req.body;

    // Validate required fields
    if (!invoice || !invoice.businessName || !invoice.clientName) {
      return res.status(400).json({ 
        error: 'Missing required invoice fields' 
      });
    }

    // Check usage limits for free tier
    if (userTier === 'FREE_TIER') {
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const { count } = await supabase
        .from('CustomerInvoice')
        .select('id', { count: 'exact' })
        .eq('ipAddress', ip)
        .gte('createdAt', startOfMonth.toISOString());

      if (count >= 5) {
        return res.status(429).json({ 
          error: 'Monthly invoice limit reached. Please upgrade to Pro.',
          upgrade: true 
        });
      }
    }

    // Generate unique invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Calculate totals
    const subtotal = invoice.items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);
    
    const taxAmount = subtotal * ((invoice.taxRate || 0) / 100);
    const total = subtotal + taxAmount;

    // Create invoice in database
    const { data: savedInvoice, error: saveError } = await supabase
      .from('CustomerInvoice')
      .insert({
        invoiceNumber,
        businessName: invoice.businessName,
        businessEmail: invoice.businessEmail,
        businessAddress: invoice.businessAddress,
        businessCity: invoice.businessCity,
        businessState: invoice.businessState,
        businessZip: invoice.businessZip,
        businessPhone: invoice.businessPhone,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        clientAddress: invoice.clientAddress,
        clientCity: invoice.clientCity,
        clientState: invoice.clientState,
        clientZip: invoice.clientZip,
        issueDate: new Date().toISOString(),
        dueDate: invoice.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        subtotal,
        taxRate: invoice.taxRate || 0,
        taxAmount,
        total,
        notes: invoice.notes,
        terms: invoice.terms,
        emailCaptured: emailCapture?.email,
        isProVersion: userTier === 'PRO_TIER',
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: 'DRAFT',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving invoice:', saveError);
      return res.status(500).json({ error: 'Failed to save invoice' });
    }

    // Save invoice items
    const itemsToSave = invoice.items.map(item => ({
      invoiceId: savedInvoice.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
    }));

    const { error: itemsError } = await supabase
      .from('CustomerInvoiceItem')
      .insert(itemsToSave);

    if (itemsError) {
      console.error('Error saving invoice items:', itemsError);
      return res.status(500).json({ error: 'Failed to save invoice items' });
    }

    // Handle email capture for lead generation
    if (emailCapture?.email) {
      await supabase
        .from('InvoiceLeadCapture')
        .insert({
          email: emailCapture.email,
          invoiceId: savedInvoice.id,
          firstName: emailCapture.firstName,
          lastName: emailCapture.lastName,
          company: emailCapture.company,
          source: emailCapture.source || 'invoice-generator',
          medium: 'organic',
        });

      // Send welcome email sequence (integrate with existing email system)
      try {
        await fetch(`${process.env.VERCEL_URL || ''}/api/send-welcome-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailCapture.email,
            firstName: emailCapture.firstName,
            invoiceNumber,
            total,
          }),
        });
      } catch (emailError) {
        console.warn('Failed to send welcome email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Generate download URL for PDF
    const downloadUrl = `/api/customer-invoices/${savedInvoice.id}/pdf`;

    // Track analytics
    if (process.env.POSTHOG_KEY) {
      // Could integrate with PostHog here
    }

    return res.status(200).json({
      success: true,
      id: savedInvoice.id,
      invoiceNumber: savedInvoice.invoiceNumber,
      downloadUrl,
      total,
      status: savedInvoice.status,
    });

  } catch (error) {
    console.error('Invoice generation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

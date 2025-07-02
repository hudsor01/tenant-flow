// PDF Generation API for Customer Invoices
// Generates professional PDFs with lead magnet features

import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { invoiceId } = req.query;

    if (!invoiceId) {
      return res.status(400).json({ error: 'Invoice ID required' });
    }

    // Fetch invoice with items
    const { data: invoice, error: invoiceError } = await supabase
      .from('CustomerInvoice')
      .select(`
        *,
        items:CustomerInvoiceItem(*)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Generate PDF
    const pdfBuffer = generateInvoicePDF(invoice);

    // Update download count
    await supabase
      .from('CustomerInvoice')
      .update({ 
        downloadCount: (invoice.downloadCount || 0) + 1,
        status: 'VIEWED' 
      })
      .eq('id', invoiceId);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);

  } catch (error) {
    console.error('PDF generation error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate PDF',
      message: error.message 
    });
  }
}

function generateInvoicePDF(invoice) {
  const doc = new jsPDF();
  
  // Set up fonts and colors
  doc.setFont('helvetica');
  const primaryColor = [44, 62, 80]; // Dark blue
  const accentColor = [52, 152, 219]; // Blue
  const grayColor = [149, 165, 166]; // Gray
  
  // Header with logo space
  doc.setFontSize(28);
  doc.setTextColor(...primaryColor);
  doc.text('INVOICE', 20, 30);
  
  // Invoice details box
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  
  // Right side - Invoice info
  const rightCol = 140;
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, rightCol, 30);
  doc.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, rightCol, 40);
  doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, rightCol, 50);
  
  // Status badge
  if (invoice.status === 'PAID') {
    doc.setFillColor(46, 204, 113);
  } else if (invoice.status === 'OVERDUE') {
    doc.setFillColor(231, 76, 60);
  } else {
    doc.setFillColor(...grayColor);
  }
  doc.rect(rightCol, 55, 30, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(invoice.status, rightCol + 2, 61);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  
  // From section
  let yPos = 80;
  doc.setFontSize(12);
  doc.setTextColor(...accentColor);
  doc.text('From:', 20, yPos);
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  yPos += 10;
  doc.text(invoice.businessName, 20, yPos);
  
  if (invoice.businessEmail) {
    yPos += 8;
    doc.text(invoice.businessEmail, 20, yPos);
  }
  
  if (invoice.businessAddress) {
    yPos += 8;
    doc.text(invoice.businessAddress, 20, yPos);
    
    if (invoice.businessCity && invoice.businessState) {
      yPos += 8;
      doc.text(`${invoice.businessCity}, ${invoice.businessState} ${invoice.businessZip || ''}`, 20, yPos);
    }
  }
  
  if (invoice.businessPhone) {
    yPos += 8;
    doc.text(invoice.businessPhone, 20, yPos);
  }
  
  // To section
  yPos = 80;
  doc.setFontSize(12);
  doc.setTextColor(...accentColor);
  doc.text('To:', rightCol, yPos);
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  yPos += 10;
  doc.text(invoice.clientName, rightCol, yPos);
  
  if (invoice.clientEmail) {
    yPos += 8;
    doc.text(invoice.clientEmail, rightCol, yPos);
  }
  
  if (invoice.clientAddress) {
    yPos += 8;
    doc.text(invoice.clientAddress, rightCol, yPos);
    
    if (invoice.clientCity && invoice.clientState) {
      yPos += 8;
      doc.text(`${invoice.clientCity}, ${invoice.clientState} ${invoice.clientZip || ''}`, rightCol, yPos);
    }
  }
  
  // Line items table
  yPos = 140;
  
  // Table header
  doc.setFillColor(...accentColor);
  doc.rect(20, yPos - 5, 170, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('Description', 25, yPos);
  doc.text('Qty', 130, yPos);
  doc.text('Rate', 150, yPos);
  doc.text('Amount', 170, yPos);
  
  // Table rows
  doc.setTextColor(0, 0, 0);
  yPos += 15;
  
  invoice.items.forEach((item, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(20, yPos - 5, 170, 10, 'F');
    }
    
    doc.text(item.description, 25, yPos);
    doc.text(item.quantity.toString(), 130, yPos);
    doc.text(`$${item.unitPrice.toFixed(2)}`, 150, yPos);
    doc.text(`$${item.total.toFixed(2)}`, 170, yPos);
    
    yPos += 12;
  });
  
  // Totals section
  yPos += 10;
  const totalsX = 140;
  
  // Subtotal
  doc.text('Subtotal:', totalsX, yPos);
  doc.text(`$${invoice.subtotal.toFixed(2)}`, 170, yPos);
  
  // Tax
  if (invoice.taxRate > 0) {
    yPos += 10;
    doc.text(`Tax (${invoice.taxRate}%):`, totalsX, yPos);
    doc.text(`$${invoice.taxAmount.toFixed(2)}`, 170, yPos);
  }
  
  // Total
  yPos += 15;
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('Total:', totalsX, yPos);
  doc.text(`$${invoice.total.toFixed(2)}`, 170, yPos);
  
  // Notes section
  if (invoice.notes) {
    yPos += 25;
    doc.setFontSize(12);
    doc.setTextColor(...accentColor);
    doc.text('Notes:', 20, yPos);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    yPos += 10;
    
    const splitNotes = doc.splitTextToSize(invoice.notes, 170);
    doc.text(splitNotes, 20, yPos);
    yPos += splitNotes.length * 5;
  }
  
  // Terms section
  if (invoice.terms) {
    yPos += 10;
    doc.setFontSize(12);
    doc.setTextColor(...accentColor);
    doc.text('Terms & Conditions:', 20, yPos);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    yPos += 10;
    
    const splitTerms = doc.splitTextToSize(invoice.terms, 170);
    doc.text(splitTerms, 20, yPos);
  }
  
  // Lead magnet footer for free tier
  if (!invoice.isProVersion) {
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text('Created with TenantFlow Invoice Generator - Remove this watermark with Pro', 20, 280);
    doc.text('Upgrade at tenantflow.app/pricing', 20, 285);
  }
  
  return doc.output('arraybuffer');
}

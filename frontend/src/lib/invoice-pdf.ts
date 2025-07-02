import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { CustomerInvoice, Invoice } from '@/types/invoice';

// Enhanced PDF generation with lead magnet features
export const generateInvoicePDF = (invoice: CustomerInvoice | Invoice): Blob => {
  const doc = new jsPDF();
  
  // Detect invoice type and normalize data
  const normalizedInvoice = normalizeInvoiceData(invoice);
  
  // Set up styling
  doc.setFont('helvetica');
  const primaryColor: [number, number, number] = [44, 62, 80]; // Dark blue
  const accentColor: [number, number, number] = [52, 152, 219]; // Blue
  const grayColor: [number, number, number] = [149, 165, 166]; // Gray
  const greenColor: [number, number, number] = [46, 204, 113]; // Success green
  
  // Header
  doc.setFontSize(32);
  doc.setTextColor(...primaryColor);
  doc.text('INVOICE', 20, 35);
  
  // Add professional accent line
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(2);
  doc.line(20, 40, 190, 40);
  
  // Invoice details in styled box
  const rightCol = 130;
  
  // Invoice info box background
  doc.setFillColor(248, 249, 250);
  doc.rect(rightCol - 5, 20, 65, 35, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`Invoice #: ${normalizedInvoice.invoiceNumber}`, rightCol, 30);
  doc.text(`Issue Date: ${format(normalizedInvoice.issueDate, 'MMM dd, yyyy')}`, rightCol, 38);
  doc.text(`Due Date: ${format(normalizedInvoice.dueDate, 'MMM dd, yyyy')}`, rightCol, 46);
  
  // Status badge (if available)
  if ('status' in invoice && invoice.status) {
    let badgeColor: [number, number, number] = grayColor;
    if (invoice.status === 'PAID') badgeColor = greenColor;
    if (invoice.status === 'OVERDUE') badgeColor = [231, 76, 60];
    
    doc.setFillColor(...badgeColor);
    doc.rect(rightCol, 50, 25, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(invoice.status, rightCol + 2, 54);
    doc.setTextColor(0, 0, 0);
  }
  
  // Business information (From)
  let yPos = 70;
  doc.setFontSize(14);
  doc.setTextColor(...accentColor);
  doc.text('From:', 20, yPos);
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text(normalizedInvoice.businessName, 20, yPos);
  doc.setFont('helvetica', 'normal');
  
  if (normalizedInvoice.businessEmail) {
    yPos += 7;
    doc.text(normalizedInvoice.businessEmail, 20, yPos);
  }
  
  if (normalizedInvoice.businessAddress) {
    yPos += 7;
    doc.text(normalizedInvoice.businessAddress, 20, yPos);
    
    const cityStateZip = [
      normalizedInvoice.businessCity,
      normalizedInvoice.businessState,
      normalizedInvoice.businessZip
    ].filter(Boolean).join(' ');
    
    if (cityStateZip) {
      yPos += 7;
      doc.text(cityStateZip, 20, yPos);
    }
  }
  
  if (normalizedInvoice.businessPhone) {
    yPos += 7;
    doc.text(normalizedInvoice.businessPhone, 20, yPos);
  }
  
  // Client information (To)
  yPos = 70;
  doc.setFontSize(14);
  doc.setTextColor(...accentColor);
  doc.text('To:', rightCol, yPos);
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text(normalizedInvoice.clientName, rightCol, yPos);
  doc.setFont('helvetica', 'normal');
  
  if (normalizedInvoice.clientEmail) {
    yPos += 7;
    doc.text(normalizedInvoice.clientEmail, rightCol, yPos);
  }
  
  if (normalizedInvoice.clientAddress) {
    yPos += 7;
    doc.text(normalizedInvoice.clientAddress, rightCol, yPos);
    
    const clientCityStateZip = [
      normalizedInvoice.clientCity,
      normalizedInvoice.clientState,
      normalizedInvoice.clientZip
    ].filter(Boolean).join(' ');
    
    if (clientCityStateZip) {
      yPos += 7;
      doc.text(clientCityStateZip, rightCol, yPos);
    }
  }
  
  // Line items table
  yPos = 140;
  
  // Table header with professional styling
  doc.setFillColor(...accentColor);
  doc.rect(20, yPos - 8, 170, 12, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 25, yPos - 2);
  doc.text('Qty', 120, yPos - 2);
  doc.text('Rate', 140, yPos - 2);
  doc.text('Amount', 165, yPos - 2);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  yPos += 10;
  
  // Table rows with alternating background
  normalizedInvoice.items.forEach((item, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(248, 249, 250);
      doc.rect(20, yPos - 6, 170, 10, 'F');
    }
    
    // Wrap long descriptions
    const maxDescWidth = 90;
    const splitDesc = doc.splitTextToSize(item.description, maxDescWidth);
    const descHeight = splitDesc.length * 4;
    
    doc.text(splitDesc, 25, yPos);
    doc.text(item.quantity.toString(), 120, yPos);
    doc.text(`$${item.unitPrice?.toFixed(2) || '0.00'}`, 140, yPos);
    doc.text(`$${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}`, 165, yPos);
    
    yPos += Math.max(10, descHeight + 2);
  });
  
  // Totals section with professional styling
  yPos += 15;
  const totalsX = 120;
  
  // Background for totals
  doc.setFillColor(248, 249, 250);
  doc.rect(totalsX - 5, yPos - 5, 75, 40, 'F');
  
  // Subtotal
  doc.setFontSize(10);
  doc.text('Subtotal:', totalsX, yPos);
  doc.text(`$${normalizedInvoice.subtotal?.toFixed(2) || '0.00'}`, 165, yPos);
  
  // Tax (if applicable)
  if ((normalizedInvoice.taxRate || 0) > 0) {
    yPos += 8;
    doc.text(`Tax (${normalizedInvoice.taxRate}%):`, totalsX, yPos);
    doc.text(`$${normalizedInvoice.taxAmount?.toFixed(2) || '0.00'}`, 165, yPos);
  }
  
  // Total with emphasis
  yPos += 12;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('TOTAL:', totalsX, yPos);
  doc.text(`$${normalizedInvoice.total?.toFixed(2) || '0.00'}`, 165, yPos);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  // Notes section
  if (normalizedInvoice.notes) {
    yPos += 25;
    doc.setFontSize(12);
    doc.setTextColor(...accentColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 20, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    yPos += 8;
    
    const splitNotes = doc.splitTextToSize(normalizedInvoice.notes, 170);
    doc.text(splitNotes, 20, yPos);
    yPos += splitNotes.length * 5;
  }
  
  // Terms section
  if (normalizedInvoice.terms) {
    yPos += 10;
    doc.setFontSize(12);
    doc.setTextColor(...accentColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', 20, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    yPos += 8;
    
    const splitTerms = doc.splitTextToSize(normalizedInvoice.terms, 170);
    doc.text(splitTerms, 20, yPos);
  }
  
  // Lead magnet watermark for free tier
  const isProVersion = 'isProVersion' in invoice ? invoice.isProVersion : false;
  if (!isProVersion) {
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text('Created with TenantFlow Invoice Generator', 20, 280);
    doc.setTextColor(...accentColor);
    doc.text('Remove this watermark → tenantflow.app/pricing', 20, 285);
  }
  
  return doc.output('blob');
};

// Legacy support function for backward compatibility
export const generateInvoicePDFLegacy = (invoice: Invoice): void => {
  const pdfBlob = generateInvoicePDF(invoice);
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${invoice.invoiceNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};

// Normalize invoice data for consistent PDF generation
function normalizeInvoiceData(invoice: CustomerInvoice | Invoice) {
  // Handle both new CustomerInvoice and legacy Invoice formats
  if ('businessName' in invoice) {
    // New CustomerInvoice format
    return {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
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
      items: invoice.items,
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      notes: invoice.notes,
      terms: invoice.terms,
    };
  } else {
    // Legacy Invoice format - map old field names to new
    return {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      businessName: invoice.fromName,
      businessEmail: invoice.fromEmail,
      businessAddress: invoice.fromAddress,
      businessCity: invoice.fromCity,
      businessState: invoice.fromState,
      businessZip: invoice.fromZip,
      businessPhone: invoice.fromPhone,
      clientName: invoice.toName,
      clientEmail: invoice.toEmail,
      clientAddress: invoice.toAddress,
      clientCity: invoice.toCity,
      clientState: invoice.toState,
      clientZip: invoice.toZip,
      items: invoice.items,
      subtotal: invoice.subtotal,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      notes: invoice.notes,
      terms: invoice.terms,
    };
  }
}

export const previewInvoicePDF = (invoice: CustomerInvoice | Invoice): string => {
  const pdfBlob = generateInvoicePDF(invoice);
  return URL.createObjectURL(pdfBlob);
};

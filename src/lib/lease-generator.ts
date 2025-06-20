import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
// Table imports not currently used: Table, TableCell, TableRow, WidthType
import type { LeaseGeneratorForm } from '@/types/lease-generator';
import { generateTexasLeaseHTML, generateTexasLeaseText, type TexasLeaseData } from './lease-templates/texas-residential-lease';

export class LeaseGenerator {
  private data: LeaseGeneratorForm;

  constructor(data: LeaseGeneratorForm) {
    this.data = data;
  }

  /**
   * Generate Texas-compliant lease agreement content
   */
  private generateLeaseContent(): string {
    // Convert form data to Texas lease format
    const texasData: TexasLeaseData = {
      ...this.data,
      countyName: this.data.countyName || this.data.city,
    };

    return generateTexasLeaseText(texasData);
  }

  /**
   * Generate HTML content for better PDF rendering
   */
  private generateLeaseHTML(): string {
    // Convert form data to Texas lease format
    const texasData: TexasLeaseData = {
      ...this.data,
      countyName: this.data.countyName || this.data.city,
    };

    return generateTexasLeaseHTML(texasData);
  }

  /**
   * Generate PDF lease agreement using HTML to PDF conversion
   */
  async generatePDF(): Promise<Blob> {
    // For better PDF generation, we'll use HTML rendering approach
    // This provides much better formatting and layout control
    
    // const htmlContent = this.generateLeaseHTML(); // TODO: Implement HTML to PDF conversion
    
    // Create a new PDF document with proper page settings
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter'
    });
    
    // Set up document properties
    pdf.setProperties({
      title: 'Texas Residential Lease Agreement',
      subject: `Lease for ${this.data.propertyAddress}`,
      author: 'TenantFlow',
      creator: 'TenantFlow Lease Generator'
    });

    // For now, we'll use the text-based approach with better formatting
    // In a future update, we can integrate html2canvas or puppeteer for true HTML to PDF
    const content = this.generateLeaseContent();
    const lines = content.split('\n');
    let yPosition = 0.75; // Start 0.75 inches from top
    const pageHeight = 11; // Letter size height
    const margin = 0.75;
    const lineHeight = 0.15; // Line height in inches
    const pageWidth = 8.5;

    pdf.setFontSize(11);
    pdf.setFont('times', 'normal');

    for (const line of lines) {
      // Check if we need a new page
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      // Handle different text formatting
      if (line.includes('Texas Residential Lease Agreement')) {
        pdf.setFontSize(14);
        pdf.setFont('times', 'bold');
        // Center the title
        const textWidth = pdf.getStringUnitWidth(line) * 14 / 72;
        const x = (pageWidth - textWidth) / 2;
        pdf.text(line, x, yPosition);
        pdf.setFontSize(11);
        pdf.setFont('times', 'normal');
        yPosition += lineHeight * 1.5;
        continue;
      } else if (line.match(/^\d+\./)) {
        // Section headers
        pdf.setFont('times', 'bold');
        const splitText = pdf.splitTextToSize(line, pageWidth - 2 * margin);
        pdf.text(splitText, margin, yPosition);
        yPosition += splitText.length * lineHeight;
        pdf.setFont('times', 'normal');
        continue;
      } else if (line.includes('THIS AGREEMENT') || 
                 line.includes('LANDLORD:') || 
                 line.includes('TENANT')) {
        pdf.setFont('times', 'bold');
        const splitText = pdf.splitTextToSize(line, pageWidth - 2 * margin);
        pdf.text(splitText, margin, yPosition);
        yPosition += splitText.length * lineHeight;
        pdf.setFont('times', 'normal');
        continue;
      } else if (line.trim()) {
        // Regular text
        const splitText = pdf.splitTextToSize(line, pageWidth - 2 * margin);
        pdf.text(splitText, margin, yPosition);
        yPosition += splitText.length * lineHeight;
        continue;
      }

      // Empty line spacing
      yPosition += lineHeight;
    }

    return pdf.output('blob');
  }

  /**
   * Generate DOCX lease agreement using Texas template
   */
  async generateDOCX(): Promise<Blob> {
    const content = this.generateLeaseContent();
    
    const paragraphs = content.split('\n').map(line => {
      if (line.includes('Texas Residential Lease Agreement')) {
        return new Paragraph({
          children: [new TextRun({ text: line, bold: true, size: 28 })],
          spacing: { after: 200 },
          alignment: 'center'
        });
      } else if (line.includes('THIS AGREEMENT')) {
        return new Paragraph({
          children: [new TextRun({ text: line, size: 22 })],
          spacing: { before: 200, after: 200 }
        });
      } else if (line.match(/^\d+\./)) {
        // Section headers
        return new Paragraph({
          children: [new TextRun({ text: line, bold: true, size: 22 })],
          spacing: { before: 200, after: 100 }
        });
      } else if (line.includes('LANDLORD:') || line.includes('TENANT')) {
        return new Paragraph({
          children: [new TextRun({ text: line, bold: true, size: 22 })],
          spacing: { before: 300, after: 100 }
        });
      } else if (line.trim().startsWith('A.') || 
                 line.trim().startsWith('B.') || 
                 line.trim().startsWith('C.') ||
                 line.trim().startsWith('D.') ||
                 line.trim().startsWith('E.') ||
                 line.trim().startsWith('F.')) {
        // Sub-sections
        return new Paragraph({
          children: [new TextRun({ text: line, bold: true })],
          spacing: { before: 100, after: 50 }
        });
      } else if (line.trim()) {
        return new Paragraph({
          children: [new TextRun({ text: line, size: 22 })],
          spacing: { after: 100 }
        });
      } else {
        return new Paragraph({
          children: [new TextRun({ text: '' })],
          spacing: { after: 50 }
        });
      }
    });

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 720,  // 0.75 inches
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: paragraphs
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    return new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
  }

  /**
   * Create a ZIP file containing both PDF and DOCX
   */
  async generateZIP(): Promise<Blob> {
    // Dynamic import for JSZip to avoid bundling issues
    const JSZip = (await import('jszip')).default;
    
    const zip = new JSZip();
    
    const [pdfBlob, docxBlob] = await Promise.all([
      this.generatePDF(),
      this.generateDOCX()
    ]);

    const fileName = `lease_${this.data.propertyAddress.replace(/\s+/g, '_').toLowerCase()}`;
    
    zip.file(`${fileName}.pdf`, pdfBlob);
    zip.file(`${fileName}.docx`, docxBlob);

    return zip.generateAsync({ type: 'blob' });
  }
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
/**
 * Lightweight PDF generation using browser native printing
 * This reduces bundle size by ~3.5MB compared to jsPDF
 */

/**
 * Generate PDF using browser's print functionality
 * Much lighter than jsPDF but requires user interaction
 */
export function generatePDFFromHTML(htmlContent: string, filename: string): void {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Popup blocked. Please allow popups and try again.');
  }

  // Add print styles and content
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${filename}</title>
      <style>
        @media print {
          body { 
            margin: 0.75in; 
            font-family: 'Times New Roman', serif;
            font-size: 11px;
            line-height: 1.3;
          }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
        }
        body {
          font-family: 'Times New Roman', serif;
          font-size: 11px;
          line-height: 1.3;
          margin: 0.75in;
          color: #000;
        }
      </style>
    </head>
    <body>
      ${htmlContent}
      <div class="no-print" style="position: fixed; top: 10px; right: 10px; z-index: 1000;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Print to PDF
        </button>
        <button onclick="window.close()" style="padding: 10px 20px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
          Close
        </button>
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
}

/**
 * Alternative: Generate PDF blob using canvas and minimal libraries
 * This is a compromise between bundle size and functionality
 */
export async function generatePDFBlob(): Promise<Blob> {
  // For now, throw error suggesting the lighter approach
  throw new Error('PDF blob generation requires jsPDF. Use generatePDFFromHTML() for lighter bundle or enable jsPDF dynamic import.');
}

/**
 * Create a printable document that downloads as HTML
 * Users can then use browser's "Print to PDF" feature
 */
export function downloadPrintableHTML(htmlContent: string, filename: string): void {
  const fullHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    @media screen {
      body { 
        max-width: 8.5in; 
        margin: 0 auto; 
        padding: 20px;
        background: #f5f5f5;
      }
      .document {
        background: white;
        padding: 0.75in;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        margin-bottom: 20px;
      }
      .print-instructions {
        background: #e0f2fe;
        border: 1px solid #0288d1;
        border-radius: 4px;
        padding: 15px;
        margin-bottom: 20px;
        font-family: Arial, sans-serif;
      }
    }
    @media print {
      body { 
        margin: 0.75in; 
        background: white;
      }
      .document { 
        background: white; 
        padding: 0; 
        box-shadow: none; 
        margin: 0;
      }
      .print-instructions { display: none !important; }
      .page-break { page-break-before: always; }
    }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 11px;
      line-height: 1.3;
      color: #000;
    }
  </style>
</head>
<body>
  <div class="print-instructions">
    <strong>📄 Print to PDF Instructions:</strong><br>
    1. Press <strong>Ctrl+P</strong> (or Cmd+P on Mac)<br>
    2. Select <strong>"Save as PDF"</strong> as destination<br>
    3. Click <strong>"Save"</strong> to download your lease agreement
  </div>
  <div class="document">
    ${htmlContent}
  </div>
</body>
</html>`;

  const blob = new Blob([fullHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.replace('.pdf', '.html');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
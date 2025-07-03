import React, { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CustomerInvoice } from '@/types/invoice';
import { generateInvoicePDF } from '@/lib/invoice-pdf';

// Import all the individual components
import { InvoiceHeader } from '@/components/invoice/InvoiceHeader';
import { InvoiceDetails } from '@/components/invoice/InvoiceDetails';
import { BusinessInfoSection } from '@/components/invoice/BusinessInfoSection';
import { ClientInfoSection } from '@/components/invoice/ClientInfoSection';
import { InvoiceItemsSection } from '@/components/invoice/InvoiceItemsSection';
import { InvoiceActions } from '@/components/invoice/InvoiceActions';
import { EmailModal } from '@/components/invoice/EmailModal';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const InvoiceGeneratorPage: React.FC = () => {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      invoiceNumber: `INV-${Date.now()}`,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'DRAFT' as const,
      businessName: '',
      businessEmail: '',
      businessAddress: '',
      businessCity: '',
      businessState: '',
      businessZip: '',
      businessPhone: '',
      clientName: '',
      clientEmail: '',
      clientAddress: '',
      clientCity: '',
      clientState: '',
      clientZip: '',
      emailTo: '',
      emailSubject: '',
      emailMessage: '',
      items: [
        {
          id: '1',
          description: '',
          quantity: 1,
          unitPrice: 0,
          total: 0,
        },
      ],
      notes: 'Thank you for your business!',
      terms: 'Payment is due within 30 days.',
      subtotal: 0,
      taxRate: 0,
      taxAmount: 0,
      total: 0,
      downloadCount: 0,
      isProVersion: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = form.watch('items');

  // Calculate totals
  const subtotal = watchedItems?.reduce((sum, item) => {
    const qty = Number(item?.quantity) || 0;
    const rate = Number(item?.unitPrice) || 0;
    return sum + (qty * rate);
  }, 0) || 0;

  // US State Tax Rates (2024)
  const stateTaxRates: Record<string, number> = useMemo(() => ({
    'AL': 4.00, 'AK': 0.00, 'AZ': 5.60, 'AR': 6.50, 'CA': 7.25,
    'CO': 2.90, 'CT': 6.35, 'DE': 0.00, 'FL': 6.00, 'GA': 4.00,
    'HI': 4.17, 'ID': 6.00, 'IL': 6.25, 'IN': 7.00, 'IA': 6.00,
    'KS': 6.50, 'KY': 6.00, 'LA': 4.45, 'ME': 5.50, 'MD': 6.00,
    'MA': 6.25, 'MI': 6.00, 'MN': 6.88, 'MS': 7.00, 'MO': 4.23,
    'MT': 0.00, 'NE': 5.50, 'NV': 6.85, 'NH': 0.00, 'NJ': 6.63,
    'NM': 5.13, 'NY': 4.00, 'NC': 4.75, 'ND': 5.00, 'OH': 5.75,
    'OK': 4.50, 'OR': 0.00, 'PA': 6.00, 'RI': 7.00, 'SC': 6.00,
    'SD': 4.20, 'TN': 7.00, 'TX': 6.25, 'UT': 6.10, 'VT': 6.00,
    'VA': 5.30, 'WA': 6.50, 'WV': 6.00, 'WI': 5.00, 'WY': 4.00,
    'DC': 6.00
  }), []);

  const clientState = form.watch('clientState');
  const autoTaxRate = clientState && clientState.length === 2 ? 
    stateTaxRates[clientState.toUpperCase()] || 0 : 0;

  const taxAmount = subtotal * (autoTaxRate / 100);
  const total = subtotal + taxAmount;

  // Auto-calculate tax rate based on client state
  useEffect(() => {
    if (clientState && clientState.length === 2) {
      const stateCode = clientState.toUpperCase();
      const taxRate = stateTaxRates[stateCode];
      if (taxRate !== undefined) {
        form.setValue('taxRate', taxRate, { shouldValidate: false, shouldDirty: false });
      }
    }
  }, [clientState, form, stateTaxRates]);

  // Number formatting function
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleGenerateInvoice = async () => {
    try {
      const isValid = await form.trigger();
      
      if (!isValid) {
        toast.error('Please fix the validation errors before generating invoice');
        return;
      }

      const formData = form.getValues() as CustomerInvoice;
      
      if (!clientState || clientState.length !== 2) {
        toast.error('Valid client state is required for tax calculation');
        return;
      }
      
      if (!stateTaxRates[clientState.toUpperCase()]) {
        toast.error('Invalid state code. Please enter a valid US state abbreviation.');
        return;
      }
      
      const invoiceData = {
        ...formData,
        subtotal,
        taxAmount,
        total,
        taxRate: autoTaxRate,
        clientState: clientState.toUpperCase()
      };
      
      const pdfBlob = generateInvoicePDF(invoiceData);
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${formData.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Invoice generated successfully!');
    } catch (error) {
      toast.error('Failed to generate invoice');
      console.error(error);
    }
  };

  const handlePreview = () => {
    const formData = form.getValues() as CustomerInvoice;
    try {
      const invoiceData = {
        ...formData,
        subtotal,
        taxAmount,
        total
      };
      
      const pdfBlob = generateInvoicePDF(invoiceData);
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to generate preview');
    }
  };

  const handlePrepareEmail = () => {
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async (emailData: { to: string; subject: string; message: string }) => {
    try {
      const formData = form.getValues() as CustomerInvoice;
      const invoiceData = {
        ...formData,
        subtotal,
        taxAmount,
        total,
        taxRate: autoTaxRate,
        clientState: clientState?.toUpperCase()
      };
      
      const pdfBlob = generateInvoicePDF(invoiceData);
      
      // Download PDF and open email client
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${formData.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Open email client
      const subject = encodeURIComponent(emailData.subject);
      const body = encodeURIComponent(emailData.message);
      window.location.href = `mailto:${emailData.to}?subject=${subject}&body=${body}`;
      
      toast.success('PDF downloaded! Email client opened.');
    } catch (error) {
      toast.error('Failed to prepare email');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23f8fafc%22%20fill-opacity%3D%220.3%22%3E%3Ccircle%20cx%3D%227%22%20cy%3D%227%22%20r%3D%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
      
      <div className="container mx-auto px-4 max-w-7xl relative py-8">
        <InvoiceHeader />

        <div className="max-w-7xl mx-auto mb-8">
          {/* First Row: From Business + Invoice Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
            <BusinessInfoSection 
              register={form.register} 
              errors={form.formState.errors} 
            />
            <InvoiceDetails register={form.register} />
          </div>

          {/* Second Row: To Client + Invoice Items + Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - To Client + Notes */}
            <div className="flex flex-col gap-4 h-full">
              <ClientInfoSection
                register={form.register}
                errors={form.formState.errors}
                clientState={clientState}
                autoTaxRate={autoTaxRate}
                stateTaxRates={stateTaxRates}
              />

              {/* Notes Section in Left Column */}
              <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg p-6 shadow-lg flex-1">
                <Label htmlFor="notes" className="text-lg font-semibold text-foreground block mb-3">Notes</Label>
                <Textarea
                  id="notes"
                  {...form.register('notes')}
                  placeholder="Thank you for your business! Please feel free to add any additional notes or special instructions here."
                  rows={4}
                  className="text-base resize-none"
                />
              </div>
            </div>

            {/* Right Column - Invoice Items */}
            <InvoiceItemsSection
              register={form.register}
              fields={fields}
              append={append}
              remove={remove}
              setValue={form.setValue}
              getValues={form.getValues}
              watchedItems={watchedItems}
              subtotal={subtotal}
              taxAmount={taxAmount}
              total={total}
              autoTaxRate={autoTaxRate}
              clientState={clientState}
              formatCurrency={formatCurrency}
            />
          </div>
        </div>

        {/* Centered CTA Buttons */}
        <div className="flex justify-center max-w-7xl mx-auto mb-8">
          <InvoiceActions
            onGenerateInvoice={handleGenerateInvoice}
            onPreview={handlePreview}
            onPrepareEmail={handlePrepareEmail}
          />
        </div>

        {/* Centered Upgrade CTA */}
        <div className="flex justify-center max-w-7xl mx-auto mb-8">
          <div className="text-center p-6 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border border-primary/10 shadow-lg max-w-md">
            <p className="text-lg text-muted-foreground mb-4">
              ✨ Want to remove the watermark and unlock premium features?
            </p>
            <Button 
              variant="ghost" 
              size="lg"
              className="text-primary hover:text-primary-foreground hover:bg-primary font-semibold px-8 py-3"
            >
              Upgrade to TenantFlow Pro →
            </Button>
          </div>
        </div>
      </div>

      <EmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSend={handleSendEmail}
        defaultTo={form.getValues('clientEmail')}
        defaultSubject={`Invoice ${form.getValues('invoiceNumber')} from ${form.getValues('businessName')}`}
        defaultMessage={`Hi ${form.getValues('clientName') || 'there'},

Please find your invoice attached.

Thank you for your business!

Best regards,
${form.getValues('businessName') || 'Your Business'}`}
      />
    </div>
  );
};

export default InvoiceGeneratorPage;
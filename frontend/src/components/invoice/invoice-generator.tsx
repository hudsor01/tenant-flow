import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Plus, Trash2, Download, Eye, Building, User 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { CustomerInvoice, CustomerInvoiceSchema } from '@/types/invoice';
import { generateInvoicePDF } from '@/lib/invoice-pdf';

export const InvoiceGenerator: React.FC = () => {
  const form = useForm({
    resolver: zodResolver(CustomerInvoiceSchema),
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
  const watchedTaxRate = form.watch('taxRate');

  // Real-time calculation effect
  useEffect(() => {
    const subtotal = watchedItems.reduce((sum, item) => {
      const amount = (item.quantity || 0) * (item.unitPrice || 0);
      return sum + amount;
    }, 0);

    const taxAmount = subtotal * ((watchedTaxRate || 0) / 100);
    const total = subtotal + taxAmount;

    // Update form values
    form.setValue('subtotal', subtotal);
    form.setValue('taxAmount', taxAmount);
    form.setValue('total', total);
  }, [watchedItems, watchedTaxRate, form]);

  const handleGenerateInvoice = () => {
    // Validate form
    const isValid = form.trigger();
    if (!isValid) {
      toast.error('Please fix form errors first');
      return;
    }

    try {
      const formData = form.getValues() as CustomerInvoice;
      const pdfBlob = generateInvoicePDF(formData);
      
      // Create download
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
      const pdfBlob = generateInvoicePDF(formData);
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to generate preview');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Invoice Generator
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Create professional invoices
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Left Column - Form */}
          <div className="space-y-6">
            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-600" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input
                      id="invoiceNumber"
                      {...form.register('invoiceNumber')}
                      placeholder="INV-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      {...form.register('dueDate', {
                        setValueAs: (value) => new Date(value)
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  From (Your Business)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      {...form.register('businessName')}
                      placeholder="Your Business Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessEmail">Email *</Label>
                    <Input
                      id="businessEmail"
                      type="email"
                      {...form.register('businessEmail')}
                      placeholder="business@email.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessAddress">Address</Label>
                  <Input
                    id="businessAddress"
                    {...form.register('businessAddress')}
                    placeholder="123 Business Street"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessCity">City</Label>
                    <Input
                      id="businessCity"
                      {...form.register('businessCity')}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessState">State</Label>
                    <Input
                      id="businessState"
                      {...form.register('businessState')}
                      placeholder="ST"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessZip">ZIP</Label>
                    <Input
                      id="businessZip"
                      {...form.register('businessZip')}
                      placeholder="12345"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessPhone">Phone</Label>
                  <Input
                    id="businessPhone"
                    {...form.register('businessPhone')}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  To (Client)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Client Name *</Label>
                    <Input
                      id="clientName"
                      {...form.register('clientName')}
                      placeholder="Client Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">Email *</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      {...form.register('clientEmail')}
                      placeholder="client@email.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientAddress">Address</Label>
                  <Input
                    id="clientAddress"
                    {...form.register('clientAddress')}
                    placeholder="123 Client Street"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientCity">City</Label>
                    <Input
                      id="clientCity"
                      {...form.register('clientCity')}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientState">State</Label>
                    <Input
                      id="clientState"
                      {...form.register('clientState')}
                      placeholder="ST"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientZip">ZIP</Label>
                    <Input
                      id="clientZip"
                      {...form.register('clientZip')}
                      placeholder="12345"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Items & Totals */}
          <div className="space-y-6">
            {/* Invoice Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Invoice Items</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({
                      id: Date.now().toString(),
                      description: '',
                      quantity: 1,
                      unitPrice: 0,
                      total: 0,
                    })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Label htmlFor={`item-desc-${index}`} className="text-xs">
                          Description
                        </Label>
                        <Input
                          id={`item-desc-${index}`}
                          {...form.register(`items.${index}.description`)}
                          placeholder="Description of service/product"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`item-qty-${index}`} className="text-xs">
                          Qty
                        </Label>
                        <Input
                          id={`item-qty-${index}`}
                          type="number"
                          step="0.01"
                          min="0"
                          {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor={`item-rate-${index}`} className="text-xs">
                          Rate
                        </Label>
                        <Input
                          id={`item-rate-${index}`}
                          type="number"
                          step="0.01"
                          min="0"
                          {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Amount</Label>
                        <div className="h-10 flex items-center font-medium">
                          ${((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unitPrice || 0)).toFixed(2)}
                        </div>
                      </div>
                      <div className="col-span-1">
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            className="h-10 w-10 p-0"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>${form.watch('subtotal')?.toFixed(2) || '0.00'}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="taxRate" className="text-sm">Tax Rate:</Label>
                      <Input
                        id="taxRate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="w-20 h-8"
                        {...form.register('taxRate', { valueAsNumber: true })}
                      />
                      <span className="text-sm">%</span>
                    </div>
                    <span className="text-sm">${form.watch('taxAmount')?.toFixed(2) || '0.00'}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-blue-600">${form.watch('total')?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes & Terms */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    {...form.register('notes')}
                    placeholder="Thank you for your business!"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="terms">Terms & Conditions</Label>
                  <Textarea
                    id="terms"
                    {...form.register('terms')}
                    placeholder="Payment is due within 30 days."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                onClick={handleGenerateInvoice}
                className="flex-1" 
                size="lg"
              >
                <Download className="h-5 w-5 mr-2" />
                Generate Invoice
              </Button>
              
              <Button 
                variant="outline"
                onClick={handlePreview}
                size="lg"
              >
                <Eye className="h-5 w-5 mr-2" />
                Preview
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
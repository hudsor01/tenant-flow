import { Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UseFormRegister } from 'react-hook-form';

interface InvoiceDetailsProps {
  register: UseFormRegister<any>;
}

export function InvoiceDetails({ register }: InvoiceDetailsProps) {
  return (
    <Card className="group border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm h-fit">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/50 py-4 flex items-center justify-center">
        <CardTitle className="flex items-center justify-center gap-3 text-foreground">
          <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
            <Eye className="h-5 w-5 text-primary" />
          </div>
          <span className="font-serif">Invoice Details</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="py-4">
        <div className="flex items-center justify-center gap-8 mb-6">
          <div className="flex items-center gap-4">
            <Label htmlFor="invoiceNumber" className="text-sm font-medium whitespace-nowrap">
              Invoice Number
            </Label>
            <Input
              id="invoiceNumber"
              {...register('invoiceNumber')}
              placeholder="INV-001"
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-4">
            <Label htmlFor="dueDate" className="text-sm font-medium whitespace-nowrap">
              Due Date
            </Label>
            <Input
              id="dueDate"
              type="date"
              {...register('dueDate', {
                setValueAs: (value) => new Date(value)
              })}
              className="w-40"
            />
          </div>
        </div>
        
        {/* Terms & Conditions */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="terms">Terms & Conditions</Label>
          <Textarea
            id="terms"
            {...register('terms')}
            placeholder="Payment is due within 30 days."
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}
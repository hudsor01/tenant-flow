import { useState } from 'react';
import { Mail, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (emailData: { to: string; subject: string; message: string }) => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultMessage?: string;
}

export function EmailModal({ 
  isOpen, 
  onClose, 
  onSend, 
  defaultTo = '', 
  defaultSubject = '', 
  defaultMessage = '' 
}: EmailModalProps) {
  const [emailTo, setEmailTo] = useState(defaultTo);
  const [emailSubject, setEmailSubject] = useState(defaultSubject);
  const [emailMessage, setEmailMessage] = useState(defaultMessage);

  const handleSend = () => {
    onSend({
      to: emailTo,
      subject: emailSubject,
      message: emailMessage
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Prepare Email Invoice
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="emailTo">Email Address *</Label>
            <Input
              id="emailTo"
              type="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="client@email.com"
              required
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="emailSubject">Subject *</Label>
            <Input
              id="emailSubject"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Your Invoice from [Business Name]"
              required
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="emailMessage">Message</Label>
            <Textarea
              id="emailMessage"
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder="Hi [Client Name],

Please find your invoice attached.

Thank you for your business!

Best regards,
[Business Name]"
              rows={6}
            />
          </div>
          
          <div className="flex gap-3 justify-end mt-4">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSend}
              disabled={!emailTo || !emailSubject}
              className="bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Invoice
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
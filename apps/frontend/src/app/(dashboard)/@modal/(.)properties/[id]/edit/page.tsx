import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PropertyEditForm } from '@/components/properties/property-edit-form';
import { getProperty } from '@/lib/data/properties';
import { notFound } from 'next/navigation';

interface EditPropertyModalProps {
  params: Promise<{ id: string }>;
}

// Server Component for modal content
export default async function EditPropertyModal({ params }: EditPropertyModalProps) {
  // In Next.js 15, params is a Promise
  const resolvedParams = await params;
  // Server-side data fetching
  const property = await getProperty(resolvedParams.id);
  
  if (!property) {
    notFound();
  }

  return (
    <Dialog defaultOpen={true}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {property.name}</DialogTitle>
          <DialogDescription>
            Update property information and settings
          </DialogDescription>
        </DialogHeader>
        <PropertyEditForm property={property} />
      </DialogContent>
    </Dialog>
  );
}

// Generate static params for better performance
export async function generateStaticParams() {
  // In a real app, you'd fetch property IDs from your API
  // For now, return empty array to use dynamic routing
  return [];
}

export const dynamic = 'force-dynamic'; // Ensure this is always server-rendered
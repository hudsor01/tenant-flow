import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone';
import { useSupabaseUpload } from '@/hooks/use-supabase-upload';
import { useAuthStore } from '@/store/authStore';
import { FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface PropertyFileUploadProps {
  propertyId: string;
  onUploadComplete?: (urls: string[]) => void;
  maxFiles?: number;
  className?: string;
}

export default function PropertyFileUpload({
  propertyId,
  onUploadComplete,
  maxFiles = 5,
  className,
}: PropertyFileUploadProps) {
  const { user } = useAuthStore();

  const uploadProps = useSupabaseUpload({
    bucketName: 'property-documents',
    path: `user-${user?.id}/property-${propertyId}`,
    allowedMimeTypes: [
      'image/*',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles,
    upsert: true,
  });

  React.useEffect(() => {
    if (uploadProps.isSuccess && onUploadComplete) {
      // Get the URLs of uploaded files
      const uploadedUrls = uploadProps.successes.map(
        (fileName) => `user-${user?.id}/property-${propertyId}/${fileName}`
      );
      onUploadComplete(uploadedUrls);
    }
  }, [uploadProps.isSuccess, uploadProps.successes, onUploadComplete, user?.id, propertyId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Property Documents
          </CardTitle>
          <CardDescription>
            Upload images, PDFs, or other documents related to this property. 
            Maximum file size: 10MB per file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dropzone {...uploadProps} className="min-h-[200px]">
            <DropzoneEmptyState />
            <DropzoneContent />
          </Dropzone>
          
          {uploadProps.errors.length > 0 && (
            <div className="mt-4 space-y-1">
              {uploadProps.errors.map((error, index) => (
                <p key={index} className="text-sm text-destructive">
                  {error.name}: {error.message}
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
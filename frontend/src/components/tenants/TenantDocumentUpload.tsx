import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone';
import { useSupabaseUpload } from '@/hooks/useSupabaseUpload';
import { useAuthStore } from '@/store/authStore';
import { Shield } from 'lucide-react';
import { motion } from 'framer-motion';

interface TenantDocumentUploadProps {
  tenantId: string;
  leaseId?: string;
  onUploadComplete?: (urls: string[]) => void;
  maxFiles?: number;
  className?: string;
}

export default function TenantDocumentUpload({
  tenantId,
  leaseId,
  onUploadComplete,
  maxFiles = 3,
  className,
}: TenantDocumentUploadProps) {
  const { user } = useAuthStore();

  const uploadProps = useSupabaseUpload({
    bucketName: 'tenant-documents',
    path: `user-${user?.id}/tenant-${tenantId}${leaseId ? `/lease-${leaseId}` : ''}`,
    allowedMimeTypes: [
      'image/*',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles,
    upsert: true,
  });

  React.useEffect(() => {
    if (uploadProps.isSuccess && onUploadComplete) {
      // Get the URLs of uploaded files
      const uploadedUrls = uploadProps.successes.map(
        (fileName) => 
          `user-${user?.id}/tenant-${tenantId}${leaseId ? `/lease-${leaseId}` : ''}/${fileName}`
      );
      onUploadComplete(uploadedUrls);
    }
  }, [uploadProps.isSuccess, uploadProps.successes, onUploadComplete, user?.id, tenantId, leaseId]);

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
            <Shield className="h-5 w-5" />
            Upload Tenant Documents
          </CardTitle>
          <CardDescription>
            Upload lease agreements, ID verification, or other tenant-related documents. 
            Maximum file size: 5MB per file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dropzone {...uploadProps} className="min-h-[180px]">
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
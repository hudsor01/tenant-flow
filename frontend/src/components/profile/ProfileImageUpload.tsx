import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone';
import { useSupabaseUpload } from '@/hooks/useSupabaseUpload';
import { useAuthStore } from '@/store/authStore';
import { CurrentUserAvatar } from '@/components/current-user-avatar';
import { Camera, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProfileImageUploadProps {
  onUploadComplete?: (url: string) => void;
  className?: string;
}

export default function ProfileImageUpload({
  onUploadComplete,
  className,
}: ProfileImageUploadProps) {
  const { user } = useAuthStore();

  const uploadProps = useSupabaseUpload({
    bucketName: 'user-avatars',
    path: `user-${user?.id}`,
    allowedMimeTypes: ['image/*'],
    maxFileSize: 2 * 1024 * 1024, // 2MB
    maxFiles: 1,
    upsert: true,
  });

  React.useEffect(() => {
    if (uploadProps.isSuccess && onUploadComplete) {
      // Get the URL of the uploaded avatar
      const fileName = uploadProps.successes[0];
      if (fileName) {
        const avatarUrl = `user-${user?.id}/${fileName}`;
        onUploadComplete(avatarUrl);
      }
    }
  }, [uploadProps.isSuccess, uploadProps.successes, onUploadComplete, user?.id]);

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
            <User className="h-5 w-5" />
            Profile Picture
          </CardTitle>
          <CardDescription>
            Upload a profile picture. Maximum file size: 2MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Avatar Display */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <CurrentUserAvatar />
              <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                <Camera className="h-3 w-3 text-primary-foreground" />
              </div>
            </div>
          </div>

          {/* Upload Dropzone */}
          <Dropzone {...uploadProps} className="min-h-[120px]">
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
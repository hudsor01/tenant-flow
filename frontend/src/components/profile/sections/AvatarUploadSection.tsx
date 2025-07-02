import React from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { User } from '@/types/entities';

interface AvatarState {
  file: File | null;
  preview: string | null;
  uploading: boolean;
}

interface AvatarUploadSectionProps {
  user: User;
  avatarState: AvatarState;
  onAvatarChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  getInitials: (name: string) => string;
}

/**
 * Avatar upload section component for profile editing
 * Handles avatar display, upload, and preview functionality
 */
export function AvatarUploadSection({
  user,
  avatarState,
  onAvatarChange,
  getInitials,
}: AvatarUploadSectionProps) {
  const displayAvatar = avatarState.preview || user?.avatarUrl;

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Avatar Display */}
      <div className="relative">
        <Avatar className="h-24 w-24">
          <AvatarImage 
            src={displayAvatar || undefined} 
            alt={user?.name || 'User avatar'} 
          />
          <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
            {user?.name ? getInitials(user.name) : 'U'}
          </AvatarFallback>
        </Avatar>
        
        {/* Upload Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-full">
          <Camera className="h-6 w-6 text-white" />
        </div>
        
        {/* Loading Overlay */}
        {avatarState.uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Upload Button */}
      <div className="text-center">
        <Label htmlFor="avatar" className="cursor-pointer">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="relative"
            disabled={avatarState.uploading}
            asChild
          >
            <span>
              <Camera className="h-4 w-4 mr-2" />
              {avatarState.file ? 'Change Photo' : 'Upload Photo'}
            </span>
          </Button>
        </Label>
        <input
          id="avatar"
          type="file"
          accept="image/*"
          onChange={onAvatarChange}
          className="hidden"
          disabled={avatarState.uploading}
        />
      </div>

      {/* Upload Info */}
      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground">
          JPG, PNG or GIF. Max file size 2MB.
        </p>
        {avatarState.file && (
          <p className="text-xs text-green-600 font-medium">
            ✓ Ready to upload: {avatarState.file.name}
          </p>
        )}
      </div>

      {/* Upload Status */}
      {avatarState.uploading && (
        <div className="text-center">
          <p className="text-sm text-primary font-medium">
            Uploading avatar...
          </p>
        </div>
      )}
    </div>
  );
}
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, User } from 'lucide-react'

interface AvatarUploadSectionProps {
  currentAvatar?: string
  userName?: string
  onAvatarChange: (file: File | null) => void
}

export function AvatarUploadSection({
  currentAvatar,
  userName = 'User',
  onAvatarChange
}: AvatarUploadSectionProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatar || null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreviewUrl(currentAvatar || null)
    }
    
    onAvatarChange(file)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center space-y-4">
        <Avatar className="h-24 w-24">
          <AvatarImage src={previewUrl || currentAvatar} alt={userName} />
          <AvatarFallback>
            {currentAvatar ? <User /> : getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        
        <div className="space-y-2">
          <Label htmlFor="avatar-upload" className="cursor-pointer">
            <Button type="button" variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Change Avatar
              </span>
            </Button>
          </Label>
          <Input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="sr-only"
          />
        </div>
      </div>
    </div>
  )
}
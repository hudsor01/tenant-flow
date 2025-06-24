import React from 'react';
import { Lock, Save, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UseFormReturn } from 'react-hook-form';
import { PasswordFormData } from '@/hooks/useEditProfileData';

interface SecurityTabSectionProps {
  form: UseFormReturn<PasswordFormData>;
  onSubmit: (data: PasswordFormData) => Promise<void>;
  onCancel: () => void;
}

/**
 * Security tab section component for profile editing
 * Handles password change functionality
 */
export function SecurityTabSection({
  form,
  onSubmit,
  onCancel,
}: SecurityTabSectionProps) {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Security Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 mb-1">Password Security</p>
            <p className="text-blue-700">
              Choose a strong password with at least 6 characters. A good password includes a mix of letters, numbers, and symbols.
            </p>
          </div>
        </div>
      </div>

      {/* Password Fields */}
      <div className="space-y-4">
        {/* Current Password */}
        <div className="space-y-2">
          <Label htmlFor="currentPass" className="text-sm font-medium text-gray-700">
            Current Password *
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="currentPass"
              type="password"
              placeholder="Enter your current password"
              className="pl-10 transition-colors focus:border-blue-500"
              {...form.register('currentPass')}
            />
          </div>
          {form.formState.errors.currentPass && (
            <p className="text-sm text-red-600">{form.formState.errors.currentPass.message}</p>
          )}
        </div>

        {/* New Password */}
        <div className="space-y-2">
          <Label htmlFor="newPass" className="text-sm font-medium text-gray-700">
            New Password *
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="newPass"
              type="password"
              placeholder="Enter your new password"
              className="pl-10 transition-colors focus:border-blue-500"
              {...form.register('newPass')}
            />
          </div>
          {form.formState.errors.newPass && (
            <p className="text-sm text-red-600">{form.formState.errors.newPass.message}</p>
          )}
        </div>

        {/* Confirm New Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPass" className="text-sm font-medium text-gray-700">
            Confirm New Password *
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="confirmPass"
              type="password"
              placeholder="Confirm your new password"
              className="pl-10 transition-colors focus:border-blue-500"
              {...form.register('confirmPass')}
            />
          </div>
          {form.formState.errors.confirmPass && (
            <p className="text-sm text-red-600">{form.formState.errors.confirmPass.message}</p>
          )}
        </div>
      </div>

      {/* Security Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-900 mb-1">Important Security Note</p>
            <p className="text-amber-700">
              Changing your password will sign you out of all devices. You'll need to sign in again with your new password.
            </p>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={form.formState.isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="bg-red-600 hover:bg-red-700"
        >
          {form.formState.isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Updating...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Update Password
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
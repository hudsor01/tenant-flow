# Profiles

## Description
User profile management for both owners and tenants. Includes contact information updates, password management, and account details. Profile changes apply across the platform.

## Shell
true

## Views
- **My Profile**: Current user's profile with editable fields
- **Edit Profile**: Form for updating profile information
- **Change Password**: Dedicated view for password update with current password verification

## Data
- **User**: All user fields including name, email, phone, avatar
- **Tenant**: Additional tenant fields if user is tenant (emergency contact)
- **PropertyOwner**: Additional owner fields if user is owner (business info)

## Actions
- **Update Profile**: Save profile changes
- **Upload Avatar**: Change profile picture
- **Remove Avatar**: Delete profile picture
- **Change Password**: Update password with verification
- **Update Phone**: Change phone number
- **Update Emergency Contact**: Change emergency contact (tenants)

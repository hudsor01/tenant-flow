// Profiles Section Types

export interface ProfilesProps {
	// Current user profile
	profile: ProfileInfo

	// Additional owner/tenant fields
	ownerProfile?: OwnerProfileInfo
	tenantProfile?: TenantProfileInfo

	// Callbacks
	onUpdateProfile: (data: ProfileUpdateData) => void
	onUploadAvatar: (file: File) => void
	onRemoveAvatar: () => void
	onChangePassword: (currentPassword: string, newPassword: string) => void
	onUpdatePhone: (phone: string) => void
	onUpdateEmergencyContact: (data: EmergencyContactData) => void
}

export interface ProfileInfo {
	id: string
	email: string
	fullName: string
	firstName: string
	lastName: string
	phone?: string
	avatarUrl?: string
	userType: UserType
	status: UserStatus
	createdAt: string
	updatedAt: string
}

export interface OwnerProfileInfo {
	businessName?: string
	businessType?: string
	taxId?: string
	stripeConnected: boolean
	propertiesCount: number
	unitsCount: number
}

export interface TenantProfileInfo {
	dateOfBirth?: string
	emergencyContactName?: string
	emergencyContactPhone?: string
	emergencyContactRelationship?: string
	identityVerified: boolean
	currentPropertyName?: string
	currentUnitNumber?: string
	moveInDate?: string
}

export interface ProfileUpdateData {
	firstName?: string
	lastName?: string
	phone?: string
}

export interface EmergencyContactData {
	name: string
	phone: string
	relationship: string
}

export interface PasswordChangeData {
	currentPassword: string
	newPassword: string
	confirmPassword: string
}

export type UserType = 'owner' | 'tenant' | 'manager' | 'admin'
export type UserStatus = 'active' | 'inactive' | 'suspended'

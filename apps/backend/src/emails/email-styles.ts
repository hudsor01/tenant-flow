/**
 * Email Styles Constants
 *
 * Centralized styles for React Email components
 * Extracted from inline styles for better maintainability
 */

// ============================================================
// SHARED CONSTANTS
// ============================================================

export const COLORS = {
	primary: '#007bff',
	success: '#28a745',
	warning: '#ffc107',
	danger: '#dc3545',
	info: '#17a2b8',
	muted: '#6c757d',
	text: '#333',
	heading: '#2c3e50',
	background: '#f8f9fa',
	border: '#e9ecef',
	white: '#ffffff'
} as const

export const TYPOGRAPHY = {
	fontFamily: 'Arial, sans-serif',
	lineHeight: '1.6',
	sizes: {
		h1: '24px',
		h2: '20px',
		base: '16px',
		small: '14px'
	},
	weights: {
		normal: 'normal',
		bold: 'bold'
	}
} as const

export const SPACING = {
	padding: {
		container: '20px',
		content: '20px',
		box: '15px',
		badge: '8px 12px',
		button: '14px 28px'
	},
	margin: {
		section: '20px 0',
		text: '16px 0',
		bottom: '20px'
	},
	borderRadius: {
		small: '4px',
		medium: '8px'
	}
} as const

// ============================================================
// BASE STYLES
// ============================================================

export const main = {
	fontFamily: TYPOGRAPHY.fontFamily,
	lineHeight: TYPOGRAPHY.lineHeight,
	color: COLORS.text,
	backgroundColor: COLORS.background
}

export const container = {
	maxWidth: '600px',
	margin: '0 auto',
	padding: SPACING.padding.container
}

export const header = {
	backgroundColor: COLORS.background,
	padding: SPACING.padding.container,
	borderRadius: SPACING.borderRadius.medium,
	marginBottom: SPACING.margin.bottom
}

export const h1 = {
	color: COLORS.heading,
	margin: '0 0 10px 0',
	fontSize: TYPOGRAPHY.sizes.h1
}

export const h2 = {
	color: COLORS.heading,
	marginBottom: SPACING.margin.bottom,
	fontSize: TYPOGRAPHY.sizes.h2
}

// ============================================================
// STATUS BADGES
// ============================================================

export const signatureBadge = {
	backgroundColor: COLORS.warning,
	color: COLORS.text,
	padding: SPACING.padding.badge,
	borderRadius: SPACING.borderRadius.small,
	display: 'inline-block',
	fontWeight: TYPOGRAPHY.weights.bold,
	fontSize: TYPOGRAPHY.sizes.small
}

export const activeBadge = {
	backgroundColor: COLORS.success,
	color: COLORS.white,
	padding: SPACING.padding.badge,
	borderRadius: SPACING.borderRadius.small,
	display: 'inline-block',
	fontWeight: TYPOGRAPHY.weights.bold,
	fontSize: TYPOGRAPHY.sizes.small
}

export const inviteBadge = {
	backgroundColor: COLORS.primary,
	color: COLORS.white,
	padding: SPACING.padding.badge,
	borderRadius: SPACING.borderRadius.small,
	display: 'inline-block',
	fontWeight: TYPOGRAPHY.weights.bold,
	fontSize: TYPOGRAPHY.sizes.small
}

export const successBadge = {
	backgroundColor: COLORS.success,
	color: COLORS.white,
	padding: SPACING.padding.badge,
	borderRadius: SPACING.borderRadius.small,
	display: 'inline-block',
	fontWeight: TYPOGRAPHY.weights.bold,
	fontSize: TYPOGRAPHY.sizes.small
}

export const canceledBadge = {
	backgroundColor: COLORS.muted,
	color: COLORS.white,
	padding: SPACING.padding.badge,
	borderRadius: SPACING.borderRadius.small,
	display: 'inline-block',
	fontWeight: TYPOGRAPHY.weights.bold,
	fontSize: TYPOGRAPHY.sizes.small
}

export const badge = {
	color: COLORS.white,
	padding: SPACING.padding.badge,
	borderRadius: SPACING.borderRadius.small,
	display: 'inline-block',
	fontWeight: TYPOGRAPHY.weights.bold,
	fontSize: TYPOGRAPHY.sizes.small
}

// ============================================================
// CONTENT STYLES
// ============================================================

export const content = {
	backgroundColor: COLORS.white,
	border: `1px solid ${COLORS.border}`,
	borderRadius: SPACING.borderRadius.medium,
	padding: SPACING.padding.content,
	marginBottom: SPACING.margin.bottom
}

export const text = {
	margin: SPACING.margin.text,
	fontSize: TYPOGRAPHY.sizes.base
}

// ============================================================
// MESSAGE BOXES
// ============================================================

export const messageBox = {
	backgroundColor: '#e8f4fd',
	padding: SPACING.padding.box,
	borderRadius: SPACING.borderRadius.small,
	margin: SPACING.margin.section,
	borderLeft: `4px solid ${COLORS.primary}`
}

export const messageTitle = {
	margin: '0 0 10px 0',
	fontSize: TYPOGRAPHY.sizes.small
}

export const messageText = {
	margin: '0',
	fontSize: TYPOGRAPHY.sizes.small,
	fontStyle: 'italic'
}

export const actionBox = {
	backgroundColor: '#fff3cd',
	padding: SPACING.padding.box,
	borderRadius: SPACING.borderRadius.small,
	margin: SPACING.margin.section,
	borderLeft: `4px solid ${COLORS.warning}`
}

export const actionText = {
	margin: '0',
	fontSize: TYPOGRAPHY.sizes.small,
	color: '#856404'
}

export const successBox = {
	backgroundColor: '#d4edda',
	padding: SPACING.padding.box,
	borderRadius: SPACING.borderRadius.small,
	margin: SPACING.margin.section,
	borderLeft: `4px solid ${COLORS.success}`
}

export const successText = {
	margin: '0',
	fontSize: TYPOGRAPHY.sizes.small,
	color: '#155724'
}

export const detailsBox = {
	backgroundColor: COLORS.background,
	padding: SPACING.padding.box,
	borderRadius: SPACING.borderRadius.small,
	margin: SPACING.margin.section,
	border: `1px solid ${COLORS.border}`
}

export const detailsTitle = {
	margin: '0 0 10px 0',
	fontSize: TYPOGRAPHY.sizes.small
}

export const detailsText = {
	margin: '0',
	fontSize: TYPOGRAPHY.sizes.small,
	lineHeight: '1.8'
}

export const benefitsBox = {
	backgroundColor: '#e8f4fd',
	padding: SPACING.padding.box,
	borderRadius: SPACING.borderRadius.small,
	margin: SPACING.margin.section,
	borderLeft: `4px solid ${COLORS.primary}`
}

export const benefitsTitle = {
	margin: '0 0 10px 0',
	fontSize: TYPOGRAPHY.sizes.base
}

export const benefitsList = {
	margin: '0',
	fontSize: TYPOGRAPHY.sizes.small,
	lineHeight: '1.8'
}

export const paymentDetails = {
	backgroundColor: COLORS.background,
	padding: SPACING.padding.box,
	borderRadius: SPACING.borderRadius.small,
	margin: '15px 0'
}

export const details = {
	margin: '0',
	fontSize: TYPOGRAPHY.sizes.base
}

export const urgentNotice = {
	backgroundColor: '#fff3cd',
	border: '1px solid #ffeaa7',
	padding: SPACING.padding.box,
	borderRadius: SPACING.borderRadius.small,
	margin: SPACING.margin.section
}

export const urgentText = {
	color: '#856404',
	margin: '10px 0 0 0',
	fontSize: TYPOGRAPHY.sizes.base
}

export const cancellationDetails = {
	backgroundColor: COLORS.background,
	padding: SPACING.padding.box,
	borderRadius: SPACING.borderRadius.small,
	margin: '15px 0'
}

export const smallText = {
	color: COLORS.muted,
	fontSize: TYPOGRAPHY.sizes.small
}

export const comeBackNotice = {
	backgroundColor: '#e7f3ff',
	border: '1px solid #b3d9ff',
	padding: SPACING.padding.box,
	borderRadius: SPACING.borderRadius.small,
	margin: SPACING.margin.section
}

export const comeBackTitle = {
	margin: '0 0 10px 0',
	fontSize: TYPOGRAPHY.sizes.base
}

export const comeBackText = {
	margin: '0',
	fontSize: TYPOGRAPHY.sizes.base
}

export const securityNotice = {
	backgroundColor: '#fff3cd',
	padding: SPACING.padding.box,
	borderRadius: SPACING.borderRadius.small,
	marginBottom: SPACING.margin.bottom,
	borderLeft: `4px solid ${COLORS.warning}`
}

export const securityText = {
	margin: '0',
	fontSize: TYPOGRAPHY.sizes.small,
	color: '#856404'
}

// ============================================================
// BUTTONS AND INTERACTIONS
// ============================================================

export const buttonContainer = {
	textAlign: 'center' as const,
	margin: '30px 0'
}

export const button = {
	backgroundColor: COLORS.primary,
	color: COLORS.white,
	padding: SPACING.padding.button,
	textDecoration: 'none',
	borderRadius: '6px',
	display: 'inline-block',
	fontWeight: TYPOGRAPHY.weights.bold,
	fontSize: TYPOGRAPHY.sizes.base
}

export const secondaryButton = {
	backgroundColor: COLORS.muted,
	color: COLORS.white,
	padding: '10px 20px',
	textDecoration: 'none',
	borderRadius: SPACING.borderRadius.small,
	display: 'inline-block',
	margin: '0 5px'
}

export const helpText = {
	margin: SPACING.margin.text,
	fontSize: TYPOGRAPHY.sizes.small,
	color: COLORS.muted,
	textAlign: 'center' as const
}

export const expiryText = {
	margin: SPACING.margin.text,
	fontSize: TYPOGRAPHY.sizes.small,
	color: COLORS.muted,
	textAlign: 'center' as const
}

export const linkContainer = {
	textAlign: 'center' as const,
	margin: SPACING.margin.section
}

// ============================================================
// LAYOUT AND SEPARATORS
// ============================================================

export const hr = {
	borderColor: COLORS.border,
	margin: '30px 0'
}

export const footer = {
	fontSize: TYPOGRAPHY.sizes.small,
	color: COLORS.muted,
	textAlign: 'center' as const
}

export const footerText = {
	margin: '8px 0'
}

export const link = {
	color: COLORS.primary
}

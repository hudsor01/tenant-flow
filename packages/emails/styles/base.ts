// Base styles for email templates
export const baseStyles = {
	container: {
		backgroundColor: '#ffffff',
		margin: '0 auto',
		padding: '20px 0 48px',
		width: '560px',
		maxWidth: '100%'
	},
	body: {
		backgroundColor: '#f6f9fc',
		fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif'
	},
	logo: {
		width: '42px',
		height: '42px'
	},
	heading: {
		fontSize: '24px',
		fontWeight: 'bold',
		color: '#333333',
		margin: '16px 0'
	},
	text: {
		fontSize: '16px',
		lineHeight: '26px',
		color: '#666666'
	},
	section: {
		margin: '16px 0',
		padding: '0'
	},
	listItem: {
		fontSize: '16px',
		lineHeight: '26px',
		color: '#666666',
		marginBottom: '8px'
	},
	button: {
		backgroundColor: '#3182ce',
		borderRadius: '5px',
		color: '#fff',
		fontSize: '16px',
		fontWeight: 'bold',
		textDecoration: 'none',
		textAlign: 'center' as const,
		display: 'block',
		padding: '12px 24px',
		margin: '16px 0'
	},
	footer: {
		color: '#8898aa',
		fontSize: '12px',
		marginTop: '32px'
	}
}
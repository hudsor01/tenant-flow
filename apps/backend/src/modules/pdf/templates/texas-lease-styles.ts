import { StyleSheet } from '@react-pdf/renderer'

export const styles = StyleSheet.create({
	page: {
		padding: 50,
		fontSize: 11,
		lineHeight: 1.6,
		fontFamily: 'Helvetica'
	},
	title: {
		fontSize: 16,
		fontWeight: 'bold',
		textAlign: 'center',
		marginBottom: 20,
		textDecoration: 'underline'
	},
	section: {
		marginBottom: 15
	},
	sectionTitle: {
		fontSize: 11,
		fontWeight: 'bold',
		marginBottom: 5
	},
	paragraph: {
		marginBottom: 10,
		textAlign: 'justify'
	},
	subsection: {
		marginLeft: 20,
		marginBottom: 8
	},
	bold: {
		fontWeight: 'bold'
	},
	signatureSection: {
		marginTop: 30,
		marginBottom: 15
	},
	signatureLine: {
		borderBottomWidth: 1,
		borderBottomColor: '#000',
		width: 300,
		marginTop: 20,
		marginBottom: 5
	}
})

export type TexasLeaseStyles = typeof styles

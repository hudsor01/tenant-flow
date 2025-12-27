/**
 * PDF Styles - StyleSheet definitions for React-PDF components
 *
 * Extracted from pdf-generator.service.ts for maintainability.
 * Used by invoice and lease agreement PDF generation.
 */

import { StyleSheet } from '@react-pdf/renderer'

/**
 * Invoice PDF styles
 */
export const invoiceStyles = StyleSheet.create({
	page: {
		padding: 30,
		fontFamily: 'Helvetica',
		fontSize: 11,
		color: '#333333'
	},
	header: {
		borderBottomWidth: 2,
		borderBottomColor: '#007bff',
		paddingBottom: 15,
		marginBottom: 25
	},
	companyName: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#007bff',
		marginBottom: 5
	},
	companyAddress: {
		fontSize: 10,
		color: '#666666'
	},
	invoiceMeta: {
		marginBottom: 25,
		alignItems: 'flex-end'
	},
	invoiceTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 10
	},
	metaText: {
		fontSize: 10,
		marginBottom: 3
	},
	customerInfo: {
		marginBottom: 25
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: 'bold',
		marginBottom: 8
	},
	customerName: {
		fontSize: 11,
		marginBottom: 3
	},
	customerEmail: {
		fontSize: 10,
		color: '#666666'
	},
	table: {
		marginBottom: 25
	},
	tableHeader: {
		flexDirection: 'row',
		backgroundColor: '#f8f9fa',
		borderBottomWidth: 1,
		borderBottomColor: '#dddddd',
		paddingVertical: 8,
		paddingHorizontal: 10
	},
	tableColHeader: {
		flex: 1,
		fontSize: 10,
		fontWeight: 'bold'
	},
	tableRow: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#eeeeee',
		paddingVertical: 10,
		paddingHorizontal: 10
	},
	tableCol: {
		flex: 1,
		fontSize: 10
	},
	amountCol: {
		textAlign: 'right',
		width: 100,
		flex: 0
	},
	totalRow: {
		flexDirection: 'row',
		backgroundColor: '#f8f9fa',
		paddingVertical: 12,
		paddingHorizontal: 10,
		marginTop: 5
	},
	totalLabel: {
		flex: 1,
		fontSize: 11,
		fontWeight: 'bold'
	},
	totalAmount: {
		fontSize: 11,
		fontWeight: 'bold'
	},
	footer: {
		marginTop: 40,
		fontSize: 10,
		color: '#666666',
		textAlign: 'center'
	}
})

/**
 * Lease Agreement PDF styles
 */
export const leaseStyles = StyleSheet.create({
	page: {
		padding: 40,
		fontFamily: 'Times-Roman',
		fontSize: 11,
		lineHeight: 1.6,
		color: '#333333'
	},
	title: {
		textAlign: 'center',
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 25,
		textDecoration: 'underline'
	},
	propertyInfo: {
		backgroundColor: '#f8f9fa',
		padding: 15,
		borderLeftWidth: 4,
		borderLeftColor: '#007bff',
		marginVertical: 20
	},
	propertyLabel: {
		fontSize: 11,
		fontWeight: 'bold'
	},
	section: {
		marginBottom: 20
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: 'bold',
		marginBottom: 8
	},
	text: {
		fontSize: 11,
		marginBottom: 5
	},
	termItem: {
		fontSize: 11,
		marginBottom: 8,
		paddingLeft: 15
	},
	signatures: {
		marginTop: 40
	},
	signatureRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 20
	},
	signatureBlock: {
		width: '45%'
	},
	signatureLine: {
		borderBottomWidth: 1,
		borderBottomColor: '#333333',
		marginBottom: 8,
		marginTop: 25
	},
	signatureLabel: {
		fontSize: 10,
		fontWeight: 'bold',
		marginBottom: 3
	},
	signatureDate: {
		fontSize: 10
	}
})

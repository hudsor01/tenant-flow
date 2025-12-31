// React needed for JSX transform at runtime
// Force classic JSX runtime for this file (Jest requires React in scope)
/* @jsxRuntime classic */
import * as React from 'react'
import { Document, Page } from '@react-pdf/renderer'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'
import {
	LeasePageFiveSections,
	LeasePageFourSections,
	LeasePageOneSections,
	LeasePageThreeSections,
	LeasePageTwoSections
} from './components/lease-sections'
import { styles } from './texas-lease-styles'

// Register fonts (optional - uses default if not specified)
// Font.register({
// 	family: 'Roboto',
// 	src: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxP.ttf'
// })

interface TexasLeaseTemplateProps {
	data: LeaseGenerationFormData
}

// Helper function to get ordinal suffix for day numbers (1st, 2nd, 3rd, etc.)
const getOrdinalSuffix = (day: number): string => {
	if (day === 1 || day === 21 || day === 31) return 'st'
	if (day === 2 || day === 22) return 'nd'
	if (day === 3 || day === 23) return 'rd'
	return 'th'
}

// Defensive helpers to avoid runtime crashes when optional numeric data is missing
const getNumberOrFallback = (
	value: number | undefined | null,
	fallback = 0
): number =>
	typeof value === 'number' && Number.isFinite(value) ? value : fallback

const formatCurrency = (
	value: number | undefined | null,
	fallback = 0
): string => getNumberOrFallback(value, fallback).toFixed(2)

export function TexasLeaseTemplate({ data }: TexasLeaseTemplateProps) {
	// Format date helper
	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr)
		return date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		})
	}

	// Extract day/month/year for agreement date
	const agreementDate = new Date(data.agreementDate)
	const agreementDay = agreementDate.getDate()
	const agreementMonth = agreementDate.toLocaleDateString('en-US', {
		month: 'long'
	})
	const agreementYear = agreementDate.getFullYear()

	// Calculate hold over rent
	const holdOverRent =
		getNumberOrFallback(data.rent_amount) *
		getNumberOrFallback(data.holdOverRentMultiplier, 1.2)

	return (
		<Document>
			<Page size="A4" style={styles.page}>
				<LeasePageOneSections
					data={data}
					styles={styles}
					formatDate={formatDate}
					getOrdinalSuffix={getOrdinalSuffix}
					formatCurrency={formatCurrency}
					agreementDay={agreementDay}
					agreementMonth={agreementMonth}
					agreementYear={agreementYear}
					holdOverRent={holdOverRent}
				/>
			</Page>

			<Page size="A4" style={styles.page}>
				<LeasePageTwoSections
					data={data}
					styles={styles}
					formatDate={formatDate}
					getOrdinalSuffix={getOrdinalSuffix}
					formatCurrency={formatCurrency}
					agreementDay={agreementDay}
					agreementMonth={agreementMonth}
					agreementYear={agreementYear}
					holdOverRent={holdOverRent}
				/>
			</Page>

			<Page size="A4" style={styles.page}>
				<LeasePageThreeSections
					data={data}
					styles={styles}
					formatDate={formatDate}
					getOrdinalSuffix={getOrdinalSuffix}
					formatCurrency={formatCurrency}
					agreementDay={agreementDay}
					agreementMonth={agreementMonth}
					agreementYear={agreementYear}
					holdOverRent={holdOverRent}
				/>
			</Page>

			<Page size="A4" style={styles.page}>
				<LeasePageFourSections
					data={data}
					styles={styles}
					formatDate={formatDate}
					getOrdinalSuffix={getOrdinalSuffix}
					formatCurrency={formatCurrency}
					agreementDay={agreementDay}
					agreementMonth={agreementMonth}
					agreementYear={agreementYear}
					holdOverRent={holdOverRent}
				/>
			</Page>

			<Page size="A4" style={styles.page}>
				<LeasePageFiveSections
					data={data}
					styles={styles}
					formatDate={formatDate}
					getOrdinalSuffix={getOrdinalSuffix}
					formatCurrency={formatCurrency}
					agreementDay={agreementDay}
					agreementMonth={agreementMonth}
					agreementYear={agreementYear}
					holdOverRent={holdOverRent}
				/>
			</Page>
		</Document>
	)
}

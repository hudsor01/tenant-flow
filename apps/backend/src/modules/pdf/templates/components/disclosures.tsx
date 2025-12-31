/* @jsxRuntime classic */
import * as React from 'react'
import { Text, View } from '@react-pdf/renderer'
import type { LeaseGenerationFormData } from '@repo/shared/validation/lease-generation.schemas'
import type { TexasLeaseStyles } from '../texas-lease-styles'

interface LeadBasedPaintDisclosureProps {
	data: LeaseGenerationFormData
	styles: TexasLeaseStyles
}

export function LeadBasedPaintDisclosure({
	data,
	styles
}: LeadBasedPaintDisclosureProps) {
	return (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>34. LEAD-BASED PAINT DISCLOSURE.</Text>
			<Text style={styles.paragraph}>
				{data.propertyBuiltBefore1978
					? 'If the premises were constructed prior to 1978, Tenant acknowledges receipt of the form entitled "LEAD-BASED PAINT DISCLOSURE" which contains disclosure of information on lead-based paint and/or lead-based paint hazards.'
					: 'The premises were constructed after 1978, therefore lead-based paint disclosure is not required.'}
			</Text>
		</View>
	)
}

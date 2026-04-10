import type { Metadata } from 'next'

import { PageLayout } from '#components/layout/page-layout'
import { createPageMetadata } from '#lib/seo/page-metadata'
import { SuccessClient } from './success-client'

export const metadata: Metadata = createPageMetadata({
	title: 'Payment Successful',
	description: 'Your TenantFlow subscription is now active.',
	path: '/pricing/success',
	noindex: true
})

export default function CheckoutSuccessPage() {
	return (
		<PageLayout>
			<SuccessClient />
		</PageLayout>
	)
}

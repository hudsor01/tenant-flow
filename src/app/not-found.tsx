import { PageLayout } from '#components/layout/page-layout'
import { NotFoundPage } from '#components/shared/not-found-page'

// Public 404: renders the marketing navbar + footer so a signed-out
// visitor who mistypes a URL can recover into Features / Pricing /
// Compare / Sign In instead of being stranded with one "Back to Home"
// button.
export default function NotFound() {
	return (
		<PageLayout>
			<NotFoundPage dashboardHref="/" />
		</PageLayout>
	)
}

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function AnalyticsIndexPage() {
	redirect('/manage/analytics/overview')
}

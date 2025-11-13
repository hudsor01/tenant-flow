'use client'

import { redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function AnalyticsIndexPage() {
	useEffect(() => {
		redirect('/manage/analytics/overview')
	}, [])
	
	return null
}

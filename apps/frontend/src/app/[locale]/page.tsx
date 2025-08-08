/**
 * Locale redirect page - English only
 * Redirects to main homepage since we don't support localization
 */

import { redirect } from 'next/navigation'

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

export default async function LocalePage({ params: _params }: LocalePageProps) {
  // Always redirect to main homepage since we're English-only
  redirect('/')
}
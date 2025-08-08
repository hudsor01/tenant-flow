import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n/config';
interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  // In Next.js 15, params is a Promise
  const resolvedParams = await params;
  
  // Validate locale
  if (!isValidLocale(resolvedParams.locale)) {
    notFound();
  }

  return (
    <div lang={resolvedParams.locale}>
      {children}
    </div>
  );
}

// Generate static params for all supported locales
export function generateStaticParams() {
  return [
    { locale: 'en' },
    { locale: 'es' },
    { locale: 'fr' },
    { locale: 'de' },
  ];
}
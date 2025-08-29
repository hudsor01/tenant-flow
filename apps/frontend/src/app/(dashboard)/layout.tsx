// This layout applies to all routes under the (dashboard) group
// Force dynamic rendering so build does not attempt to prerender
export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}


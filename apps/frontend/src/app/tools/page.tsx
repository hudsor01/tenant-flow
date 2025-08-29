import Link from 'next/link'

export const metadata = {
  title: 'Tools | TenantFlow',
  description: 'Free property management tools from TenantFlow.'
}

export default function ToolsIndexPage() {
  const tools = [
    { href: '/tools/invoice-generator', label: 'Invoice Generator' },
    { href: '/tools/rent-calculator', label: 'Rent Calculator' },
    { href: '/tools/maintenance-tracker', label: 'Maintenance Tracker' }
  ]

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold">Free Tools</h1>
      <p className="text-muted-foreground mb-8">
        Explore helpful tools while we build out richer experiences.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {tools.map(tool => (
          <li key={tool.href} className="rounded-lg border p-4 hover:bg-muted/30">
            <Link href={tool.href} className="font-medium">
              {tool.label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}


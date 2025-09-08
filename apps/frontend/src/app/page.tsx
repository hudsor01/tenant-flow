import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Navbar } from '@/components/navbar'

export default function HomePage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        <div className="pt-20 px-4 max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-8">
            Welcome to TenantFlow
          </h1>
          <p className="text-xl mb-8 text-muted-foreground">
            Streamline your property management with our comprehensive platform
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
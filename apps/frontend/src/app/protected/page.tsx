import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export default async function ProtectedPage() {
  // Create a mock request object for server context
  const request = new Request('http://localhost:3000/protected', {
    headers: {
      Cookie: (await cookies()).toString()
    }
  })
  
  const { supabase } = createClient(request)

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect('/auth/login')
  }

  return (
    <div className="flex h-svh w-full items-center justify-center gap-2">
      <p>
        Hello <span>{data.user.email}</span>
      </p>
      <form action="/auth/signout" method="post">
        <button type="submit" className="bg-red-500 text-white px-4 py-2 rounded">
          Sign Out
        </button>
      </form>
    </div>
  )
}

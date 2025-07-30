import { Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function createTestUser(email: string, role: 'OWNER' | 'TENANT' | 'MANAGER' = 'OWNER'): Promise<string> {
  // Create user in Supabase Auth
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'testpassword123',
    email_confirm: true
  })

  if (authError) {
    throw new Error(`Failed to create auth user: ${authError.message}`)
  }

  // Create user record in database
  const { data: dbUser, error: dbError } = await supabaseAdmin
    .from('User')
    .insert({
      id: authUser.user.id,
      supabaseId: authUser.user.id,
      email: email,
      name: `Test ${role}`,
      role: role
    })
    .select()
    .single()

  if (dbError) {
    // Cleanup auth user if database insert fails
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
    throw new Error(`Failed to create database user: ${dbError.message}`)
  }

  return dbUser.id
}

export async function cleanupTestUser(userId: string): Promise<void> {
  try {
    // Delete from auth
    await supabaseAdmin.auth.admin.deleteUser(userId)
    
    // Database records should cascade delete
  } catch (error) {
    console.error(`Failed to cleanup user ${userId}:`, error)
  }
}

export async function loginAs(page: Page | null, email: string): Promise<{ token: string; user: any }> {
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password: 'testpassword123'
  })

  if (error) {
    throw new Error(`Failed to login as ${email}: ${error.message}`)
  }

  if (page) {
    // Set session in browser
    await page.goto('/')
    await page.evaluate((session) => {
      localStorage.setItem('supabase.auth.token', JSON.stringify(session))
    }, data.session)
  }

  return {
    token: data.session.access_token,
    user: data.user
  }
}
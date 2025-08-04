import { Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const testPassword = process.env.TEST_USER_PASSWORD || 'test_' + Math.random().toString(36).substring(7) + '_password'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

import { Role, User } from '@repo/shared'

export async function createTestUser(email: string, role: Role = Role.OWNER): Promise<string> {
  // Create user in Supabase Auth
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: testPassword,
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

export async function loginAs(page: Page | null, email: string): Promise<{ token: string; user: User }> {
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password: testPassword
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

  // Map Supabase user to centralized User type
  const user: User = {
    id: data.user.id,
    supabaseId: data.user.id,
    email: data.user.email ?? '',
    name: data.user.user_metadata?.name ?? '',
    role: data.user.user_metadata?.role ?? Role.OWNER
  }

  return {
    token: data.session.access_token,
    user
  }
}

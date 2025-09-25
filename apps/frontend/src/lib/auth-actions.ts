'use client'

import type { ClientAuthResponse, SignupData } from '@repo/shared'
import { supabaseClient } from '@repo/shared'

/**
 * Client-side signup using Supabase Auth
 */
export async function signUp(data: SignupData): Promise<ClientAuthResponse> {
	try {
		const { email, password, firstName, lastName, company } = data

		const { data: authData, error } = await supabaseClient.auth.signUp({
			email,
			password,
			options: {
				data: {
					first_name: firstName,
					last_name: lastName,
					company: company || null,
					full_name: `${firstName} ${lastName}`
				}
			}
		})

		if (error) {
			return {
				success: false,
				error: error.message
			}
		}

		return {
			success: true,
			data: authData
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Signup failed'
		}
	}
}

/**
 * Client-side login using Supabase Auth
 */
export async function signIn(
	email: string,
	password: string
): Promise<ClientAuthResponse> {
	try {
		const { data, error } = await supabaseClient.auth.signInWithPassword({
			email,
			password
		})

		if (error) {
			return {
				success: false,
				error: error.message
			}
		}

		return {
			success: true,
			data
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Login failed'
		}
	}
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const BasicInfoSchema = z.object({
	name: z.string().min(1),
	propertyType: z.string().min(1),
	address: z.string().min(1),
	city: z.string().min(1),
	state: z.string().length(2),
	zipCode: z.string().min(5).max(10),
	description: z.string().optional()
})

export type BasicInfoInput = z.infer<typeof BasicInfoSchema>

export async function createPropertyBasicInfo(input: BasicInfoInput) {
	const parsed = BasicInfoSchema.parse(input)
	const supabase = await createClient()

	const { data, error } = await supabase
		.from('property')
		.insert({
			name: parsed.name,
			propertyType: parsed.propertyType,
			address: parsed.address,
			city: parsed.city,
			state: parsed.state,
			zipCode: parsed.zipCode,
			description: parsed.description ?? null
		})
		.select('*')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	return data
}

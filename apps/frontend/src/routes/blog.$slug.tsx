import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import BlogArticle from '@/pages/BlogArticle'

const blogParamsSchema = z.object({
	slug: z.string().min(1, 'Slug is required'),
})

export const Route = createFileRoute('/blog/$slug')({
	validateSearch: z.object({}).optional(),
	params: blogParamsSchema,
	component: BlogArticle,
})

/**
 * Blog utility exports
 * Re-exports from actual blog hooks for compatibility
 */

import { useBlogArticleData } from './blog-data'

export function useRelatedBlogArticles(
	articleId?: string,
	_category?: string,
	_limit?: number
) {
	const { getRelatedArticles } = useBlogArticleData()
	const articles = articleId ? getRelatedArticles(articleId, _limit) : []

	return {
		data: articles,
		isLoading: false,
		error: null
	}
}

export function useBlogArticle(_slug?: string) {
	const { getArticleBySlug } = useBlogArticleData()
	const article = _slug ? getArticleBySlug(_slug) : null

	return {
		data: article,
		isLoading: false,
		error: null
	}
}

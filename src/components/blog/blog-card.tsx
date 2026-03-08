import Link from 'next/link'
import Image from 'next/image'
import { cn } from '#lib/utils'
import type { BlogListItem } from '#hooks/api/query-keys/blog-keys'

interface BlogCardProps {
	post: BlogListItem
	className?: string
}

export function BlogCard({ post, className }: BlogCardProps) {
	return (
		<Link
			href={`/blog/${post.slug}`}
			className={cn(
				'group flex flex-col overflow-hidden rounded-lg border bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg',
				className
			)}
		>
			<div className="relative aspect-[16/10] overflow-hidden">
				{post.featured_image ? (
					<Image
						src={post.featured_image}
						alt={post.title}
						fill
						sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
						className="object-cover transition-transform duration-300 group-hover:scale-105"
					/>
				) : (
					<div className="h-full w-full bg-muted" />
				)}
			</div>

			<div className="flex flex-1 flex-col gap-2 p-4">
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
					<span>{post.category}</span>
					<span aria-hidden="true">-</span>
					<span>{post.reading_time} min read</span>
				</div>

				<h3 className="line-clamp-2 font-semibold leading-snug">
					{post.title}
				</h3>

				{post.excerpt && (
					<p className="line-clamp-3 text-sm text-muted-foreground">
						{post.excerpt}
					</p>
				)}
			</div>
		</Link>
	)
}

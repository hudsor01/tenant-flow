'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useQueryState, parseAsString, parseAsInteger } from 'nuqs'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Input } from '#components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Button } from '#components/ui/button'
import { Skeleton } from '#components/ui/skeleton'
import {
	documentSearchQueries,
	DOCUMENT_ENTITY_TYPES,
	SEARCH_PAGE_SIZE,
	type DocumentEntityType,
	type DocumentRow as DocumentRowData
} from '#hooks/api/query-keys/document-keys'
import { DocumentRow } from './document-row'
import { AlertTriangle, FolderArchive, Search } from 'lucide-react'

const ENTITY_TYPE_LABELS: Record<DocumentEntityType, string> = {
	property: 'Property',
	lease: 'Lease',
	tenant: 'Tenant',
	maintenance_request: 'Maintenance request'
}

const ANY_ENTITY = '__any__'

export function DocumentsVaultClient() {
	// URL-synced filters via nuqs so a shared link reproduces the search.
	const [queryParam, setQueryParam] = useQueryState(
		'q',
		parseAsString.withDefault('')
	)
	const [entityParam, setEntityParam] = useQueryState(
		'entity',
		parseAsString.withDefault(ANY_ENTITY)
	)
	const [pageParam, setPageParam] = useQueryState(
		'page',
		parseAsInteger.withDefault(0)
	)

	// Local input mirrors the URL search param but debounces before
	// committing — we don't want a query-fire on every keystroke.
	const [searchInput, setSearchInput] = useState(queryParam)
	useEffect(() => {
		const id = window.setTimeout(() => {
			if (searchInput !== queryParam) {
				void setQueryParam(searchInput || null)
				// Reset to page 0 when the query changes — current page may
				// be out of bounds for the new result set.
				void setPageParam(null)
			}
		}, 300)
		return () => window.clearTimeout(id)
	}, [searchInput, queryParam, setQueryParam, setPageParam])

	const entityType: DocumentEntityType | undefined =
		entityParam === ANY_ENTITY
			? undefined
			: (entityParam as DocumentEntityType)

	const { data, isLoading, isError, refetch } = useQuery(
		documentSearchQueries.list({
			...(queryParam ? { query: queryParam } : {}),
			...(entityType ? { entityType } : {}),
			page: pageParam
		})
	)

	const totalCount = data?.totalCount ?? 0
	const pageStart = pageParam * SEARCH_PAGE_SIZE
	const pageEnd = pageStart + (data?.rows.length ?? 0)
	const hasNextPage = pageEnd < totalCount
	const hasPrevPage = pageParam > 0

	return (
		<div className="container mx-auto space-y-6 py-6">
			<div className="flex items-center gap-3">
				<FolderArchive className="size-8 text-primary" />
				<div>
					<h1 className="typography-h2">Documents vault</h1>
					<p className="text-muted-foreground">
						Every PDF or image attached to your portfolio, in one place.
					</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Search & filter</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-3 md:grid-cols-[1fr_220px]">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
							<Input
								type="search"
								placeholder="Search by title, description, or tag..."
								className="pl-9"
								value={searchInput}
								onChange={e => setSearchInput(e.target.value)}
								aria-label="Search documents"
							/>
						</div>
						<Select
							value={entityParam}
							onValueChange={value => {
								void setEntityParam(value === ANY_ENTITY ? null : value)
								void setPageParam(null)
							}}
						>
							<SelectTrigger aria-label="Filter by entity type">
								<SelectValue placeholder="All types" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ANY_ENTITY}>All types</SelectItem>
								{DOCUMENT_ENTITY_TYPES.map(type => (
									<SelectItem key={type} value={type}>
										{ENTITY_TYPE_LABELS[type]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<CardTitle className="text-base">
						{totalCount > 0
							? `${totalCount} document${totalCount === 1 ? '' : 's'}`
							: 'Results'}
					</CardTitle>
					{totalCount > 0 && (
						<p className="text-xs text-muted-foreground">
							Showing {pageStart + 1}-{pageEnd} of {totalCount}
						</p>
					)}
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="space-y-2">
							{Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={i} className="h-12 w-full" />
							))}
						</div>
					) : isError ? (
						<EmptyState
							icon={<AlertTriangle className="size-8 text-destructive" />}
							title="We couldn't load your documents."
							action={
								<Button size="sm" variant="outline" onClick={() => { void refetch() }}>
									Try again
								</Button>
							}
						/>
					) : !data || data.rows.length === 0 ? (
						<EmptyState
							icon={<FolderArchive className="size-8 opacity-50" />}
							title={
								queryParam || entityType
									? 'No documents match your search.'
									: 'No documents uploaded yet.'
							}
							subtitle={
								queryParam || entityType
									? 'Try a different keyword or filter.'
									: 'Open a property, lease, tenant, or maintenance request to upload your first document.'
							}
						/>
					) : (
						<>
							<ul className="divide-y divide-border">
								{data.rows.map(doc => (
									<DocumentVaultRow key={doc.id} doc={doc} />
								))}
							</ul>
							{(hasPrevPage || hasNextPage) && (
								<div className="flex items-center justify-between pt-4 mt-2 border-t border-border">
									<Button
										size="sm"
										variant="outline"
										disabled={!hasPrevPage}
										onClick={() => { void setPageParam(pageParam - 1) }}
									>
										Previous
									</Button>
									<span className="text-xs text-muted-foreground">
										Page {pageParam + 1} of {Math.ceil(totalCount / SEARCH_PAGE_SIZE)}
									</span>
									<Button
										size="sm"
										variant="outline"
										disabled={!hasNextPage}
										onClick={() => { void setPageParam(pageParam + 1) }}
									>
										Next
									</Button>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

// Vault rows reuse the per-entity DocumentRow but omit `onDelete` —
// the vault is a read view; deletion happens on the entity detail
// page so list-cache invalidation stays scoped to that entity.
function DocumentVaultRow({ doc }: { doc: DocumentRowData }) {
	const [isOpen, setIsOpen] = useState(false)
	return <DocumentRow doc={doc} isOpen={isOpen} onOpenChange={setIsOpen} />
}

function EmptyState({
	icon,
	title,
	subtitle,
	action
}: {
	icon: React.ReactNode
	title: string
	subtitle?: string
	action?: React.ReactNode
}) {
	return (
		<div className="text-center py-12 text-muted-foreground space-y-3">
			<div className="flex justify-center">{icon}</div>
			<p className="text-sm font-medium text-foreground">{title}</p>
			{subtitle && <p className="text-xs">{subtitle}</p>}
			{action}
		</div>
	)
}

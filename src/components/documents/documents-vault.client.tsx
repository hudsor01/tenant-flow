'use client'

import { useEffect, useMemo, useState } from 'react'
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
import {
	DOCUMENT_CATEGORIES,
	DOCUMENT_CATEGORY_LABELS,
	type DocumentCategory
} from '#lib/validation/documents'
import { DocumentRow } from './document-row'
import { AlertTriangle, FolderArchive, Loader2, Search } from 'lucide-react'

const ENTITY_TYPE_LABELS: Record<DocumentEntityType, string> = {
	property: 'Property',
	lease: 'Lease',
	tenant: 'Tenant',
	maintenance_request: 'Maintenance request'
}

const ANY_ENTITY = '__any__'
const ANY_CATEGORY = '__any__'

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
	const [categoryParam, setCategoryParam] = useQueryState(
		'category',
		parseAsString.withDefault(ANY_CATEGORY)
	)
	const [pageParam, setPageParam] = useQueryState(
		'page',
		parseAsInteger.withDefault(0)
	)

	// Local input mirrors the URL search param but debounces before
	// committing — we don't want a query-fire on every keystroke.
	const [searchInput, setSearchInput] = useState(queryParam)

	// Sync searchInput when queryParam changes externally (browser back,
	// shared link landing). Without this, the debounce useEffect below
	// would clobber the external change and push the stale local value
	// back into the URL. The debounce's `searchInput !== queryParam`
	// guard short-circuits when both are equal, so there's no loop.
	useEffect(() => {
		setSearchInput(queryParam)
	}, [queryParam])

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

	// Validate the URL-supplied entity filter against the known set so a
	// bookmarked or attacker-tampered `?entity=banana` degrades to "All
	// types" instead of being passed unchecked into the RPC. Memoise so
	// the queryKey stays stable.
	const entityType = useMemo<DocumentEntityType | undefined>(() => {
		if (entityParam === ANY_ENTITY) return undefined
		return (DOCUMENT_ENTITY_TYPES as readonly string[]).includes(entityParam)
			? (entityParam as DocumentEntityType)
			: undefined
	}, [entityParam])

	// Same H2-style guard for category — `?category=banana` must NOT flow
	// into the RPC as a typed DocumentCategory. Empty string also degrades
	// to "Any" (the RPC treats null as "no filter").
	const category = useMemo<DocumentCategory | undefined>(() => {
		if (categoryParam === ANY_CATEGORY) return undefined
		return (DOCUMENT_CATEGORIES as readonly string[]).includes(categoryParam)
			? (categoryParam as DocumentCategory)
			: undefined
	}, [categoryParam])

	const { data, isLoading, isFetching, isError, refetch } = useQuery(
		documentSearchQueries.list({
			...(queryParam ? { query: queryParam } : {}),
			...(entityType ? { entityType } : {}),
			...(category ? { category } : {}),
			page: pageParam
		})
	)

	const totalCount = data?.totalCount ?? 0
	const pageStart = pageParam * SEARCH_PAGE_SIZE
	const pageEnd = pageStart + (data?.rows.length ?? 0)
	const hasNextPage = pageEnd < totalCount
	const hasPrevPage = pageParam > 0
	// Defer the "Showing X-Y" header during pagination refetches so the
	// stale page-0 row count doesn't display "Showing 51-100 of 51"
	// momentarily after clicking Next.
	const showRangeHeader = totalCount > 0 && !isFetching

	// Out-of-bounds page recovery (cycle-2 L1). If the user lands on a
	// `?page=N` whose offset is beyond `totalCount` (bookmarked link from
	// a since-shrunk portfolio, or hand-edited URL), the empty-rows
	// branch fires with the misleading "No documents uploaded yet"
	// copy and no recovery affordance. Auto-reset to page 0 when we
	// detect the mismatch — only AFTER the query has settled (data &&
	// !isFetching) so we don't reset during a transient fetch.
	const isOutOfBounds =
		!isFetching &&
		!!data &&
		data.rows.length === 0 &&
		totalCount > 0 &&
		pageParam > 0
	useEffect(() => {
		if (isOutOfBounds) void setPageParam(null)
	}, [isOutOfBounds, setPageParam])

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
					<div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
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
						<Select
							value={categoryParam}
							onValueChange={value => {
								void setCategoryParam(value === ANY_CATEGORY ? null : value)
								void setPageParam(null)
							}}
						>
							<SelectTrigger aria-label="Filter by category">
								<SelectValue placeholder="All categories" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ANY_CATEGORY}>All categories</SelectItem>
								{DOCUMENT_CATEGORIES.map(value => (
									<SelectItem key={value} value={value}>
										{DOCUMENT_CATEGORY_LABELS[value]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			<Card aria-busy={isFetching}>
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<CardTitle className="text-base flex items-center gap-2">
						{totalCount > 0
							? `${totalCount} document${totalCount === 1 ? '' : 's'}`
							: 'Results'}
						{isFetching && !isLoading && (
							<Loader2
								className="size-4 animate-spin text-muted-foreground"
								aria-hidden="true"
							/>
						)}
					</CardTitle>
					{showRangeHeader && (
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
								queryParam || entityType || category
									? 'No documents match your search.'
									: 'No documents uploaded yet.'
							}
							subtitle={
								queryParam || entityType || category
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

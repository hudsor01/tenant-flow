'use client'

import { useState } from 'react'
import {
	FileText,
	Upload,
	Search,
	Filter,
	MoreHorizontal,
	Download,
	Trash2,
	Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'

// Mock data matching PRD requirements
const mockDocuments = [
	{
		id: '1',
		name: 'Lease Agreement - Unit 101.pdf',
		type: 'Lease Agreement',
		size: '2.4 MB',
		uploaded: '2024-01-15',
		property: 'Sunset Apartments',
		unit: 'Unit 101',
		tags: ['lease', 'legal']
	},
	{
		id: '2',
		name: 'Insurance Certificate.pdf',
		type: 'Insurance',
		size: '1.2 MB',
		uploaded: '2024-01-10',
		property: 'Downtown Complex',
		unit: 'All Units',
		tags: ['insurance', 'required']
	},
	{
		id: '3',
		name: 'Property Photos - Building A.zip',
		type: 'Photos',
		size: '15.6 MB',
		uploaded: '2024-01-08',
		property: 'Sunset Apartments',
		unit: 'Building A',
		tags: ['photos', 'marketing']
	}
]

const documentTypes = [
	'All Types',
	'Lease Agreement',
	'Insurance',
	'Photos',
	'Legal',
	'Financial'
]

export default function DocumentsPage() {
	const [searchTerm, setSearchTerm] = useState('')
	const [selectedType, setSelectedType] = useState('All Types')

	const filteredDocuments = mockDocuments.filter(doc => {
		const matchesSearch =
			doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			doc.property.toLowerCase().includes(searchTerm.toLowerCase())
		const matchesType =
			selectedType === 'All Types' || doc.type === selectedType
		return matchesSearch && matchesType
	})

	const totalDocuments = mockDocuments.length
	const totalSize = mockDocuments.reduce(
		(acc, doc) => acc + parseFloat(doc.size),
		0
	)

	return (
		<div className="container mx-auto space-y-6 py-6">
			{/* Page Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						Documents
					</h1>
					<p className="text-muted-foreground">
						Manage property documents and files
					</p>
				</div>
				<Button>
					<Upload className="mr-2 h-4 w-4" />
					Upload Document
				</Button>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Documents
						</CardTitle>
						<FileText className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{totalDocuments}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Size
						</CardTitle>
						<FileText className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{totalSize.toFixed(1)} MB
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Document Types
						</CardTitle>
						<Filter className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{documentTypes.length - 1}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Recent Uploads
						</CardTitle>
						<Upload className="text-muted-foreground h-4 w-4" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{
								mockDocuments.filter(
									doc =>
										new Date(doc.uploaded) >
										new Date(
											Date.now() - 7 * 24 * 60 * 60 * 1000
										)
								).length
							}
						</div>
						<p className="text-muted-foreground text-xs">
							Last 7 days
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Search and Filters */}
			<div className="flex flex-col gap-4 sm:flex-row">
				<div className="relative flex-1">
<<<<<<< HEAD
					<Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
					<Input
						aria-label="Search documents by name or property..."
						placeholder="Search documents by name or property..."
						value={searchTerm}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setSearchTerm(e.target.value)
						}
=======
					<Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
					<Input
						placeholder="Search documents by name or property..."
						value={searchTerm}
						onChange={e => setSearchTerm(e.target.value)}
>>>>>>> origin/main
						className="pl-8"
					/>
				</div>
				<Select value={selectedType} onValueChange={setSelectedType}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Filter by type" />
					</SelectTrigger>
					<SelectContent>
						{documentTypes.map(type => (
							<SelectItem key={type} value={type}>
								{type}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Documents Table */}
			<Card>
				<CardHeader>
					<CardTitle>All Documents</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Document</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Property/Unit</TableHead>
								<TableHead>Size</TableHead>
								<TableHead>Uploaded</TableHead>
								<TableHead>Tags</TableHead>
								<TableHead className="text-right">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredDocuments.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={7}
										className="text-muted-foreground py-8 text-center"
									>
										No documents found matching your
										criteria
									</TableCell>
								</TableRow>
							) : (
								filteredDocuments.map(document => (
									<TableRow key={document.id}>
										<TableCell>
											<div className="flex items-center space-x-2">
												<FileText className="text-muted-foreground h-4 w-4" />
												<span className="font-medium">
													{document.name}
												</span>
											</div>
										</TableCell>
										<TableCell>
											<Badge variant="secondary">
												{document.type}
											</Badge>
										</TableCell>
										<TableCell>
											<div>
												<div className="font-medium">
													{document.property}
												</div>
												<div className="text-muted-foreground text-sm">
													{document.unit}
												</div>
											</div>
										</TableCell>
										<TableCell>{document.size}</TableCell>
										<TableCell>
											{document.uploaded}
										</TableCell>
										<TableCell>
											<div className="flex gap-1">
												{document.tags.map(tag => (
													<Badge
														key={tag}
														variant="outline"
														className="text-xs"
													>
														{tag}
													</Badge>
												))}
											</div>
										</TableCell>
										<TableCell className="text-right">
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														className="h-8 w-8 p-0"
													>
														<MoreHorizontal className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem>
														<Eye className="mr-2 h-4 w-4" />
														View
													</DropdownMenuItem>
													<DropdownMenuItem>
														<Download className="mr-2 h-4 w-4" />
														Download
													</DropdownMenuItem>
													<DropdownMenuItem className="text-destructive">
														<Trash2 className="mr-2 h-4 w-4" />
														Delete
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	)
}

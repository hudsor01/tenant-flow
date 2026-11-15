import { FileText } from "lucide-react";
import { LeaseTemplateBuilder } from "#components/leases/template/lease-template-builder.client";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card";

export default function LeaseTemplatePage() {
	return (
		<div className="container mx-auto space-y-6 py-6">
			<header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					<FileText className="hidden size-10 text-primary sm:block" />
					<div>
						<h1 className="typography-h2 tracking-tight">
							Lease Agreement Builder
						</h1>
						<p className="mb-0 text-muted-foreground">
							Choose from built-in clauses, add state notes where available, and
							preview a lease agreement you can download as a PDF.
						</p>
					</div>
				</div>
			</header>

			<Card>
				<CardHeader>
					<CardTitle>Workflow</CardTitle>
					<CardDescription>
						Four steps from clause selection to a downloadable PDF.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ul className="grid grid-cols-1 gap-4 pl-0 mt-0 mb-0 [&>li]:mb-0 text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
						<li>
							<strong className="text-foreground">1. Select clauses</strong>
							<p className="mb-0">
								Toggle sections on or off and review plain-language tooltips
								explaining what each clause does.
							</p>
						</li>
						<li>
							<strong className="text-foreground">2. Check state notes</strong>
							<p className="mb-0">
								Switch states to see built-in notes and recommended clauses for
								California, New York, Illinois, and Texas.
							</p>
						</li>
						<li>
							<strong className="text-foreground">3. Preview instantly</strong>
							<p className="mb-0">
								The PDF is built from the same HTML as this preview.
							</p>
						</li>
						<li>
							<strong className="text-foreground">4. Export PDF</strong>
							<p className="mb-0">
								Click Render PDF, then download it from the preview frame.
							</p>
						</li>
					</ul>
				</CardContent>
			</Card>

			<LeaseTemplateBuilder />
		</div>
	);
}

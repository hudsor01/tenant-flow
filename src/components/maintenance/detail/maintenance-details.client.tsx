"use client";

import {
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import {
	Edit2,
	Loader2,
	Mail,
	Phone,
	Printer,
	Trash2,
	User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DocumentsSection } from "#components/documents/documents-section";
import { Button } from "#components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#components/ui/card";
import { ConfirmDialog } from "#components/ui/confirm-dialog";
import { Skeleton } from "#components/ui/skeleton";
import { maintenanceQueries } from "#hooks/api/query-keys/maintenance-keys";
import { useDeleteMaintenanceRequest } from "#hooks/api/use-maintenance";
import { callGeneratePdfFromHtml } from "#hooks/api/use-report-mutations";
import { useIsClient } from "#hooks/use-is-client";
import { formatLocalYmd } from "#lib/formatters/date";
import { createLogger } from "#lib/frontend-logger";
import { userFacingErrorMessage } from "#lib/mutation-error-handler";
import { downloadBlob } from "#lib/reports/download-blob";
import { formatCurrency } from "#lib/utils/currency";
import { ContactRow } from "./contact-row";
import { ExpensesCard } from "./expenses-card";
import { MaintenanceHeaderCard } from "./maintenance-header-card";
import {
	generateTimeline,
	mailtoHref,
	spendToDate,
	telHref,
} from "./maintenance-utils";
import { PhotosCard } from "./photos-card";
import { TimelineCard } from "./timeline-card";
import { VendorCard } from "./vendor-card";
import { buildWorkOrderHtml } from "./work-order-template";

const logger = createLogger({ component: "MaintenanceDetails" });

interface MaintenanceDetailsProps {
	id: string;
}

export function MaintenanceDetails(props: MaintenanceDetailsProps) {
	// Owner data loads in the browser only: rendered on the server, the
	// suspense query below would run there without a session (useIsClient).
	const isClient = useIsClient();
	if (!isClient) return <Skeleton className="h-96 w-full" />;
	return <MaintenanceDetailsContent {...props} />;
}

function MaintenanceDetailsContent({ id }: MaintenanceDetailsProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const deleteMutation = useDeleteMaintenanceRequest();
	// The request names its own unit and property (its detail embeds them):
	// no capped or filtered unit or property list can name every request.
	const { data: request } = useSuspenseQuery(maintenanceQueries.detail(id));

	const { data: expensesData } = useQuery(maintenanceQueries.expenses(id));

	const expenses = expensesData ?? [];

	const handleRefresh = () => {
		queryClient.invalidateQueries({
			queryKey: maintenanceQueries.detail(id).queryKey,
		});
		queryClient.invalidateQueries({
			queryKey: maintenanceQueries.expenses(id).queryKey,
		});
	};

	const handleExport = () => {
		if (!request) return;

		const exportData = {
			id: request.id,
			title: request.title ?? request.description,
			description: request.description,
			status: request.status,
			priority: request.priority,
			property: request.propertyName ?? "Unknown",
			unit: request.unitNumber ?? "Unknown",
			created_at: request.created_at,
			scheduled_date: request.scheduled_date,
			completed_at: request.completed_at,
			estimated_cost: request.estimated_cost,
			expenses: expenses.map((e) => ({
				vendor: e.vendor_name,
				amount: e.amount,
				date: e.expense_date,
			})),
		};

		const blob = new Blob([JSON.stringify(exportData, null, 2)], {
			type: "application/json",
		});
		downloadBlob(blob, `maintenance-${id}.json`);
		toast.success("Export downloaded");
	};

	const timeline = generateTimeline(request);
	const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
	// The work order lists every expense, so its total is totalExpenses; the
	// header shows the spend to date, as the analytics count it.
	const spentToDate = spendToDate(expenses, formatLocalYmd(new Date()));

	const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
	// Delete Request only opens the confirmation; the delete runs from its
	// Delete, and the page leaves for the list only once it succeeded.
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
	const handleConfirmDelete = async () => {
		setConfirmDeleteOpen(false);
		try {
			await deleteMutation.mutateAsync(id);
			router.push("/maintenance");
		} catch (error) {
			// The hook's onError raises the one error toast; only log here.
			logger.error("Delete maintenance request failed", {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	};
	const handleDownloadWorkOrder = async () => {
		if (!request) return;
		setIsGeneratingPdf(true);
		try {
			const html = buildWorkOrderHtml({
				request,
				propertyName: request.propertyName,
				unitNumber: request.unitNumber,
				vendor:
					request.vendorName === null
						? null
						: {
								name: request.vendorName,
								phone: request.vendorPhone,
								email: request.vendorEmail,
							},
				expenses: expenses.map((e) => ({
					vendor_name: e.vendor_name ?? "Vendor",
					amount: formatCurrency(e.amount ?? 0),
					expense_date: e.expense_date ?? "",
				})),
				totalExpenses: formatCurrency(totalExpenses),
			});
			await callGeneratePdfFromHtml(
				html,
				`work-order-${request.id.slice(0, 8)}.pdf`,
			);
			toast.success("Work order PDF downloaded");
		} catch (err) {
			toast.error("Failed to generate work order", {
				description: userFacingErrorMessage(err, "Please try again."),
			});
		} finally {
			setIsGeneratingPdf(false);
		}
	};

	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
			{/* Main Content */}
			<div className="lg:col-span-2 space-y-6">
				<MaintenanceHeaderCard
					request={request}
					spentToDate={spentToDate}
					onRefresh={handleRefresh}
					onExport={handleExport}
				/>

				<ExpensesCard
					maintenanceId={request.id}
					expenses={expenses}
					onRefresh={handleRefresh}
				/>

				<PhotosCard requestId={id} />
			</div>

			{/* Sidebar */}
			<div className="space-y-6">
				{/* Contact Information */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Contact Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<ContactRow
							icon={<User className="size-4 text-primary" />}
							label="Tenant"
							value={request.tenantName}
						/>
						<ContactRow
							icon={<Mail className="size-4 text-primary" />}
							label="Email"
							value={request.tenantEmail}
							href={mailtoHref(request.tenantEmail)}
						/>
						<ContactRow
							icon={<Phone className="size-4 text-primary" />}
							label="Phone"
							value={request.tenantPhone}
							href={telHref(request.tenantPhone)}
						/>
					</CardContent>
				</Card>

				<VendorCard request={request} />

				<TimelineCard timeline={timeline} />

				<DocumentsSection entityType="maintenance_request" entityId={id} />

				{/* Quick Actions */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Quick Actions</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<Button
							variant="outline"
							className="w-full justify-start gap-2"
							onClick={() => router.push(`/maintenance/${request.id}/edit`)}
						>
							<Edit2 className="size-4" />
							Edit Request
						</Button>
						<Button
							variant="outline"
							className="w-full justify-start gap-2"
							onClick={handleDownloadWorkOrder}
							disabled={isGeneratingPdf}
						>
							{isGeneratingPdf ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Generating...
								</>
							) : (
								<>
									<Printer className="size-4" />
									Print work order
								</>
							)}
						</Button>
						<Button
							variant="outline"
							className="w-full justify-start gap-2 text-destructive-text hover:text-destructive-text hover:bg-destructive/10 dark:hover:bg-destructive/20 dark:hover:text-destructive-text"
							disabled={deleteMutation.isPending}
							onClick={() => setConfirmDeleteOpen(true)}
						>
							<Trash2 className="size-4" />
							Delete Request
						</Button>
					</CardContent>
				</Card>
				<ConfirmDialog
					open={confirmDeleteOpen}
					onOpenChange={setConfirmDeleteOpen}
					title={`Delete request "${request.title || request.description}"?`}
					description="This permanently deletes the maintenance request with its expenses and photos. This can't be undone."
					confirmText="Delete request"
					loading={deleteMutation.isPending}
					onConfirm={() => void handleConfirmDelete()}
				/>
			</div>
		</div>
	);
}

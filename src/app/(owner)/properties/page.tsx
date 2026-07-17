"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import {
	PropertyInsightsSection,
	PropertyInsightsSkeleton,
} from "#components/analytics/property-insights-section";
import { Properties } from "#components/properties/properties";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#components/ui/tabs";
import { ownerDashboardKeys } from "#hooks/api/query-keys/owner-dashboard-keys";
import { propertyQueries } from "#hooks/api/query-keys/property-keys";
import { handleMutationError } from "#lib/mutation-error-handler";
import { createClient } from "#lib/supabase/client";
import { PropertiesLoadingSkeleton } from "./components/properties-loading-skeleton";
import {
	calculateSummary,
	transformToPropertyItem,
} from "./components/property-transforms";

export default function PropertiesPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const queryClient = useQueryClient();
	const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);

	// Tab state from URL
	const tabFromUrl = searchParams.get("tab") || "overview";
	const [activeTab, setActiveTab] = useState(tabFromUrl);

	const handleTabChange = (value: string) => {
		setActiveTab(value);
		const url = new URL(window.location.href);
		if (value === "overview") {
			url.searchParams.delete("tab");
		} else {
			url.searchParams.set("tab", value);
		}
		router.replace(url.pathname + url.search, { scroll: false });
	};

	// SEO-01: single consolidated query replaces the prior 1+2N fan-out.
	const {
		data: propertiesResponse,
		isLoading,
		error,
	} = useQuery(propertyQueries.listWithDetails());

	const propertiesData = propertiesResponse?.data ?? [];

	// Transform to design-os format — units and cover_image_url are embedded.
	const properties = propertiesData.map((p) =>
		transformToPropertyItem(p, p.units, p.cover_image_url ?? undefined),
	);

	// Calculate summary (use API total for accurate count across pages)
	const summary = {
		...calculateSummary(properties),
		totalProperties: propertiesResponse?.total ?? properties.length,
	};

	// Delete mutation -- soft-delete: set status to 'inactive'
	const { mutate: deleteProperty } = useMutation({
		mutationFn: async (propertyId: string) => {
			const supabase = createClient();
			const { error } = await supabase
				.from("properties")
				.update({ status: "inactive" })
				.eq("id", propertyId);
			if (error) throw error;
		},
		onSuccess: () => {
			toast.success("Property deleted");
			queryClient.invalidateQueries({ queryKey: propertyQueries.all() });
			queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all });
		},
		onError: (err) =>
			handleMutationError(err, "Delete property", "Failed to delete property"),
	});

	// Callbacks
	const handleAddProperty = () => {
		router.push("/properties/new");
	};

	const handlePropertyClick = (propertyId: string) => {
		router.push(`/properties/${propertyId}`);
	};

	const handlePropertyEdit = (propertyId: string) => {
		router.push(`/properties/${propertyId}/edit`);
	};

	const handlePropertyDelete = (propertyId: string) => {
		setPropertyToDelete(propertyId);
	};

	const confirmDelete = () => {
		if (propertyToDelete) {
			deleteProperty(propertyToDelete);
			setPropertyToDelete(null);
		}
	};

	if (isLoading) {
		return <PropertiesLoadingSkeleton />;
	}

	if (error) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
					<h2 className="text-lg font-semibold text-destructive-text mb-2">
						Error Loading Properties
					</h2>
					<p className="text-muted-foreground">
						{error instanceof Error
							? error.message
							: "Failed to load properties"}
					</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<Tabs
					value={activeTab}
					onValueChange={handleTabChange}
					className="w-full"
				>
					<TabsList className="mb-4">
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="insights">Insights</TabsTrigger>
					</TabsList>

					<TabsContent value="overview">
						<Properties
							properties={properties}
							summary={summary}
							onPropertyClick={handlePropertyClick}
							onPropertyEdit={handlePropertyEdit}
							onPropertyDelete={handlePropertyDelete}
							onAddProperty={handleAddProperty}
						/>
					</TabsContent>

					<TabsContent value="insights">
						<Suspense fallback={<PropertyInsightsSkeleton />}>
							<PropertyInsightsSection />
						</Suspense>
					</TabsContent>
				</Tabs>
			</div>

			{/* Delete confirmation dialog */}
			<AlertDialog
				open={!!propertyToDelete}
				onOpenChange={(open) => !open && setPropertyToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Property</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this property? This action cannot
							be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

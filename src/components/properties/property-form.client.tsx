"use client";

import { useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { propertyQueries } from "#hooks/api/query-keys/property-keys";
import { useSupabaseUser } from "#hooks/api/use-auth";
import {
	useCreatePropertyMutation,
	useUpdatePropertyMutation,
} from "#hooks/api/use-property-mutations";
import { useCurrentUser } from "#hooks/use-current-user";
import { useUnsavedChangesWarning } from "#hooks/use-unsaved-changes";
import { useAppForm } from "#lib/forms/form-hook";
import { createLogger } from "#lib/frontend-logger";
import { createClient } from "#lib/supabase/client";
import { cn } from "#lib/utils";
import type { Property, PropertyType } from "#types/core";
import { AcquisitionDetailsSection } from "./property-form-fields";
import { propertyFormOptions } from "./property-form-options";
import { PropertyFormSuccessState } from "./property-form-success-state";
import { uploadPropertyImages } from "./property-form-upload";
import { PropertyAddressSection } from "./sections/property-address-section";
import { PropertyFormActions } from "./sections/property-form-actions";
import {
	type FileWithStatus,
	PropertyImagesCreateSection,
} from "./sections/property-images-create-section";
import { PropertyImagesEditSection } from "./sections/property-images-edit-section";
import { PropertyInfoSection } from "./sections/property-info-section";
import { usePropertyImageDropzone } from "./use-property-image-dropzone";

interface PropertyFormProps {
	mode: "create" | "edit";
	property?: Property;
	onSuccess?: () => void;
	showSuccessState?: boolean;
	className?: string;
}

export function PropertyForm({
	mode,
	property,
	onSuccess,
	showSuccessState = mode === "create",
	className,
}: PropertyFormProps) {
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [uploadingImages, setUploadingImages] = useState(false);
	const [filesWithStatus, setFilesWithStatus] = useState<FileWithStatus[]>([]);
	const isMountedRef = useRef(true);

	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	const { data: user } = useSupabaseUser();
	const { isLoading: isAuthLoading } = useCurrentUser();
	const router = useRouter();
	const queryClient = useQueryClient();
	const logger = createLogger({ component: "PropertyForm" });
	const supabase = createClient();

	const createPropertyMutation = useCreatePropertyMutation();
	const updatePropertyMutation = useUpdatePropertyMutation();

	const mutation =
		mode === "create" ? createPropertyMutation : updatePropertyMutation;

	const { getRootProps, getInputProps, isDragActive } =
		usePropertyImageDropzone({
			setFilesWithStatus,
		});

	useEffect(() => {
		if (mode === "edit" && property) {
			queryClient.setQueryData(
				propertyQueries.detail(property.id).queryKey,
				property,
			);
		}
	}, [mode, property, queryClient]);

	const filesWithStatusRef = useRef<FileWithStatus[]>([]);
	filesWithStatusRef.current = filesWithStatus;
	useEffect(() => {
		return () => {
			for (const { objectUrl } of filesWithStatusRef.current) {
				URL.revokeObjectURL(objectUrl);
			}
		};
	}, []);

	const form = useAppForm({
		...propertyFormOptions,
		defaultValues: {
			name: property?.name ?? "",
			property_type: (property?.property_type ??
				"SINGLE_FAMILY") as PropertyType,
			address_line1: property?.address_line1 ?? "",
			address_line2: property?.address_line2 ?? "",
			city: property?.city ?? "",
			state: property?.state ?? "",
			postal_code: property?.postal_code ?? "",
			country: property?.country ?? "US",
			acquisition_cost: (property?.acquisition_cost !== null &&
			property?.acquisition_cost !== undefined
				? Number(property.acquisition_cost)
				: null) as number | null,
			acquisition_date: property?.acquisition_date ?? "",
		},
		onSubmit: async ({ value }) => {
			// FORMFIX-08: no form-level error toast — the mutation's onError
			// (createMutationCallbacks) surfaces a single error toast. On failure the
			// awaited mutation rejects (onSuccess is not reached); the rejection is
			// handled by the mutation callback + TanStack Form's submit boundary.
			if (mode === "create") {
				await handleCreateSubmit(value);
			} else {
				await handleEditSubmit(value);
			}
			onSuccess?.();
		},
	});

	// FORMFIX-01: read dirty REACTIVELY from the form store so the beforeunload
	// guard re-arms as the user edits (a `form.state.isDirty` snapshot is read
	// once at mount and never updates).
	const isDirty = useStore(form.store, (s) => s.isDirty);
	useUnsavedChangesWarning(isDirty);

	async function handleCreateSubmit(
		value: typeof form.state.values,
	): Promise<void> {
		if (!user?.id) {
			toast.error("You must be logged in to create a property");
			logger.error("User not authenticated", { action: "formSubmission" });
			return;
		}
		const createData = {
			name: value.name,
			address_line1: value.address_line1,
			city: value.city,
			state: value.state,
			postal_code: value.postal_code,
			country: value.country,
			property_type: value.property_type,
			status: "active" as const,
			...(value.address_line2 ? { address_line2: value.address_line2 } : {}),
			...(value.acquisition_cost !== null
				? { acquisition_cost: value.acquisition_cost }
				: {}),
			...(value.acquisition_date
				? { acquisition_date: value.acquisition_date }
				: {}),
		};
		logger.info("Creating property", {
			action: "formSubmission",
			data: createData,
		});

		const newProperty = await createPropertyMutation.mutateAsync(createData);

		// FORMFIX-08: the create mutation's createMutationCallbacks fires the single
		// success toast; no form-level duplicate. Image upload still runs on the
		// image branch (its own toasts are unaffected).
		if (filesWithStatus.length > 0) {
			await uploadPropertyImages({
				propertyId: newProperty.id,
				files: filesWithStatus,
				supabase,
				queryClient,
				isMountedRef,
				setUploadingImages,
				setFilesWithStatus,
			});
		}

		if (showSuccessState) {
			setIsSubmitted(true);
		}
		form.reset();
	}

	async function handleEditSubmit(
		value: typeof form.state.values,
	): Promise<void> {
		if (!property?.id) {
			toast.error("Property ID is missing");
			return;
		}
		const updateData = {
			name: value.name,
			address_line1: value.address_line1,
			city: value.city,
			state: value.state,
			postal_code: value.postal_code,
			country: value.country,
			property_type: value.property_type,
			...(value.address_line2 ? { address_line2: value.address_line2 } : {}),
			...(value.acquisition_cost !== null
				? { acquisition_cost: value.acquisition_cost }
				: { acquisition_cost: null }),
			...(value.acquisition_date
				? { acquisition_date: value.acquisition_date }
				: { acquisition_date: null }),
		};
		logger.info("Updating property", {
			action: "formSubmission",
			property_id: property.id,
			data: updateData,
		});

		await updatePropertyMutation.mutateAsync({
			id: property.id,
			data: updateData,
		});
		// FORMFIX-08: the update mutation's createMutationCallbacks fires the single
		// success toast; no form-level duplicate.

		if (!onSuccess) {
			router.back();
		}
	}

	function handleRemoveFile(index: number): void {
		setFilesWithStatus((prev) => {
			const removed = prev[index];
			if (removed) URL.revokeObjectURL(removed.objectUrl);
			return prev.filter((_, i) => i !== index);
		});
	}

	if (showSuccessState && isSubmitted) {
		return <PropertyFormSuccessState />;
	}

	return (
		<div className={cn("mx-auto max-w-2xl space-y-6", className)}>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
				className="space-y-6"
			>
				<div className="space-y-4 border rounded-lg p-6">
					<PropertyInfoSection form={form} />
					<PropertyAddressSection form={form} />
				</div>

				<AcquisitionDetailsSection form={form} />

				{mode === "edit" && property?.id && (
					<PropertyImagesEditSection propertyId={property.id} />
				)}

				{mode === "create" && (
					<PropertyImagesCreateSection
						getRootProps={getRootProps}
						getInputProps={getInputProps}
						isDragActive={isDragActive}
						uploadingImages={uploadingImages}
						filesWithStatus={filesWithStatus}
						onRemoveFile={handleRemoveFile}
					/>
				)}

				<PropertyFormActions
					mode={mode}
					isPending={mutation.isPending}
					uploadingImages={uploadingImages}
					isAuthLoading={isAuthLoading}
				/>
			</form>
		</div>
	);
}

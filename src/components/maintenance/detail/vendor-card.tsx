"use client";

import { useQuery } from "@tanstack/react-query";
import { Mail, Phone } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "#components/ui/card";
import { Field, FieldLabel } from "#components/ui/field";
import type { MaintenanceDetailRow } from "#hooks/api/query-keys/maintenance-mappers";
import { vendorQueries } from "#hooks/api/query-keys/vendor-keys";
import { useMaintenanceVendorMutation } from "#hooks/api/use-maintenance";
import { createLogger } from "#lib/frontend-logger";
import { VendorSelect } from "../vendor-select";
import { ContactRow } from "./contact-row";
import { mailtoHref, telHref } from "./maintenance-utils";

const logger = createLogger({ component: "VendorCard" });

const VENDOR_SELECT_ID = "maintenance-vendor";
const VENDOR_LABEL_ID = "maintenance-vendor-label";

/**
 * The request's vendor: a picker to assign, change or clear it, and how to
 * reach the assigned vendor. Assigning one to an open request moves it to
 * Assigned (the database's vendor trigger); the returned row carries the new
 * status into the page.
 */
export function VendorCard({ request }: { request: MaintenanceDetailRow }) {
	const vendorMutation = useMaintenanceVendorMutation();
	const { data: vendors, isSuccess } = useQuery(vendorQueries.allActive());
	const hasNoVendors =
		isSuccess && vendors.length === 0 && request.vendor_id === null;

	const handleChange = async (vendorId: string | null) => {
		if (vendorId === request.vendor_id) return;
		try {
			await vendorMutation.mutateAsync({
				id: request.id,
				data: { vendor_id: vendorId },
			});
		} catch (error) {
			// The hook's onError raises the one error toast; only log here.
			logger.error("Assign vendor failed", {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Vendor</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<Field className="min-w-0">
					<FieldLabel id={VENDOR_LABEL_ID} htmlFor={VENDOR_SELECT_ID}>
						Assigned vendor
					</FieldLabel>
					<VendorSelect
						id={VENDOR_SELECT_ID}
						aria-labelledby={VENDOR_LABEL_ID}
						value={request.vendor_id}
						currentVendorName={request.vendorName}
						onChange={(vendorId) => void handleChange(vendorId)}
						disabled={vendorMutation.isPending}
					/>
				</Field>

				{request.vendor_id !== null && request.vendorName !== null && (
					<>
						<ContactRow
							icon={<Phone className="size-4 text-primary" />}
							label="Phone"
							value={request.vendorPhone}
							href={telHref(request.vendorPhone)}
						/>
						<ContactRow
							icon={<Mail className="size-4 text-primary" />}
							label="Email"
							value={request.vendorEmail}
							href={mailtoHref(request.vendorEmail)}
						/>
					</>
				)}

				{hasNoVendors ? (
					<p className="mb-0 text-sm text-muted-foreground">
						You have no vendors yet.{" "}
						<Link
							href="/maintenance/vendors"
							className="text-primary-text underline-offset-4 hover:underline"
						>
							Add a vendor
						</Link>{" "}
						to assign one.
					</p>
				) : (
					<p className="mb-0 text-sm">
						<Link
							href="/maintenance/vendors"
							className="text-primary-text underline-offset-4 hover:underline"
						>
							Manage vendors
						</Link>
					</p>
				)}
			</CardContent>
		</Card>
	);
}

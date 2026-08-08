"use client";

import { UserCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert";
import { Button } from "#components/ui/button";

/**
 * Duplicate-tenant notice for the application -> tenant conversion
 * (APPLY-04, UI-SPEC §B-6).
 *
 * WHY THIS IS A NOTICE AND NEVER A BLOCK. The same person legitimately applies
 * for a second unit, so a landlord with two vacancies and one repeat applicant
 * could not proceed at all if a matching address stopped the form. That is a
 * normal case, not an edge case. The owner is told what was found and keeps
 * both routes — carry on creating the new record, or open the tenant that
 * already exists. Nothing on this surface is ever made inert, and the form
 * below is never gated on it.
 *
 * It renders on the DESTINATION page rather than the application detail page
 * (§B-6): the check needs the applicant's address, which both pages have, but
 * the decision belongs where the tenant is about to be created.
 */
interface ApplicationPrefillNoticeProps {
	matchedTenantId: string;
	matchedTenantName: string;
}

export function ApplicationPrefillNotice({
	matchedTenantId,
	matchedTenantName,
}: ApplicationPrefillNoticeProps) {
	// "Continue creating a new tenant" is a real action, not a label: it clears
	// the notice so the owner is not asked the same question twice while filling
	// the form out.
	const [acknowledged, setAcknowledged] = useState(false);
	if (acknowledged) return null;

	return (
		<Alert>
			<UserCheck className="size-4" />
			<AlertTitle>This applicant may already be a tenant</AlertTitle>
			<AlertDescription className="flex flex-col gap-3">
				<p className="mb-0">
					This email already matches tenant {matchedTenantName}. Link to the
					existing tenant instead?
				</p>
				<div className="flex flex-wrap gap-2">
					<Button asChild variant="outline" size="sm">
						<Link href={`/tenants/${matchedTenantId}`}>
							Go to {matchedTenantName}
						</Link>
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => setAcknowledged(true)}
					>
						Continue creating a new tenant
					</Button>
				</div>
			</AlertDescription>
		</Alert>
	);
}

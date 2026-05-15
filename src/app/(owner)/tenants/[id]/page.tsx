import { Suspense } from "react";
import { Skeleton } from "#components/ui/skeleton";
import { TenantDetails } from "../components/tenant-details.client";

async function TenantDetailsWrapper({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <TenantDetails id={id} />;
}

export default function TenantPage({ params }: PageProps<"/tenants/[id]">) {
	return (
		<Suspense fallback={<Skeleton className="h-96 w-full" />}>
			<TenantDetailsWrapper params={params} />
		</Suspense>
	);
}

import type { ReactNode } from "react";
import { ownerPageMetadata } from "#lib/seo/owner-page-metadata";

export const metadata = ownerPageMetadata(
	"Dashboard",
	"Overview of your property portfolio, revenue, and activity",
);

export default function Layout({ children }: { children: ReactNode }) {
	return <>{children}</>;
}

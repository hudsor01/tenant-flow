import type { ReactNode } from "react";
import { ownerPageMetadata } from "#lib/seo/owner-page-metadata";

export const metadata = ownerPageMetadata(
	"Reports",
	"Generate financial, property, tenant, and maintenance reports",
);

export default function Layout({ children }: { children: ReactNode }) {
	return <>{children}</>;
}

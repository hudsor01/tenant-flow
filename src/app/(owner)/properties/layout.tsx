import type { ReactNode } from "react";
import { ownerPageMetadata } from "#lib/seo/owner-page-metadata";

export const metadata = ownerPageMetadata(
	"Properties",
	"Manage your rental properties and units",
);

export default function Layout({ children }: { children: ReactNode }) {
	return <>{children}</>;
}

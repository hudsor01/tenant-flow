import type { ReactNode } from "react";
import { ownerPageMetadata } from "#lib/seo/owner-page-metadata";

export const metadata = ownerPageMetadata("Financial Analytics");

export default function Layout({ children }: { children: ReactNode }) {
	return <>{children}</>;
}

import type { ReactNode } from "react";
import { ownerPageMetadata } from "#lib/seo/owner-page-metadata";

export const metadata = ownerPageMetadata(
	"Settings",
	"Manage account settings, notifications, security, and billing",
);

export default function Layout({ children }: { children: ReactNode }) {
	return <>{children}</>;
}

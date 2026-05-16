"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Ref } from "react";
import { useEffect, useState } from "react";
import { Button } from "#components/ui/button";
import { useSupabaseSession } from "#hooks/api/use-auth";
import { useNavigation } from "#hooks/use-navigation";
import { SUPABASE_AUTH_COOKIE_NAME } from "#lib/supabase/cookie-name";
import { cn } from "#lib/utils";
import { NavbarDesktopNav } from "./navbar/navbar-desktop-nav";
import { NavbarMobileMenu } from "./navbar/navbar-mobile-menu";
import { DEFAULT_NAV_ITEMS, type NavbarProps } from "./navbar/types";

export function Navbar({
	className,
	logo = "TenantFlow",
	navItems = DEFAULT_NAV_ITEMS,
	ctaText = "Get Started",
	ctaHref = "/pricing",
	ref,
	...props
}: NavbarProps & { ref?: Ref<HTMLElement> }) {
	const [isScrolled, setIsScrolled] = useState(false);
	// Synchronous cookie probe for the signed-OUT fast-path. Starts `false`
	// so SSR and first-client-paint render identically (no hydration
	// mismatch). useEffect below promotes it to `true` if the cookie is
	// actually present — at which point we defer to the query. Without
	// this fast-path the navbar would hang at authPending=true indefinitely
	// for signed-out cold-start visitors on /pricing (PersistQueryClient
	// can pause queries during IDB restoration even when the persisted
	// namespace is excluded — battle-test Session 6 P1).
	const [hasAuthCookie, setHasAuthCookie] = useState(false);

	const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } =
		useNavigation();
	const pathname = usePathname();
	// Session-only check — reads local cookie cache via getSession(), no
	// network round-trip.
	const { data: authSession, isPending: authPending } = useSupabaseSession();
	// Authentication decision:
	//   - While the session query is pending, trust the cookie probe
	//     (optimistic: cookie present → "Dashboard", absent → "Sign In").
	//     Session 10/11 P1: waiting for the query to resolve stranded
	//     signed-in users on marketing pages with no Dashboard CTA when
	//     the query stayed pending.
	//   - Once the query resolves, prefer its result (authoritative):
	//     a stale/expired cookie that the server rejects will downgrade
	//     the user to the signed-out state.
	const isAuthenticated = authPending ? hasAuthCookie : !!authSession;
	// `authResolved` is true once we know which branch to render.
	// We always know after first paint: either the cookie is absent
	// (signed-out fast-path) or the cookie is present (optimistic Dashboard
	// pending query confirmation). No "spinner" gap on the navbar.
	const authResolved = true;

	useEffect(() => {
		setHasAuthCookie(document.cookie.includes(`${SUPABASE_AUTH_COOKIE_NAME}=`));
	}, []);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20);
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<nav
			data-site-navbar
			ref={ref}
			className={cn(
				"fixed top-0 left-0 right-0 z-50 w-full transition-all duration-normal",
				isScrolled
					? "bg-card/95 backdrop-blur-2xl shadow-md border-b border-border/40"
					: "bg-transparent",
				className,
			)}
			{...props}
		>
			<div className="flex-between max-w-7xl mx-auto px-6 lg:px-8 h-18">
				{/* Logo */}
				<Link
					href="/"
					className="flex items-center gap-2.5 transition-opacity duration-fast hover:opacity-80"
				>
					<Image
						src="/tenant-flow-logo.png"
						alt="TenantFlow"
						width={28}
						height={28}
						className="size-7 object-contain"
						priority
					/>
					<span className="text-xl font-semibold text-foreground">{logo}</span>
				</Link>

				<NavbarDesktopNav navItems={navItems} pathname={pathname} />

				<div className="flex items-center space-x-4">
					<div className="hidden sm:flex items-center gap-3">
						{authResolved &&
							(isAuthenticated ? (
								<Button asChild size="default">
									<Link href="/dashboard">Dashboard</Link>
								</Button>
							) : (
								<>
									<Link
										href="/login"
										className="px-4 py-2 text-foreground/70 hover:text-foreground rounded-md border border-transparent hover:border-border/50 transition-colors duration-fast text-base font-medium"
									>
										Sign In
									</Link>
									<Button asChild size="default">
										<Link href={ctaHref}>{ctaText}</Link>
									</Button>
								</>
							))}
					</div>

					{/* Mobile Toggle */}
					<button
						onClick={toggleMobileMenu}
						aria-label={
							isMobileMenuOpen
								? "Close navigation menu"
								: "Open navigation menu"
						}
						data-testid="mobile-nav-toggle"
						className="md:hidden inline-flex items-center justify-center min-h-11 min-w-11 p-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors duration-fast"
					>
						{isMobileMenuOpen ? (
							<X className="size-5" />
						) : (
							<Menu className="size-5" />
						)}
					</button>
				</div>
			</div>

			<NavbarMobileMenu
				isOpen={isMobileMenuOpen}
				onOpenChange={(open: boolean) =>
					open ? toggleMobileMenu() : closeMobileMenu()
				}
				onClose={closeMobileMenu}
				navItems={navItems}
				pathname={pathname}
				ctaText={ctaText}
				ctaHref={ctaHref}
				isAuthenticated={isAuthenticated}
				authResolved={authResolved}
			/>
		</nav>
	);
}

export default Navbar;

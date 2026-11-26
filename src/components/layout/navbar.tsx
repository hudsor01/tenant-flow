"use client";

import { Menu, X } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Ref } from "react";
import { useEffect, useState } from "react";
import { Button } from "#components/ui/button";
import { ctaTrackAttributes } from "#lib/analytics/cta-attributes";
import { SUPABASE_AUTH_COOKIE_NAME } from "#lib/supabase/cookie-name";
import { cn } from "#lib/utils";
import { useNavigationStore } from "#stores/navigation-store";
import { NavbarDesktopNav } from "./navbar/navbar-desktop-nav";
import { DEFAULT_NAV_ITEMS, type NavbarProps } from "./navbar/types";

// The mobile menu (a Radix dialog sheet) loads after hydration rather than in
// every page's initial JavaScript (2026-11-24 SEO audit S1). It is mounted
// closed from the start, so opening it never waits on a download.
const NavbarMobileMenu = dynamic(
	() => import("./navbar/navbar-mobile-menu").then((m) => m.NavbarMobileMenu),
	{ ssr: false },
);

export function Navbar({
	className,
	logo = "TenantFlow",
	navItems = DEFAULT_NAV_ITEMS,
	ctaText = "Start free",
	ctaHref = "/pricing",
	ref,
	...props
}: NavbarProps & { ref?: Ref<HTMLElement> }) {
	const [isScrolled, setIsScrolled] = useState(false);
	// Signed in or not, from the Supabase auth cookie alone. It starts
	// `false` so the server HTML and the first client paint match, and the
	// effect below reads the cookie after hydration.
	//
	// No session query: that loaded supabase-js and React Query onto every
	// marketing page to choose between two buttons (2026-11-24 SEO audit
	// S1). A stale cookie shows "Dashboard", and the proxy, which checks the
	// session with getUser(), sends that click to /login, so nothing is
	// exposed by trusting the cookie here. The prefix match covers a chunked
	// cookie (`<name>.0`).
	const [isAuthenticated, setIsAuthenticated] = useState(false);

	const { isMobileMenuOpen, toggleMobileMenu, closeMobileMenu } =
		useNavigationStore();
	const pathname = usePathname();

	useEffect(() => {
		setIsAuthenticated(document.cookie.includes(SUPABASE_AUTH_COOKIE_NAME));
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
					{/* The mark is drawn for a white ground, so dark mode gives it a
					    light tile instead of recolouring it. */}
					<span className="flex size-9 items-center justify-center rounded-md dark:bg-foreground">
						<Image
							src="/brand/tenantflow-mark.png"
							alt=""
							width={28}
							height={28}
							className="size-7"
							priority
						/>
					</span>
					<span className="text-xl font-semibold text-foreground">{logo}</span>
				</Link>

				<NavbarDesktopNav navItems={navItems} pathname={pathname} />

				<div className="flex items-center space-x-4">
					<div className="hidden sm:flex items-center gap-3">
						{isAuthenticated ? (
							<>
								{/* Settings is the one owner page a lapsed subscription still
								    reaches (owner, 2026-11-09; proxy.ts), and the proxy sends
								    that owner here, to /pricing, from every other one. */}
								<Link
									href="/settings"
									className="px-4 py-2 text-foreground/70 hover:text-foreground rounded-md border border-transparent hover:border-border/50 transition-colors duration-fast text-base font-medium"
								>
									Settings
								</Link>
								<Button asChild size="default">
									<Link href="/dashboard">Dashboard</Link>
								</Button>
							</>
						) : (
							<>
								<Link
									href="/login"
									className="px-4 py-2 text-foreground/70 hover:text-foreground rounded-md border border-transparent hover:border-border/50 transition-colors duration-fast text-base font-medium"
								>
									Sign In
								</Link>
								<Button asChild size="default">
									<Link href={ctaHref} {...ctaTrackAttributes("navbar")}>
										{ctaText}
									</Link>
								</Button>
							</>
						)}
					</div>

					{/* Mobile Toggle — hidden at `lg:` to match the desktop nav
					    breakpoint (was `md:hidden`, which let nav items collide
					    with the logo at 768-1023px viewports). */}
					<button
						onClick={toggleMobileMenu}
						aria-label={
							isMobileMenuOpen
								? "Close navigation menu"
								: "Open navigation menu"
						}
						data-testid="mobile-nav-toggle"
						className="lg:hidden inline-flex items-center justify-center min-h-11 min-w-11 p-2 text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors duration-fast"
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
			/>
		</nav>
	);
}

export default Navbar;

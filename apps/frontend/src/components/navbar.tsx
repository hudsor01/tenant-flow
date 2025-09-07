"use client";

import * as React from 'react'
import Link from "next/link";
import { Building2, Menu, X } from "lucide-react";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { cn } from '@/lib/utils'

interface NavbarProps extends React.ComponentProps<'nav'> {}

export const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  ({ className, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <nav ref={ref} className={cn("fixed inset-x-0 top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border", className)} {...props}>
      <div className="container">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Building2 className="size-8 text-primary" />
              <span className="font-bold text-xl text-foreground">TenantFlow</span>
            </Link>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline gap-4">
              <Link href="/features" className="nav-link">
                Features
              </Link>
              <Link href="/pricing" className="nav-link">
                Pricing
              </Link>
              <Link href="/blog" className="nav-link">
                Blog
              </Link>
              <Link href="/about" className="nav-link">
                About
              </Link>
              <Link href="/contact" className="nav-link">
                Contact
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/auth/login" className="nav-link">
              Sign In
            </Link>
            <ShimmerButton>
              <Link href="/auth/sign-up">Get Started</Link>
            </ShimmerButton>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="bg-background text-foreground hover:text-primary p-2 rounded-md"
            >
              {isOpen ? (
                <X className="size-6" />
              ) : (
                <Menu className="size-6" />
              )}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden">
            <div className="card mt-2 space-y-1 bg-background/95 backdrop-blur-lg">
              <Link href="/features" className="nav-link block">
                Features
              </Link>
              <Link href="/pricing" className="nav-link block">
                Pricing
              </Link>
              <Link href="/blog" className="nav-link block">
                Blog
              </Link>
              <Link href="/about" className="nav-link block">
                About
              </Link>
              <Link href="/contact" className="nav-link block">
                Contact
              </Link>
              <Link href="/auth/login" className="nav-link block">
                Sign In
              </Link>
              <div className="px-3 py-2">
                <ShimmerButton className="w-full">
                  <Link href="/auth/sign-up">Get Started</Link>
                </ShimmerButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
})
Navbar.displayName = 'Navbar'

export default Navbar
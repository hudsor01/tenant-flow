import Link from 'next/link'

const links = [
    {
        title: 'Features',
        href: '/features',
    },
    {
        title: 'Pricing',
        href: '/pricing',
    },
    {
        title: 'About',
        href: '/about',
    },
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Support',
        href: '/contact',
    },
    {
        title: 'Login',
        href: '/auth/login',
    },
]

export default function FooterSection() {
    return (
        <footer className="tw-:border-b tw-:bg-white tw-:py-12 tw-:dark:bg-transparent">
            <div className="tw-:mx-auto tw-:max-w-5xl tw-:px-6">
                <div className="tw-:flex tw-:flex-wrap tw-:justify-between tw-:gap-6">
                    <span className="tw-:text-muted-foreground tw-:order-last tw-:block tw-:text-center tw-:text-sm tw-:md:order-first">© {new Date().getFullYear()} TenantFlow, All rights reserved</span>
                    <div className="tw-:order-first tw-:flex tw-:flex-wrap tw-:justify-center tw-:gap-6 tw-:text-sm tw-:md:order-last">
                        {links.map((link, index) => (
                            <Link
                                key={index}
                                href={link.href}
                                className="tw-:text-muted-foreground tw-:hover:text-primary tw-:block tw-:duration-150">
                                <span>{link.title}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    )
}

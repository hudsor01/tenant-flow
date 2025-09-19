export default function StatsSection() {
    return (
        <section className="py-16 md:py-32">
            <div className="mx-auto max-w-5xl space-y-8 px-6 md:space-y-12">
                <div className="relative z-10 max-w-xl space-y-6">
                    <h2 className="text-4xl font-medium lg:text-5xl">Trusted by property managers nationwide.</h2>
                    <p>
                        TenantFlow is more than just software. <span className="font-medium">It's a complete property management ecosystem</span> — from tenant screening to rent collection.
                    </p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 md:gap-12 lg:gap-24">
                    <div>
                        <p>Our platform streamlines every aspect of property management — from tenant applications to maintenance tracking and financial reporting.</p>
                        <div className="mb-12 mt-12 grid grid-cols-2 gap-2 md:mb-0">
                            <div className="space-y-4">
                                <div className="bg-gradient-to-r from-zinc-950 to-zinc-600 bg-clip-text text-5xl font-bold text-transparent dark:from-white dark:to-zinc-800">50K+</div>
                                <p>Units Managed</p>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-gradient-to-r from-zinc-950 to-zinc-600 bg-clip-text text-5xl font-bold text-transparent dark:from-white dark:to-zinc-800">98%</div>
                                <p>Rent Collection Rate</p>
                            </div>
                        </div>
                    </div>
                    <div className="relative">
                        <blockquote className="border-l-4 pl-4">
                            <p>TenantFlow has completely transformed how I manage my 50+ units. The automated rent collection alone saves me over 15 hours every week, and the tenant portal has virtually eliminated maintenance request calls.</p>

                            <div className="mt-6 space-y-3">
                                <cite className="block font-medium">Sarah Chen, Property Manager</cite>
                                <div className="text-sm text-muted-foreground">Mountain View Properties</div>
                            </div>
                        </blockquote>
                    </div>
                </div>
            </div>
        </section>
    )
}

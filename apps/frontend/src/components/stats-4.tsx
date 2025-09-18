export default function StatsSection() {
    return (
        <section className="tw-:py-16 tw-:md:py-32">
            <div className="tw-:mx-auto tw-:max-w-5xl tw-:space-y-8 tw-:px-6 tw-:md:space-y-12">
                <div className="tw-:relative tw-:z-10 tw-:max-w-xl tw-:space-y-6">
                    <h2 className="tw-:text-4xl tw-:font-medium tw-:lg:text-5xl">Trusted by property managers nationwide.</h2>
                    <p>
                        TenantFlow is more than just software. <span className="tw-:font-medium">It's a complete property management ecosystem</span> — from tenant screening to rent collection.
                    </p>
                </div>
                <div className="tw-:grid tw-:gap-6 tw-:sm:grid-cols-2 tw-:md:gap-12 tw-:lg:gap-24">
                    <div>
                        <p>Our platform streamlines every aspect of property management — from tenant applications to maintenance tracking and financial reporting.</p>
                        <div className="tw-:mb-12 tw-:mt-12 tw-:grid tw-:grid-cols-2 tw-:gap-2 tw-:md:mb-0">
                            <div className="tw-:space-y-4">
                                <div className="tw-:bg-linear-to-r tw-:from-zinc-950 tw-:to-zinc-600 tw-:bg-clip-text tw-:text-5xl tw-:font-bold tw-:text-transparent tw-:dark:from-white tw-:dark:to-zinc-800">50K+</div>
                                <p>Units Managed</p>
                            </div>
                            <div className="tw-:space-y-4">
                                <div className="tw-:bg-linear-to-r tw-:from-zinc-950 tw-:to-zinc-600 tw-:bg-clip-text tw-:text-5xl tw-:font-bold tw-:text-transparent tw-:dark:from-white tw-:dark:to-zinc-800">98%</div>
                                <p>Rent Collection Rate</p>
                            </div>
                        </div>
                    </div>
                    <div className="tw-:relative">
                        <blockquote className="tw-:border-l-4 tw-:pl-4">
                            <p>TenantFlow has completely transformed how I manage my 50+ units. The automated rent collection alone saves me over 15 hours every week, and the tenant portal has virtually eliminated maintenance request calls.</p>

                            <div className="tw-:mt-6 tw-:space-y-3">
                                <cite className="tw-:block tw-:font-medium">Sarah Chen, Property Manager</cite>
                                <div className="tw-:text-sm tw-:text-muted-foreground">Mountain View Properties</div>
                            </div>
                        </blockquote>
                    </div>
                </div>
            </div>
        </section>
    )
}

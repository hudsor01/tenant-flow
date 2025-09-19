import { Cpu, Fingerprint, Pencil, Settings2, Sparkles, Zap } from 'lucide-react'

export default function Features() {
    return (
        <section className="tw-:py-12 tw-:md:py-20">
            <div className="tw-:mx-auto tw-:max-w-5xl tw-:space-y-8 tw-:px-6 tw-:md:space-y-16">
                <div className="tw-:relative tw-:z-10 tw-:mx-auto tw-:max-w-xl tw-:space-y-6 tw-:text-center tw-:md:space-y-12">
                    <h2 className="tw-:text-balance tw-:text-4xl tw-:font-medium tw-:lg:text-5xl">The foundation for creative teams management</h2>
                    <p>Lyra is evolving to be more than just the models. It supports an entire to the APIs and platforms helping developers and businesses innovate.</p>
                </div>

                <div className="tw-:relative tw-:mx-auto tw-:grid tw-:max-w-4xl tw-:divide-x tw-:divide-y tw-:border tw-:*:p-12 tw-:sm:grid-cols-2 tw-:lg:grid-cols-3">
                    <div className="tw-:space-y-3">
                        <div className="tw-:flex tw-:items-center tw-:gap-2">
                            <Zap className="tw-:size-4" />
                            <h3 className="tw-:text-sm tw-:font-medium">Faaast</h3>
                        </div>
                        <p className="tw-:text-sm">It supports an entire helping developers and innovate.</p>
                    </div>
                    <div className="tw-:space-y-2">
                        <div className="tw-:flex tw-:items-center tw-:gap-2">
                            <Cpu className="tw-:size-4" />
                            <h3 className="tw-:text-sm tw-:font-medium">Powerful</h3>
                        </div>
                        <p className="tw-:text-sm">It supports an entire helping developers and businesses.</p>
                    </div>
                    <div className="tw-:space-y-2">
                        <div className="tw-:flex tw-:items-center tw-:gap-2">
                            <Fingerprint className="tw-:size-4" />

                            <h3 className="tw-:text-sm tw-:font-medium">Security</h3>
                        </div>
                        <p className="tw-:text-sm">It supports an helping developers businesses.</p>
                    </div>
                    <div className="tw-:space-y-2">
                        <div className="tw-:flex tw-:items-center tw-:gap-2">
                            <Pencil className="tw-:size-4" />

                            <h3 className="tw-:text-sm tw-:font-medium">Customization</h3>
                        </div>
                        <p className="tw-:text-sm">It supports helping developers and businesses innovate.</p>
                    </div>
                    <div className="tw-:space-y-2">
                        <div className="tw-:flex tw-:items-center tw-:gap-2">
                            <Settings2 className="tw-:size-4" />

                            <h3 className="tw-:text-sm tw-:font-medium">Control</h3>
                        </div>
                        <p className="tw-:text-sm">It supports helping developers and businesses innovate.</p>
                    </div>
                    <div className="tw-:space-y-2">
                        <div className="tw-:flex tw-:items-center tw-:gap-2">
                            <Sparkles className="tw-:size-4" />

                            <h3 className="tw-:text-sm tw-:font-medium">Built for AI</h3>
                        </div>
                        <p className="tw-:text-sm">It supports helping developers and businesses innovate.</p>
                    </div>
                </div>
            </div>
        </section>
    )
}

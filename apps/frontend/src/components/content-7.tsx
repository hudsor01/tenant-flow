import { Cpu, Zap } from 'lucide-react'
import Image from 'next/image'

export default function ContentSection() {
    return (
        <section className="tw-:py-16 tw-:md:py-32">
            <div className="tw-:mx-auto tw-:max-w-5xl tw-:space-y-8 tw-:px-6 tw-:md:space-y-16">
                <h2 className="tw-:relative tw-:z-10 tw-:max-w-xl tw-:text-4xl tw-:font-medium tw-:lg:text-5xl">The Lyra ecosystem brings together our models.</h2>
                <div className="tw-:grid tw-:gap-6 tw-:sm:grid-cols-2 tw-:md:gap-12 tw-:lg:gap-24">
                    <div className="tw-:relative tw-:space-y-4">
                        <p className="tw-:text-muted-foreground">
                            Gemini is evolving to be more than just the models. <span className="tw-:text-accent-foreground tw-:font-bold">It supports an entire ecosystem</span> — from products innovate.
                        </p>
                        <p className="tw-:text-muted-foreground">It supports an entire ecosystem — from products to the APIs and platforms helping developers and businesses innovate</p>

                        <div className="tw-:grid tw-:grid-cols-2 tw-:gap-3 tw-:pt-6 tw-:sm:gap-4">
                            <div className="tw-:space-y-3">
                                <div className="tw-:flex tw-:items-center tw-:gap-2">
                                    <Zap className="tw-:size-4" />
                                    <h3 className="tw-:text-sm tw-:font-medium">Faaast</h3>
                                </div>
                                <p className="tw-:text-muted-foreground tw-:text-sm">It supports an entire helping developers and innovate.</p>
                            </div>
                            <div className="tw-:space-y-2">
                                <div className="tw-:flex tw-:items-center tw-:gap-2">
                                    <Cpu className="tw-:size-4" />
                                    <h3 className="tw-:text-sm tw-:font-medium">Powerful</h3>
                                </div>
                                <p className="tw-:text-muted-foreground tw-:text-sm">It supports an entire helping developers and businesses.</p>
                            </div>
                        </div>
                    </div>
                    <div className="tw-:relative tw-:mt-6 tw-:sm:mt-0">
                        <div className="tw-:bg-linear-to-b tw-:aspect-67/34 tw-:relative tw-:rounded-2xl tw-:from-zinc-300 tw-:to-transparent tw-:p-px tw-:dark:from-zinc-700">
                            <Image src="/exercice-dark.png" className="tw-:hidden tw-:rounded-[15px] tw-:dark:block" alt="payments illustration dark" width={1206} height={612} />
                            <Image src="/exercice.png" className="tw-:rounded-[15px] tw-:shadow tw-:dark:hidden" alt="payments illustration light" width={1206} height={612} />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

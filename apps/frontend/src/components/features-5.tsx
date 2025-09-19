import { Activity, DraftingCompass, Mail, Zap } from 'lucide-react'
import Image from 'next/image'

export default function FeaturesSection() {
    return (
        <section className="tw-:py-16 tw-:md:py-32">
            <div className="tw-:mx-auto tw-:max-w-6xl tw-:px-6">
                <div className="tw-:grid tw-:items-center tw-:gap-12 tw-:md:grid-cols-2 tw-:md:gap-12 tw-:lg:grid-cols-5 tw-:lg:gap-24">
                    <div className="tw-:lg:col-span-2">
                        <div className="tw-:md:pr-6 tw-:lg:pr-0">
                            <h2 className="tw-:text-4xl tw-:font-semibold tw-:lg:text-5xl">Built for Scaling teams</h2>
                            <p className="tw-:mt-6">Orrupti aut temporibus assumenda atque ab, accusamus sit, molestiae veniam laboriosam pariatur.</p>
                        </div>
                        <ul className="tw-:mt-8 tw-:divide-y tw-:border-y tw-:*:flex tw-:*:items-center tw-:*:gap-3 tw-:*:py-3">
                            <li>
                                <Mail className="tw-:size-5" />
                                Email and web support
                            </li>
                            <li>
                                <Zap className="tw-:size-5" />
                                Fast response time
                            </li>
                            <li>
                                <Activity className="tw-:size-5" />
                                Menitoring and analytics
                            </li>
                            <li>
                                <DraftingCompass className="tw-:size-5" />
                                Architectural review
                            </li>
                        </ul>
                    </div>
                    <div className="tw-:border-border/50 tw-:relative tw-:rounded-3xl tw-:border tw-:p-3 tw-:lg:col-span-3">
                        <div className="tw-:bg-linear-to-b tw-:aspect-76/59 tw-:relative tw-:rounded-2xl tw-:from-zinc-300 tw-:to-transparent tw-:p-px tw-:dark:from-zinc-700">
                            <Image src="/payments.png" className="tw-:hidden tw-:rounded-[15px] tw-:dark:block" alt="payments illustration dark" width={1207} height={929} />
                            <Image src="/payments-light.png" className="tw-:rounded-[15px] tw-:shadow tw-:dark:hidden" alt="payments illustration light" width={1207} height={929} />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

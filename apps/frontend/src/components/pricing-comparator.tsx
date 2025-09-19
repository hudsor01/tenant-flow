import { Button } from '@/components/ui/button'
import { Cpu, Sparkles } from 'lucide-react'
import Link from 'next/link'

const tableData = [
    {
        feature: 'Feature 1',
        free: true,
        pro: true,
        startup: true,
    },
    {
        feature: 'Feature 2',
        free: true,
        pro: true,
        startup: true,
    },
    {
        feature: 'Feature 3',
        free: false,
        pro: true,
        startup: true,
    },
    {
        feature: 'Tokens',
        free: '',
        pro: '20 Users',
        startup: 'Unlimited',
    },
    {
        feature: 'Video calls',
        free: '',
        pro: '12 Weeks',
        startup: '56',
    },
    {
        feature: 'Support',
        free: '',
        pro: 'Secondes',
        startup: 'Unlimited',
    },
    {
        feature: 'Security',
        free: '',
        pro: '20 Users',
        startup: 'Unlimited',
    },
]

export default function PricingComparator() {
    return (
        <section className="tw-:py-16 tw-:md:py-32">
            <div className="tw-:mx-auto tw-:max-w-5xl tw-:px-6">
                <div className="tw-:w-full tw-:overflow-auto tw-:lg:overflow-visible">
                    <table className="tw-:w-[200vw] tw-:border-separate tw-:border-spacing-x-3 tw-:md:w-full tw-:dark:[--color-muted:var(--color-zinc-900)]">
                        <thead className="tw-:bg-background tw-:sticky tw-:top-0">
                            <tr className="tw-:*:py-4 tw-:*:text-left tw-:*:font-medium">
                                <th className="tw-:lg:w-2/5"></th>
                                <th className="tw-:space-y-3">
                                    <span className="tw-:block">Free</span>

                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm">
                                        <Link href="#">Get Started</Link>
                                    </Button>
                                </th>
                                <th className="tw-:bg-muted tw-:rounded-t-(--radius) tw-:space-y-3 tw-:px-4">
                                    <span className="tw-:block">Pro</span>
                                    <Button
                                        asChild
                                        size="sm">
                                        <Link href="#">Get Started</Link>
                                    </Button>
                                </th>
                                <th className="tw-:space-y-3">
                                    <span className="tw-:block">Startup</span>
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm">
                                        <Link href="#">Get Started</Link>
                                    </Button>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="tw-:text-caption tw-:text-sm">
                            <tr className="tw-:*:py-3">
                                <td className="tw-:flex tw-:items-center tw-:gap-2 tw-:font-medium">
                                    <Cpu className="tw-:size-4" />
                                    <span>Features</span>
                                </td>
                                <td></td>
                                <td className="tw-:bg-muted tw-:border-none tw-:px-4"></td>
                                <td></td>
                            </tr>
                            {tableData.slice(-4).map((row, index) => (
                                <tr
                                    key={index}
                                    className="tw-:*:border-b tw-:*:py-3">
                                    <td className="tw-:text-muted-foreground">{row.feature}</td>
                                    <td>
                                        {row.free === true ? (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                className="tw-:size-4">
                                                <path
                                                    fillRule="evenodd"
                                                    d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        ) : (
                                            row.free
                                        )}
                                    </td>
                                    <td className="tw-:bg-muted tw-:border-none tw-:px-4">
                                        <div className="tw-:-mb-3 tw-:border-b tw-:py-3">
                                            {row.pro === true ? (
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    fill="currentColor"
                                                    className="tw-:size-4">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            ) : (
                                                row.pro
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {row.startup === true ? (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                className="tw-:size-4">
                                                <path
                                                    fillRule="evenodd"
                                                    d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        ) : (
                                            row.startup
                                        )}
                                    </td>
                                </tr>
                            ))}
                            <tr className="tw-:*:pb-3 tw-:*:pt-8">
                                <td className="tw-:flex tw-:items-center tw-:gap-2 tw-:font-medium">
                                    <Sparkles className="tw-:size-4" />
                                    <span>AI Models</span>
                                </td>
                                <td></td>
                                <td className="tw-:bg-muted tw-:border-none tw-:px-4"></td>
                                <td></td>
                            </tr>
                            {tableData.map((row, index) => (
                                <tr
                                    key={index}
                                    className="tw-:*:border-b tw-:*:py-3">
                                    <td className="tw-:text-muted-foreground">{row.feature}</td>
                                    <td>
                                        {row.free === true ? (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                className="tw-:size-4">
                                                <path
                                                    fillRule="evenodd"
                                                    d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        ) : (
                                            row.free
                                        )}
                                    </td>
                                    <td className="tw-:bg-muted tw-:border-none tw-:px-4">
                                        <div className="tw-:-mb-3 tw-:border-b tw-:py-3">
                                            {row.pro === true ? (
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    fill="currentColor"
                                                    className="tw-:size-4">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            ) : (
                                                row.pro
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {row.startup === true ? (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                className="tw-:size-4">
                                                <path
                                                    fillRule="evenodd"
                                                    d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        ) : (
                                            row.startup
                                        )}
                                    </td>
                                </tr>
                            ))}
                            <tr className="tw-:*:py-6">
                                <td></td>
                                <td></td>
                                <td className="tw-:bg-muted tw-:rounded-b-(--radius) tw-:border-none tw-:px-4"></td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    )
}

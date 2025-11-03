'use client'
import { BorderBeam } from '#components/ui/border-beam'
import { TimelineContent } from '#components/ui/timeline-animation'
import Image from 'next/image'
import { useRef } from 'react'

function ClientFeedback() {
	const testimonialRef = useRef<HTMLDivElement>(null)

	const revealVariants = (isInView: boolean, animationNum: number) => {
		if (isInView) {
			return {
				y: 0,
				opacity: 1,
				filter: 'blur(0px)',
				transition: {
					delay: animationNum * 0.4,
					duration: 0.5
				}
			}
		} else {
			return {
				filter: 'blur(10px)',
				y: -20,
				opacity: 0
			}
		}
	}

	return (
		<main className="w-full bg-background">
			<section
				className="relative  h-full container text-foreground mx-auto  rounded  py-8 bg-background"
				ref={testimonialRef}
			>
				<article className={'max-w-screen-md mx-auto text-center space-y-2 '}>
					<TimelineContent
						className={'xl:text-4xl text-3xl  font-medium'}
						animationNum={0}
						customVariants={revealVariants}
						timelineRef={testimonialRef}
					>
						<h1>Trusted by Property Managers and Real Estate Professionals</h1>
					</TimelineContent>
					<TimelineContent
						className={'mx-auto text-muted-foreground'}
						animationNum={1}
						customVariants={revealVariants}
						timelineRef={testimonialRef}
					>
						<p>
							See how TenantFlow has transformed property management for our
							clients
						</p>
					</TimelineContent>
				</article>
				<div className="lg:grid lg:grid-cols-3  gap-2 flex flex-col w-full lg:py-6 pt-6 pb-4 lg:px-10 px-4">
					<div className="md:flex lg:flex-col lg:space-y-2 h-full lg:gap-0 gap-2 ">
						<TimelineContent
							animationNum={0}
							customVariants={revealVariants}
							timelineRef={testimonialRef}
							className=" lg:flex-[7] flex-[6] flex flex-col justify-between relative bg-primary/5 overflow-hidden rounded border border-border p-5 group"
						>
							<BorderBeam
								size={250}
								duration={12}
								delay={9}
								colorFrom="var(--color-primary)"
								colorTo="var(--color-accent)"
								className="opacity-0 group-hover:opacity-100 transition-opacity duration-500"
							/>
							<div className="absolute bottom-0 left-0 right-0 top-0 bg-grid-pattern opacity-30"></div>
							<article className="mt-auto relative z-10">
								<p>
									&quot;TenantFlow has revolutionized our property management
									operations. The automated rent collection and maintenance
									tracking saved us 20+ hours per week.&quot;
								</p>
								<div className="flex justify-between pt-5">
									<div>
										<h2 className=" font-semibold lg:text-xl text-sm">
											Sarah Martinez
										</h2>
										<p className="text-muted-foreground">
											Property Manager, SunSet Apartments
										</p>
									</div>
									<Image
										src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=687&auto=format&fit=crop"
										alt="Sarah Martinez"
										width={200}
										height={200}
										className="size-16 rounded object-cover"
										placeholder="blur"
										blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQ3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
									/>
								</div>
							</article>
						</TimelineContent>
						<TimelineContent
							animationNum={1}
							customVariants={revealVariants}
							timelineRef={testimonialRef}
							className="lg:flex-[3] flex-[4] lg:h-fit  lg:shrink-0 flex flex-col justify-between relative bg-accent text-primary-foreground overflow-hidden rounded border border-border p-5 group"
						>
							<BorderBeam
								size={200}
								duration={10}
								delay={5}
								colorFrom="var(--color-primary)"
								colorTo="var(--color-accent)"
								className="opacity-0 group-hover:opacity-100 transition-opacity duration-500"
							/>
							<article className="mt-auto">
								<p>
									&quot;Our tenant satisfaction scores increased by 40% since
									implementing TenantFlow. The communication tools are
									outstanding.&quot;
								</p>
								<div className="flex justify-between pt-5">
									<div>
										<h2 className=" font-semibold text-xl">Michael Chen</h2>
										<p className="text-primary-foreground/80">
											Real Estate Investor
										</p>
									</div>
									<Image
										src="https://images.unsplash.com/photo-1512485694743-9c9538b4e6e0?q=80&w=687&auto=format&fit=crop"
										alt="Michael Chen"
										width={200}
										height={200}
										className="size-16 rounded object-cover"
										placeholder="blur"
										blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQ3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
									/>
								</div>
							</article>
						</TimelineContent>
					</div>
					<div className="lg:h-full  md:flex lg:flex-col h-fit lg:space-y-2 lg:gap-0 gap-2">
						<TimelineContent
							animationNum={2}
							customVariants={revealVariants}
							timelineRef={testimonialRef}
							className="flex flex-col justify-between relative bg-card text-card-foreground overflow-hidden rounded border border-border p-5 group"
						>
							<BorderBeam
								size={180}
								duration={8}
								delay={3}
								colorFrom="var(--color-primary)"
								colorTo="var(--color-accent)"
								className="opacity-0 group-hover:opacity-100 transition-opacity duration-500"
							/>
							<article className="mt-auto">
								<p className="2xl:text-base text-sm">
									&quot;The financial reporting features give us complete
									visibility into our portfolio performance. ROI tracking has
									never been easier.&quot;
								</p>
								<div className="flex justify-between items-end pt-5">
									<div>
										<h2 className=" font-semibold lg:text-xl text-lg">
											Jessica Thompson
										</h2>
										<p className="lg:text-base text-sm text-muted-foreground">
											CEO, Prime Properties
										</p>
									</div>
									<Image
										src="https://images.unsplash.com/photo-1566753323558-f4e0952af115?q=80&w=1021&auto=format&fit=crop"
										alt="Jessica Thompson"
										width={200}
										height={200}
										className="lg:size-16 size-12 rounded object-cover"
										placeholder="blur"
										blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQ3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
									/>
								</div>
							</article>
						</TimelineContent>
						<TimelineContent
							animationNum={3}
							customVariants={revealVariants}
							timelineRef={testimonialRef}
							className="flex flex-col justify-between relative bg-card text-card-foreground overflow-hidden rounded border border-border p-5 group"
						>
							<BorderBeam
								size={180}
								duration={8}
								delay={7}
								colorFrom="var(--color-primary)"
								colorTo="var(--color-accent)"
								className="opacity-0 group-hover:opacity-100 transition-opacity duration-500"
							/>
							<article className="mt-auto">
								<p className="2xl:text-base text-sm">
									&quot;Automated lease renewals and rent increases saved us
									countless hours. TenantFlow pays for itself within the first
									month.&quot;
								</p>
								<div className="flex justify-between items-end pt-5">
									<div>
										<h2 className=" font-semibold lg:text-xl text-lg">
											David Park
										</h2>
										<p className="lg:text-base text-sm text-muted-foreground">
											Portfolio Manager
										</p>
									</div>
									<Image
										src="https://images.unsplash.com/photo-1615109398623-88346a601842?q=80&w=687&auto=format&fit=crop"
										alt="David Park"
										width={200}
										height={200}
										className="lg:size-16 size-12 rounded object-cover"
										placeholder="blur"
										blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQ3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
									/>
								</div>
							</article>
						</TimelineContent>
						<TimelineContent
							animationNum={4}
							customVariants={revealVariants}
							timelineRef={testimonialRef}
							className="flex flex-col justify-between relative bg-card text-card-foreground overflow-hidden rounded border border-border p-5 group"
						>
							<BorderBeam
								size={180}
								duration={8}
								delay={11}
								colorFrom="var(--color-primary)"
								colorTo="var(--color-accent)"
								className="opacity-0 group-hover:opacity-100 transition-opacity duration-500"
							/>
							<article className="mt-auto">
								<p className="2xl:text-base text-sm">
									&quot;The tenant screening process is incredibly thorough yet
									fast. We&apos;ve reduced bad tenants by 90% and vacancy rates
									are down.&quot;
								</p>
								<div className="flex justify-between items-end pt-5">
									<div>
										<h2 className=" font-semibold lg:text-xl text-lg">
											Amanda Rodriguez
										</h2>
										<p className="lg:text-base text-sm text-muted-foreground">
											Regional Property Director
										</p>
									</div>
									<Image
										src="https://images.unsplash.com/photo-1740102074295-c13fae3e4f8a?q=80&w=687&auto=format&fit=crop"
										alt="Amanda Rodriguez"
										width={200}
										height={200}
										className="lg:size-16 size-12 rounded object-cover"
										placeholder="blur"
										blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQ3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
									/>
								</div>
							</article>
						</TimelineContent>
					</div>
					<div className="h-full md:flex lg:flex-col lg:space-y-2 lg:gap-0 gap-2">
						<TimelineContent
							animationNum={5}
							customVariants={revealVariants}
							timelineRef={testimonialRef}
							className=" lg:flex-[3] flex-[4] flex flex-col justify-between relative bg-accent text-primary-foreground overflow-hidden rounded border border-border p-5 group"
						>
							<BorderBeam
								size={200}
								duration={10}
								delay={13}
								colorFrom="var(--color-primary)"
								colorTo="var(--color-accent)"
								className="opacity-0 group-hover:opacity-100 transition-opacity duration-500"
							/>
							<article className="mt-auto">
								<p>
									&quot;TenantFlow has been instrumental in scaling our property
									management business from 50 to 500+ units seamlessly.&quot;
								</p>
								<div className="flex justify-between pt-5">
									<div>
										<h2 className=" font-semibold text-xl">Robert Kim</h2>
										<p className="text-primary-foreground/80">
											Founder, Urban Rentals
										</p>
									</div>
									<Image
										src="https://images.unsplash.com/photo-1563237023-b1e970526dcb?q=80&w=765&auto=format&fit=crop"
										alt="Robert Kim"
										width={200}
										height={200}
										className="size-16 rounded object-cover"
										placeholder="blur"
										blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQ3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
									/>
								</div>
							</article>
						</TimelineContent>
						<TimelineContent
							animationNum={6}
							customVariants={revealVariants}
							timelineRef={testimonialRef}
							className="lg:flex-[7] flex-[6] flex flex-col justify-between relative bg-primary/5 overflow-hidden rounded border border-border p-5 group"
						>
							<BorderBeam
								size={250}
								duration={12}
								delay={15}
								colorFrom="var(--color-primary)"
								colorTo="var(--color-accent)"
								className="opacity-0 group-hover:opacity-100 transition-opacity duration-500"
							/>
							<div className="absolute bottom-0 left-0 right-0 top-0 bg-grid-pattern opacity-30"></div>
							<article className="mt-auto relative z-10">
								<p>
									&quot;The maintenance request system with contractor
									management has transformed how we handle property issues.
									Response times improved by 75%.&quot;
								</p>
								<div className="flex justify-between pt-5">
									<div>
										<h2 className=" font-semibold text-xl">Lisa Walsh</h2>
										<p className="text-muted-foreground">
											Operations Manager, Metro Properties
										</p>
									</div>
									<Image
										src="https://images.unsplash.com/photo-1590086782957-93c06ef21604?q=80&w=687&auto=format&fit=crop"
										alt="Lisa Walsh"
										width={200}
										height={200}
										className="size-16 rounded object-cover"
										placeholder="blur"
										blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQ3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
									/>
								</div>
							</article>
						</TimelineContent>
					</div>
				</div>
			</section>
		</main>
	)
}

export default ClientFeedback

import { ArrowRightIcon } from "@radix-ui/react-icons";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  className: string;
  background: ReactNode;
  Icon: React.ElementType;
  description: string;
  href: string;
  cta: string;
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "tw-:grid tw-:w-full tw-:auto-rows-[22rem] tw-:grid-cols-3 tw-:gap-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "tw-:group tw-:relative tw-:col-span-3 tw-:flex tw-:flex-col tw-:justify-between tw-:overflow-hidden tw-:rounded-xl",
      // light styles
      "tw-:bg-background tw-:[box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
      // dark styles
      "tw-:transform-gpu tw-:dark:bg-background tw-:dark:[border:1px_solid_rgba(255,255,255,.1)] tw-:dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
      className,
    )}
    {...props}
  >
    <div>{background}</div>
    <div className="tw-:p-4">
      <div className="tw-:pointer-events-none tw-:z-10 tw-:flex tw-:transform-gpu tw-:flex-col tw-:gap-1 tw-:transition-all tw-:duration-300 tw-:lg:group-hover:-translate-y-10">
        <Icon className="tw-:h-12 tw-:w-12 tw-:origin-left tw-:transform-gpu tw-:text-neutral-700 tw-:transition-all tw-:duration-300 tw-:ease-in-out tw-:group-hover:scale-75" />
        <h3 className="tw-:text-xl tw-:font-semibold tw-:text-neutral-700 tw-:dark:text-neutral-300">
          {name}
        </h3>
        <p className="tw-:max-w-lg tw-:text-neutral-400">{description}</p>
      </div>

      <div
        className={cn(
          "tw-:lg:hidden tw-:pointer-events-none tw-:flex tw-:w-full tw-:translate-y-0 tw-:transform-gpu tw-:flex-row tw-:items-center tw-:transition-all tw-:duration-300 tw-:group-hover:translate-y-0 tw-:group-hover:opacity-100",
        )}
      >
        <Button
          variant="link"
          asChild
          size="sm"
          className="tw-:pointer-events-auto tw-:p-0"
        >
          <a href={href}>
            {cta}
            <ArrowRightIcon className="tw-:ms-2 tw-:h-4 tw-:w-4 tw-:rtl:rotate-180" />
          </a>
        </Button>
      </div>
    </div>

    <div
      className={cn(
        "tw-:hidden tw-:lg:flex tw-:pointer-events-none tw-:absolute tw-:bottom-0 tw-:w-full tw-:translate-y-10 tw-:transform-gpu tw-:flex-row tw-:items-center tw-:p-4 tw-:opacity-0 tw-:transition-all tw-:duration-300 tw-:group-hover:translate-y-0 tw-:group-hover:opacity-100",
      )}
    >
      <Button
        variant="link"
        asChild
        size="sm"
        className="tw-:pointer-events-auto tw-:p-0"
      >
        <a href={href}>
          {cta}
          <ArrowRightIcon className="tw-:ms-2 tw-:h-4 tw-:w-4 tw-:rtl:rotate-180" />
        </a>
      </Button>
    </div>

    <div className="tw-:pointer-events-none tw-:absolute tw-:inset-0 tw-:transform-gpu tw-:transition-all tw-:duration-300 tw-:group-hover:bg-black/[.03] tw-:group-hover:dark:bg-neutral-800/10" />
  </div>
);

export { BentoCard, BentoGrid };

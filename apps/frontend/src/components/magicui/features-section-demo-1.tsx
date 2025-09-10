import React from "react";
import { useId } from "react";
import {
  cn,
  cardClasses,
  ANIMATION_DURATIONS,
  TYPOGRAPHY_SCALE
} from "@/lib/design-system";

export default function FeaturesSectionDemo() {
  return (
    <div className="py-20 lg:py-40">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10 md:gap-6 max-w-7xl mx-auto px-4">
        {grid.map((feature, index) => (
          <div
            key={feature.title}
            className={cn(
              "group relative overflow-hidden rounded-2xl p-8 transition-all",
              "bg-gradient-to-br from-white/80 to-gray-50/50 dark:from-gray-900/80 dark:to-gray-800/50",
              "border border-gray-200/50 dark:border-gray-700/50",
              "hover:shadow-xl hover:scale-[1.02] hover:border-primary/30",
              "backdrop-blur-sm",
              cardClasses('elevated')
            )}
            style={{
              animationDelay: `${index * 100}ms`,
              transition: `all ${ANIMATION_DURATIONS.default}ms ease-out`
            }}
          >
            <Grid size={20} />

            {/* Feature Icon */}
            <div className={cn(
              "w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20",
              "flex items-center justify-center mb-6 relative z-20",
              "group-hover:bg-primary/20 dark:group-hover:bg-primary/30",
              "transition-colors"
            )}
            style={{ transition: `all ${ANIMATION_DURATIONS.fast}ms ease-out` }}
            >
              <div className="w-6 h-6 rounded bg-primary/70" />
            </div>

            <h3 
              className={cn(
                "font-bold text-gray-900 dark:text-white relative z-20 mb-3",
                "group-hover:text-primary dark:group-hover:text-primary",
                "transition-colors"
              )}
              style={{ 
                fontSize: TYPOGRAPHY_SCALE['body-lg'].fontSize,
                lineHeight: TYPOGRAPHY_SCALE['body-lg'].lineHeight,
                fontWeight: TYPOGRAPHY_SCALE['body-lg'].fontWeight,
                transition: `color ${ANIMATION_DURATIONS.fast}ms ease-out` 
              }}
            >
              {feature.title}
            </h3>

            <p 
              className={cn(
                "text-gray-600 dark:text-gray-300 relative z-20 leading-relaxed",
                "group-hover:text-gray-700 dark:group-hover:text-gray-200",
                "transition-colors"
              )}
              style={{ 
                fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
                lineHeight: TYPOGRAPHY_SCALE['body-sm'].lineHeight,
                fontWeight: TYPOGRAPHY_SCALE['body-sm'].fontWeight,
                transition: `color ${ANIMATION_DURATIONS.fast}ms ease-out` 
              }}
            >
              {feature.description}
            </p>

            {/* Hover Gradient */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "pointer-events-none"
            )}
            style={{ transition: `opacity ${ANIMATION_DURATIONS.default}ms ease-out` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const grid = [
  {
    title: "HIPAA and SOC2 Compliant",
    description:
      "Our applications are HIPAA and SOC2 compliant, your data is safe with us, always.",
  },
  {
    title: "Automated Social Media Posting",
    description:
      "Schedule and automate your social media posts across multiple platforms to save time and maintain a consistent online presence.",
  },
  {
    title: "Advanced Analytics",
    description:
      "Gain insights into your social media performance with detailed analytics and reporting tools to measure engagement and ROI.",
  },
  {
    title: "Content Calendar",
    description:
      "Plan and organize your social media content with an intuitive calendar view, ensuring you never miss a post.",
  },
  {
    title: "Audience Targeting",
    description:
      "Reach the right audience with advanced targeting options, including demographics, interests, and behaviors.",
  },
  {
    title: "Social Listening",
    description:
      "Monitor social media conversations and trends to stay informed about what your audience is saying and respond in real-time.",
  },
  {
    title: "Customizable Templates",
    description:
      "Create stunning social media posts with our customizable templates, designed to fit your brand's unique style and voice.",
  },
  {
    title: "Collaboration Tools",
    description:
      "Work seamlessly with your team using our collaboration tools, allowing you to assign tasks, share drafts, and provide feedback in real-time.",
  },
];

export const Grid = ({
  pattern,
  size,
}: {
  pattern?: Array<[number, number]>;
  size?: number;
}) => {
  const p = pattern ?? [
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
  ];
  return (
    <div className="pointer-events-none absolute left-1/2 top-0  -ml-20 -mt-2 h-full w-full [mask-image:linear-gradient(white,transparent)]">
      <div className="absolute inset-0 bg-gradient-to-r  [mask-image:radial-gradient(farthest-side_at_top,white,transparent)] dark:from-zinc-900/30 from-zinc-100/30 to-zinc-300/30 dark:to-zinc-900/30 opacity-100">
        <GridPattern
          width={size ?? 20}
          height={size ?? 20}
          x={-12}
          y={4}
          squares={p}
          className="absolute inset-0 h-full w-full  mix-blend-overlay dark:fill-white/10 dark:stroke-white/10 stroke-black/10 fill-black/10"
        />
      </div>
    </div>
  );
};

interface GridPatternProps {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  squares?: Array<[number, number]>;
  [key: string]: unknown;
}

export function GridPattern({ width, height, x, y, squares, ...props }: GridPatternProps) {
  const patternId = useId();

  return (
    <svg aria-hidden="true" {...props}>
      <defs>
        <pattern
          id={patternId}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path d={`M.5 ${height}V.5H${width}`} fill="none" />
        </pattern>
      </defs>
      <rect
        width="100%"
        height="100%"
        strokeWidth={0}
        fill={`url(#${patternId})`}
      />
      {squares && (
        <svg x={x} y={y} className="overflow-visible">
          {squares.map(([x, y]: [number, number]) => (
            <rect
              strokeWidth="0"
              key={`${x}-${y}`}
              width={(width ?? 1) + 1}
              height={(height ?? 1) + 1}
              x={x * (width ?? 1)}
              y={y * (height ?? 1)}
            />
          ))}
        </svg>
      )}
    </svg>
  );
}

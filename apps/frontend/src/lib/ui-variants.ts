import { cva } from 'class-variance-authority'

export const badgeVariants = cva(
	'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
	{
		variants: {
			variant: {
				// Default: Minimal, 
				default:
					'bg-muted text-muted-foreground border border-border',

				// Primary: Steel blue brand color
				primary:
					'bg-primary/10 text-primary border border-primary/20',

				// Secondary: Slate gray
				secondary:
					'bg-secondary/10 text-secondary border border-secondary/20',

				// Accent: Deep teal for special status
				accent:
					'bg-accent/10 text-accent border border-accent/20',

				// Success: Muted green for positive indicators
				success:
					'bg-green-50 text-green-700 border border-green-200',

				// Warning: Attention needed
				warning:
					'bg-amber-50 text-amber-700 border border-amber-200',

				// Destructive: Muted red for error states
				destructive:
					'bg-destructive/10 text-destructive border border-destructive/20',

				// Info: Steel blue variant for information
				info:
					'bg-primary/5 text-primary/80 border border-primary/10',

				// Outline: Minimal, subtle
				outline:
					'bg-transparent text-foreground border border-border',

				// Muted: Even more subtle
				muted:
					'bg-muted/50 text-muted-foreground/80 border-transparent'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	}
)

export const buttonVariants = cva(
	'btn-base focus-ring disabled:pointer-events-none disabled:opacity-50 font-medium [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default:
					'bg-primary text-primary-foreground hover:bg-primary-600 shadow-sm hover:shadow-md',
				secondary:
					'bg-secondary text-secondary-foreground border border-border hover:bg-muted shadow-sm hover:shadow-md',
				outline:
					'border border-border bg-card text-foreground hover:bg-muted hover:border-primary-300 shadow-sm hover:shadow-md',
				ghost:
					'text-foreground hover:bg-muted shadow-none',
				link:
					'text-primary hover:text-primary-700 underline-offset-4 hover:underline shadow-none',
				destructive:
					'bg-destructive text-destructive-foreground hover:bg-red-600 shadow-sm hover:shadow-md',
				success:
					'bg-accent text-accent-foreground hover:bg-accent-600 shadow-sm hover:shadow-md'
			},
			size: {
				sm: 'h-8 px-3 text-xs rounded-md',
				default: 'h-10 px-4 text-sm',
				lg: 'h-11 px-6 text-base',
				icon: 'h-10 w-10 p-0'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
)

export const toggleVariants = cva(
	'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 gap-2',
	{
		variants: {
			variant: {
				default: 'bg-transparent',
				outline:
					'border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground'
			},
			size: {
				default: 'h-9 px-3',
				sm: 'h-8 px-2',
				lg: 'h-10 px-3'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
)

/* ===  CARD VARIANTS === */
export const cardVariants = cva(
	'card-modern overflow-hidden',
	{
		variants: {
			variant: {
				// Default: Clean,  card
				default: '',

				// Interactive: Hover states for clickable cards
				interactive: 'cursor-pointer hover:card-modern-hover',

				// Elevated: More prominent shadow
				elevated: 'shadow-lg border-primary-100',

				// Glass: Modern glass morphism
				glass: 'glass shadow-lg',

				// Outline: Minimal border only
				outline: 'bg-transparent border border-border shadow-none',

				// Flat: No shadow, minimal
				flat: 'shadow-none border-0'
			},
			padding: {
				none: 'p-0',
				sm: 'p-4',
				default: 'p-6',
				lg: 'p-8'
			}
		},
		defaultVariants: {
			variant: 'default',
			padding: 'default'
		}
	}
)

/* === ENHANCED CTA (CALL-TO-ACTION) VARIANTS === */
export const ctaVariants = cva(
	'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 text-center relative overflow-hidden',
	{
		variants: {
			variant: {
				// Primary CTA: Steel blue gradient - Main conversion action
				primary:
					'bg-gradient-steel-soft text-primary-foreground hover:shadow-xl hover:-translate-y-1 active:translate-y-0 shadow-lg rounded-lg px-8 py-4 text-lg',

				// Secondary CTA: Slate gray - Alternative action
				secondary:
					'bg-card border-2 border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground shadow-md hover:shadow-lg rounded-lg px-6 py-3',

				// Accent CTA: Deep teal - Special actions
				accent:
					'bg-gradient-accent-primary text-accent-foreground hover:shadow-xl hover:-translate-y-1 active:translate-y-0 shadow-lg rounded-lg px-8 py-4 text-lg',

				// Steel CTA: Deep steel blue gradient
				steel:
					'bg-gradient-steel-deep text-primary-foreground hover:shadow-xl hover:-translate-y-1 active:translate-y-0 shadow-lg rounded-lg px-8 py-4 text-lg',

				// Slate CTA: Sophisticated slate theme
				slate:
					'bg-gradient-slate-gentle text-secondary-foreground hover:shadow-xl hover:-translate-y-1 active:translate-y-0 shadow-lg rounded-lg px-8 py-4 text-lg',

				// Premium CTA: Enhanced dark gradient
				premium:
					'bg-gradient-slate-dark text-white hover:shadow-2xl hover:-translate-y-2 active:translate-y-0 shadow-xl rounded-lg px-10 py-5 text-xl font-bold',

				// Glass CTA: Modern glassmorphism
				glass:
					'glass backdrop-blur-lg text-foreground hover:backdrop-blur-xl shadow-lg hover:shadow-xl rounded-lg px-6 py-3',

				// Outline CTA: Minimal with steel border
				outline:
					'bg-transparent border-2 border-primary text-primary hover:bg-gradient-steel-soft hover:text-primary-foreground hover:border-transparent shadow-sm hover:shadow-lg rounded-lg px-6 py-3'
			},
			size: {
				sm: 'px-4 py-2 text-sm',
				default: 'px-6 py-3 text-base',
				lg: 'px-8 py-4 text-lg',
				xl: 'px-10 py-5 text-xl',
				hero: 'px-12 py-6 text-2xl font-bold'
			}
		},
		defaultVariants: {
			variant: 'primary',
			size: 'default'
		}
	}
)

/* === INPUT VARIANTS === */
export const inputVariants = cva(
	'flex w-full rounded-lg border border-input bg-card px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
	{
		variants: {
			variant: {
				default: '',
				error: 'border-destructive focus-visible:ring-destructive',
				success: 'border-accent focus-visible:ring-accent'
			},
			size: {
				sm: 'h-8 px-2 text-xs',
				default: 'h-10 px-3',
				lg: 'h-12 px-4 text-base'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
)

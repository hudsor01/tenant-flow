import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 overflow-hidden",
  {
    variants: {
      variant: {
        // Premium primary button with gradient and shadow
        premium: "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 border border-blue-500/20",
        
        // Modern glass-morphism style
        glass: "bg-white/10 backdrop-blur-md border border-white/20 text-foreground hover:bg-white/20 shadow-lg",
        
        // Elevated outline with better shadows
        outline: "border-2 border-border bg-background hover:bg-muted/50 shadow-md hover:shadow-lg hover:border-border/80",
        
        // Social login buttons
        social: "bg-white border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-md hover:shadow-lg text-gray-700",
        
        // Success/confirmation style
        success: "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-600/25",
        
        // Ghost with subtle hover
        ghost: "hover:bg-muted/60 hover:shadow-sm",
        
        // Link style with underline animation
        link: "text-blue-600 hover:text-blue-700 underline-offset-4 hover:underline font-medium",

        // Standard variants for compatibility
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80"
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 px-4 py-2",
        lg: "h-12 px-8 py-3 text-base",
        xl: "h-14 px-10 py-4 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
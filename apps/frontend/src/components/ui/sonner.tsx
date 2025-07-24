import type { ToasterProps } from "sonner";
import { Toaster as Sonner } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  // React app - not using next-themes
  const theme = "light"

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }

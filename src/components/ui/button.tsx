import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transform hover:scale-[1.03] active:scale-[0.97] relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-gold hover:bg-primary/90 hover:shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)]",
        destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90 hover:shadow-[0_10px_30px_-10px_hsl(0_84%_60%/0.5)]",
        outline: "border-2 border-border bg-transparent text-foreground shadow-xs hover:bg-primary/10 hover:text-primary hover:border-primary hover:shadow-[0_8px_25px_-8px_hsl(var(--primary)/0.4)]",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 border border-border hover:border-primary/30 hover:shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.3)]",
        ghost: "hover:bg-primary/10 hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
        gold: "bg-gradient-to-r from-primary via-gold-light to-primary text-primary-foreground shadow-gold hover:shadow-[0_15px_40px_-10px_hsl(var(--primary)/0.7)] hover:from-primary/95 hover:via-gold-light hover:to-primary/95",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg gap-1.5 px-3",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "size-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
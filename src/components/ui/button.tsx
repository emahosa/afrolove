import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-250 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden group",
  {
    variants: {
      variant: {
        default: [
          "text-white border border-[var(--glass-border-strong)]",
          "bg-[rgba(255,255,255,0.08)] backdrop-blur-[16px] saturate-[1.2]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_18px_rgba(0,0,0,0.35)]",
          "bg-gradient-to-t from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)]",
          "hover:transform hover:translate-y-[-3px] hover:scale-[1.03] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_28px_rgba(0,0,0,0.5)]",
          "active:scale-[0.985]",
          // Reflective sweep element
          "before:content-[''] before:absolute before:inset-[-40%_auto_auto_-40%] before:w-[60%] before:h-[200%]",
          "before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent",
          "before:transition-transform before:duration-500 before:ease-in-out before:rotate-[-25deg] before:translate-x-[-120%]",
          "hover:before:translate-x-[120%] hover:before:rotate-[-25deg]",
        ],
        destructive: [
          "text-white border border-[var(--glass-border-strong)]",
          "bg-[rgba(255,255,255,0.08)] backdrop-blur-[16px] saturate-[1.2]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_18px_rgba(0,0,0,0.35)]",
          "bg-gradient-to-t from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)]",
          "hover:transform hover:translate-y-[-3px] hover:scale-[1.03] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_28px_rgba(0,0,0,0.5)]",
        ],
        outline: "border border-input bg-transparent hover:bg-white/10",
        secondary: "bg-white/10 hover:bg-white/20",
        ghost: "hover:bg-white/10",
        link: "text-white underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-full px-3",
        lg: "h-11 rounded-full px-8",
        icon: "h-10 w-10",
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
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

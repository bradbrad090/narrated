import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        free:
          "border-2 border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 text-slate-700 shadow-sm",
        basic:
          "border-transparent bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-md",
        standard:
          "border-transparent bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-md",
        premium:
          "border-transparent bg-gradient-to-br from-yellow-400 to-yellow-500 text-slate-900 shadow-lg font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

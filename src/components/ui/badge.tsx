import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground border-border",
        // Financial domain badges
        shared:
          "border-emerald-200 bg-emerald-50 text-emerald-800 font-medium",
        personal:
          "border-stone-200 bg-stone-100 text-stone-700 font-medium",
        custom:
          "border-blue-200 bg-blue-50 text-blue-800 font-medium",
        receivable:
          "border-emerald-200 bg-emerald-50 text-emerald-800 font-mono tabular-nums font-semibold",
        payable:
          "border-rose-200 bg-rose-50 text-rose-800 font-mono tabular-nums font-semibold",
        pending:
          "border-amber-200 bg-amber-50 text-amber-800 font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

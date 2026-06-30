import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border tracking-wide",
  {
    variants: {
      variant: {
        safe:    "bg-safe/10 text-safe border-safe/30",
        caution: "bg-caution/10 text-caution border-caution/30",
        warning: "bg-warning/10 text-warning border-warning/30",
        danger:  "bg-danger/10 text-danger border-danger/30",
        default: "bg-surface-el text-text-muted border-border",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

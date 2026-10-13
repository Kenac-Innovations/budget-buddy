import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// Humaflow Card: one topic per card, separated by border, never by stripes or heavy shadows.
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-5 rounded-xl border border-border bg-card py-5 text-card-foreground shadow-card", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex items-start justify-between gap-2 px-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("flex items-center gap-2 text-[15px] leading-none font-semibold [&_svg]:size-4", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("mt-1.5 text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-2 px-5", className)} {...props} />;
}

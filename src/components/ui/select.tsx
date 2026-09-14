import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Native <select> styled with the project's zinc design tokens.
 * A native control is intentional here: it is fully keyboard-accessible and
 * needs no additional runtime dependency.
 */
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "w-full bg-muted/30 border border-input rounded-md px-3 h-9 text-sm text-foreground outline-none transition-colors focus:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

export { Select };

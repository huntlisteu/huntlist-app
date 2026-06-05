import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

// Colori ombra/bordo hardcoded perché Tailwind non interpola CSS vars
// nelle classi arbitrary shadow. Ink #1A1A18 (light) / Char #3A3D38 (dark).
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[4px] text-sm font-medium transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-2 border-[#1A1A18] shadow-[4px_4px_0px_#1A1A18] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#1A1A18] dark:border-[#3A3D38] dark:shadow-[4px_4px_0px_#3A3D38] dark:hover:shadow-[2px_2px_0px_#3A3D38]",
        secondary:
          "bg-secondary text-secondary-foreground border-2 border-[#1A1A18] shadow-[4px_4px_0px_#1A1A18] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#1A1A18] dark:border-[#3A3D38] dark:shadow-[4px_4px_0px_#3A3D38] dark:hover:shadow-[2px_2px_0px_#3A3D38]",
        accent:
          "bg-accent text-accent-foreground border-2 border-[#1A1A18] shadow-[4px_4px_0px_#1A1A18] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#1A1A18] dark:border-[#3A3D38] dark:shadow-[4px_4px_0px_#3A3D38] dark:hover:shadow-[2px_2px_0px_#3A3D38]",
        ember:
          "bg-[#B84A1C] text-[#FAF7F2] border-2 border-[#1A1A18] shadow-[4px_4px_0px_#1A1A18] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#1A1A18] dark:bg-[#FF6B2C] dark:text-[#111210] dark:border-[#3A3D38] dark:shadow-[4px_4px_0px_#3A3D38] dark:hover:shadow-[2px_2px_0px_#3A3D38]",
        outline:
          "border-2 border-[#1A1A18] bg-background text-foreground shadow-[4px_4px_0px_#1A1A18] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#1A1A18] dark:border-[#3A3D38] dark:shadow-[4px_4px_0px_#3A3D38] dark:hover:shadow-[2px_2px_0px_#3A3D38]",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

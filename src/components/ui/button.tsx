import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Zed/Telegram base styles - ghost by default, subtle interactions
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]',
  {
    variants: {
      variant: {
        // Default is now ghost-like - transparent with subtle hover
        default: 'bg-transparent text-foreground hover:bg-accent',
        // Primary action - solid accent color
        primary: 'bg-primary text-primary-foreground hover:brightness-110',
        // Destructive - for dangerous actions
        destructive: 'bg-transparent text-destructive hover:bg-destructive/10',
        // Outline - minimal border
        outline: 'border border-border bg-transparent hover:bg-accent hover:border-transparent',
        // Secondary - subtle background
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        // Ghost - completely transparent, only shows on hover
        ghost: 'bg-transparent hover:bg-accent',
        // Link - text only
        link: 'text-primary underline-offset-4 hover:underline bg-transparent',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-6',
        icon: 'h-9 w-9',
        // Telegram-style pill
        pill: 'h-9 px-5 py-2 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center py-1 cursor-pointer",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800/90 border border-slate-300/40 dark:border-slate-700/40">
      <SliderPrimitive.Range className="absolute h-full bg-sky-500 dark:bg-sky-400 rounded-full" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="relative block h-4.5 w-4.5 sm:h-4 sm:w-4 rounded-full border-2 border-sky-500 dark:border-sky-400 bg-white shadow-md transition-transform hover:scale-115 active:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing touch-manipulation after:absolute after:-inset-3 after:content-['']" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };

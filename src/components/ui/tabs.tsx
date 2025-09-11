
import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-12 items-center justify-center rounded-lg bg-card/50 backdrop-blur-sm p-1 text-muted-foreground border border-border/20 shadow-sm",
      "transition-all duration-300 ease-in-out",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2.5 text-sm font-medium",
      "ring-offset-background transition-all duration-300 ease-in-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      "hover:bg-accent/50 hover:text-accent-foreground hover:scale-105",
      "data-[state=active]:bg-melody-primary data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:rounded-none",
      "data-[state=active]:border data-[state=active]:border-melody-primary/20",
      "text-foreground/70 hover:text-foreground",
      "transform hover:translate-y-[-1px] active:translate-y-0",
      "relative overflow-hidden",
      "before:absolute before:inset-0 before:bg-gradient-to-r before:from-melody-primary/10 before:to-melody-secondary/10",
      "before:opacity-0 before:transition-opacity before:duration-300",
      "data-[state=active]:before:opacity-100",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 ring-offset-background",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "animate-fade-in",
      "transition-all duration-300 ease-in-out",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }

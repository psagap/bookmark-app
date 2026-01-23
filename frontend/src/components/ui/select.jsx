"use client"

import * as React from "react"
import { isValidElement } from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Create a Context for `indicatorPosition` and `indicator` control
const SelectContext = React.createContext({
  indicatorPosition: 'left',
  indicatorVisibility: true,
  indicator: null
})

// Root Component with context
const Select = ({
  indicatorPosition = 'left',
  indicatorVisibility = true,
  indicator,
  ...props
}) => {
  return (
    <SelectContext.Provider value={{ indicatorPosition, indicatorVisibility, indicator }}>
      <SelectPrimitive.Root {...props} />
    </SelectContext.Provider>
  )
}

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

// Define size variants for SelectTrigger
const selectTriggerVariants = cva(
  `
    flex items-center justify-between outline-none border shadow-xs transition-all
    bg-[#1a1a1d] border-white/[0.1] text-white/90
    data-[placeholder]:text-white/40
    focus-visible:border-white/20 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/5
    hover:border-white/20 hover:bg-[#1e1e22]
    disabled:cursor-not-allowed disabled:opacity-50
    [&>span]:line-clamp-1
  `,
  {
    variants: {
      size: {
        sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
        md: 'h-10 px-4 text-sm gap-2 rounded-xl',
        lg: 'h-12 px-5 text-base gap-2.5 rounded-xl',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
)

const SelectTrigger = React.forwardRef(({ className, children, size, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(selectTriggerVariants({ size }), className)}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50 -me-0.5 shrink-0" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4 text-white/50" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4 text-white/50" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-xl border border-white/[0.1] bg-[#1e1e22] shadow-2xl shadow-black/50 text-white/90",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1.5 data-[side=left]:-translate-x-1.5 data-[side=right]:translate-x-1.5 data-[side=top]:-translate-y-1.5",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1.5",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 ps-8 pe-2 text-xs text-white/40 font-medium", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => {
  const { indicatorPosition, indicatorVisibility, indicator } = React.useContext(SelectContext)

  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-lg py-2 text-sm outline-none",
        "text-white/80 hover:bg-white/[0.06] hover:text-white focus:bg-white/[0.06] focus:text-white",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        indicatorPosition === 'left' ? 'ps-8 pe-3' : 'pe-8 ps-3',
        className
      )}
      {...props}
    >
      {indicatorVisibility && (
        indicator && isValidElement(indicator) ? (
          indicator
        ) : (
          <span
            className={cn(
              "absolute flex h-3.5 w-3.5 items-center justify-center",
              indicatorPosition === 'left' ? 'start-2.5' : 'end-2.5'
            )}
          >
            <SelectPrimitive.ItemIndicator>
              <Check className="h-4 w-4 text-primary" />
            </SelectPrimitive.ItemIndicator>
          </span>
        )
      )}
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
})
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectIndicator = React.forwardRef(({ children, className, ...props }, ref) => {
  const { indicatorPosition } = React.useContext(SelectContext)

  return (
    <span
      ref={ref}
      className={cn(
        "absolute flex top-1/2 -translate-y-1/2 items-center justify-center",
        indicatorPosition === 'left' ? 'start-2' : 'end-2',
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemIndicator>{children}</SelectPrimitive.ItemIndicator>
    </span>
  )
})
SelectIndicator.displayName = "SelectIndicator"

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1.5 my-1.5 h-px bg-white/[0.08]", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectIndicator,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}

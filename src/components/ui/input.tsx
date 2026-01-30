import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border-2 border-[#CBD5E1] dark:border-[#475569] bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] px-4 py-2.5 text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#94A3B8] dark:placeholder:text-[#64748B] focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981] focus:ring-opacity-20 disabled:cursor-not-allowed disabled:opacity-50 hover:border-[#94A3B8] dark:hover:border-[#64748B]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

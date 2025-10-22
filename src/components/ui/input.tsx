import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        style={{
          ...((props as any).style || {}),
          boxShadow: 'none',
          ...(document.documentElement.classList.contains('dark') && {
            borderColor: 'black'
          })
        }}
        className={cn(
          "flex h-10 w-full rounded-md border-2 border-gray-200 dark:border-black bg-white dark:bg-black text-gray-900 dark:text-white px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-black dark:focus:border-white focus:shadow-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors [&:focus]:!shadow-none [&:focus]:!ring-0 [&:focus]:!outline-none",
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

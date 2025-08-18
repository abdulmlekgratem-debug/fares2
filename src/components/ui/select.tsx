import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
}

interface SelectContentProps {
  children: React.ReactNode
  className?: string
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

interface SelectValueProps {
  placeholder?: string
}

const Select = ({ value, onValueChange, children }: SelectProps) => {
  const [isOpen, setIsOpen] = React.useState(false)

  return (
    <div className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, {
            value,
            onValueChange,
            isOpen,
            setIsOpen,
          })
        }
        return child
      })}
    </div>
  )
}

const SelectTrigger = ({ children, className, ...props }: SelectTriggerProps & any) => {
  return (
    <button
      className={cn(
        "flex h-12 w-full items-center justify-between rounded-full border-2 border-yellow-300 bg-white px-4 py-3 text-base text-gray-900",
        "focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        "shadow-md hover:shadow-lg transition-all duration-300",
        "rtl:pr-4 rtl:pl-2 ltr:pl-4 ltr:pr-2 text-right",
        className
      )}
      onClick={() => props.setIsOpen(!props.isOpen)}
      {...props}
    >
      {children}
      <ChevronDown className="h-5 w-5 text-yellow-600 opacity-70" />
    </button>
  )
}

const SelectContent = ({ children, className, ...props }: SelectContentProps & any) => {
  if (!props.isOpen) return null

  return (
    <div
      className={cn(
        "absolute top-full left-0 z-50 w-full min-w-[8rem] rounded-xl border border-yellow-300 p-1 shadow-2xl",
        "bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 text-white",
        "rtl:text-right ltr:text-left",
        "max-h-32 overflow-y-auto overscroll-contain", // ← تم التحديث
        "scrollbar-thin scrollbar-thumb-yellow-300 scrollbar-track-transparent",
        "mt-1", // مسافة صغيرة بين التريغر والقائمة
        className
      )}
      style={{ direction: "rtl" }}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, {
            onValueChange: props.onValueChange,
            setIsOpen: props.setIsOpen,
          })
        }
        return child
      })}
    </div>
  )
}
const SelectItem = ({ value, children, className, ...props }: SelectItemProps & any) => {
  return (
    <div
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-2 pr-4 pl-10 text-base outline-none",
        "text-white hover:bg-yellow-200 hover:text-gray-900 focus:bg-yellow-200 focus:text-gray-900",
        "rtl:text-right ltr:text-left",
        className
      )}
      onClick={() => {
        props.onValueChange(value)
        props.setIsOpen(false)
      }}
      style={{ direction: "rtl", textAlign: "right" }}
    >
      {children}
    </div>
  )
}

const SelectValue = ({ placeholder, ...props }: SelectValueProps & any) => {
  const displayValue =
    props.value === "all" || !props.value ? placeholder : props.value

  return (
    <span
      className="block truncate text-right pr-2 text-gray-900"
      style={{ textAlign: "right", direction: "rtl" }}
    >
      {displayValue || placeholder}
    </span>
  )
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue }

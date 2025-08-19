import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

// Context
const SelectContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  searchable?: boolean
  searchTerm: string
  setSearchTerm: (val: string) => void
} | null>(null)

const useSelectContext = () => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("Select.* must be used within <Select>")
  return context
}

// Select
const Select = ({ value, onValueChange, children, searchable = false }: {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  searchable?: boolean
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen, searchable, searchTerm, setSearchTerm }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

// Trigger
const SelectTrigger = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const { setIsOpen, setSearchTerm } = useSelectContext()
  return (
    <button
      type="button"
      className={cn(
        "flex h-12 w-full items-center justify-between rounded-full border-2 border-yellow-300 bg-white px-4 py-3 text-base text-gray-900",
        "focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2",
        "shadow-md hover:shadow-lg transition-all duration-300",
        "rtl:pr-4 rtl:pl-2 ltr:pl-4 ltr:pr-2 text-right",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onClick={() => setIsOpen(open => {
        const next = !open
        if (!next) setSearchTerm("")
        return next
      })}
    >
      {children}
      <ChevronDown className="h-5 w-5 text-yellow-600 opacity-70" />
    </button>
  )
}

// Value
const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { value } = useSelectContext()
  const displayValue = value === "all" || !value ? placeholder : value
  return (
    <span
      className="block truncate text-right pr-2 text-gray-900"
      style={{ textAlign: 'right', direction: 'rtl' }}
    >
      {displayValue || placeholder}
    </span>
  )
}

// Content
const SelectContent = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const { isOpen, searchable, searchTerm, setSearchTerm } = useSelectContext()
  if (!isOpen) return null

  const normalize = (s: string) => s?.toString().toLowerCase().trim()

  const filteredChildren = React.Children.toArray(children).filter((child) => {
    if (!searchable) return true
    const q = normalize(searchTerm)
    if (!q) return true
    if (React.isValidElement(child) && typeof child.props?.value === 'string') {
      const val: string = child.props.value
      return normalize(val).includes(q)
    }
    return true
  })

  return (
    <div
      className={cn(
        "absolute top-full right-0 left-0 z-[9999] mt-1 w-full min-w-[8rem] max-h-64 overflow-y-auto overscroll-contain",
        "rounded-xl border border-yellow-300 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 p-1 text-white shadow-2xl",
        "scrollbar-thin scrollbar-thumb-yellow-300 scrollbar-track-transparent",
        "rtl:text-right ltr:text-left",
        className
      )}
      style={{ direction: 'rtl' }}
    >
      {searchable && (
        <div className="p-1 sticky top-0 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 z-10">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="اكتب للبحث..."
            className="h-10 rounded-full bg-white/90 text-gray-900 placeholder:text-gray-500 border border-yellow-200 focus:border-yellow-300"
          />
        </div>
      )}
      <div className="py-1">
        {filteredChildren.length > 0 ? (
          filteredChildren as React.ReactNode
        ) : (
          <div className="py-2 px-3 text-sm text-white/90">لا توجد نتائج</div>
        )}
      </div>
    </div>
  )
}

// Item
const SelectItem = ({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) => {
  const { onValueChange, setIsOpen, setSearchTerm } = useSelectContext()
  return (
    <div
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pr-4 pl-10 text-base",
        "text-white hover:bg-yellow-200 hover:text-gray-900 focus:bg-yellow-200 focus:text-gray-900 outline-none",
        "rtl:text-right ltr:text-left",
        className
      )}
      onClick={() => {
        onValueChange(value)
        setIsOpen(false)
        setSearchTerm("")
      }}
      style={{ direction: 'rtl', textAlign: 'right' }}
    >
      {children}
    </div>
  )
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue }

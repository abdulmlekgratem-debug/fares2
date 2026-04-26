import * as React from "react"
import { ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const selectRef = React.useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <SelectContext.Provider value={{ value, onValueChange, isOpen, setIsOpen, searchable, searchTerm, setSearchTerm }}>
      <div ref={selectRef} className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

// Trigger
const SelectTrigger = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const { setIsOpen, setSearchTerm, isOpen } = useSelectContext()
  return (
    <button
      type="button"
      className={cn(
        "relative z-[100000] flex h-12 w-full items-center justify-between rounded-xl border-2 bg-input px-4 py-3 text-base",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
        "shadow-md hover:shadow-lg transition-all duration-300",
        "rtl:pr-4 rtl:pl-2 ltr:pl-4 ltr:pr-2 text-right",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isOpen && "ring-2 ring-primary",
        className
      )}
      onClick={() => setIsOpen(open => {
        const next = !open
        if (!next) setSearchTerm("")
        return next
      })}
    >
      {children}
      <ChevronDown className={cn(
        "h-5 w-5 text-primary opacity-70 transition-transform duration-200",
        isOpen && "rotate-180"
      )} />
    </button>
  )
}

// Value
const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { value } = useSelectContext()
  const displayValue = value === "all" || !value ? placeholder : value
  return (
    <span
      className="block truncate text-right pr-2 text-foreground"
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
        "absolute top-full right-0 left-0 z-[100001] mt-2 w-full min-w-[8rem] max-h-64 overflow-y-auto overscroll-contain",
        "rounded-xl border-2 border-border bg-popover p-1 text-popover-foreground shadow-2xl",
        "scrollbar-thin scrollbar-thumb-primary scrollbar-track-transparent",
        "rtl:text-right ltr:text-left animate-fade-in",
        className
      )}
      style={{ direction: 'rtl' }}
    >
      {searchable && (
        <div className="p-2 sticky top-0 bg-popover z-10 border-b border-border">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="اكتب للبحث..."
              className="w-full h-10 pr-10 pl-4 rounded-lg bg-input text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      )}
      <div className="py-1">
        {filteredChildren.length > 0 ? (
          filteredChildren as React.ReactNode
        ) : (
          <div className="py-2 px-3 text-sm text-muted-foreground">لا توجد نتائج</div>
        )}
      </div>
    </div>
  )
}

// Item
const SelectItem = ({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) => {
  const { onValueChange, setIsOpen, setSearchTerm, value: selectedValue } = useSelectContext()
  const isSelected = value === selectedValue
  
  return (
    <div
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2.5 pr-4 pl-10 text-base",
        "text-foreground hover:bg-primary/10 hover:text-primary focus:bg-primary/10 outline-none transition-colors duration-200",
        "rtl:text-right ltr:text-left",
        isSelected && "bg-primary/10 text-primary font-semibold",
        className
      )}
      onClick={() => {
        onValueChange(value)
        setIsOpen(false)
        setSearchTerm("")
      }}
      style={{ direction: 'rtl', textAlign: 'right' }}
    >
      {isSelected && (
        <span className="absolute left-3 text-primary">✓</span>
      )}
      {children}
    </div>
  )
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue }
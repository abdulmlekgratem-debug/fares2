import * as React from "react"
import { ChevronDown, Search, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "./badge"

interface MultiSelectProps {
  values: string[]
  onValuesChange: (values: string[]) => void
  options: string[]
  placeholder?: string
  className?: string
  searchable?: boolean
  allLabel?: string
}

export function MultiSelect({
  values,
  onValuesChange,
  options,
  placeholder = "اختر...",
  className,
  searchable = true,
  allLabel = "الكل"
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm("")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const isAllSelected = values.length === 0 || values.includes("all")

  const toggleOption = (option: string) => {
    if (option === "all") {
      onValuesChange([])
      return
    }

    const newValues = values.includes(option)
      ? values.filter(v => v !== option)
      : [...values.filter(v => v !== "all"), option]
    
    onValuesChange(newValues.length === 0 ? [] : newValues)
  }

  const removeValue = (valueToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newValues = values.filter(v => v !== valueToRemove)
    onValuesChange(newValues)
  }

  const displayText = isAllSelected 
    ? allLabel 
    : values.length > 2 
      ? `${values.length} محدد`
      : values.join(", ")

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={cn(
          "relative z-[100000] flex min-h-12 w-full items-center justify-between rounded-xl border-2 bg-input px-4 py-2 text-base",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
          "shadow-md hover:shadow-lg transition-all duration-300",
          "rtl:pr-4 rtl:pl-2 ltr:pl-4 ltr:pr-2 text-right",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isOpen && "ring-2 ring-primary",
          className
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-1 flex-1 text-right" style={{ direction: 'rtl' }}>
          {isAllSelected ? (
            <span className="text-foreground">{allLabel}</span>
          ) : values.length <= 2 ? (
            values.map(value => (
              <Badge 
                key={value} 
                variant="secondary"
                className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-md flex items-center gap-1"
              >
                {value}
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-destructive" 
                  onClick={(e) => removeValue(value, e)}
                />
              </Badge>
            ))
          ) : (
            <span className="text-foreground">{displayText}</span>
          )}
        </div>
        <ChevronDown className={cn(
          "h-5 w-5 text-primary opacity-70 transition-transform duration-200 flex-shrink-0",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute top-full right-0 left-0 z-[100001] mt-2 w-full min-w-[8rem] max-h-64 overflow-y-auto overscroll-contain",
            "rounded-xl border-2 border-border bg-popover p-1 text-popover-foreground shadow-2xl",
            "scrollbar-thin scrollbar-thumb-primary scrollbar-track-transparent",
            "rtl:text-right ltr:text-left animate-fade-in"
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
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          <div className="py-1">
            {/* All option */}
            <div
              className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2.5 pr-4 pl-10 text-base",
                "text-foreground hover:bg-primary/10 hover:text-primary focus:bg-primary/10 outline-none transition-colors duration-200",
                isAllSelected && "bg-primary/10 text-primary font-semibold"
              )}
              onClick={() => toggleOption("all")}
            >
              {isAllSelected && <Check className="absolute left-3 w-4 h-4 text-primary" />}
              {allLabel}
            </div>

            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = values.includes(option)
                return (
                  <div
                    key={option}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2.5 pr-4 pl-10 text-base",
                      "text-foreground hover:bg-primary/10 hover:text-primary focus:bg-primary/10 outline-none transition-colors duration-200",
                      isSelected && "bg-primary/10 text-primary font-semibold"
                    )}
                    onClick={() => toggleOption(option)}
                  >
                    {isSelected && <Check className="absolute left-3 w-4 h-4 text-primary" />}
                    {option}
                  </div>
                )
              })
            ) : (
              <div className="py-2 px-3 text-sm text-muted-foreground">لا توجد نتائج</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

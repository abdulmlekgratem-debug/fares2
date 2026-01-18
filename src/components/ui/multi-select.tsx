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
  const [isClosing, setIsClosing] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleClose = React.useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      setIsOpen(false)
      setIsClosing(false)
      setSearchTerm("")
    }, 200)
  }, [])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [handleClose])

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

  const handleToggle = () => {
    if (isOpen) {
      handleClose()
    } else {
      setIsOpen(true)
    }
  }

  return (
    <div ref={containerRef} className="relative group">
      <button
        type="button"
        className={cn(
          "relative z-[100000] flex min-h-12 w-full items-center justify-between rounded-xl border-2 bg-input px-4 py-2 text-base",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
          "shadow-md hover:shadow-xl transition-all duration-300 ease-out",
          "rtl:pr-4 rtl:pl-2 ltr:pl-4 ltr:pr-2 text-right",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "hover:border-primary/60 hover:scale-[1.02] active:scale-[0.98]",
          "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-r before:from-primary/0 before:via-primary/5 before:to-primary/0 before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100",
          isOpen && "ring-2 ring-primary border-primary scale-[1.02]",
          className
        )}
        onClick={handleToggle}
      >
        <div className="flex flex-wrap gap-1.5 flex-1 text-right relative z-10" style={{ direction: 'rtl' }}>
          {isAllSelected ? (
            <span className="text-foreground transition-colors duration-200">{allLabel}</span>
          ) : values.length <= 2 ? (
            values.map((value, index) => (
              <Badge 
                key={value} 
                variant="secondary"
                className="bg-primary/20 text-primary text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-scale-in hover:bg-primary/30 transition-all duration-200"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {value}
                <X 
                  className="w-3.5 h-3.5 cursor-pointer hover:text-destructive hover:scale-125 transition-all duration-200" 
                  onClick={(e) => removeValue(value, e)}
                />
              </Badge>
            ))
          ) : (
            <span className="text-foreground">{displayText}</span>
          )}
        </div>
        <ChevronDown className={cn(
          "h-5 w-5 text-primary opacity-70 transition-all duration-300 flex-shrink-0 relative z-10",
          isOpen ? "rotate-180 opacity-100" : "group-hover:opacity-100 group-hover:translate-y-0.5"
        )} />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute top-full right-0 left-0 z-[100001] mt-2 w-full min-w-[8rem] max-h-64 overflow-y-auto overscroll-contain",
            "rounded-xl border-2 border-border bg-popover/95 backdrop-blur-lg p-1.5 text-popover-foreground shadow-2xl",
            "scrollbar-thin scrollbar-thumb-primary scrollbar-track-transparent",
            "rtl:text-right ltr:text-left",
            "origin-top",
            isClosing 
              ? "animate-[scaleOut_0.2s_ease-out_forwards]" 
              : "animate-[scaleIn_0.2s_ease-out_forwards]"
          )}
          style={{ 
            direction: 'rtl',
          }}
        >
          {searchable && (
            <div className="p-2 sticky top-0 bg-popover/95 backdrop-blur-lg z-10 border-b border-border/50 rounded-t-lg">
              <div className="relative group/search">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors duration-200 group-focus-within/search:text-primary" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="اكتب للبحث..."
                  className="w-full h-10 pr-10 pl-4 rounded-lg bg-input text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-300"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>
            </div>
          )}
          <div className="py-1">
            {/* All option */}
            <div
              className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2.5 pr-4 pl-10 text-base",
                "text-foreground hover:bg-primary/10 hover:text-primary focus:bg-primary/10 outline-none",
                "transition-all duration-200 ease-out hover:translate-x-1 hover:shadow-sm",
                isAllSelected && "bg-primary/15 text-primary font-semibold shadow-sm"
              )}
              onClick={() => toggleOption("all")}
            >
              <div className={cn(
                "absolute left-3 w-5 h-5 rounded-md border-2 border-border flex items-center justify-center transition-all duration-200",
                isAllSelected && "bg-primary border-primary"
              )}>
                {isAllSelected && <Check className="w-3.5 h-3.5 text-primary-foreground animate-scale-in" />}
              </div>
              {allLabel}
            </div>

            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isSelected = values.includes(option)
                return (
                  <div
                    key={option}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2.5 pr-4 pl-10 text-base",
                      "text-foreground hover:bg-primary/10 hover:text-primary focus:bg-primary/10 outline-none",
                      "transition-all duration-200 ease-out hover:translate-x-1 hover:shadow-sm",
                      isSelected && "bg-primary/15 text-primary font-semibold shadow-sm"
                    )}
                    onClick={() => toggleOption(option)}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className={cn(
                      "absolute left-3 w-5 h-5 rounded-md border-2 border-border flex items-center justify-center transition-all duration-200",
                      isSelected && "bg-primary border-primary scale-110"
                    )}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground animate-scale-in" />}
                    </div>
                    {option}
                  </div>
                )
              })
            ) : (
              <div className="py-4 px-3 text-sm text-muted-foreground text-center">لا توجد نتائج</div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scaleY(0.9) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: scaleY(1) translateY(0);
          }
        }
        @keyframes scaleOut {
          from {
            opacity: 1;
            transform: scaleY(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scaleY(0.9) translateY(-8px);
          }
        }
      `}</style>
    </div>
  )
}

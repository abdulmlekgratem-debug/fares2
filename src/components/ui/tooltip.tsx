import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: string
  side?: "top" | "bottom" | "left" | "right"
  className?: string
}

export function Tooltip({ children, content, side = "top", className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const hideTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const showTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const clearTimeouts = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current)
      showTimeoutRef.current = null
    }
  }

  const showTooltip = () => {
    clearTimeouts()
    showTimeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        let x = rect.left + rect.width / 2
        let y = rect.top

        switch (side) {
          case "bottom":
            y = rect.bottom + 8
            break
          case "top":
            y = rect.top - 8
            break
          case "left":
            x = rect.left - 8
            y = rect.top + rect.height / 2
            break
          case "right":
            x = rect.right + 8
            y = rect.top + rect.height / 2
            break
        }

        setPosition({ x, y })
        setIsVisible(true)
      }
    }, 200)
  }

  const hideTooltip = () => {
    clearTimeouts()
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false)
    }, 100)
  }

  React.useEffect(() => {
    return () => clearTimeouts()
  }, [])

  const getTooltipStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {
      position: "fixed",
      zIndex: 999999,
      pointerEvents: "none",
    }

    switch (side) {
      case "top":
        styles.left = position.x
        styles.top = position.y
        styles.transform = "translateX(-50%) translateY(-100%)"
        break
      case "bottom":
        styles.left = position.x
        styles.top = position.y
        styles.transform = "translateX(-50%)"
        break
      case "left":
        styles.left = position.x
        styles.top = position.y
        styles.transform = "translateX(-100%) translateY(-50%)"
        break
      case "right":
        styles.left = position.x
        styles.top = position.y
        styles.transform = "translateY(-50%)"
        break
    }

    return styles
  }

  const getArrowClasses = () => {
    switch (side) {
      case "top":
        return "bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-popover border-x-transparent border-b-transparent"
      case "bottom":
        return "top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-popover border-x-transparent border-t-transparent"
      case "left":
        return "right-0 top-1/2 translate-x-full -translate-y-1/2 border-l-popover border-y-transparent border-r-transparent"
      case "right":
        return "left-0 top-1/2 -translate-x-full -translate-y-1/2 border-r-popover border-y-transparent border-l-transparent"
    }
  }

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>

      {isVisible && (
        <div
          style={getTooltipStyles()}
          className={cn(
            "px-3 py-2 text-sm font-medium rounded-xl",
            "bg-popover text-popover-foreground",
            "border border-border/50 shadow-xl backdrop-blur-sm",
            "animate-fade-in",
            "whitespace-nowrap",
            className
          )}
        >
          {content}
          <div
            className={cn(
              "absolute w-0 h-0 border-[6px]",
              getArrowClasses()
            )}
          />
        </div>
      )}
    </>
  )
}

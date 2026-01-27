import { Minimize2, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DisplayMode } from '@/hooks/useDisplayMode'

interface DisplayModeToggleProps {
  mode: DisplayMode
  onToggle: () => void
  className?: string
}

export default function DisplayModeToggle({ mode, onToggle, className = '' }: DisplayModeToggleProps) {
  const isCompact = mode === 'compact'
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggle}
      className={`
        flex items-center gap-2 
        bg-card/80 backdrop-blur-sm 
        border-border/50 
        hover:bg-accent hover:text-accent-foreground
        transition-all duration-200
        ${className}
      `}
      title={isCompact ? 'وضع مريح' : 'وضع مضغوط'}
    >
      {isCompact ? (
        <>
          <Maximize2 className="w-4 h-4" />
          <span className="text-xs hidden sm:inline">مريح</span>
        </>
      ) : (
        <>
          <Minimize2 className="w-4 h-4" />
          <span className="text-xs hidden sm:inline">مضغوط</span>
        </>
      )}
    </Button>
  )
}

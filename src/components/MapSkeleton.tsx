import { Globe, RefreshCw } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface MapSkeletonProps {
  onSwitchProvider?: () => void
  showSwitchButton?: boolean
  providerName?: string
}

export default function MapSkeleton({ onSwitchProvider, showSwitchButton = false, providerName = 'OpenStreetMap' }: MapSkeletonProps) {
  const [loadingTime, setLoadingTime] = useState(0)
  const [showFallback, setShowFallback] = useState(false)
  const mountedRef = useRef(true)

  // Track loading time and show fallback after 10 seconds (only if still mounted)
  useEffect(() => {
    mountedRef.current = true
    
    const interval = setInterval(() => {
      if (!mountedRef.current) return
      
      setLoadingTime(prev => {
        const newTime = prev + 1
        // Only show fallback after 10 seconds
        if (newTime >= 10) {
          setShowFallback(true)
        }
        return newTime
      })
    }, 1000)

    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="w-full h-full bg-card rounded-xl overflow-hidden relative animate-pulse">
      {/* Map background */}
      <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted/60" />
      
      {/* Fake map grid lines */}
      <div className="absolute inset-0 opacity-10">
        {[...Array(8)].map((_, i) => (
          <div key={`h-${i}`} className="absolute w-full h-px bg-primary/30" style={{ top: `${(i + 1) * 12}%` }} />
        ))}
        {[...Array(6)].map((_, i) => (
          <div key={`v-${i}`} className="absolute h-full w-px bg-primary/30" style={{ left: `${(i + 1) * 15}%` }} />
        ))}
      </div>
      
      {/* Fake markers */}
      <div className="absolute top-[20%] left-[30%] w-6 h-8 bg-primary/20 rounded-full" />
      <div className="absolute top-[45%] left-[55%] w-6 h-8 bg-primary/20 rounded-full" />
      <div className="absolute top-[60%] left-[25%] w-6 h-8 bg-primary/20 rounded-full" />
      <div className="absolute top-[35%] left-[70%] w-6 h-8 bg-primary/20 rounded-full" />
      <div className="absolute top-[70%] left-[60%] w-6 h-8 bg-primary/20 rounded-full" />
      
      {/* Loading indicator in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-card/90 backdrop-blur-sm rounded-2xl px-6 py-4 flex flex-col items-center gap-3 shadow-xl border border-border/50">
          {!showFallback ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                <div className="text-right">
                  <p className="font-bold text-foreground text-sm">جاري تحميل الخريطة</p>
                  <p className="text-xs text-muted-foreground">يرجى الانتظار...</p>
                </div>
              </div>
              {loadingTime > 3 && (
                <p className="text-[10px] text-muted-foreground animate-pulse">
                  قد يستغرق التحميل بعض الوقت...
                </p>
              )}
            </>
          ) : (
            <>
              <div className="text-center mb-2">
                <p className="font-bold text-foreground text-sm mb-1">تعذر تحميل الخريطة</p>
                <p className="text-xs text-muted-foreground">يمكنك التبديل إلى خريطة أخرى</p>
              </div>
              
              {onSwitchProvider && (
                <button
                  onClick={onSwitchProvider}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium text-sm transition-all duration-300 shadow-lg"
                >
                  <Globe className="w-4 h-4" />
                  <span>التبديل إلى {providerName}</span>
                </button>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg text-xs transition-all duration-300"
              >
                <RefreshCw className="w-3 h-3" />
                <span>إعادة تحميل الصفحة</span>
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Fake controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <div className="w-9 h-9 bg-muted-foreground/20 rounded-lg" />
        <div className="w-9 h-9 bg-muted-foreground/20 rounded-lg" />
      </div>
      
      {/* Fake zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <div className="w-8 h-8 bg-muted-foreground/20 rounded-t-lg" />
        <div className="w-8 h-8 bg-muted-foreground/20 rounded-b-lg" />
      </div>
    </div>
  )
}

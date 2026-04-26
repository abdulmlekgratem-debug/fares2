import { memo, useState, useRef, useEffect } from 'react'
import { Layers, Check, Satellite, Globe, MapPin, Map } from 'lucide-react'
import { LAYER_OPTIONS, LayerOption } from '@/types/map'

const ICON_MAP: Record<LayerOption['icon'], typeof Satellite> = {
  satellite: Satellite,
  globe: Globe,
  'map-pin': MapPin,
  map: Map,
}

interface MapLayerSelectorProps {
  currentLayer: string
  onLayerChange: (layerId: string) => void
  className?: string
}

function MapLayerSelectorComponent({ currentLayer, onLayerChange, className = '' }: MapLayerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const currentOption = LAYER_OPTIONS.find(o => o.id === currentLayer) || LAYER_OPTIONS[0]

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-center
          w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10
          rounded-lg md:rounded-xl
          bg-card/95 backdrop-blur-md border border-border/50
          shadow-lg transition-all duration-300
          ${isOpen ? 'bg-primary text-primary-foreground border-primary/50' : 'hover:bg-card'}
        `}
        title="تبديل الطبقات"
      >
        <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute top-0 right-full mr-2 z-[2000] animate-fade-in"
          style={{ direction: 'rtl' }}
        >
          <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl overflow-hidden w-[240px]">
            <div className="px-4 py-3 border-b border-border/30 bg-gradient-to-l from-primary/10 to-transparent">
              <h4 className="text-sm font-bold text-foreground" style={{ fontFamily: 'Doran, Tajawal, sans-serif' }}>
                طبقات الخريطة
              </h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {currentOption.labelAr}
              </p>
            </div>

            <div className="p-2 space-y-1">
              {LAYER_OPTIONS.map((option) => {
                const isActive = currentLayer === option.id
                const IconComp = ICON_MAP[option.icon]
                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      onLayerChange(option.id)
                      setIsOpen(false)
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                      transition-all duration-200 text-right
                      ${isActive
                        ? 'bg-primary/15 border border-primary/30 shadow-sm'
                        : 'hover:bg-muted/50 border border-transparent'
                      }
                    `}
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                      <IconComp className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-bold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                          {option.labelAr}
                        </span>
                        {isActive && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {option.description}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(MapLayerSelectorComponent)

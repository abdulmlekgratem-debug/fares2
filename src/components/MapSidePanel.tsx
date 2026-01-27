import { useEffect, useRef, useState, useCallback } from "react"
import { X, MapPin, Clock, Maximize2, Layers, ZoomIn, ZoomOut, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Billboard } from "@/types"

interface MapSidePanelProps {
  billboard: Billboard | null
  isOpen: boolean
  onClose: () => void
  onViewImage: (imageUrl: string) => void
}

declare global {
  interface Window {
    google: any
    __mapPreloaded?: boolean
  }
}

const getDaysRemaining = (expiryDate: string | null): number | null => {
  if (!expiryDate) return null
  
  let parsedDate: Date | null = null
  
  if (expiryDate.includes('-') && expiryDate.length === 10 && expiryDate.indexOf('-') === 4) {
    const parts = expiryDate.split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0])
      const month = parseInt(parts[1]) - 1
      const day = parseInt(parts[2])
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        parsedDate = new Date(year, month, day)
      }
    }
  }
  
  if (!parsedDate) {
    const parts = expiryDate.split(/[/-]/)
    if (parts.length === 3) {
      const day = parseInt(parts[0])
      const month = parseInt(parts[1]) - 1
      const year = parseInt(parts[2])
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 2000) {
        parsedDate = new Date(year, month, day)
      }
    }
  }
  
  if (!parsedDate || isNaN(parsedDate.getTime())) return null
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffTime = parsedDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-'
  
  let parsedDate: Date | null = null
  
  if (dateStr.includes('-') && dateStr.length === 10 && dateStr.indexOf('-') === 4) {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0])
      const month = parseInt(parts[1]) - 1
      const day = parseInt(parts[2])
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        parsedDate = new Date(year, month, day)
      }
    }
  }
  
  if (!parsedDate) {
    const parts = dateStr.split(/[/-]/)
    if (parts.length === 3) {
      const day = parseInt(parts[0])
      const month = parseInt(parts[1]) - 1
      const year = parseInt(parts[2])
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 2000) {
        parsedDate = new Date(year, month, day)
      }
    }
  }
  
  if (!parsedDate || isNaN(parsedDate.getTime())) return dateStr
  
  return parsedDate.toLocaleDateString('ar-LY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#d4af37" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#d4af37" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#283046" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
]

export default function MapSidePanel({ billboard, isOpen, onClose, onViewImage }: MapSidePanelProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('satellite')
  
  // Swipe to close state
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchCurrent, setTouchCurrent] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
    setTouchCurrent(e.touches[0].clientX)
    setIsDragging(true)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || touchStart === null) return
    setTouchCurrent(e.touches[0].clientX)
  }, [isDragging, touchStart])

  const handleTouchEnd = useCallback(() => {
    if (touchStart !== null && touchCurrent !== null) {
      const diff = touchStart - touchCurrent
      // إذا سحب المستخدم لليسار بأكثر من 100 بكسل، أغلق اللوحة
      if (diff > 100) {
        onClose()
      }
    }
    setTouchStart(null)
    setTouchCurrent(null)
    setIsDragging(false)
  }, [touchStart, touchCurrent, onClose])

  const swipeOffset = isDragging && touchStart !== null && touchCurrent !== null
    ? Math.max(0, touchStart - touchCurrent)
    : 0

  const toggleMapType = () => {
    const types: ('roadmap' | 'satellite' | 'hybrid')[] = ['roadmap', 'satellite', 'hybrid']
    const currentIndex = types.indexOf(mapType)
    const nextType = types[(currentIndex + 1) % types.length]
    setMapType(nextType)
    
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(nextType)
      if (nextType === 'roadmap') {
        mapInstanceRef.current.setOptions({ styles: darkMapStyles })
      } else {
        mapInstanceRef.current.setOptions({ styles: [] })
      }
    }
  }

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + 1)
    }
  }

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() - 1)
    }
  }

  useEffect(() => {
    if (!isOpen || !billboard) return

    const initMap = async () => {
      if (!window.google?.maps) {
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if (window.google?.maps) {
              clearInterval(check)
              resolve()
            }
          }, 25)
          setTimeout(() => {
            clearInterval(check)
            resolve()
          }, 2000)
        })
      }

      if (!mapRef.current || !window.google?.maps) return

      const coords = billboard.coordinates.split(",").map((c) => parseFloat(c.trim()))
      if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return

      const [lat, lng] = coords

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: { lat, lng },
          zoom: 15,
          styles: mapType === 'roadmap' ? darkMapStyles : [],
          mapTypeId: mapType,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          scaleControl: false,
          rotateControl: false,
          panControl: false,
          keyboardShortcuts: false,
          gestureHandling: 'greedy',
          tilt: 0,
        })
        setMapLoaded(true)
      } else {
        mapInstanceRef.current.setCenter({ lat, lng })
      }

      if (markerRef.current) {
        markerRef.current.setMap(null)
      }

      const colorPalette = [
        "#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d", 
        "#16a34a", "#059669", "#0d9488", "#0891b2", "#0284c7",
        "#2563eb", "#4f46e5", "#7c3aed", "#9333ea", "#c026d3"
      ]
      
      const getSizeColor = (size: string): string => {
        let hash = 0
        for (let i = 0; i < size.length; i++) {
          hash = size.charCodeAt(i) + ((hash << 5) - hash)
        }
        return colorPalette[Math.abs(hash) % colorPalette.length]
      }
      
      const pinColor = getSizeColor(billboard.size)
      const statusColor = billboard.status === "متاح" ? "#10b981" : billboard.status === "قريباً" ? "#f59e0b" : "#ef4444"
      
      const pinIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60">
            <defs>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.4"/>
              </filter>
            </defs>
            <path filter="url(#shadow)" d="M24 2C11.745 2 2 11.745 2 24c0 16 22 34 22 34s22-18 22-34C46 11.745 36.255 2 24 2z" fill="${pinColor}" stroke="#fff" stroke-width="2"/>
            <circle cx="24" cy="22" r="12" fill="#1a1a2e"/>
            <image href="/logo-symbol.svg" x="10" y="8" width="28" height="28"/>
            <circle cx="24" cy="22" r="5" fill="${statusColor}" stroke="#1a1a2e" stroke-width="2"/>
          </svg>
        `)}`,
        scaledSize: new window.google.maps.Size(48, 60),
        anchor: new window.google.maps.Point(24, 60),
      }

      markerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        icon: pinIcon,
        title: billboard.name,
        label: {
          text: billboard.size,
          color: '#fff',
          fontWeight: 'bold',
          fontSize: '10px',
          className: 'marker-label'
        }
      })
    }

    initMap()
  }, [isOpen, billboard])

  useEffect(() => {
    if (!isOpen) {
      mapInstanceRef.current = null
      markerRef.current = null
      setMapLoaded(false)
      setMapType('satellite')
    }
  }, [isOpen])

  if (!billboard) return null

  const daysRemaining = getDaysRemaining(billboard.expiryDate)

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/70 backdrop-blur-md z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Side Panel - Compact design */}
      <div 
        ref={panelRef}
        className={`fixed top-0 left-0 h-full w-full md:w-[500px] lg:w-[600px] xl:w-[700px] bg-gradient-to-br from-card via-card to-background z-50 shadow-2xl transition-transform duration-500 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          transform: isOpen 
            ? `translateX(-${swipeOffset}px)` 
            : 'translateX(-100%)',
          transition: isDragging ? 'none' : 'transform 0.5s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* مؤشر السحب للإغلاق */}
        <div className="md:hidden absolute top-1/2 -translate-y-1/2 right-0 w-6 h-20 bg-muted/50 rounded-l-xl flex items-center justify-center z-[60]">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* زر إغلاق للموبايل - فوق شارة الحالة */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden absolute top-2 right-2 z-[70] bg-card/95 backdrop-blur-md hover:bg-destructive hover:text-destructive-foreground rounded-full shadow-xl w-8 h-8 border border-border/50"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="h-full flex flex-col overflow-hidden">
          
          {/* Image Section - Compact */}
          <div className="relative h-[30vh] md:h-[35%] flex-shrink-0 overflow-hidden">
            <img
              src={billboard.imageUrl || "/roadside-billboard.png"}
              alt={billboard.name}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "https://lh3.googleusercontent.com/d/13yTnaEWp2tFSxCmg8AuXH1e9QvPNMYWq"
              }}
            />
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Status Badge - تحت زر الإغلاق على الموبايل */}
            <Badge className={`absolute top-12 md:top-3 right-2 md:right-3 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg font-bold text-[10px] md:text-xs shadow-lg ${
              billboard.status === "متاح" 
                ? "bg-emerald-500 text-white"
                : billboard.status === "قريباً"
                  ? "bg-amber-500 text-white"
                  : "bg-red-500 text-white"
            }`}>
              <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ml-1 md:ml-1.5 inline-block ${
                billboard.status === "متاح" ? "bg-white animate-pulse" : "bg-white/80"
              }`} />
              {billboard.status}
            </Badge>

            {/* Size Badge */}
            <Badge className="absolute top-3 left-3 bg-card/95 backdrop-blur-md text-foreground font-bold px-2.5 py-1 rounded-lg shadow-lg text-xs">
              {billboard.size}
            </Badge>

            {/* Billboard Name on Image */}
            <div className="absolute bottom-3 left-3 right-3">
              <h2 className="text-base md:text-lg font-bold text-white leading-tight drop-shadow-lg mb-2 line-clamp-2">
                {billboard.name}
              </h2>
              <Button
                size="sm"
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30 rounded-lg px-3 py-1.5 shadow-lg text-xs"
                onClick={() => onViewImage(billboard.imageUrl)}
              >
                <Maximize2 className="w-3 h-3 ml-1.5" />
                عرض الصورة
              </Button>
            </div>
          </div>

          {/* Map Section - Compact */}
          <div className="relative h-[30%] md:h-[35%] bg-muted flex-shrink-0">
            <div ref={mapRef} className="w-full h-full" />
            
            {/* Loading */}
            {!mapLoaded && isOpen && (
              <div className="absolute inset-0 bg-card flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Close Button - Desktop */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex absolute top-3 left-3 bg-card/95 backdrop-blur-md hover:bg-card rounded-full shadow-lg w-8 h-8"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>

            {/* Map Type Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 bg-card/95 backdrop-blur-md hover:bg-card rounded-full shadow-lg w-8 h-8"
              onClick={toggleMapType}
              title="تغيير نوع الخريطة"
            >
              <Layers className="w-4 h-4" />
            </Button>

            {/* Zoom Controls */}
            <div className="absolute top-12 right-3 flex flex-col gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="bg-card/95 backdrop-blur-md hover:bg-card rounded-full shadow-lg w-8 h-8"
                onClick={handleZoomIn}
                title="تكبير"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-card/95 backdrop-blur-md hover:bg-card rounded-full shadow-lg w-8 h-8"
                onClick={handleZoomOut}
                title="تصغير"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
            </div>

            {/* Map Type Label */}
            <div className="absolute bottom-2 right-2 bg-card/95 backdrop-blur-md rounded px-2 py-1 shadow-lg">
              <span className="text-[10px] font-bold text-foreground">
                {mapType === 'roadmap' ? 'خريطة' : mapType === 'satellite' ? 'قمر صناعي' : 'هجين'}
              </span>
            </div>

            {/* Location Label */}
            <div className="absolute bottom-2 left-2 bg-card/95 backdrop-blur-md rounded-lg px-2.5 py-1.5 shadow-lg border border-border/50 max-w-[55%]">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                <span className="font-bold text-[10px] text-foreground truncate">{billboard.location}</span>
              </div>
            </div>
          </div>

          {/* Info Section - Compact */}
          <div className="flex-1 p-3 md:p-4 overflow-y-auto bg-gradient-to-b from-card/50 to-card">
            
            {/* Location Details */}
            <div className="flex items-start gap-2 mb-3 p-2.5 bg-muted/50 rounded-xl border border-border/50">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div className="text-right flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{billboard.location}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{billboard.municipality} - {billboard.city}</p>
              </div>
            </div>

            {/* Availability Info */}
            {billboard.status !== "متاح" && daysRemaining !== null && daysRemaining > 0 && (
              <div className="mb-3 p-2.5 bg-gradient-to-r from-amber-500/20 to-amber-500/5 rounded-xl border border-amber-500/30">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-sm text-amber-600 dark:text-amber-400">
                      متبقي {daysRemaining} يوم
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      تاريخ الإتاحة: {formatDate(billboard.expiryDate)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {billboard.area && (
                <Badge variant="outline" className="bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-lg text-[10px] font-bold">
                  {billboard.area}
                </Badge>
              )}
              <Badge variant="outline" className="bg-primary/15 border-primary/30 text-primary px-2 py-1 rounded-lg text-[10px] font-bold">
                {billboard.municipality}
              </Badge>
              {billboard.billboardType && (
                <Badge variant="outline" className="bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg text-[10px] font-bold">
                  {billboard.billboardType}
                </Badge>
              )}
              {billboard.facesCount && (
                <Badge variant="outline" className="bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-lg text-[10px] font-bold">
                  {billboard.facesCount}
                </Badge>
              )}
            </div>

            {/* Open in Google Maps */}
            <Button
              className="w-full bg-gradient-to-r from-primary via-primary to-accent hover:from-primary/90 hover:via-primary/90 hover:to-accent/90 text-primary-foreground font-bold py-3 rounded-xl shadow-lg text-sm"
              onClick={() => window.open(billboard.gpsLink, "_blank")}
            >
              <MapPin className="w-4 h-4 ml-1.5" />
              فتح في خرائط قوقل
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

import { useEffect, useRef, useState, useCallback, useMemo, lazy, Suspense } from "react"
import { createPortal } from "react-dom"
import { Card, CardContent } from "@/components/ui/card"
import { Billboard } from "@/types"
import { MapProvider, MapPosition } from "@/types/map"
import { MapPin, ZoomIn, ZoomOut, Download, PenTool, X, CheckCircle2, Maximize, Minimize, Navigation, Radio, EyeOff, Eye, ChevronDown, ChevronUp, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import MapSkeleton from "./MapSkeleton"
import MapProviderToggle from "./map/MapProviderToggle"
import MapSearchBar from "./map/MapSearchBar"
import NavigationMode from "./map/NavigationMode"
import LiveTrackingMode from "./map/LiveTrackingMode"
import MapLayerSelector from "./map/MapLayerSelector"
import { parseExpiryDate, getDaysRemaining, getStatusFromExpiry } from "@/utils/dateUtils"

import { getSizeColor } from "@/hooks/useMapMarkers"
import { useProgressiveMarkers } from "@/hooks/useProgressiveMarkers"

// Map Status Filter Component
function MapStatusFilter({ billboards, filter, onFilterChange }: { 
  billboards: Billboard[], 
  filter: string, 
  onFilterChange: (f: string) => void 
}) {
  const [showMonths, setShowMonths] = useState(false)
  
  const counts = useMemo(() => {
    let available = 0, soon = 0, booked = 0
    const monthMap: Record<string, number> = {}
    const now = new Date()
    
    billboards.forEach(b => {
      // Use getStatusFromExpiry for consistent counting with card filters
      const computedStatus = getStatusFromExpiry(b.expiryDate)
      if (computedStatus === 'متاح') { available++ }
      else if (computedStatus === 'قريباً') { soon++ }
      else { booked++ }
      
      // Monthly grouping for non-available billboards
      if (computedStatus !== 'متاح') {
        const parsed = parseExpiryDate(b.expiryDate)
        if (parsed && parsed >= now) {
          const key = `${parsed.getFullYear()}-${parsed.getMonth()}`
          monthMap[key] = (monthMap[key] || 0) + 1
        }
      }
    })
    
    const months = Object.entries(monthMap)
      .map(([key, count]) => {
        const [y, m] = key.split('-').map(Number)
        const date = new Date(y, m)
        return { 
          key: `month-${key}`, 
          label: date.toLocaleDateString('ar-LY', { month: 'short', year: 'numeric' }), 
          count 
        }
      })
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(0, 6)
    
    return { available, soon, booked, total: billboards.length, months }
  }, [billboards])

  const statusButtons = [
    { id: 'all', label: 'الكل', count: counts.total, color: 'bg-foreground/20' },
    { id: 'available', label: 'متاح', count: counts.available, color: 'bg-emerald-500' },
    { id: 'soon', label: 'قريباً', count: counts.soon, color: 'bg-amber-500' },
    { id: 'booked', label: 'محجوز', count: counts.booked, color: 'bg-red-500' },
  ]

  return (
    <div className="absolute bottom-2 md:bottom-4 left-1/2 -translate-x-1/2 z-[1000] max-w-[calc(100vw-90px)]" style={{ direction: 'rtl' }}>
      <div className="bg-card/95 backdrop-blur-md rounded-xl border border-border/50 shadow-lg p-1 md:p-2">
        <div className="flex items-center gap-0.5 md:gap-1.5 flex-nowrap overflow-x-auto scrollbar-hide">
          {statusButtons.map(btn => (
            <button
              key={btn.id}
              onClick={() => onFilterChange(btn.id)}
              className={`flex items-center gap-1 md:gap-1.5 px-1.5 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all flex-shrink-0 ${
                filter === btn.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'hover:bg-muted/60 text-foreground/80'
              }`}
            >
              <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${btn.color} flex-shrink-0 ${btn.id === 'available' && filter !== btn.id ? 'animate-pulse' : ''}`} />
              <span>{btn.label}</span>
              <span className="opacity-60">({btn.count})</span>
            </button>
          ))}
          
          {counts.months.length > 0 && (
            <button
              onClick={() => setShowMonths(!showMonths)}
              className={`flex items-center gap-1 px-1.5 md:px-2 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-bold transition-all flex-shrink-0 ${
                filter.startsWith('month-') ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/60 text-foreground/80'
              }`}
            >
              <Filter className="w-3 h-3" />
              <span className="hidden sm:inline">الأشهر</span>
            </button>
          )}
        </div>
        
        {showMonths && counts.months.length > 0 && (
          <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-border/30 flex-wrap max-w-[280px]">
            {counts.months.map(m => (
              <button
                key={m.key}
                onClick={() => { onFilterChange(m.key); setShowMonths(false) }}
                className={`px-2 py-1 rounded-lg text-[10px] md:text-xs font-medium transition-all ${
                  filter === m.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'hover:bg-muted/60 text-foreground/80 bg-muted/30'
                }`}
              >
                {m.label} ({m.count})
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Map Legend Component with mini-pin icons and billboard counts
function MapLegend({ billboards }: { billboards: Billboard[] }) {
  const [expanded, setExpanded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  
  const sizeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    billboards.forEach(b => {
      counts[b.size] = (counts[b.size] || 0) + 1
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
  }, [billboards])

  return (
    <>
      {/* Mobile: Compact toggle button (top-right area, below controls) */}
      <button
        onClick={() => setMobileOpen(v => !v)}
        className="md:hidden absolute bottom-16 right-2 z-[1000] w-9 h-9 rounded-full bg-card/95 backdrop-blur-md border border-border/50 shadow-lg flex items-center justify-center hover:bg-card transition-colors"
        title="مفتاح الخريطة"
        aria-label="مفتاح الخريطة"
      >
        <span className="text-base">ⓘ</span>
      </button>

      {/* Mobile: Popup panel (only when open) */}
      {mobileOpen && (
        <div className="md:hidden absolute bottom-28 right-2 z-[1001] bg-card/98 backdrop-blur-xl rounded-xl border border-border/60 shadow-2xl p-2.5 w-[160px] animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-foreground">حالة اللوحة</p>
            <button onClick={() => setMobileOpen(false)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {[
              { label: 'متاح للحجز', color: 'bg-emerald-500', pulse: true },
              { label: 'قريباً يتوفر', color: 'bg-amber-500', pulse: false },
              { label: 'محجوز حالياً', color: 'bg-red-500', pulse: false },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 text-[10px] text-foreground/80 font-medium">
                <span className={`w-3 h-3 rounded-full ${s.color} flex-shrink-0 shadow-sm ${s.pulse ? 'animate-pulse' : ''}`} />
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[8px] text-muted-foreground/70 border-t border-border/30 pt-1.5 mt-2">
            ⓘ ألوان الدبابيس تمثل المقاسات
          </p>
        </div>
      )}

      {/* Desktop: Full legend (unchanged) */}
      <div className="hidden md:block absolute bottom-4 right-4 bg-card/95 backdrop-blur-md rounded-2xl border border-border/50 shadow-lg z-[1000] overflow-hidden" style={{ maxWidth: expanded ? '220px' : '180px', transition: 'max-width 0.3s ease' }}>
        <div className="p-3">
          <p className="text-xs font-black text-foreground mb-2">حالة اللوحة</p>
          <div className="flex flex-col gap-2 mb-1.5">
            {[
              { label: 'متاح للحجز', color: 'bg-emerald-500', pulse: true },
              { label: 'قريباً يتوفر', color: 'bg-amber-500', pulse: false },
              { label: 'محجوز حالياً', color: 'bg-red-500', pulse: false },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2 text-xs text-foreground/80 font-medium">
                <span className={`w-3.5 h-3.5 rounded-full ${s.color} flex-shrink-0 shadow-sm ${s.pulse ? 'animate-pulse' : ''}`} />
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          
          <p className="text-[10px] text-muted-foreground/70 border-t border-border/30 pt-1.5 mt-1">
            ⓘ ألوان الدبابيس تمثل المقاسات وليس الحالة
          </p>
          
          <button 
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-xs font-bold text-foreground mt-2 pt-2 border-t border-border/50 hover:text-primary transition-colors"
          >
            <span>ألوان المقاسات ({sizeCounts.length})</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          
          {expanded && (
            <div className="space-y-1 mt-1.5 max-h-[180px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {sizeCounts.map(([size, count]) => {
                const colors = getSizeColor(size)
                return (
                  <div key={size} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <div className="flex-shrink-0 w-4 h-5 relative">
                      <svg viewBox="0 0 16 20" className="w-full h-full">
                        <path d="M8,19 C7,16 1,12 1,7.5 A7,7 0 1,1 15,7.5 C15,12 9,16 8,19Z" fill={colors.bg} stroke="white" strokeWidth="1"/>
                        <circle cx="8" cy="7.5" r="3" fill="white" stroke={colors.bg} strokeWidth="0.8"/>
                      </svg>
                    </div>
                    <span className="truncate flex-1">{size}</span>
                    <span className="text-[10px] font-bold text-primary/70 flex-shrink-0">({count})</span>
                  </div>
                )
              })}
            </div>
          )}
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
            <img src="/logo-symbol.svg" alt="" className="w-4 h-4" />
            <span>مقر الشركة</span>
          </div>
        </div>
      </div>
    </>
  )
}


// Lazy load map components
const GoogleMapComponent = lazy(() => import("./map/GoogleMap"))
const LeafletMapComponent = lazy(() => import("./map/LeafletMap"))

interface InteractiveMapProps {
  billboards: Billboard[]
  onImageView: (imageUrl: string) => void
  selectedBillboards?: Set<string>
  onToggleSelection?: (billboardId: string) => void
  onSelectMultiple?: (billboardIds: string[]) => void
  onDownloadSelected?: () => void
  onFullscreenChange?: (isFullscreen: boolean) => void
}

export default function InteractiveMap({ billboards, onImageView, selectedBillboards, onToggleSelection, onSelectMultiple, onDownloadSelected, onFullscreenChange }: InteractiveMapProps) {
  const googleMapRef = useRef<any>(null)
  const leafletMapRef = useRef<HTMLDivElement>(null)
  
  const [mapProvider, setMapProvider] = useState<MapProvider>('openstreetmap')
  const [mapLoaded, setMapLoaded] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [mapStyle, setMapStyle] = useState<string>('google-hybrid')
  const [activeLayer, setActiveLayer] = useState<string>('google-hybrid')
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [drawingPoints, setDrawingPoints] = useState<MapPosition[]>([])
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'select' | 'deselect' }>({ show: false, message: '', type: 'select' })
  const [mapKey, setMapKey] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [targetLocation, setTargetLocation] = useState<{ lat: number; lng: number; zoom?: number; boundary?: { north: number; south: number; east: number; west: number }; placeName?: string } | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isNavigationMode, setIsNavigationMode] = useState(false)
  const [isLiveTrackingMode, setIsLiveTrackingMode] = useState(false)
  const [navigationRoute, setNavigationRoute] = useState<{ lat: number; lng: number }[]>([])
  const [navigationCurrentIndex, setNavigationCurrentIndex] = useState(0)
  const [liveTrackingLocation, setLiveTrackingLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [liveTrackingHeading, setLiveTrackingHeading] = useState<number>(0)
  const [recordedRoute, setRecordedRoute] = useState<{ lat: number; lng: number; timestamp: number }[]>([])
  const [visitedBillboards, setVisitedBillboards] = useState<Set<string>>(new Set())
  
  const [showSoussetOnly, setShowSoussetOnly] = useState(false)
  const [mapStatusFilter, setMapStatusFilter] = useState<string>('available')
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null)
  const [swipeCurrentY, setSwipeCurrentY] = useState<number | null>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const selectedCount = selectedBillboards?.size || 0
  
  // Progressive marker loading for better performance
  const { 
    loadedBillboards: rawLoadedBillboards, 
    isLoading: isLoadingMarkers, 
    progress: markerProgress 
  } = useProgressiveMarkers(billboards, {
    batchSize: 40,
    batchDelay: 80,
    prioritizeViewport: true
  })

  // فلترة لوحات السوسيت: إخفاؤها افتراضياً أو إظهارها فقط عند التفعيل
  const SOUSSET_SIZE = "سوسيت"
  const soussetFiltered = showSoussetOnly
    ? rawLoadedBillboards.filter(b => b.size === SOUSSET_SIZE)
    : rawLoadedBillboards.filter(b => b.size !== SOUSSET_SIZE)
  
  // Apply status filter using getStatusFromExpiry for consistency
  const loadedBillboards = useMemo(() => {
    if (mapStatusFilter === 'all') return soussetFiltered
    if (mapStatusFilter === 'available') return soussetFiltered.filter(b => getStatusFromExpiry(b.expiryDate) === 'متاح')
    if (mapStatusFilter === 'soon') return soussetFiltered.filter(b => getStatusFromExpiry(b.expiryDate) === 'قريباً')
    if (mapStatusFilter === 'booked') return soussetFiltered.filter(b => getStatusFromExpiry(b.expiryDate) === 'محجوز')
    // Month filter: month-YYYY-M
    if (mapStatusFilter.startsWith('month-')) {
      const [, ym] = mapStatusFilter.split('month-')
      const [y, m] = ym.split('-').map(Number)
      return soussetFiltered.filter(b => {
        const parsed = parseExpiryDate(b.expiryDate)
        return parsed && parsed.getFullYear() === y && parsed.getMonth() === m
      })
    }
    return soussetFiltered
  }, [soussetFiltered, mapStatusFilter])
  // Mark tutorial as seen on mount (disabled)
  useEffect(() => {
    localStorage.setItem('map-tutorial-seen', 'true')
  }, [])

  // Show notification helper
  const showNotification = useCallback((message: string, type: 'select' | 'deselect') => {
    setNotification({ show: true, message, type })
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }))
    }, 1500)
  }, [])

  // Handle map ready
  const handleMapReady = useCallback(() => {
    setMapLoaded(true)
    setTimeout(() => setShowMap(true), 100)
  }, [])

  // Handle target location reached
  const handleTargetLocationReached = useCallback(() => {
    setTargetLocation(null)
  }, [])

  // Toggle provider with smooth transition and progress bar
  const toggleProvider = useCallback(() => {
    setIsTransitioning(true)
    setShowMap(false)
    setMapLoaded(false)
    setLoadProgress(0)
    
    // Animate progress bar during transition
    const progressInterval = setInterval(() => {
      setLoadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return prev
        }
        return prev + Math.random() * 15
      })
    }, 100)
    
    // Wait for fade out, then switch provider and force remount
    setTimeout(() => {
      setMapProvider(prev => prev === 'google' ? 'openstreetmap' : 'google')
      setMapKey(prev => prev + 1)
      
      // Complete progress after switch
      setTimeout(() => {
        clearInterval(progressInterval)
        setLoadProgress(100)
        setTimeout(() => {
          setIsTransitioning(false)
          setLoadProgress(0)
        }, 300)
      }, 200)
    }, 400)
  }, [])

  // Drawing handlers
  const handleDrawingPointAdd = useCallback((point: MapPosition) => {
    setDrawingPoints(prev => [...prev, point])
  }, [])

  const startDrawingMode = useCallback(() => {
    setIsDrawingMode(true)
    setDrawingPoints([])
  }, [])

  const cancelDrawingMode = useCallback(() => {
    setIsDrawingMode(false)
    setDrawingPoints([])
  }, [])

  const finishDrawing = useCallback(() => {
    if (drawingPoints.length < 3 || !onSelectMultiple) {
      cancelDrawingMode()
      return
    }

    const selectedIds: string[] = []
    billboards.forEach(billboard => {
      const coords = billboard.coordinates.split(",").map(c => Number.parseFloat(c.trim()))
      if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        const point = { lat: coords[0], lng: coords[1] }
        if (isPointInPolygon(point, drawingPoints)) {
          selectedIds.push(billboard.id)
        }
      }
    })

    if (selectedIds.length > 0) {
      onSelectMultiple(selectedIds)
    }
    
    cancelDrawingMode()
  }, [drawingPoints, billboards, onSelectMultiple, cancelDrawingMode])

  const isPointInPolygon = (point: MapPosition, polygon: MapPosition[]) => {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng
      const xj = polygon[j].lat, yj = polygon[j].lng
      const intersect = ((yi > point.lng) !== (yj > point.lng)) &&
        (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi)
      if (intersect) inside = !inside
    }
    return inside
  }

  const handleZoomIn = () => {
    if (mapProvider === 'google' && googleMapRef.current) {
      googleMapRef.current.zoomIn()
    } else if (leafletMapRef.current) {
      (leafletMapRef.current as any).zoomIn?.()
    }
  }

  const handleZoomOut = () => {
    if (mapProvider === 'google' && googleMapRef.current) {
      googleMapRef.current.zoomOut()
    } else if (leafletMapRef.current) {
      (leafletMapRef.current as any).zoomOut?.()
    }
  }

  const handleLayerChange = useCallback((layerId: string) => {
    setActiveLayer(layerId)
    // Map layer IDs to the mapStyle prop for LeafletMap
    if (layerId === 'google-hybrid') setMapStyle('google-hybrid')
    else if (layerId === 'google-satellite') setMapStyle('google-satellite')
    else if (layerId === 'esri-satellite') setMapStyle('esri-satellite')
    else if (layerId === 'standard') setMapStyle('standard')
    else if (layerId === 'dark') setMapStyle('dark')
    else setMapStyle(layerId)
  }, [])

  // Handle location search
  const handleLocationSelect = useCallback((lat: number, lng: number, zoom?: number, boundary?: { north: number; south: number; east: number; west: number }, placeName?: string) => {
    setTargetLocation({ lat, lng, zoom, boundary, placeName })
  }, [])

  // Handle current location
  const handleCurrentLocation = useCallback((lat: number, lng: number) => {
    setUserLocation({ lat, lng })
  }, [])

  // Toggle fullscreen - use CSS-based fullscreen instead of browser API
  // This allows overlays like image viewer to work correctly
  const setFullscreen = useCallback((next: boolean) => {
    setIsFullscreen(next)
    onFullscreenChange?.(next)
  }, [onFullscreenChange])

  const toggleFullscreen = useCallback(() => {
    setFullscreen(!isFullscreen)
  }, [isFullscreen, setFullscreen])

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = `-${window.scrollY}px`
    } else {
      const scrollY = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
      window.scrollTo(0, parseInt(scrollY || '0') * -1)
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
      document.body.style.top = ''
    }
  }, [isFullscreen])

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setFullscreen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, setFullscreen])

  // Swipe down to close fullscreen on mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isFullscreen) return
    const touch = e.touches[0]
    // Only track if starting from top area (within 80px from top)
    if (touch.clientY <= 80) {
      setSwipeStartY(touch.clientY)
      setSwipeCurrentY(touch.clientY)
    }
  }, [isFullscreen])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (swipeStartY === null || !isFullscreen) return
    const touch = e.touches[0]
    setSwipeCurrentY(touch.clientY)
  }, [swipeStartY, isFullscreen])

  const handleTouchEnd = useCallback(() => {
    if (swipeStartY === null || swipeCurrentY === null || !isFullscreen) {
      setSwipeStartY(null)
      setSwipeCurrentY(null)
      return
    }
    
    const swipeDistance = swipeCurrentY - swipeStartY
    // If swiped down more than 100px, close fullscreen
    if (swipeDistance > 100) {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10)
      }
      setFullscreen(false)
    }
    
    setSwipeStartY(null)
    setSwipeCurrentY(null)
  }, [swipeStartY, swipeCurrentY, isFullscreen, setFullscreen])

  // Calculate swipe indicator opacity
  const swipeProgress = swipeStartY !== null && swipeCurrentY !== null 
    ? Math.min((swipeCurrentY - swipeStartY) / 150, 1) 
    : 0

  // Request user location for navigation
  const requestUserLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Geolocation error:', error)
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }, [])

  // Handle live tracking location update
  const handleLiveTrackingUpdate = useCallback((location: { lat: number; lng: number; heading?: number; speed?: number }) => {
    setLiveTrackingLocation({ lat: location.lat, lng: location.lng })
    if (location.heading !== undefined) {
      setLiveTrackingHeading(location.heading)
    }
  }, [])

  // Handle zoom to location for live tracking
  const handleZoomToLocation = useCallback((lat: number, lng: number, zoom: number) => {
    if (mapProvider === 'google' && googleMapRef.current) {
      // Use the map instance to pan and zoom
      const map = (window as any).__googleMapInstance
      if (map) {
        map.panTo({ lat, lng })
        map.setZoom(zoom)
      }
    } else if (leafletMapRef.current) {
      const leafletMap = (leafletMapRef.current as any)?._leafletMap
      if (leafletMap) {
        leafletMap.setView([lat, lng], zoom, { animate: true })
      }
    }
  }, [mapProvider])

  // Pan to location WITHOUT changing zoom — يحترم زوم المستخدم أثناء التتبع
  const handlePanToLocation = useCallback((lat: number, lng: number) => {
    if (mapProvider === 'google') {
      const map = (window as any).__googleMapInstance
      if (map) {
        map.panTo({ lat, lng })
      }
    } else if (leafletMapRef.current) {
      const leafletMap = (leafletMapRef.current as any)?._leafletMap
      if (leafletMap) {
        leafletMap.panTo([lat, lng], { animate: true, duration: 0.6 })
      }
    }
  }, [mapProvider])

  // Toggle live tracking mode
  const toggleLiveTracking = useCallback(() => {
    if (isLiveTrackingMode) {
      setIsLiveTrackingMode(false)
      setLiveTrackingLocation(null)
    } else {
      // Enter fullscreen for better experience
      if (!isFullscreen) {
        setFullscreen(true)
      }
      setIsLiveTrackingMode(true)
    }
  }, [isLiveTrackingMode, isFullscreen, setFullscreen])

  const content = (
    <div className={`${isFullscreen ? '' : 'mb-8 md:mb-12 animate-fade-in'}`}>
      <Card
        ref={mapContainerRef}
        className={`overflow-hidden shadow-xl md:shadow-2xl shadow-primary/10 border-0 bg-card transition-all duration-300 ease-out ${
          isFullscreen
            ? 'fixed inset-0 z-[999999] rounded-none !h-[100dvh] bg-background animate-[fullscreen-in_0.3s_ease-out]'
            : 'rounded-2xl md:rounded-3xl'
        }`}
        style={isFullscreen ? { height: '100dvh', maxHeight: '100dvh', isolation: 'isolate' } : {}}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <CardContent className={`p-0 transition-all duration-300 ${isFullscreen ? 'h-full flex flex-col' : ''}`}>
          {/* Swipe Down Indicator - Only visible in fullscreen on mobile */}
          {isFullscreen && (
            <div 
              className="md:hidden absolute top-0 left-0 right-0 z-[100000] flex flex-col items-center pt-2 pointer-events-none transition-opacity duration-200"
              style={{ opacity: swipeProgress > 0 ? 1 : 0.6 }}
            >
              <div 
                className="w-12 h-1.5 bg-foreground/40 rounded-full mb-1"
                style={{ 
                  transform: `scaleX(${1 + swipeProgress * 0.3})`,
                  backgroundColor: swipeProgress > 0.6 ? 'hsl(var(--primary))' : undefined
                }}
              />
              <span 
                className="text-[10px] text-foreground/50 font-medium transition-opacity"
                style={{ opacity: swipeProgress > 0.3 ? 1 : 0 }}
              >
                اسحب للإغلاق
              </span>
            </div>
          )}
          
          {/* Header - Modern Premium Design - مخفي في وضع ملء الشاشة على الموبايل */}
          <div className={`relative overflow-hidden bg-gradient-to-br from-card via-card/95 to-secondary/80 backdrop-blur-xl border-b border-border/50 ${
            isFullscreen ? 'p-2 md:p-4 pt-6 md:pt-4' : 'p-4 md:p-6'
          }`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary rounded-full blur-2xl" />
            </div>
            
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-2 md:gap-3">
              {/* Title Section - مختصر في وضع ملء الشاشة */}
              <div className="flex items-center gap-2 md:gap-3">
                <div className={`rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center ${
                  isFullscreen ? 'w-8 h-8 md:w-10 md:h-10' : 'w-10 h-10 md:w-12 md:h-12'
                }`}>
                  <MapPin className={`text-primary ${isFullscreen ? 'w-4 h-4 md:w-5 md:h-5' : 'w-5 h-5 md:w-6 md:h-6'}`} />
                </div>
                <div>
                  <h3 className={`font-black text-foreground ${isFullscreen ? 'text-sm md:text-lg' : 'text-lg md:text-xl'}`} style={{ fontFamily: 'Doran, Tajawal, sans-serif' }}>
                    خريطة المواقع الإعلانية
                  </h3>
                  {!isFullscreen && (
                    <p className="text-xs md:text-sm text-muted-foreground font-medium">
                      استكشف {billboards.length} موقع إعلاني
                    </p>
                  )}
                </div>
              </div>
              
              {/* Instructions Badge - مخفي في وضع ملء الشاشة */}
              {!isFullscreen && (
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-xl border border-primary/20">
                  <span className="text-xs text-foreground/80 font-medium">
                    نقرة = تفاصيل
                  </span>
                  <span className="w-1 h-1 rounded-full bg-primary/50" />
                  <span className="text-xs text-foreground/80 font-medium">
                    نقرة مزدوجة = تحديد
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Map Container - يملأ المساحة المتبقية في وضع ملء الشاشة */}
          <div className={`relative overflow-hidden ${
            isFullscreen ? 'flex-1' : 'h-[450px] sm:h-[550px] md:h-[650px]'
          }`}>
            {/* Single Map Component - keyed to force unmount/remount */}
            <div 
              key={mapKey}
              className={`absolute inset-0 transition-opacity duration-500 ease-out ${showMap ? 'opacity-100' : 'opacity-0'}`}
            >
              <Suspense fallback={
                <MapSkeleton 
                  onSwitchProvider={toggleProvider} 
                  showSwitchButton={true}
                  providerName={mapProvider === 'google' ? 'OpenStreetMap' : 'Google Maps'}
                />
              }>
                {mapProvider === 'openstreetmap' ? (
                  <div ref={leafletMapRef} className="w-full h-full">
                    <LeafletMapComponent
                      billboards={loadedBillboards}
                      selectedBillboards={selectedBillboards}
                      onToggleSelection={onToggleSelection}
                      onSelectMultiple={onSelectMultiple}
                      onImageView={onImageView}
                      mapStyle={mapStyle}
                      isDrawingMode={isDrawingMode}
                      drawingPoints={drawingPoints}
                      onDrawingPointAdd={handleDrawingPointAdd}
                      onMapReady={handleMapReady}
                      showNotification={showNotification}
                      targetLocation={targetLocation}
                      onTargetLocationReached={handleTargetLocationReached}
                      userLocation={userLocation}
                      navigationRoute={isNavigationMode ? navigationRoute : undefined}
                      navigationCurrentIndex={isNavigationMode ? navigationCurrentIndex : undefined}
                      liveTrackingLocation={isLiveTrackingMode && liveTrackingLocation ? { ...liveTrackingLocation, heading: liveTrackingHeading } : (isNavigationMode ? liveTrackingLocation : null)}
                      recordedRoute={recordedRoute}
                      visitedBillboards={visitedBillboards}
                    />
                  </div>
                ) : (
                  <GoogleMapComponent
                    ref={googleMapRef}
                    billboards={loadedBillboards}
                    selectedBillboards={selectedBillboards}
                    onToggleSelection={onToggleSelection}
                    onSelectMultiple={onSelectMultiple}
                    onImageView={onImageView}
                    mapStyle={mapStyle}
                    isDrawingMode={isDrawingMode}
                    drawingPoints={drawingPoints}
                    onDrawingPointAdd={handleDrawingPointAdd}
                    onMapReady={handleMapReady}
                    showNotification={showNotification}
                    targetLocation={targetLocation}
                    onTargetLocationReached={handleTargetLocationReached}
                    userLocation={userLocation}
                    navigationRoute={isNavigationMode ? navigationRoute : undefined}
                    navigationCurrentIndex={isNavigationMode ? navigationCurrentIndex : undefined}
                    liveTrackingLocation={isLiveTrackingMode && liveTrackingLocation ? { ...liveTrackingLocation, heading: liveTrackingHeading } : (isNavigationMode ? liveTrackingLocation : null)}
                    recordedRoute={recordedRoute}
                    visitedBillboards={visitedBillboards}
                  />
                )}
              </Suspense>
            </div>
            
            {/* Loading State with Progress Bar - Only show when transitioning */}
            {(!showMap || isTransitioning) && (
              <div className={`absolute inset-0 transition-opacity duration-500 ease-out ${showMap && !isTransitioning ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <MapSkeleton 
                  onSwitchProvider={toggleProvider} 
                  showSwitchButton={true}
                  providerName={mapProvider === 'google' ? 'OpenStreetMap' : 'Google Maps'}
                />
              
              {/* Progress Bar */}
              {isTransitioning && (
                <div className="absolute top-0 left-0 right-0 z-50">
                  <div className="h-1 bg-background/20 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary via-gold-light to-primary transition-all duration-300 ease-out"
                      style={{ width: `${loadProgress}%` }}
                    />
                  </div>
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg border border-primary/30">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-medium text-foreground">
                        جاري التبديل إلى {mapProvider === 'google' ? 'OpenStreetMap' : 'Google Maps'}...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              </div>
            )}
            {/* Progressive Marker Loading Indicator */}
            {isLoadingMarkers && showMap && (
              <div className="absolute bottom-4 right-4 z-[1000] bg-card/95 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border border-primary/30">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium text-muted-foreground">
                    تحميل العلامات {markerProgress}%
                  </span>
                </div>
                <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-200 ease-out"
                    style={{ width: `${markerProgress}%` }}
                  />
                </div>
              </div>
            )}
            
            {/* Provider Toggle - Bottom Left Corner */}
            <div className="absolute bottom-2 left-2 z-[1000] scale-75 sm:scale-90 md:scale-100 origin-bottom-left">
              <MapProviderToggle provider={mapProvider} onToggle={toggleProvider} disabled={isTransitioning} />
            </div>
            
            {/* Search Bar - Top Center - تصميم مختلف للموبايل */}
            <div className="absolute top-2 md:top-4 left-2 sm:left-1/2 sm:-translate-x-1/2 right-2 sm:right-auto z-[1000] sm:w-full sm:max-w-xs md:max-w-md sm:px-4">
              <MapSearchBar onLocationSelect={handleLocationSelect} onCurrentLocation={handleCurrentLocation} />
            </div>
            
            {/* Notification */}
            <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-[1001] transition-all duration-300 ${notification.show && !showSoussetOnly ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg backdrop-blur-md border ${
                notification.type === 'select' 
                  ? 'bg-primary/95 border-primary-foreground/20 text-primary-foreground' 
                  : 'bg-muted/95 border-border text-muted-foreground'
              }`}>
                {notification.type === 'select' ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                <span className="text-sm font-medium">{notification.message}</span>
              </div>
            </div>

            {/* Sousset Mode Indicator */}
            {showSoussetOnly && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1001] animate-fade-in">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg backdrop-blur-md border bg-primary/95 border-primary-foreground/20 text-primary-foreground">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm font-bold">وضع السوسيت</span>
                  <button 
                    onClick={() => setShowSoussetOnly(false)} 
                    className="mr-1 opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Controls - Right Side - مدمجة على الجوال */}
            <div className="absolute top-14 sm:top-2 md:top-4 right-2 md:right-4 flex flex-col gap-1 md:gap-2 z-[1000]">
              {/* Fullscreen Toggle */}
              <Button size="icon" variant="secondary" className="w-8 h-8 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-card/95 backdrop-blur-md border border-border/50 shadow-lg hover:bg-card" onClick={toggleFullscreen} title={isFullscreen ? 'تصغير' : 'ملء الشاشة'}>
                {isFullscreen ? <Minimize className="w-4 h-4 md:w-5 md:h-5" /> : <Maximize className="w-4 h-4 md:w-5 md:h-5" />}
              </Button>
              
              {/* Zoom buttons - مخفية على الجوال (يوجد pinch-to-zoom) */}
              <Button size="icon" variant="secondary" className="hidden sm:flex w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-card/95 backdrop-blur-md border border-border/50 shadow-lg hover:bg-card" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
              <Button size="icon" variant="secondary" className="hidden sm:flex w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-card/95 backdrop-blur-md border border-border/50 shadow-lg hover:bg-card" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
              
              <MapLayerSelector currentLayer={activeLayer} onLayerChange={handleLayerChange} />
              
              {/* Live Tracking Mode Button - GTA Style */}
              <Button 
                size="icon" 
                variant="secondary" 
                className={`w-8 h-8 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl backdrop-blur-md border shadow-lg ${
                  isLiveTrackingMode 
                    ? 'bg-cyan-500 border-cyan-400 hover:bg-cyan-600 animate-pulse' 
                    : 'bg-card/95 border-border/50 hover:bg-card'
                }`} 
                onClick={toggleLiveTracking} 
                title="التتبع المباشر"
              >
                <Radio className={`w-4 h-4 md:w-5 md:h-5 ${isLiveTrackingMode ? 'text-white' : ''}`} />
              </Button>

              {/* Navigation Mode Button - يظهر فقط عند تحديد لوحات */}
              {selectedCount > 0 && (
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className={`w-8 h-8 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl backdrop-blur-md border shadow-lg ${
                    isNavigationMode 
                      ? 'bg-emerald-500 border-emerald-400 hover:bg-emerald-600' 
                      : 'bg-card/95 border-border/50 hover:bg-card'
                  }`} 
                  onClick={() => setIsNavigationMode(!isNavigationMode)} 
                  title="وضع الملاحة"
                >
                  <Navigation className={`w-4 h-4 md:w-5 md:h-5 ${isNavigationMode ? 'text-white' : ''}`} />
                </Button>
              )}

              {/* Sousset Filter Button */}
              <Button 
                size="icon" 
                variant="secondary" 
                className={`w-8 h-8 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl backdrop-blur-md border shadow-lg transition-all ${
                  showSoussetOnly 
                    ? 'bg-primary border-primary/70 hover:bg-primary/90' 
                    : 'bg-card/95 border-border/50 hover:bg-card'
                }`}
                onClick={() => setShowSoussetOnly(prev => !prev)} 
                title={showSoussetOnly ? 'إظهار جميع المقاسات' : 'إظهار لوحات السوسيت فقط'}
              >
                {showSoussetOnly 
                  ? <Eye className={`w-4 h-4 md:w-5 md:h-5 text-primary-foreground`} />
                  : <EyeOff className="w-4 h-4 md:w-5 md:h-5" />
                }
              </Button>
              
              {/* Drawing Mode Button - Hidden on small mobile */}
              <div className="hidden sm:block">
                {!isDrawingMode ? (
                  <Button size="icon" variant="secondary" className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-card/95 backdrop-blur-md border border-border/50 shadow-lg hover:bg-card" onClick={startDrawingMode} title="رسم منطقة للاختيار">
                    <PenTool className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                ) : (
                  <Button size="icon" variant="secondary" className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-destructive/95 backdrop-blur-md border border-destructive/50 shadow-lg hover:bg-destructive" onClick={cancelDrawingMode} title="إلغاء الرسم">
                    <X className="w-4 h-4 md:w-5 md:h-5 text-destructive-foreground" />
                  </Button>
                )}
              </div>
            </div>

            {/* Drawing Mode UI */}
            {isDrawingMode && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-primary/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg border border-primary-foreground/20 z-[1000]">
                <p className="text-sm font-bold text-primary-foreground text-center mb-2">وضع رسم المنطقة</p>
                <p className="text-xs text-primary-foreground/80 text-center mb-2">انقر على الخريطة لرسم نقاط المنطقة ({drawingPoints.length} نقطة)</p>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="secondary" className="text-xs" onClick={finishDrawing} disabled={drawingPoints.length < 3}>
                    <CheckCircle2 className="w-4 h-4 ml-1" />
                    تأكيد
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs text-primary-foreground hover:bg-primary-foreground/20" onClick={cancelDrawingMode}>
                    إلغاء
                  </Button>
                </div>
              </div>
            )}

            {/* Selection Counter */}
            {selectedCount > 0 && !isDrawingMode && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg border border-primary/30 z-[1000] flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-foreground">{selectedCount}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">لوحة مختارة</span>
                </div>
                {onDownloadSelected && (
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={onDownloadSelected}>
                    <Download className="w-4 h-4 ml-1" />
                    تحميل
                  </Button>
                )}
              </div>
            )}

            {/* Legend - Enhanced with mini pin icons */}
            <MapLegend billboards={billboards} />
            
            {/* Status Filter */}
            <MapStatusFilter billboards={billboards} filter={mapStatusFilter} onFilterChange={setMapStatusFilter} />
            
            {/* Navigation Mode Panel */}
            <NavigationMode
              isActive={isNavigationMode}
              onClose={() => {
                setIsNavigationMode(false)
                setNavigationRoute([])
                setLiveTrackingLocation(null)
              }}
              billboards={billboards}
              selectedBillboards={selectedBillboards || new Set()}
              userLocation={userLocation}
              onRequestLocation={requestUserLocation}
              onRouteUpdate={(route, currentIndex) => {
                setNavigationRoute(route)
                setNavigationCurrentIndex(currentIndex)
              }}
              onCurrentLocationUpdate={(location) => {
                setLiveTrackingLocation(location)
              }}
            />
            
            {/* Live Tracking Mode */}
            <LiveTrackingMode
              isActive={isLiveTrackingMode}
              onClose={() => {
                setIsLiveTrackingMode(false)
                setLiveTrackingLocation(null)
                setRecordedRoute([])
              }}
              billboards={billboards}
              onLocationUpdate={handleLiveTrackingUpdate}
              onZoomToLocation={handleZoomToLocation}
              onPanToLocation={handlePanToLocation}
              onRequestLocation={requestUserLocation}
              onRouteUpdate={(route) => setRecordedRoute(route)}
              onVisitedBillboardsUpdate={(visited) => setVisitedBillboards(visited)}
              onBillboardSelect={(billboard) => {
                // فتح نافذة معلومات اللوحة على الخريطة
                const event = new CustomEvent('openBillboardInfoWindow', { detail: billboard.id })
                document.dispatchEvent(event)
              }}
            />
            
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // IMPORTANT: when fullscreen, render via Portal to escape parent stacking contexts/animations (e.g. page-transition transforms)
  if (isFullscreen && typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }

  return content
}

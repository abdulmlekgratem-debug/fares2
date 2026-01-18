import { useEffect, useRef, useState, useCallback, lazy, Suspense } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Billboard } from "@/types"
import { MapProvider, MapPosition } from "@/types/map"
import { MapPin, Layers, ZoomIn, ZoomOut, Download, PenTool, X, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import MapSkeleton from "./MapSkeleton"
import MapProviderToggle from "./map/MapProviderToggle"
import MapSearchBar from "./map/MapSearchBar"
import { getSizeColor } from "@/hooks/useMapMarkers"

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
}

export default function InteractiveMap({ billboards, onImageView, selectedBillboards, onToggleSelection, onSelectMultiple, onDownloadSelected }: InteractiveMapProps) {
  const googleMapRef = useRef<any>(null)
  const leafletMapRef = useRef<HTMLDivElement>(null)
  
  const [mapProvider, setMapProvider] = useState<MapProvider>('openstreetmap')
  const [mapLoaded, setMapLoaded] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [mapStyle, setMapStyle] = useState<'roadmap' | 'satellite' | 'hybrid'>('satellite')
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [drawingPoints, setDrawingPoints] = useState<MapPosition[]>([])
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: 'select' | 'deselect' }>({ show: false, message: '', type: 'select' })
  const [mapKey, setMapKey] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [targetLocation, setTargetLocation] = useState<{ lat: number; lng: number; zoom?: number; boundary?: { north: number; south: number; east: number; west: number }; placeName?: string } | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const selectedCount = selectedBillboards?.size || 0

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

  const toggleMapStyle = () => {
    const styles: ('roadmap' | 'satellite' | 'hybrid')[] = ['roadmap', 'satellite', 'hybrid']
    const currentIndex = styles.indexOf(mapStyle)
    setMapStyle(styles[(currentIndex + 1) % styles.length])
  }

  // Handle location search
  const handleLocationSelect = useCallback((lat: number, lng: number, zoom?: number, boundary?: { north: number; south: number; east: number; west: number }, placeName?: string) => {
    setTargetLocation({ lat, lng, zoom, boundary, placeName })
  }, [])

  // Handle current location
  const handleCurrentLocation = useCallback((lat: number, lng: number) => {
    setUserLocation({ lat, lng })
  }, [])

  return (
    <div className="mb-12 animate-fade-in">
      <Card className="overflow-hidden shadow-2xl shadow-primary/10 border-0 bg-card rounded-3xl">
        <CardContent className="p-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary via-gold-light to-primary p-5">
            <div className="flex items-center justify-center gap-3">
              <MapPin className="w-6 h-6 text-primary-foreground" />
              <h3 className="text-2xl font-extrabold text-center text-primary-foreground">
                خريطة المواقع الإعلانية
              </h3>
            </div>
            <p className="text-center mt-2 text-sm font-medium text-primary-foreground/80">
              {billboards.length} موقع إعلاني
            </p>
            <p className="text-center mt-1 text-xs text-primary-foreground/60">
              نقرة واحدة = عرض التفاصيل • نقرة مزدوجة = تحديد اللوحة
            </p>
          </div>
          
          {/* Map Container */}
          <div className="relative h-[550px] overflow-hidden">
            {/* Single Map Component - keyed to force unmount/remount */}
            <div 
              key={mapKey}
              className={`absolute inset-0 transition-opacity duration-500 ease-out ${showMap ? 'opacity-100' : 'opacity-0'}`}
            >
              <Suspense fallback={<MapSkeleton />}>
                {mapProvider === 'openstreetmap' ? (
                  <div ref={leafletMapRef} className="w-full h-full">
                    <LeafletMapComponent
                      billboards={billboards}
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
                      onTargetLocationReached={() => setTargetLocation(null)}
                      userLocation={userLocation}
                    />
                  </div>
                ) : (
                  <GoogleMapComponent
                    ref={googleMapRef}
                    billboards={billboards}
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
                    onTargetLocationReached={() => setTargetLocation(null)}
                  />
                )}
              </Suspense>
            </div>
            
            {/* Loading State with Progress Bar */}
            <div className={`absolute inset-0 transition-opacity duration-500 ease-out pointer-events-none ${showMap && !isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
              <MapSkeleton />
              
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
            
            {/* Provider Toggle - Top Left - Always visible */}
            <div className="absolute top-4 left-4 z-[1000]">
              <MapProviderToggle provider={mapProvider} onToggle={toggleProvider} disabled={isTransitioning} />
            </div>
            
            {/* Search Bar - Top Center */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-md px-4">
              <MapSearchBar onLocationSelect={handleLocationSelect} onCurrentLocation={handleCurrentLocation} />
            </div>
            
            {/* Notification */}
            <div className={`absolute top-20 left-1/2 -translate-x-1/2 z-[1001] transition-all duration-300 ${notification.show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg backdrop-blur-md border ${
                notification.type === 'select' 
                  ? 'bg-primary/95 border-primary-foreground/20 text-primary-foreground' 
                  : 'bg-muted/95 border-border text-muted-foreground'
              }`}>
                {notification.type === 'select' ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
                <span className="text-sm font-medium">{notification.message}</span>
              </div>
            </div>

            {/* Controls - Right Side - Always visible */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
              <Button size="icon" variant="secondary" className="w-10 h-10 rounded-xl bg-card/95 backdrop-blur-md border border-border/50 shadow-lg hover:bg-card" onClick={handleZoomIn}>
                <ZoomIn className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="secondary" className="w-10 h-10 rounded-xl bg-card/95 backdrop-blur-md border border-border/50 shadow-lg hover:bg-card" onClick={handleZoomOut}>
                <ZoomOut className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="secondary" className="w-10 h-10 rounded-xl bg-card/95 backdrop-blur-md border border-border/50 shadow-lg hover:bg-card" onClick={toggleMapStyle} title={mapStyle === 'roadmap' ? 'القمر الصناعي' : mapStyle === 'satellite' ? 'هجين' : 'خريطة'}>
                <Layers className="w-5 h-5" />
              </Button>
              
              {!isDrawingMode ? (
                <Button size="icon" variant="secondary" className="w-10 h-10 rounded-xl bg-card/95 backdrop-blur-md border border-border/50 shadow-lg hover:bg-card" onClick={startDrawingMode} title="رسم منطقة للاختيار">
                  <PenTool className="w-5 h-5" />
                </Button>
              ) : (
                <Button size="icon" variant="secondary" className="w-10 h-10 rounded-xl bg-destructive/95 backdrop-blur-md border border-destructive/50 shadow-lg hover:bg-destructive" onClick={cancelDrawingMode} title="إلغاء الرسم">
                  <X className="w-5 h-5 text-destructive-foreground" />
                </Button>
              )}
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

            {/* Legend */}
            <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-md rounded-2xl p-4 border border-border/50 shadow-lg max-h-[300px] overflow-y-auto z-[1000]">
              <p className="text-xs font-bold text-foreground mb-3">حالة اللوحة</p>
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-card shadow-sm" />
                  <span>متاح</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-4 h-4 rounded-full bg-amber-500 border-2 border-card shadow-sm" />
                  <span>قريباً</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-4 h-4 rounded-full bg-red-500 border-2 border-card shadow-sm" />
                  <span>محجوز</span>
                </div>
              </div>
              
              <p className="text-xs font-bold text-foreground mb-2 pt-2 border-t border-border/50">ألوان المقاسات</p>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                {Array.from(new Set(billboards.map(b => b.size))).slice(0, 8).map(size => {
                  const colors = getSizeColor(size)
                  return (
                    <div key={size} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="w-4 h-4 rounded shadow-sm" style={{ backgroundColor: colors.bg, border: `2px solid ${colors.border}` }} />
                      <span className="truncate">{size}</span>
                    </div>
                  )
                })}
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                <img src="/logo-symbol.svg" alt="" className="w-4 h-4" />
                <span>مقر الشركة</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

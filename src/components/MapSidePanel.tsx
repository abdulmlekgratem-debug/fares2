import { useEffect, useRef, useState, useCallback } from "react"
import { X, MapPin, Clock, Maximize2, Layers, ZoomIn, ZoomOut, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Billboard } from "@/types"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { OSM_TILE_LAYERS, LAYER_OPTIONS } from "@/types/map"
import { createMarkerIcon, getDaysRemaining } from "@/hooks/useMapMarkers"

interface MapSidePanelProps {
  billboard: Billboard | null
  isOpen: boolean
  onClose: () => void
  onViewImage: (imageUrl: string) => void
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
  return parsedDate.toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function MapSidePanel({ billboard, isOpen, onClose, onViewImage }: MapSidePanelProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [currentLayer, setCurrentLayer] = useState('google-hybrid')
  
  // Swipe to close
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
      if (diff > 100) onClose()
    }
    setTouchStart(null)
    setTouchCurrent(null)
    setIsDragging(false)
  }, [touchStart, touchCurrent, onClose])

  const swipeOffset = isDragging && touchStart !== null && touchCurrent !== null
    ? Math.max(0, touchStart - touchCurrent) : 0

  const switchLayer = (layerId: string) => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return
    const config = OSM_TILE_LAYERS[layerId]
    if (!config) return

    mapInstanceRef.current.removeLayer(tileLayerRef.current)
    tileLayerRef.current = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom || 18
    }).addTo(mapInstanceRef.current)
    setCurrentLayer(layerId)
  }

  const handleZoomIn = () => { mapInstanceRef.current?.zoomIn() }
  const handleZoomOut = () => { mapInstanceRef.current?.zoomOut() }

  useEffect(() => {
    if (!isOpen || !billboard || !mapRef.current) return

    const coords = billboard.coordinates.split(",").map((c) => parseFloat(c.trim()))
    if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return
    const [lat, lng] = coords

    // Initialize or update map
    if (!mapInstanceRef.current) {
      const tileConfig = OSM_TILE_LAYERS[currentLayer] || OSM_TILE_LAYERS['google-hybrid']
      
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        maxZoom: 18,
        minZoom: 5
      })

      tileLayerRef.current = L.tileLayer(tileConfig.url, {
        attribution: tileConfig.attribution,
        maxZoom: tileConfig.maxZoom || 18
      }).addTo(mapInstanceRef.current)

      setMapLoaded(true)
    } else {
      mapInstanceRef.current.setView([lat, lng], 15)
    }

    // Update marker
    if (markerRef.current) {
      markerRef.current.remove()
    }

    const days = getDaysRemaining(billboard.expiryDate || null)
    const iconData = createMarkerIcon(billboard.size, billboard.status, true, days)
    
    const icon = L.icon({
      iconUrl: iconData.url,
      iconSize: [iconData.size.width, iconData.size.height],
      iconAnchor: [iconData.anchor.x, iconData.anchor.y],
    })

    markerRef.current = L.marker([lat, lng], { icon, title: billboard.name }).addTo(mapInstanceRef.current)
  }, [isOpen, billboard])

  useEffect(() => {
    if (!isOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      tileLayerRef.current = null
      markerRef.current = null
      setMapLoaded(false)
      setCurrentLayer('google-hybrid')
    }
  }, [isOpen])

  if (!billboard) return null

  const daysRemaining = getDaysRemaining(billboard.expiryDate || null)

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/70 backdrop-blur-md z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div 
        ref={panelRef}
        className={`fixed top-0 left-0 h-full w-full md:w-[500px] lg:w-[600px] xl:w-[700px] bg-gradient-to-br from-card via-card to-background z-50 shadow-2xl transition-transform duration-500 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          transform: isOpen ? `translateX(-${swipeOffset}px)` : 'translateX(-100%)',
          transition: isDragging ? 'none' : 'transform 0.5s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe indicator */}
        <div className="md:hidden absolute top-1/2 -translate-y-1/2 right-0 w-6 h-20 bg-muted/50 rounded-l-xl flex items-center justify-center z-[60]">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Close button mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden absolute top-2 right-2 z-[70] bg-card/95 backdrop-blur-md hover:bg-destructive hover:text-destructive-foreground rounded-full shadow-xl w-8 h-8 border border-border/50"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="h-full flex flex-col overflow-hidden">
          
          {/* Image */}
          <div className="relative h-[30vh] md:h-[35%] flex-shrink-0 overflow-hidden">
            <img
              src={billboard.imageUrl || "/roadside-billboard.png"}
              alt={billboard.name}
              className="w-full h-full object-cover object-center"
              onError={(e) => { (e.target as HTMLImageElement).src = "/roadside-billboard.png" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            <Badge className={`absolute top-12 md:top-3 right-2 md:right-3 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg font-bold text-[10px] md:text-xs shadow-lg ${
              billboard.status === "متاح" ? "bg-emerald-500 text-white"
                : billboard.status === "قريباً" ? "bg-amber-500 text-white"
                : "bg-red-500 text-white"
            }`}>
              <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ml-1 md:ml-1.5 inline-block ${
                billboard.status === "متاح" ? "bg-white animate-pulse" : "bg-white/80"
              }`} />
              {billboard.status}
            </Badge>

            <Badge className="absolute top-3 left-3 bg-card/95 backdrop-blur-md text-foreground font-bold px-2.5 py-1 rounded-lg shadow-lg text-xs">
              {billboard.size}
            </Badge>

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

          {/* Map Section - Leaflet */}
          <div className="relative h-[30%] md:h-[35%] bg-muted flex-shrink-0">
            <div ref={mapRef} className="w-full h-full" />
            
            {!mapLoaded && isOpen && (
              <div className="absolute inset-0 bg-card flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Close - Desktop */}
            <Button variant="ghost" size="icon"
              className="hidden md:flex absolute top-3 left-3 bg-card/95 backdrop-blur-md hover:bg-card rounded-full shadow-lg w-8 h-8"
              onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>

            {/* Layer selector */}
            <div className="absolute top-3 right-3 flex flex-col gap-1">
              {LAYER_OPTIONS.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => switchLayer(layer.id)}
                  className={`px-2 py-1 rounded-lg text-[9px] font-bold backdrop-blur-md shadow-lg transition-all duration-200 ${
                    currentLayer === layer.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-card/90 text-foreground hover:bg-card'
                  }`}
                >
                  {layer.icon} {layer.labelAr}
                </button>
              ))}
            </div>

            {/* Zoom */}
            <div className="absolute bottom-3 right-3 flex flex-col gap-1">
              <Button variant="ghost" size="icon"
                className="bg-card/95 backdrop-blur-md hover:bg-card rounded-full shadow-lg w-8 h-8"
                onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon"
                className="bg-card/95 backdrop-blur-md hover:bg-card rounded-full shadow-lg w-8 h-8"
                onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
            </div>

            {/* Location label */}
            <div className="absolute bottom-2 left-2 bg-card/95 backdrop-blur-md rounded-lg px-2.5 py-1.5 shadow-lg border border-border/50 max-w-[55%]">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                <span className="font-bold text-[10px] text-foreground truncate">{billboard.location}</span>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="flex-1 p-3 md:p-4 overflow-y-auto bg-gradient-to-b from-card/50 to-card">
            
            <div className="flex items-start gap-2 mb-3 p-2.5 bg-muted/50 rounded-xl border border-border/50">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div className="text-right flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{billboard.location}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{billboard.municipality} - {billboard.city}</p>
              </div>
            </div>

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

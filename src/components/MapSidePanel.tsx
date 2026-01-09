import { useEffect, useRef, useState } from "react"
import { X, MapPin, Calendar, Clock, Maximize2, Map, Layers, ZoomIn, ZoomOut } from "lucide-react"
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
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('satellite')

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
      // Quick check - should be ready from preloader
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
          tilt: 0, // Disable 3D for faster rendering
        })
        setMapLoaded(true)
      } else {
        mapInstanceRef.current.setCenter({ lat, lng })
      }

      if (markerRef.current) {
        markerRef.current.setMap(null)
      }

      // Generate consistent color for each size
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
      
      // Create custom pin icon with logo and status indicator
      const pinIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="56" height="72" viewBox="0 0 56 72">
            <defs>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.5"/>
              </filter>
            </defs>
            <!-- Pin shape -->
            <path filter="url(#shadow)" d="M28 2C13.745 2 2 13.745 2 28c0 20 26 42 26 42s26-22 26-42C54 13.745 42.255 2 28 2z" fill="${pinColor}" stroke="#fff" stroke-width="2"/>
            <!-- Logo circle background -->
            <circle cx="28" cy="26" r="16" fill="#1a1a2e"/>
            <!-- Logo image -->
            <image href="/logo-symbol.svg" x="12" y="10" width="32" height="32"/>
            <!-- Status indicator circle -->
            <circle cx="28" cy="26" r="6" fill="${statusColor}" stroke="#1a1a2e" stroke-width="2"/>
          </svg>
        `)}`,
        scaledSize: new window.google.maps.Size(56, 72),
        anchor: new window.google.maps.Point(28, 72),
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
          fontSize: '11px',
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
      
      {/* Side Panel - Full height modern design */}
      <div className={`fixed top-0 left-0 h-full w-full md:w-[1100px] bg-gradient-to-br from-card via-card to-background z-50 shadow-2xl transition-transform duration-500 ease-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full flex flex-col md:flex-row overflow-hidden">
          
          {/* Image Section - Full Height */}
          <div className="relative h-[40vh] md:h-full md:w-[45%] flex-shrink-0 overflow-hidden">
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
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30" />
            
            {/* Status Badge */}
            <Badge className={`absolute top-6 right-6 px-4 py-2 rounded-xl font-bold text-sm shadow-lg ${
              billboard.status === "متاح" 
                ? "bg-emerald-500 text-white"
                : billboard.status === "قريباً"
                  ? "bg-amber-500 text-white"
                  : "bg-red-500 text-white"
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ml-2 inline-block ${
                billboard.status === "متاح" ? "bg-white animate-pulse" : "bg-white/80"
              }`} />
              {billboard.status}
            </Badge>

            {/* Size Badge */}
            <Badge className="absolute top-6 left-6 bg-card/95 backdrop-blur-md text-foreground font-bold px-4 py-2 rounded-xl shadow-lg">
              {billboard.size}
            </Badge>

            {/* Billboard Name on Image */}
            <div className="absolute bottom-6 left-6 right-6">
              <h2 className="text-xl md:text-2xl font-black text-white leading-tight drop-shadow-lg mb-3">
                {billboard.name}
              </h2>
              {/* View Full Image Button */}
              <Button
                size="sm"
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30 rounded-xl px-4 py-2 shadow-lg"
                onClick={() => onViewImage(billboard.imageUrl)}
              >
                <Maximize2 className="w-4 h-4 ml-2" />
                عرض الصورة كاملة
              </Button>
            </div>
          </div>

          {/* Map & Info Section */}
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Map Section */}
            <div className="relative h-[40%] md:h-[55%] bg-muted flex-shrink-0">
              <div ref={mapRef} className="w-full h-full" />
              
              {/* Loading */}
              {!mapLoaded && isOpen && (
                <div className="absolute inset-0 bg-card flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 left-4 bg-card/95 backdrop-blur-md hover:bg-card rounded-full shadow-lg w-10 h-10"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>

              {/* Map Type Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 bg-card/95 backdrop-blur-md hover:bg-card rounded-full shadow-lg w-10 h-10"
                onClick={toggleMapType}
                title="تغيير نوع الخريطة"
              >
                <Layers className="w-5 h-5" />
              </Button>

              {/* Zoom Controls */}
              <div className="absolute top-16 right-4 flex flex-col gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-card/95 backdrop-blur-md hover:bg-card rounded-full shadow-lg w-10 h-10"
                  onClick={handleZoomIn}
                  title="تكبير"
                >
                  <ZoomIn className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-card/95 backdrop-blur-md hover:bg-card rounded-full shadow-lg w-10 h-10"
                  onClick={handleZoomOut}
                  title="تصغير"
                >
                  <ZoomOut className="w-5 h-5" />
                </Button>
              </div>

              {/* Map Type Label */}
              <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-md rounded-lg px-3 py-1.5 shadow-lg">
                <span className="text-xs font-bold text-foreground">
                  {mapType === 'roadmap' ? 'خريطة' : mapType === 'satellite' ? 'قمر صناعي' : 'هجين'}
                </span>
              </div>

              {/* Location Label */}
              <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg border border-border/50 max-w-[60%]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                  <span className="font-bold text-sm text-foreground truncate">{billboard.location}</span>
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-card/50 to-card">
              
              {/* Location Details */}
              <div className="flex items-start gap-3 mb-4 p-4 bg-muted/50 rounded-2xl border border-border/50">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div className="text-right flex-1">
                  <p className="text-base font-bold text-foreground">{billboard.location}</p>
                  <p className="text-sm text-muted-foreground mt-1">{billboard.municipality} - {billboard.city}</p>
                </div>
              </div>

              {/* Availability Info */}
              {billboard.status !== "متاح" && daysRemaining !== null && daysRemaining > 0 && (
                <div className="mb-4 p-4 bg-gradient-to-r from-amber-500/20 to-amber-500/5 rounded-2xl border border-amber-500/30">
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-amber-500" />
                    <div>
                      <span className="font-black text-lg text-amber-600 dark:text-amber-400">
                        متبقي {daysRemaining} يوم
                      </span>
                      <p className="text-sm text-muted-foreground mt-1">
                        تاريخ الإتاحة: {formatDate(billboard.expiryDate)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {billboard.area && (
                  <Badge variant="outline" className="bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-xl text-sm font-bold">
                    {billboard.area}
                  </Badge>
                )}
                <Badge variant="outline" className="bg-primary/15 border-primary/30 text-primary px-4 py-2 rounded-xl text-sm font-bold">
                  {billboard.municipality}
                </Badge>
                {billboard.billboardType && (
                  <Badge variant="outline" className="bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl text-sm font-bold">
                    {billboard.billboardType}
                  </Badge>
                )}
                {billboard.facesCount && (
                  <Badge variant="outline" className="bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-400 px-4 py-2 rounded-xl text-sm font-bold">
                    {billboard.facesCount}
                  </Badge>
                )}
              </div>

              {/* Open in Google Maps */}
              <Button
                className="w-full bg-gradient-to-r from-primary via-primary to-accent hover:from-primary/90 hover:via-primary/90 hover:to-accent/90 text-primary-foreground font-black py-5 rounded-2xl shadow-lg text-base"
                onClick={() => window.open(billboard.gpsLink, "_blank")}
              >
                <MapPin className="w-5 h-5 ml-2" />
                فتح في خرائط قوقل
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
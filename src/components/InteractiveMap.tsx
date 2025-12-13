import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Billboard } from "@/types"
import { MapPin, Layers, ZoomIn, ZoomOut, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InteractiveMapProps {
  billboards: Billboard[]
  onImageView: (imageUrl: string) => void
}

declare global {
  interface Window {
    google: any
    initMap: () => void
    MarkerClusterer: any
  }
}

// Helper function to calculate days remaining
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

// Get marker color based on status
const getMarkerColor = (status: string): string => {
  switch (status) {
    case "متاح":
      return "#10b981" // emerald
    case "قريباً":
      return "#f59e0b" // amber
    default:
      return "#ef4444" // red
  }
}

export default function InteractiveMap({ billboards, onImageView }: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const clustererRef = useRef<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapStyle, setMapStyle] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap')

  const darkMapStyles = [
    { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#d4af37" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#d4af37" }] },
    { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdb76b" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#283046" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d4af37" }] },
    { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#1e3a2f" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#4a5568" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2937" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4e6d8c" }] },
  ]

  useEffect(() => {
    const loadGoogleMaps = async () => {
      if (!window.google) {
        await new Promise<void>((resolve) => {
          window.initMap = () => resolve()
          
          const script = document.createElement("script")
          script.src = "https://cdn.jsdelivr.net/gh/somanchiu/Keyless-Google-Maps-API@v7.1/mapsJavaScriptAPI.js"
          script.async = true
          script.defer = true
          document.head.appendChild(script)
          
          setTimeout(() => resolve(), 3000)
        })
      }

      if (!window.MarkerClusterer) {
        await new Promise<void>((resolve) => {
          const script = document.createElement("script")
          script.src = "https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js"
          script.onload = () => resolve()
          document.head.appendChild(script)
        })
      }

      await new Promise<void>((resolve) => {
        const checkGoogle = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(checkGoogle)
            resolve()
          }
        }, 100)
        setTimeout(() => {
          clearInterval(checkGoogle)
          resolve()
        }, 5000)
      })

      if (mapRef.current && window.google?.maps && !mapInstanceRef.current) {
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 32.7, lng: 13.2 },
          zoom: 8,
          styles: darkMapStyles,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
          scaleControl: false,
          rotateControl: false,
          panControl: false,
          keyboardShortcuts: false,
          gestureHandling: 'greedy',
        })

        mapInstanceRef.current = map
        setMapLoaded(true)

        const companyMarker = new window.google.maps.Marker({
          position: { lat: 32.4847, lng: 14.5959 },
          map: map,
          icon: {
            url: "/logo-symbol.svg",
            scaledSize: new window.google.maps.Size(50, 50),
            anchor: new window.google.maps.Point(25, 25),
          },
          title: "مقر الفارس الذهبي",
        })

        const companyInfoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 16px; font-family: 'Manrope', 'Tajawal', sans-serif; direction: rtl; min-width: 200px;">
              <h3 style="font-weight: 800; font-size: 16px; color: #d4af37; margin-bottom: 8px;">مقر الفارس الذهبي</h3>
              <p style="color: #666; margin-bottom: 12px; font-size: 14px;">للدعاية والإعلان</p>
              <a href="https://www.google.com/maps?q=32.4847,14.5959" target="_blank" 
                 style="display: inline-block; background: linear-gradient(135deg, #d4af37, #b8860b); color: #1a1a1a; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-decoration: none;">
                فتح في خرائط جوجل
              </a>
            </div>
          `,
        })

        companyMarker.addListener("click", () => {
          companyInfoWindow.open(map, companyMarker)
        })

        addBillboardMarkers(map)
      }
    }

    loadGoogleMaps()
  }, [])

  const addBillboardMarkers = (map: any) => {
    if (!map || !window.google?.maps) return

    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []

    if (clustererRef.current) {
      clustererRef.current.clearMarkers()
    }

    const markers: any[] = []

    billboards.forEach((billboard) => {
      const coords = billboard.coordinates.split(",").map((coord) => Number.parseFloat(coord.trim()))
      if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return

      const [lat, lng] = coords
      const markerColor = getMarkerColor(billboard.status)
      const daysRemaining = getDaysRemaining(billboard.expiryDate)

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        title: billboard.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: markerColor,
          fillOpacity: 1,
          strokeColor: "#1a1a1a",
          strokeWeight: 3,
        },
      })

      // Build days remaining HTML
      const daysRemainingHtml = billboard.status !== "متاح" && daysRemaining !== null && daysRemaining > 0 ? `
        <div style="background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05)); padding: 10px 14px; border-radius: 12px; margin-bottom: 14px; border: 1px solid rgba(245,158,11,0.3);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span style="font-weight: 700; color: #f59e0b; font-size: 13px;">متبقي ${daysRemaining} يوم</span>
          </div>
        </div>
      ` : ''

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 0; font-family: 'Manrope', 'Tajawal', sans-serif; direction: rtl; width: 320px; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            <!-- Image Section -->
            <div style="position: relative; height: 160px; overflow: hidden;">
              <img src="${billboard.imageUrl || '/roadside-billboard.png'}" 
                   alt="${billboard.name}" 
                   style="width: 100%; height: 100%; object-fit: cover;"
                   onerror="this.src='https://lh3.googleusercontent.com/d/13yTnaEWp2tFSxCmg8AuXH1e9QvPNMYWq'" />
              <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);"></div>
              
              <!-- Size Badge -->
              <div style="position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.9); backdrop-filter: blur(8px); padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; color: #1a1a1a;">
                ${billboard.size}
              </div>
              
              <!-- Status Badge -->
              <div style="position: absolute; bottom: 12px; right: 12px; background: ${billboard.status === 'متاح' ? 'rgba(16,185,129,0.9)' : billboard.status === 'قريباً' ? 'rgba(245,158,11,0.9)' : 'rgba(239,68,68,0.9)'}; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; color: white; display: flex; align-items: center; gap: 6px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: white; ${billboard.status === 'متاح' ? 'animation: pulse 2s infinite;' : ''}"></span>
                ${billboard.status}
              </div>
            </div>
            
            <!-- Content Section -->
            <div style="padding: 16px;">
              <h3 style="font-weight: 800; font-size: 15px; color: #1a1a1a; margin-bottom: 8px; line-height: 1.4;">${billboard.name}</h3>
              
              <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px;">
                <div style="width: 36px; height: 36px; border-radius: 12px; background: linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(212,175,55,0.2);">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <p style="color: #666; font-size: 13px; margin: 0; line-height: 1.5; flex: 1;">${billboard.location}</p>
              </div>
              
              ${daysRemainingHtml}
              
              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px;">
                ${billboard.area ? `<span style="background: rgba(245,158,11,0.15); color: #b45309; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; border: 1px solid rgba(245,158,11,0.3);">${billboard.area}</span>` : ''}
                <span style="background: rgba(212,175,55,0.15); color: #92700c; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; border: 1px solid rgba(212,175,55,0.3);">${billboard.municipality}</span>
                ${billboard.city && billboard.city !== billboard.municipality ? `<span style="background: #f5f5f5; color: #666; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">${billboard.city}</span>` : ''}
              </div>
              
              <button onclick="window.open('${billboard.gpsLink}', '_blank')" 
                      style="width: 100%; background: linear-gradient(135deg, #d4af37, #b8860b); color: #1a1a1a; padding: 12px 16px; border-radius: 14px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(212,175,55,0.35); display: flex; align-items: center; justify-content: center; gap: 8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                فتح في خرائط جوجل
              </button>
            </div>
          </div>
          <style>
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          </style>
        `,
      })

      marker.addListener("click", () => {
        infoWindow.open(map, marker)
      })

      markers.push(marker)
      markersRef.current.push(marker)
    })

    if (window.markerClusterer && markers.length > 0) {
      clustererRef.current = new window.markerClusterer.MarkerClusterer({
        map,
        markers,
        renderer: {
          render: ({ count, position }: any) => {
            return new window.google.maps.Marker({
              position,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 20 + Math.min(count, 10) * 2,
                fillColor: "#d4af37",
                fillOpacity: 0.9,
                strokeColor: "#1a1a1a",
                strokeWeight: 3,
              },
              label: {
                text: String(count),
                color: "#1a1a1a",
                fontWeight: "bold",
                fontSize: "14px",
              },
            })
          },
        },
      })
    } else {
      markers.forEach(marker => marker.setMap(map))
    }
  }

  useEffect(() => {
    if (mapInstanceRef.current && mapLoaded) {
      addBillboardMarkers(mapInstanceRef.current)
    }
  }, [billboards, mapLoaded])

  useEffect(() => {
    const handleShowImage = (event: any) => {
      onImageView(event.detail)
    }

    document.addEventListener("showBillboardImage", handleShowImage)
    return () => document.removeEventListener("showBillboardImage", handleShowImage)
  }, [onImageView])

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

  const toggleMapStyle = () => {
    if (!mapInstanceRef.current) return
    
    const styles: ('roadmap' | 'satellite' | 'hybrid')[] = ['roadmap', 'satellite', 'hybrid']
    const currentIndex = styles.indexOf(mapStyle)
    const nextStyle = styles[(currentIndex + 1) % styles.length]
    setMapStyle(nextStyle)
    
    if (nextStyle === 'roadmap') {
      mapInstanceRef.current.setMapTypeId('roadmap')
      mapInstanceRef.current.setOptions({ styles: darkMapStyles })
    } else {
      mapInstanceRef.current.setMapTypeId(nextStyle)
      mapInstanceRef.current.setOptions({ styles: [] })
    }
  }

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
              {billboards.length} موقع إعلاني - اضغط على العلامات لمزيد من التفاصيل
            </p>
          </div>
          
          {/* Map Container */}
          <div className="relative h-[550px]">
            <div ref={mapRef} className="w-full h-full" />
            
            {/* Loading State */}
            {!mapLoaded && (
              <div className="absolute inset-0 bg-card flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">جاري تحميل الخريطة...</p>
                </div>
              </div>
            )}

            {/* Custom Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <Button
                size="icon"
                variant="secondary"
                className="w-10 h-10 rounded-xl bg-card/90 backdrop-blur-md border border-border/50 shadow-lg hover:bg-card"
                onClick={handleZoomIn}
              >
                <ZoomIn className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="w-10 h-10 rounded-xl bg-card/90 backdrop-blur-md border border-border/50 shadow-lg hover:bg-card"
                onClick={handleZoomOut}
              >
                <ZoomOut className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="w-10 h-10 rounded-xl bg-card/90 backdrop-blur-md border border-border/50 shadow-lg hover:bg-card"
                onClick={toggleMapStyle}
                title={mapStyle === 'roadmap' ? 'القمر الصناعي' : mapStyle === 'satellite' ? 'هجين' : 'خريطة'}
              >
                <Layers className="w-5 h-5" />
              </Button>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-md rounded-2xl p-4 border border-border/50 shadow-lg">
              <p className="text-xs font-bold text-foreground mb-3">دليل الألوان</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-card" />
                  <span>متاح</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-4 h-4 rounded-full bg-amber-500 border-2 border-card" />
                  <span>قريباً</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-4 h-4 rounded-full bg-red-500 border-2 border-card" />
                  <span>محجوز</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                  <img src="/logo-symbol.svg" alt="" className="w-4 h-4" />
                  <span>مقر الشركة</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

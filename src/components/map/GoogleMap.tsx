import { useEffect, useRef, useState, useCallback, memo, forwardRef, useImperativeHandle } from 'react'
import { Billboard } from '@/types'
import { MapPosition } from '@/types/map'
import { 
  createPinSvgUrl, 
  createInfoWindowContent, 
  getSizeColor,
  clusterIconUrl 
} from '@/hooks/useMapMarkers'

declare global {
  interface Window {
    google: any
    initMap: () => void
    MarkerClusterer: any
    markerClusterer: any
    __mapPreloaded?: boolean
    __mapLoading?: boolean
  }
}

interface GoogleMapProps {
  billboards: Billboard[]
  selectedBillboards?: Set<string>
  onToggleSelection?: (billboardId: string) => void
  onSelectMultiple?: (billboardIds: string[]) => void
  onImageView: (imageUrl: string) => void
  mapStyle: 'roadmap' | 'satellite' | 'hybrid'
  isDrawingMode: boolean
  drawingPoints: MapPosition[]
  onDrawingPointAdd: (point: MapPosition) => void
  onMapReady: () => void
  showNotification: (message: string, type: 'select' | 'deselect') => void
  targetLocation?: { lat: number; lng: number; zoom?: number; boundary?: { north: number; south: number; east: number; west: number } } | null
  onTargetLocationReached?: () => void
}

export interface GoogleMapRef {
  zoomIn: () => void
  zoomOut: () => void
}

// Company marker position
const COMPANY_POSITION: MapPosition = { lat: 32.4847, lng: 14.5959 }
const LIBYA_CENTER: MapPosition = { lat: 32.7, lng: 13.2 }

// Store current open InfoWindow
let currentInfoWindow: any = null

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

const GoogleMapComponent = forwardRef<GoogleMapRef, GoogleMapProps>(({
  billboards,
  selectedBillboards,
  onToggleSelection,
  onSelectMultiple,
  onImageView,
  mapStyle,
  isDrawingMode,
  drawingPoints,
  onDrawingPointAdd,
  onMapReady,
  showNotification,
  targetLocation,
  onTargetLocationReached
}, ref) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const clustererRef = useRef<any>(null)
  const drawingPolygonRef = useRef<any>(null)
  const boundaryRectRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)

  // Expose zoom methods via ref
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (mapRef.current) {
        mapRef.current.setZoom(mapRef.current.getZoom() + 1)
      }
    },
    zoomOut: () => {
      if (mapRef.current) {
        mapRef.current.setZoom(mapRef.current.getZoom() - 1)
      }
    }
  }), [])

  // Initialize map
  useEffect(() => {
    let isMounted = true
    
    const initializeMap = async () => {
      // Wait for Google Maps to be ready
      if (!window.google?.maps) {
        await new Promise<void>((resolve) => {
          if (window.google?.maps) {
            resolve()
            return
          }
          const check = setInterval(() => {
            if (window.google?.maps) {
              clearInterval(check)
              resolve()
            }
          }, 25)
          setTimeout(() => {
            clearInterval(check)
            resolve()
          }, 5000)
        })
      }

      if (!isMounted || !mapContainerRef.current || !window.google?.maps || mapRef.current) return

      const isMobile = window.innerWidth < 768
      
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: LIBYA_CENTER,
        zoom: isMobile ? 7 : 8,
        mapTypeId: 'satellite',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
        scaleControl: false,
        rotateControl: false,
        panControl: false,
        keyboardShortcuts: false,
        gestureHandling: 'greedy',
        maxZoom: 18,
        minZoom: 5,
        clickableIcons: false,
        disableDoubleClickZoom: isMobile,
        tilt: 0,
      })

      mapRef.current = map
      setIsReady(true)
      onMapReady()

      // Close InfoWindow when clicking on map
      map.addListener("click", (e: any) => {
        if (isDrawingMode) {
          onDrawingPointAdd({ lat: e.latLng.lat(), lng: e.latLng.lng() })
        } else if (currentInfoWindow) {
          currentInfoWindow.close()
          currentInfoWindow = null
        }
      })

      // Company marker
      const companyMarker = new window.google.maps.Marker({
        position: COMPANY_POSITION,
        map: map,
        icon: {
          url: "/logo-symbol.svg",
          scaledSize: new window.google.maps.Size(50, 50),
          anchor: new window.google.maps.Point(25, 25),
        },
        title: "مقر الفارس الذهبي",
        optimized: true,
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
    }

    initializeMap()
    
    return () => {
      isMounted = false
    }
  }, [])

  // Handle drawing mode click
  useEffect(() => {
    if (!mapRef.current || !isReady) return

    const clickListener = mapRef.current.addListener("click", (e: any) => {
      if (isDrawingMode) {
        onDrawingPointAdd({ lat: e.latLng.lat(), lng: e.latLng.lng() })
      } else if (currentInfoWindow) {
        currentInfoWindow.close()
        currentInfoWindow = null
      }
    })

    return () => {
      window.google?.maps?.event?.removeListener(clickListener)
    }
  }, [isReady, isDrawingMode, onDrawingPointAdd])

  // Handle map style changes
  useEffect(() => {
    if (!mapRef.current || !isReady) return
    
    if (mapStyle === 'roadmap') {
      mapRef.current.setMapTypeId('roadmap')
      mapRef.current.setOptions({ styles: darkMapStyles })
    } else {
      mapRef.current.setMapTypeId(mapStyle)
      mapRef.current.setOptions({ styles: [] })
    }
  }, [mapStyle, isReady])

  // Add billboard markers
  const addBillboardMarkers = useCallback((map: any) => {
    if (!map || !window.google?.maps) return

    // Clear existing markers
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
      const isSelected = selectedBillboards?.has(billboard.id) || false
      const { url, pinSize } = createPinSvgUrl(billboard.size, billboard.status, isSelected)
      const w = pinSize + 8
      const h = pinSize + 14
      
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        title: billboard.name,
        icon: {
          url,
          scaledSize: new window.google.maps.Size(w, h),
          anchor: new window.google.maps.Point(w / 2, h - 2),
          labelOrigin: new window.google.maps.Point(w / 2, h + 8)
        },
        label: {
          text: billboard.size,
          color: isSelected ? '#d4af37' : '#fff',
          fontWeight: 'bold',
          fontSize: isSelected ? '11px' : '10px',
          className: 'marker-label'
        },
        optimized: true,
        zIndex: isSelected ? 1000 : 1
      })

      const infoWindow = new window.google.maps.InfoWindow({
        content: createInfoWindowContent(billboard),
      })

      // Single click: Open info window
      let clickTimeout: ReturnType<typeof setTimeout> | null = null
      
      marker.addListener("click", () => {
        if (clickTimeout) {
          clearTimeout(clickTimeout)
          clickTimeout = null
          return
        }
        
        clickTimeout = setTimeout(() => {
          clickTimeout = null
          if (currentInfoWindow) {
            currentInfoWindow.close()
          }
          currentInfoWindow = infoWindow
          infoWindow.open(map, marker)
        }, 250)
      })
      
      // Double click: Toggle selection
      marker.addListener("dblclick", () => {
        if (clickTimeout) {
          clearTimeout(clickTimeout)
          clickTimeout = null
        }
        if (onToggleSelection) {
          const wasSelected = selectedBillboards?.has(billboard.id) || false
          onToggleSelection(billboard.id)
          showNotification(
            wasSelected ? `تم إلغاء تحديد: ${billboard.name}` : `تم تحديد: ${billboard.name}`,
            wasSelected ? 'deselect' : 'select'
          )
        }
      })

      markers.push(marker)
      markersRef.current.push(marker)
    })

    // Add clustering
    if (window.markerClusterer && markers.length > 0) {
      const isMobile = window.innerWidth < 768
      
      clustererRef.current = new window.markerClusterer.MarkerClusterer({
        map,
        markers,
        gridSize: isMobile ? 80 : 60,
        minimumClusterSize: isMobile ? 3 : 2,
        renderer: {
          render: ({ count, position }: any) => {
            const displayCount = count > 99 ? '99+' : String(count)
            return new window.google.maps.Marker({
              position,
              icon: {
                url: clusterIconUrl,
                scaledSize: new window.google.maps.Size(40, 40),
                anchor: new window.google.maps.Point(20, 20),
                labelOrigin: new window.google.maps.Point(20, 20)
              },
              label: {
                text: displayCount,
                color: "#d4af37",
                fontWeight: "bold",
                fontSize: count > 50 ? "14px" : "12px",
              },
              optimized: true,
              zIndex: count + 100
            })
          },
        },
      })
    } else {
      markers.forEach(marker => marker.setMap(map))
    }
  }, [billboards, selectedBillboards, onToggleSelection, showNotification])

  // Update markers when data changes
  useEffect(() => {
    if (mapRef.current && isReady) {
      addBillboardMarkers(mapRef.current)
    }
  }, [billboards, isReady, selectedBillboards, addBillboardMarkers])

  // Handle drawing polygon
  useEffect(() => {
    if (!mapRef.current || !isReady) return

    if (drawingPolygonRef.current) {
      drawingPolygonRef.current.setMap(null)
      drawingPolygonRef.current = null
    }

    if (drawingPoints.length >= 2 && window.google?.maps) {
      drawingPolygonRef.current = new window.google.maps.Polygon({
        paths: drawingPoints,
        strokeColor: "#d4af37",
        strokeOpacity: 0.9,
        strokeWeight: 3,
        fillColor: "#d4af37",
        fillOpacity: 0.2,
        map: mapRef.current,
      })
    }
  }, [drawingPoints, isReady])

  // Listen for image view events
  useEffect(() => {
    const handleShowImage = (event: any) => {
      onImageView(event.detail)
    }

    document.addEventListener("showBillboardImage", handleShowImage)
    
    return () => {
      document.removeEventListener("showBillboardImage", handleShowImage)
    }
  }, [onImageView])

  // Handle target location navigation
  useEffect(() => {
    if (targetLocation && mapRef.current && window.google?.maps) {
      // Remove previous boundary
      if (boundaryRectRef.current) {
        boundaryRectRef.current.setMap(null)
        boundaryRectRef.current = null
      }
      
      const zoom = targetLocation.zoom || 14
      mapRef.current.panTo({ lat: targetLocation.lat, lng: targetLocation.lng })
      mapRef.current.setZoom(zoom)
      
      // Add boundary rectangle if provided
      if (targetLocation.boundary) {
        const { north, south, east, west } = targetLocation.boundary
        boundaryRectRef.current = new window.google.maps.Rectangle({
          bounds: { north, south, east, west },
          strokeColor: '#22c55e',
          strokeOpacity: 0.9,
          strokeWeight: 3,
          fillColor: '#22c55e',
          fillOpacity: 0.1,
          map: mapRef.current
        })
      }
      
      // Call callback after animation
      if (onTargetLocationReached) {
        setTimeout(() => {
          onTargetLocationReached()
        }, 1000)
      }
    }
  }, [targetLocation, onTargetLocationReached])

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full"
      style={{ background: '#1a1a2e' }}
    />
  )
})

GoogleMapComponent.displayName = 'GoogleMapComponent'

export default memo(GoogleMapComponent)

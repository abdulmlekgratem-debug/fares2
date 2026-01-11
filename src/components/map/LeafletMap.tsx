import { useEffect, useRef, useState, useCallback, memo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Billboard } from '@/types'
import { MapPosition, OSM_TILE_LAYERS } from '@/types/map'
import { createInfoWindowContent, getSizeColor } from '@/hooks/useMapMarkers'

interface LeafletMapProps {
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
}

// Company marker position
const COMPANY_POSITION: MapPosition = { lat: 32.4847, lng: 14.5959 }
const LIBYA_CENTER: MapPosition = { lat: 32.7, lng: 13.2 }

function LeafletMapComponent({
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
  showNotification
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const labelLayerRef = useRef<L.TileLayer | null>(null)
  const drawingLayerRef = useRef<L.Polygon | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const isMobile = window.innerWidth < 768

    // Create map with OSM
    const map = L.map(mapContainerRef.current, {
      center: [LIBYA_CENTER.lat, LIBYA_CENTER.lng],
      zoom: isMobile ? 7 : 8,
      zoomControl: false,
      attributionControl: false,
      maxZoom: 18,
      minZoom: 5
    })

    mapRef.current = map

    // Add initial tile layer (dark theme for satellite-like appearance)
    const tileConfig = OSM_TILE_LAYERS.satellite
    tileLayerRef.current = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 18
    }).addTo(map)

    // Create markers layer group
    markersLayerRef.current = L.layerGroup().addTo(map)

    // Add company marker
    const companyIcon = L.icon({
      iconUrl: '/logo-symbol.svg',
      iconSize: [50, 50],
      iconAnchor: [25, 25]
    })

    const companyMarker = L.marker([COMPANY_POSITION.lat, COMPANY_POSITION.lng], {
      icon: companyIcon,
      title: 'مقر الفارس الذهبي'
    }).addTo(map)

    companyMarker.bindPopup(`
      <div style="padding: 16px; font-family: 'Manrope', 'Tajawal', sans-serif; direction: rtl; min-width: 200px;">
        <h3 style="font-weight: 800; font-size: 16px; color: #d4af37; margin-bottom: 8px;">مقر الفارس الذهبي</h3>
        <p style="color: #666; margin-bottom: 12px; font-size: 14px;">للدعاية والإعلان</p>
        <a href="https://www.google.com/maps?q=32.4847,14.5959" target="_blank" 
           style="display: inline-block; background: linear-gradient(135deg, #d4af37, #b8860b); color: #1a1a1a; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-decoration: none;">
          فتح في خرائط جوجل
        </a>
      </div>
    `, { className: 'leaflet-popup-dark' })

    // Map click handler for drawing mode
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (isDrawingMode) {
        onDrawingPointAdd({ lat: e.latlng.lat, lng: e.latlng.lng })
      }
    })

    setIsReady(true)
    onMapReady()

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update drawing mode click handler
  useEffect(() => {
    if (!mapRef.current) return

    const handler = (e: L.LeafletMouseEvent) => {
      if (isDrawingMode) {
        onDrawingPointAdd({ lat: e.latlng.lat, lng: e.latlng.lng })
      }
    }

    mapRef.current.off('click')
    mapRef.current.on('click', handler)
  }, [isDrawingMode, onDrawingPointAdd])

  // Handle map style changes
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return

    // Remove existing layers
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current)
    }
    if (labelLayerRef.current) {
      mapRef.current.removeLayer(labelLayerRef.current)
    }

    // Add new tile layer based on style
    let tileConfig
    if (mapStyle === 'roadmap') {
      tileConfig = OSM_TILE_LAYERS.dark
    } else if (mapStyle === 'satellite') {
      tileConfig = OSM_TILE_LAYERS.satellite
    } else {
      tileConfig = OSM_TILE_LAYERS.hybrid
    }

    tileLayerRef.current = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 18
    }).addTo(mapRef.current)

    // Add labels layer for hybrid mode
    if (mapStyle === 'hybrid' && tileConfig.labels) {
      labelLayerRef.current = L.tileLayer(tileConfig.labels, {
        maxZoom: 18
      }).addTo(mapRef.current)
    }
  }, [mapStyle])

  // Update markers when billboards or selection changes
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current || !isReady) return

    // Clear existing markers
    markersLayerRef.current.clearLayers()

    // Add billboard markers
    billboards.forEach((billboard) => {
      const coords = billboard.coordinates.split(",").map((coord) => Number.parseFloat(coord.trim()))
      if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return

      const [lat, lng] = coords
      const isSelected = selectedBillboards?.has(billboard.id) || false
      const statusColor = billboard.status === "متاح" ? "#10b981" : billboard.status === "قريباً" ? "#f59e0b" : "#ef4444"
      const colors = getSizeColor(billboard.size)
      const pinSize = isSelected ? 44 : 32

      // Create DivIcon instead of icon with URL for better reliability
      const icon = L.divIcon({
        className: 'custom-billboard-marker',
        html: `
          <div style="
            position: relative;
            width: ${pinSize}px;
            height: ${pinSize + 12}px;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
          ">
            <svg width="${pinSize}" height="${pinSize + 12}" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2C10 2 2 10 2 20c0 14 18 30 18 30s18-16 18-30c0-10-8-18-18-18z" 
                fill="${colors.bg}" 
                stroke="${isSelected ? '#d4af37' : colors.border}" 
                stroke-width="${isSelected ? 3 : 2}"/>
              <circle cx="20" cy="18" r="8" fill="${statusColor}"/>
              ${isSelected ? '<circle cx="20" cy="18" r="12" fill="none" stroke="#d4af37" stroke-width="2"/>' : ''}
            </svg>
          </div>
        `,
        iconSize: [pinSize, pinSize + 12],
        iconAnchor: [pinSize / 2, pinSize + 10],
        popupAnchor: [0, -(pinSize + 5)]
      })

      const marker = L.marker([lat, lng], {
        icon,
        title: billboard.name,
        zIndexOffset: isSelected ? 1000 : 0,
        riseOnHover: true
      })

      // Create popup content
      const popupContent = createInfoWindowContent(billboard)
      marker.bindPopup(popupContent, { 
        className: 'leaflet-popup-dark',
        maxWidth: 280,
        minWidth: 260
      })

      // Single click: Open popup
      let clickTimeout: ReturnType<typeof setTimeout> | null = null
      
      marker.on('click', () => {
        if (clickTimeout) {
          clearTimeout(clickTimeout)
          clickTimeout = null
          return
        }
        
        clickTimeout = setTimeout(() => {
          clickTimeout = null
          marker.openPopup()
        }, 250)
      })

      // Double click: Toggle selection
      marker.on('dblclick', () => {
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

      markersLayerRef.current?.addLayer(marker)
    })
  }, [billboards, selectedBillboards, isReady, onToggleSelection, showNotification])

  // Handle drawing polygon
  useEffect(() => {
    if (!mapRef.current) return

    if (drawingLayerRef.current) {
      mapRef.current.removeLayer(drawingLayerRef.current)
      drawingLayerRef.current = null
    }

    if (drawingPoints.length >= 2) {
      drawingLayerRef.current = L.polygon(
        drawingPoints.map(p => [p.lat, p.lng] as L.LatLngTuple),
        {
          color: '#d4af37',
          weight: 3,
          fillColor: '#d4af37',
          fillOpacity: 0.2
        }
      ).addTo(mapRef.current)
    }
  }, [drawingPoints])

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

  // Expose zoom controls
  const zoomIn = useCallback(() => {
    mapRef.current?.zoomIn()
  }, [])

  const zoomOut = useCallback(() => {
    mapRef.current?.zoomOut()
  }, [])

  // Attach methods to ref for external access
  useEffect(() => {
    if (mapContainerRef.current) {
      (mapContainerRef.current as any).zoomIn = zoomIn;
      (mapContainerRef.current as any).zoomOut = zoomOut
    }
  }, [zoomIn, zoomOut])

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full"
      style={{ background: '#1a1a2e' }}
    />
  )
}

export default memo(LeafletMapComponent)

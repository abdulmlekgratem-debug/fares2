import { useEffect, useRef, useState, useCallback, memo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
import { Billboard } from '@/types'
import { MapPosition, OSM_TILE_LAYERS } from '@/types/map'
import { createInfoWindowContent, getSizeColor } from '@/hooks/useMapMarkers'

// Helper to adjust hex colors
const adjustColorHex = (hex: string, amount: number): string => {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount))
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount))
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`
}

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
  targetLocation?: { lat: number; lng: number; zoom?: number; boundary?: { north: number; south: number; east: number; west: number }; placeName?: string } | null
  onTargetLocationReached?: () => void
  userLocation?: { lat: number; lng: number } | null
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
  showNotification,
  targetLocation,
  onTargetLocationReached,
  userLocation
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const labelLayerRef = useRef<L.TileLayer | null>(null)
  const drawingLayerRef = useRef<L.Polygon | null>(null)
  const boundaryLayerRef = useRef<L.Rectangle | null>(null)
  const searchMarkerRef = useRef<L.Marker | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
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

    // Create marker cluster group with custom styling
    clusterGroupRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: isMobile ? 80 : 60,
      disableClusteringAtZoom: 16,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount()
        const displayCount = count > 99 ? '99+' : String(count)
        const size = count > 50 ? 56 : count > 20 ? 48 : 44
        
        return L.divIcon({
          html: `
            <div style="
              width: ${size}px;
              height: ${size}px;
              position: relative;
              filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
            ">
              <svg width="${size}" height="${size}" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="clusterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#d4af37;stop-opacity:1"/>
                    <stop offset="100%" style="stop-color:#b8860b;stop-opacity:1"/>
                  </linearGradient>
                </defs>
                <circle cx="25" cy="25" r="23" fill="url(#clusterGrad)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
                <circle cx="25" cy="25" r="17" fill="#1a1a2e"/>
                <circle cx="25" cy="25" r="17" fill="none" stroke="rgba(212,175,55,0.4)" stroke-width="1"/>
              </svg>
              <div style="
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #d4af37;
                font-weight: 800;
                font-size: ${count > 50 ? 14 : 12}px;
                font-family: 'Manrope', sans-serif;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
              ">${displayCount}</div>
            </div>
          `,
          className: 'custom-cluster-icon',
          iconSize: L.point(size, size),
          iconAnchor: L.point(size / 2, size / 2)
        })
      }
    })
    map.addLayer(clusterGroupRef.current)

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
    if (!mapRef.current || !clusterGroupRef.current || !isReady) return

    // Clear existing markers
    clusterGroupRef.current.clearLayers()

    // Add billboard markers
    billboards.forEach((billboard) => {
      const coords = billboard.coordinates.split(",").map((coord) => Number.parseFloat(coord.trim()))
      if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return

      const [lat, lng] = coords
      const isSelected = selectedBillboards?.has(billboard.id) || false
      const statusColor = billboard.status === "متاح" ? "#10b981" : billboard.status === "قريباً" ? "#f59e0b" : "#ef4444"
      const colors = getSizeColor(billboard.size)
      const pinSize = isSelected ? 48 : 38

      // Modern 3D pin design matching reference image
      const icon = L.divIcon({
        className: 'custom-billboard-marker',
        html: `
          <div class="pin-container" style="
            position: relative;
            width: ${pinSize + 16}px;
            height: ${pinSize + 24}px;
            cursor: pointer;
            filter: drop-shadow(0 6px 10px rgba(0,0,0,0.35));
          ">
            <!-- Main Pin Body - 3D Teardrop -->
            <svg width="${pinSize + 16}" height="${pinSize + 24}" viewBox="0 0 60 75" xmlns="http://www.w3.org/2000/svg" style="position: absolute; top: 0; left: 0;">
              <defs>
                <!-- Main body gradient -->
                <linearGradient id="pinGrad${billboard.id}" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:${adjustColorHex(colors.bg, 40)};stop-opacity:1"/>
                  <stop offset="30%" style="stop-color:${colors.bg};stop-opacity:1"/>
                  <stop offset="70%" style="stop-color:${adjustColorHex(colors.bg, -20)};stop-opacity:1"/>
                  <stop offset="100%" style="stop-color:${adjustColorHex(colors.bg, -50)};stop-opacity:1"/>
                </linearGradient>
                <!-- Inner orb gradient -->
                <radialGradient id="orbGrad${billboard.id}" cx="35%" cy="35%" r="60%">
                  <stop offset="0%" style="stop-color:${adjustColorHex(statusColor, 80)};stop-opacity:1"/>
                  <stop offset="50%" style="stop-color:${statusColor};stop-opacity:1"/>
                  <stop offset="100%" style="stop-color:${adjustColorHex(statusColor, -40)};stop-opacity:1"/>
                </radialGradient>
                <!-- Highlight -->
                <linearGradient id="highlight${billboard.id}" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:rgba(255,255,255,0.6);stop-opacity:1"/>
                  <stop offset="100%" style="stop-color:rgba(255,255,255,0);stop-opacity:1"/>
                </linearGradient>
              </defs>
              
              <!-- Shadow ellipse -->
              <ellipse cx="30" cy="72" rx="12" ry="3" fill="rgba(0,0,0,0.25)"/>
              
              <!-- Pin body - teardrop shape -->
              <path d="M30 68 C26 60, 8 45, 8 28 A22 22 0 1 1 52 28 C52 45, 34 60, 30 68 Z" 
                    fill="url(#pinGrad${billboard.id})"
                    stroke="${isSelected ? '#d4af37' : colors.border}"
                    stroke-width="${isSelected ? 3 : 2}"/>
              
              <!-- Inner silver ring -->
              <circle cx="30" cy="28" r="16" fill="none" stroke="rgba(200,200,210,0.9)" stroke-width="3"/>
              <circle cx="30" cy="28" r="14.5" fill="none" stroke="rgba(150,150,160,0.6)" stroke-width="1"/>
              
              <!-- Status orb -->
              <circle cx="30" cy="28" r="12" fill="url(#orbGrad${billboard.id})"/>
              
              <!-- Orb highlight -->
              <ellipse cx="26" cy="24" rx="5" ry="3" fill="rgba(255,255,255,0.5)"/>
              
              <!-- Small dot indicator -->
              <circle cx="38" cy="22" r="4" fill="${adjustColorHex(colors.bg, 30)}" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
              
              <!-- Bottom accent dot -->
              <ellipse cx="30" cy="52" rx="4" ry="5" fill="${adjustColorHex(colors.bg, -20)}"/>
              <ellipse cx="30" cy="50" rx="2.5" ry="3" fill="${adjustColorHex(colors.bg, 20)}"/>
              
              <!-- 3D Highlight shine -->
              <path d="M15 20 Q20 12, 30 14 Q22 16, 18 24 Z" fill="url(#highlight${billboard.id})" opacity="0.7"/>
              
              ${isSelected ? `
                <!-- Selection ring -->
                <circle cx="30" cy="28" r="24" fill="none" stroke="#d4af37" stroke-width="2" stroke-dasharray="6 4" opacity="0.8">
                  <animateTransform attributeName="transform" type="rotate" from="0 30 28" to="360 30 28" dur="8s" repeatCount="indefinite"/>
                </circle>
              ` : ''}
            </svg>
            
            <!-- Size Label Badge -->
            <div style="
              position: absolute;
              bottom: -10px;
              left: 50%;
              transform: translateX(-50%);
              background: linear-gradient(135deg, rgba(26,26,46,0.98), rgba(15,15,25,0.98));
              color: ${colors.bg};
              padding: 3px 10px;
              border-radius: 10px;
              font-size: 9px;
              font-weight: 800;
              font-family: 'Manrope', sans-serif;
              white-space: nowrap;
              border: 1px solid ${colors.bg}50;
              box-shadow: 0 3px 8px rgba(0,0,0,0.4);
              letter-spacing: 0.3px;
            ">${billboard.size}</div>
          </div>
        `,
        iconSize: [pinSize + 16, pinSize + 34],
        iconAnchor: [(pinSize + 16) / 2, pinSize + 20],
        popupAnchor: [0, -(pinSize + 12)]
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

      clusterGroupRef.current?.addLayer(marker)
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

  // Handle target location navigation
  useEffect(() => {
    if (targetLocation && mapRef.current) {
      // Remove previous boundary and marker
      if (boundaryLayerRef.current) {
        mapRef.current.removeLayer(boundaryLayerRef.current)
        boundaryLayerRef.current = null
      }
      if (searchMarkerRef.current) {
        mapRef.current.removeLayer(searchMarkerRef.current)
        searchMarkerRef.current = null
      }
      
      const zoom = targetLocation.zoom || 14
      mapRef.current.flyTo([targetLocation.lat, targetLocation.lng], zoom, {
        duration: 1.5,
        easeLinearity: 0.25
      })
      
      // Add search location marker
      const searchIcon = L.divIcon({
        className: 'search-location-marker',
        html: `
          <div style="
            position: relative;
            width: 50px;
            height: 60px;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
          ">
            <svg width="50" height="60" viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="searchPinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#22c55e;stop-opacity:1"/>
                  <stop offset="100%" style="stop-color:#16a34a;stop-opacity:1"/>
                </linearGradient>
                <filter id="searchGlow">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#22c55e" flood-opacity="0.6"/>
                </filter>
              </defs>
              <path d="M25 55 C22 48, 6 35, 6 22 A19 19 0 1 1 44 22 C44 35, 28 48, 25 55 Z" 
                    fill="url(#searchPinGrad)" 
                    stroke="#fff" 
                    stroke-width="2"
                    filter="url(#searchGlow)"/>
              <circle cx="25" cy="22" r="10" fill="#fff"/>
              <circle cx="25" cy="22" r="6" fill="#22c55e"/>
            </svg>
            <div style="
              position: absolute;
              bottom: -8px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(34,197,94,0.95);
              color: #fff;
              padding: 4px 10px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 700;
              font-family: 'Manrope', sans-serif;
              white-space: nowrap;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              border: 1px solid rgba(255,255,255,0.3);
            ">${targetLocation.placeName || 'الموقع المحدد'}</div>
          </div>
        `,
        iconSize: [50, 75],
        iconAnchor: [25, 55]
      })
      
      searchMarkerRef.current = L.marker([targetLocation.lat, targetLocation.lng], {
        icon: searchIcon,
        zIndexOffset: 2000
      }).addTo(mapRef.current)
      
      // Add popup with directions
      const popupContent = `
        <div style="
          font-family: 'Manrope', 'Tajawal', sans-serif;
          direction: rtl;
          padding: 12px;
          min-width: 180px;
        ">
          <h4 style="font-weight: 700; font-size: 14px; color: #22c55e; margin: 0 0 8px 0;">
            ${targetLocation.placeName || 'الموقع المحدد'}
          </h4>
          <p style="font-size: 11px; color: #666; margin: 0 0 12px 0;">
            ${targetLocation.lat.toFixed(5)}, ${targetLocation.lng.toFixed(5)}
          </p>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${targetLocation.lat},${targetLocation.lng}&travelmode=driving" 
             target="_blank" 
             style="
               display: flex;
               align-items: center;
               justify-content: center;
               gap: 6px;
               background: linear-gradient(135deg, #3b82f6, #1d4ed8);
               color: #fff;
               padding: 8px 14px;
               border-radius: 10px;
               font-size: 12px;
               font-weight: 700;
               text-decoration: none;
             ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            التوجيه للموقع
          </a>
        </div>
      `
      searchMarkerRef.current.bindPopup(popupContent, { className: 'leaflet-popup-dark' }).openPopup()
      
      // Add boundary rectangle if provided
      if (targetLocation.boundary) {
        const { north, south, east, west } = targetLocation.boundary
        boundaryLayerRef.current = L.rectangle(
          [[south, west], [north, east]],
          {
            color: '#22c55e',
            weight: 3,
            fill: true,
            fillColor: '#22c55e',
            fillOpacity: 0.08,
            dashArray: '10, 8'
          }
        ).addTo(mapRef.current)
      }
      
      // Call callback after animation
      if (onTargetLocationReached) {
        setTimeout(() => {
          onTargetLocationReached()
        }, 1600)
      }
    }
  }, [targetLocation, onTargetLocationReached])

  // Handle user location marker
  useEffect(() => {
    if (userLocation && mapRef.current) {
      // Remove previous user marker
      if (userMarkerRef.current) {
        mapRef.current.removeLayer(userMarkerRef.current)
        userMarkerRef.current = null
      }
      
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div style="position: relative; width: 24px; height: 24px;">
            <div style="
              position: absolute;
              inset: 0;
              background: #3b82f6;
              border-radius: 50%;
              animation: pulse-location 2s infinite;
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 14px;
              height: 14px;
              background: #3b82f6;
              border-radius: 50%;
              border: 3px solid #fff;
              box-shadow: 0 2px 8px rgba(59,130,246,0.5);
            "></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
      
      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: userIcon,
        zIndexOffset: 1500
      }).addTo(mapRef.current)
      
      userMarkerRef.current.bindPopup(`
        <div style="font-family: 'Manrope', sans-serif; direction: rtl; padding: 8px; text-align: center;">
          <p style="font-weight: 700; color: #3b82f6; margin: 0;">موقعك الحالي</p>
        </div>
      `, { className: 'leaflet-popup-dark' })
    }
  }, [userLocation])

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

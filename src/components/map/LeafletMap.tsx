import { useEffect, useRef, useState, useCallback, memo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
import { Billboard } from '@/types'
import { MapPosition, OSM_TILE_LAYERS } from '@/types/map'
import { createInfoWindowContent, createMarkerIcon, getDaysRemaining } from '@/hooks/useMapMarkers'

interface LeafletMapProps {
  billboards: Billboard[]
  selectedBillboards?: Set<string>
  onToggleSelection?: (billboardId: string) => void
  onSelectMultiple?: (billboardIds: string[]) => void
  onImageView: (imageUrl: string) => void
  mapStyle: string
  isDrawingMode: boolean
  drawingPoints: MapPosition[]
  onDrawingPointAdd: (point: MapPosition) => void
  onMapReady: () => void
  showNotification: (message: string, type: 'select' | 'deselect') => void
  targetLocation?: { lat: number; lng: number; zoom?: number; boundary?: { north: number; south: number; east: number; west: number }; placeName?: string } | null
  onTargetLocationReached?: () => void
  userLocation?: { lat: number; lng: number } | null
  navigationRoute?: { lat: number; lng: number }[]
  navigationCurrentIndex?: number
  liveTrackingLocation?: { lat: number; lng: number } | null
  recordedRoute?: { lat: number; lng: number; timestamp: number }[]
  visitedBillboards?: Set<string>
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
  userLocation,
  navigationRoute,
  navigationCurrentIndex,
  liveTrackingLocation,
  recordedRoute,
  visitedBillboards
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
  const routeLayerRef = useRef<L.Polyline | null>(null)
  const routeMarkersRef = useRef<L.Marker[]>([])
  const liveMarkerRef = useRef<L.Marker | null>(null)
  const recordedRouteLayerRef = useRef<L.Polyline | null>(null)
  const recordedRouteGlowRef = useRef<L.Polyline | null>(null)
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
      maxZoom: 20,
      minZoom: 5
    })

    mapRef.current = map
    // Store in container element for external access
    if (mapContainerRef.current) {
      ;(mapContainerRef.current as any)._leafletMap = map
    }

    // Add initial tile layer - Google Hybrid as default
    const tileConfig = OSM_TILE_LAYERS['google-hybrid'] || OSM_TILE_LAYERS.satellite
    tileLayerRef.current = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom || 20
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
                    <stop offset="0%" style="stop-color:#4338ca;stop-opacity:1"/>
                    <stop offset="100%" style="stop-color:#1e1b4b;stop-opacity:1"/>
                  </linearGradient>
                </defs>
                <circle cx="25" cy="25" r="23" fill="url(#clusterGrad)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
                <circle cx="25" cy="25" r="17" fill="#0f0e2a"/>
                <circle cx="25" cy="25" r="17" fill="none" stroke="rgba(99,102,241,0.4)" stroke-width="1"/>
              </svg>
              <div style="
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #a5b4fc;
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
    mapRef.current.removeLayer(tileLayerRef.current)
    if (labelLayerRef.current) {
      mapRef.current.removeLayer(labelLayerRef.current)
      labelLayerRef.current = null
    }

    // Get tile config by layer ID
    const tileConfig = OSM_TILE_LAYERS[mapStyle] || OSM_TILE_LAYERS['google-hybrid']

    tileLayerRef.current = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom || 20
    }).addTo(mapRef.current)

    // Add labels layer for hybrid modes if available
    if (tileConfig.labels) {
      labelLayerRef.current = L.tileLayer(tileConfig.labels, {
        maxZoom: 20
      }).addTo(mapRef.current)
    }
  }, [mapStyle])

  // Debounce marker updates for better performance
  const updateMarkersTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  
  // Update markers when billboards or selection changes (debounced)
  useEffect(() => {
    if (!mapRef.current || !clusterGroupRef.current || !isReady) return

    // Clear any pending update
    if (updateMarkersTimeoutRef.current) {
      clearTimeout(updateMarkersTimeoutRef.current)
    }
    
    // Debounce marker updates
    updateMarkersTimeoutRef.current = setTimeout(() => {
      if (!mapRef.current || !clusterGroupRef.current) return
      
      // Clear existing markers
      clusterGroupRef.current.clearLayers()
      
      // Remove selected markers from previous render
      if ((mapRef.current as any)._selectedMarkers) {
        (mapRef.current as any)._selectedMarkers.forEach((m: L.Marker) => m.remove())
      }
      (mapRef.current as any)._selectedMarkers = []

      // Add billboard markers
      billboards.forEach((billboard) => {
        const coords = billboard.coordinates.split(",").map((coord) => Number.parseFloat(coord.trim()))
        if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return

        const [lat, lng] = coords
        const isSelected = selectedBillboards?.has(billboard.id) || false
        const isVisited = visitedBillboards?.has(billboard.id) || false
        
        // Use unified pin design from useMapMarkers
        const days = getDaysRemaining(billboard.expiryDate || null)
        const markerIcon = createMarkerIcon(billboard.size, billboard.status, isSelected, days)

        const icon = L.icon({
          iconUrl: markerIcon.url,
          iconSize: [markerIcon.size.width, markerIcon.size.height],
          iconAnchor: [markerIcon.anchor.x, markerIcon.anchor.y],
          popupAnchor: [0, -markerIcon.size.height + 5]
        })

        const marker = L.marker([lat, lng], {
          icon,
          title: billboard.name,
          zIndexOffset: isSelected ? 2000 : (isVisited ? 10 : 0),
          riseOnHover: true,
          opacity: isVisited ? 0.5 : 1  // تخفيت العلامات التي تم المرور بها
        })

        // Create popup content (click only - no hover tooltip)
        const popupContent = createInfoWindowContent(billboard)
        marker.bindPopup(popupContent, { 
          className: 'leaflet-popup-dark',
          maxWidth: 280,
          minWidth: 260,
          offset: [0, -10],
          autoPan: true,
          autoPanPadding: L.point(40, 40)
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

        // Selected markers are added directly to map (not clustered)
        if (isSelected) {
          marker.addTo(mapRef.current!)
          ;(mapRef.current as any)._selectedMarkers.push(marker)
        } else {
          clusterGroupRef.current?.addLayer(marker)
        }
      })
    }, 50)
    
    return () => {
      if (updateMarkersTimeoutRef.current) {
        clearTimeout(updateMarkersTimeoutRef.current)
      }
    }
  }, [billboards, selectedBillboards, visitedBillboards, isReady, onToggleSelection, showNotification])

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

  // Listen for image view and selection events
  useEffect(() => {
    const handleShowImage = (event: any) => {
      onImageView(event.detail)
    }
    
    const handleToggleSelection = (event: any) => {
      const billboardId = event.detail
      if (billboardId && onToggleSelection) {
        const billboard = billboards.find(b => b.id === billboardId)
        const wasSelected = selectedBillboards?.has(billboardId) || false
        onToggleSelection(billboardId)
        if (billboard) {
          showNotification(
            wasSelected ? `تم إلغاء تحديد: ${billboard.name}` : `تم تحديد: ${billboard.name}`,
            wasSelected ? 'deselect' : 'select'
          )
        }
      }
    }

    document.addEventListener("showBillboardImage", handleShowImage)
    document.addEventListener("toggleBillboardSelection", handleToggleSelection)
    
    return () => {
      document.removeEventListener("showBillboardImage", handleShowImage)
      document.removeEventListener("toggleBillboardSelection", handleToggleSelection)
    }
  }, [onImageView, onToggleSelection, billboards, selectedBillboards, showNotification])

  // Listen for open billboard info window events (from LiveTrackingMode)
  useEffect(() => {
    const handleOpenInfoWindow = (event: any) => {
      const billboardId = event.detail
      if (!billboardId || !mapRef.current) return
      
      // Find the billboard
      const billboard = billboards.find(b => b.id === billboardId)
      if (!billboard) return
      
      const coords = billboard.coordinates.split(",").map((coord) => Number.parseFloat(coord.trim()))
      if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return
      
      const [lat, lng] = coords
      
      // إغلاق أي نافذة مفتوحة أولاً
      mapRef.current.closePopup()
      
      // Create and open popup
      const popupContent = createInfoWindowContent(billboard)
      L.popup({ className: 'leaflet-popup-dark', maxWidth: 280, minWidth: 260, offset: [0, -35], autoPan: true, autoPanPadding: L.point(40, 40) })
        .setLatLng([lat, lng])
        .setContent(popupContent)
        .openOn(mapRef.current)
      
      // Pan to the billboard
      mapRef.current.panTo([lat, lng])
    }
    
    const handleCloseInfoWindow = () => {
      if (mapRef.current) {
        mapRef.current.closePopup()
      }
    }

    document.addEventListener("openBillboardInfoWindow", handleOpenInfoWindow)
    document.addEventListener("closeBillboardInfoWindow", handleCloseInfoWindow)
    
    return () => {
      document.removeEventListener("openBillboardInfoWindow", handleOpenInfoWindow)
      document.removeEventListener("closeBillboardInfoWindow", handleCloseInfoWindow)
    }
  }, [billboards])

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

  // Handle navigation route line
  useEffect(() => {
    if (!mapRef.current || !isReady) return

    // Clear previous route
    if (routeLayerRef.current) {
      mapRef.current.removeLayer(routeLayerRef.current)
      routeLayerRef.current = null
    }
    routeMarkersRef.current.forEach(marker => {
      if (mapRef.current) mapRef.current.removeLayer(marker)
    })
    routeMarkersRef.current = []

    // Draw new route if available
    if (navigationRoute && navigationRoute.length >= 2) {
      // Create gradient-like polyline with multiple layers
      const routeCoords = navigationRoute.map(p => [p.lat, p.lng] as L.LatLngTuple)
      
      // Shadow layer
      L.polyline(routeCoords, {
        color: '#000',
        weight: 10,
        opacity: 0.2,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(mapRef.current)
      
      // Main route line with glow effect
      L.polyline(routeCoords, {
        color: '#d4af37',
        weight: 8,
        opacity: 0.4,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(mapRef.current)
      
      // Main route line
      routeLayerRef.current = L.polyline(routeCoords, {
        color: '#d4af37',
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: navigationCurrentIndex !== undefined && navigationCurrentIndex > 0 ? undefined : '12, 8'
      }).addTo(mapRef.current)

      // Add route point markers
      navigationRoute.forEach((point, index) => {
        if (index === 0 && !liveTrackingLocation) return // Skip start if we have live tracking
        
        const isCompleted = navigationCurrentIndex !== undefined && index < navigationCurrentIndex
        const isCurrent = navigationCurrentIndex !== undefined && index === navigationCurrentIndex
        const isEnd = index === navigationRoute.length - 1
        
        let markerColor = '#d4af37'
        let markerSize = 24
        let markerLabel = String(index)
        
        if (isCompleted) {
          markerColor = '#22c55e'
          markerLabel = '✓'
        } else if (isCurrent) {
          markerColor = '#f59e0b'
          markerSize = 28
        } else if (isEnd) {
          markerColor = '#ef4444'
          markerLabel = '🏁'
        }
        
        const routeMarkerIcon = L.divIcon({
          className: 'route-point-marker',
          html: `
            <div style="
              position: relative;
              width: ${markerSize}px;
              height: ${markerSize}px;
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
            ">
              <div style="
                position: absolute;
                inset: 0;
                background: ${markerColor};
                border-radius: 50%;
                border: 3px solid #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                font-size: ${isEnd ? '12px' : '10px'};
                font-weight: 700;
                font-family: 'Manrope', sans-serif;
                ${isCurrent ? 'animation: pulse-route 1.5s infinite;' : ''}
              ">${markerLabel}</div>
            </div>
          `,
          iconSize: [markerSize, markerSize],
          iconAnchor: [markerSize / 2, markerSize / 2]
        })
        
        const routeMarker = L.marker([point.lat, point.lng], {
          icon: routeMarkerIcon,
          zIndexOffset: isCompleted ? 500 : isCurrent ? 1000 : 600
        }).addTo(mapRef.current!)
        
        routeMarkersRef.current.push(routeMarker)
      })
      
      // Fit map to route bounds
      if (navigationRoute.length > 1) {
        const bounds = L.latLngBounds(routeCoords)
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
      }
    }
  }, [navigationRoute, navigationCurrentIndex, isReady, liveTrackingLocation])

  // Handle live tracking location (GTA-style directional marker)
  useEffect(() => {
    if (!mapRef.current || !isReady) return

    // Remove previous live marker
    if (liveMarkerRef.current) {
      mapRef.current.removeLayer(liveMarkerRef.current)
      liveMarkerRef.current = null
    }

    if (liveTrackingLocation && typeof liveTrackingLocation.lat === 'number' && typeof liveTrackingLocation.lng === 'number' && isFinite(liveTrackingLocation.lat) && isFinite(liveTrackingLocation.lng)) {
      const heading = (liveTrackingLocation as any).heading || 0
      
      // Create GTA-style navigation marker with direction arrow
      const liveIcon = L.divIcon({
        className: 'live-tracking-marker-hud',
        html: `
          <div style="
            position: relative;
            width: 80px;
            height: 80px;
          ">
            <!-- Triple pulse rings -->
            <div class="hud-pulse" style="position:absolute; inset:0; border:2px solid #06b6d4; border-radius:50%; animation: hud-pulse-ring 2.4s cubic-bezier(0.4,0,0.2,1) infinite;"></div>
            <div class="hud-pulse" style="position:absolute; inset:0; border:2px solid #06b6d4; border-radius:50%; animation: hud-pulse-ring 2.4s cubic-bezier(0.4,0,0.2,1) infinite; animation-delay: 0.8s;"></div>
            <div class="hud-pulse" style="position:absolute; inset:0; border:2px solid #06b6d4; border-radius:50%; animation: hud-pulse-ring 2.4s cubic-bezier(0.4,0,0.2,1) infinite; animation-delay: 1.6s;"></div>

            <!-- Direction cone -->
            <div style="position:absolute; top:50%; left:50%; transform: translate(-50%,-50%) rotate(${heading}deg); width:80px; height:80px; pointer-events:none;">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <defs>
                  <radialGradient id="cone-grad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stop-color="rgba(6,182,212,0.7)"/>
                    <stop offset="100%" stop-color="rgba(6,182,212,0)"/>
                  </radialGradient>
                </defs>
                <path d="M40 40 L20 8 Q40 0 60 8 Z" fill="url(#cone-grad)"/>
              </svg>
            </div>

            <!-- Core marker -->
            <div style="
              position:absolute; top:50%; left:50%;
              transform: translate(-50%,-50%);
              width:28px; height:28px;
              background: radial-gradient(circle at 35% 30%, #67e8f9, #0891b2);
              border: 3px solid #fff;
              border-radius:50%;
              box-shadow: 0 0 20px rgba(6,182,212,0.8), 0 4px 12px rgba(0,0,0,0.4);
              z-index: 10;
            ">
              <div style="
                position:absolute; inset:3px;
                background: rgba(255,255,255,0.25);
                border-radius:50%;
              "></div>
            </div>

            <!-- Heading arrow on top -->
            <div style="
              position:absolute; top:50%; left:50%;
              transform: translate(-50%, -50%) rotate(${heading}deg) translateY(-22px);
              z-index: 11;
              pointer-events: none;
            ">
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M7 0 L13 12 L7 9 L1 12 Z" fill="#fff" stroke="#0891b2" stroke-width="1" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [80, 80],
        iconAnchor: [40, 40]
      })

      liveMarkerRef.current = L.marker([liveTrackingLocation.lat, liveTrackingLocation.lng], {
        icon: liveIcon,
        zIndexOffset: 3000
      }).addTo(mapRef.current)

      // Smooth pan to live location
      mapRef.current.panTo([liveTrackingLocation.lat, liveTrackingLocation.lng], {
        animate: true,
        duration: 0.3
      })
    }
  }, [liveTrackingLocation, isReady])

  // Handle recorded route line with animated glow effect
  useEffect(() => {
    if (!mapRef.current || !isReady) return

    // Remove previous recorded route lines
    if (recordedRouteLayerRef.current) {
      mapRef.current.removeLayer(recordedRouteLayerRef.current)
      recordedRouteLayerRef.current = null
    }
    if (recordedRouteGlowRef.current) {
      mapRef.current.removeLayer(recordedRouteGlowRef.current)
      recordedRouteGlowRef.current = null
    }

    if (recordedRoute && recordedRoute.length > 1) {
      const routeCoords: L.LatLngExpression[] = recordedRoute.map(point => [point.lat, point.lng])
      
      // Layer 1: Outer cyan glow
      recordedRouteGlowRef.current = L.polyline(routeCoords, {
        color: '#06b6d4',
        weight: 14,
        opacity: 0.25,
        smoothFactor: 1,
        lineCap: 'round',
        lineJoin: 'round',
        className: 'recorded-route-glow'
      }).addTo(mapRef.current)
      
      // Layer 2: Main route line with animated dash flow
      recordedRouteLayerRef.current = L.polyline(routeCoords, {
        color: '#67e8f9',
        weight: 5,
        opacity: 0.95,
        smoothFactor: 1,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: '10 6',
        className: 'recorded-route-animated'
      }).addTo(mapRef.current)
    }
  }, [recordedRoute, isReady])

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

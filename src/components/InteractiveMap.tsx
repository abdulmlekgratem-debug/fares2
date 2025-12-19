import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Billboard } from "@/types"
import { MapPin, Layers, ZoomIn, ZoomOut, Clock, Download, PenTool, X, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface InteractiveMapProps {
  billboards: Billboard[]
  onImageView: (imageUrl: string) => void
  selectedBillboards?: Set<string>
  onToggleSelection?: (billboardId: string) => void
  onSelectMultiple?: (billboardIds: string[]) => void
  onDownloadSelected?: () => void
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

// Distinct colors for each size category - more visible and contrasting
const sizeColorMap: Record<string, { bg: string, border: string, text: string }> = {}
const colorPalette = [
  { bg: "#ef4444", border: "#fca5a5", text: "#fff" },  // Red
  { bg: "#f97316", border: "#fdba74", text: "#fff" },  // Orange
  { bg: "#eab308", border: "#fde047", text: "#000" },  // Yellow
  { bg: "#22c55e", border: "#86efac", text: "#fff" },  // Green
  { bg: "#06b6d4", border: "#67e8f9", text: "#fff" },  // Cyan
  { bg: "#3b82f6", border: "#93c5fd", text: "#fff" },  // Blue
  { bg: "#8b5cf6", border: "#c4b5fd", text: "#fff" },  // Purple
  { bg: "#ec4899", border: "#f9a8d4", text: "#fff" },  // Pink
  { bg: "#14b8a6", border: "#5eead4", text: "#fff" },  // Teal
  { bg: "#f43f5e", border: "#fda4af", text: "#fff" },  // Rose
]

const getSizeColor = (size: string): { bg: string, border: string, text: string } => {
  if (!sizeColorMap[size]) {
    let hash = 0
    for (let i = 0; i < size.length; i++) {
      hash = size.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % colorPalette.length
    sizeColorMap[size] = colorPalette[index]
  }
  return sizeColorMap[size]
}

// Create glass-effect pin SVG with size color and status indicator
const createPinIcon = (size: string, status: string, isSelected: boolean = false) => {
  const colors = getSizeColor(size)
  const statusColor = status === "متاح" ? "#10b981" : status === "قريباً" ? "#f59e0b" : "#ef4444"
  const selectedGlow = isSelected ? `<circle cx="30" cy="30" r="32" fill="none" stroke="#d4af37" stroke-width="4" stroke-dasharray="8 4">
    <animateTransform attributeName="transform" type="rotate" from="0 30 30" to="360 30 30" dur="8s" repeatCount="indefinite"/>
  </circle>
  <circle cx="30" cy="30" r="36" fill="none" stroke="#d4af37" stroke-width="2" opacity="0.5">
    <animate attributeName="r" values="36;42;36" dur="1.5s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.5;0.2;0.5" dur="1.5s" repeatCount="indefinite"/>
  </circle>` : ''
  
  const pinSize = isSelected ? 72 : 56
  const scale = isSelected ? 1.2 : 1
  
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${pinSize + 20}" height="${pinSize + 30}" viewBox="0 0 ${pinSize + 20} ${pinSize + 30}">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="${isSelected ? 6 : 4}" flood-color="${isSelected ? '#d4af37' : '#000'}" flood-opacity="${isSelected ? 0.6 : 0.4}"/>
          </filter>
          <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1"/>
            <stop offset="50%" style="stop-color:${colors.bg};stop-opacity:0.9"/>
            <stop offset="100%" style="stop-color:${colors.bg};stop-opacity:0.8"/>
          </linearGradient>
          <linearGradient id="glassShine" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:white;stop-opacity:0.6"/>
            <stop offset="50%" style="stop-color:white;stop-opacity:0.15"/>
            <stop offset="100%" style="stop-color:white;stop-opacity:0"/>
          </linearGradient>
          ${isSelected ? `<filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>` : ''}
        </defs>
        <g transform="translate(10, 5)">
          ${selectedGlow}
          <!-- Pin shape with glass effect -->
          <path filter="url(#shadow)" d="M${pinSize/2} 2C${pinSize*0.242} 2 2 ${pinSize*0.242} 2 ${pinSize/2}c0 ${pinSize*0.367} ${pinSize/2 - 2} ${pinSize*0.733} ${pinSize/2 - 2} ${pinSize*0.733}s${pinSize/2 - 2}-${pinSize*0.367} ${pinSize/2 - 2}-${pinSize*0.733}C${pinSize - 2} ${pinSize*0.242} ${pinSize*0.758} 2 ${pinSize/2} 2z" 
                fill="url(#glassGrad)" 
                stroke="${isSelected ? '#d4af37' : colors.border}" 
                stroke-width="${isSelected ? 4 : 3}"
                ${isSelected ? 'filter="url(#glow)"' : ''}/>
          <!-- Glass shine overlay -->
          <ellipse cx="${pinSize*0.37}" cy="${pinSize*0.3}" rx="${pinSize*0.2}" ry="${pinSize*0.133}" fill="url(#glassShine)" opacity="0.6"/>
          <!-- Inner circle -->
          <circle cx="${pinSize/2}" cy="${pinSize*0.467}" r="${pinSize*0.3}" fill="rgba(26,26,46,0.9)" stroke="${isSelected ? '#d4af37' : colors.border}" stroke-width="2"/>
          <!-- Status indicator with glow -->
          <circle cx="${pinSize/2}" cy="${pinSize*0.467}" r="${pinSize*0.117}" fill="${statusColor}" stroke="white" stroke-width="2">
            <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite"/>
          </circle>
          ${isSelected ? `
          <!-- Selected checkmark -->
          <circle cx="${pinSize*0.75}" cy="${pinSize*0.2}" r="10" fill="#d4af37" stroke="#1a1a2e" stroke-width="2">
            <animate attributeName="r" values="10;12;10" dur="1s" repeatCount="indefinite"/>
          </circle>
          <path d="M${pinSize*0.75 - 4} ${pinSize*0.2} l3 3 l6 -6" fill="none" stroke="#1a1a2e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          ` : ''}
        </g>
      </svg>
    `)}`,
    scaledSize: new window.google.maps.Size(pinSize + 20, pinSize + 30),
    anchor: new window.google.maps.Point((pinSize + 20) / 2, pinSize + 25),
    labelOrigin: new window.google.maps.Point((pinSize + 20) / 2, pinSize + 5)
  }
}

// Create simple circular cluster icon - fast and clean
const createClusterIcon = (count: number) => {
  const size = Math.min(44 + Math.log10(count + 1) * 10, 56)
  
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#d4af37" stroke="#1a1a2e" stroke-width="2"/>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 8}" fill="#1a1a2e"/>
    </svg>
  `)}`
}

// Store current open InfoWindow to close when clicking map
let currentInfoWindow: any = null

export default function InteractiveMap({ billboards, onImageView, selectedBillboards, onToggleSelection, onSelectMultiple, onDownloadSelected }: InteractiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const clustererRef = useRef<any>(null)
  const drawingPolygonRef = useRef<any>(null)
  const drawingPathRef = useRef<{ lat: number; lng: number }[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapStyle, setMapStyle] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap')
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [drawingPoints, setDrawingPoints] = useState<{ lat: number; lng: number }[]>([])
  
  const selectedCount = selectedBillboards?.size || 0

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
        // Mobile-optimized map settings
        const isMobile = window.innerWidth < 768
        
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 32.7, lng: 13.2 },
          zoom: isMobile ? 7 : 8,
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
          // Mobile performance optimizations
          maxZoom: 18,
          minZoom: 5,
          clickableIcons: false, // Disable clickable POIs for better performance
          disableDoubleClickZoom: isMobile, // Prevent accidental zooms on mobile
        })

        mapInstanceRef.current = map
        setMapLoaded(true)
        
        // Close InfoWindow when clicking on map
        map.addListener("click", () => {
          if (currentInfoWindow) {
            currentInfoWindow.close()
            currentInfoWindow = null
          }
        })

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
      const daysRemaining = getDaysRemaining(billboard.expiryDate)
      const sizeColor = getSizeColor(billboard.size)

      const isSelected = selectedBillboards?.has(billboard.id) || false
      
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        title: billboard.name,
        icon: createPinIcon(billboard.size, billboard.status, isSelected),
        label: {
          text: billboard.size,
          color: isSelected ? '#d4af37' : '#fff',
          fontWeight: 'bold',
          fontSize: isSelected ? '11px' : '10px',
          className: 'marker-label'
        },
        optimized: true, // Better performance on mobile
        zIndex: isSelected ? 1000 : 1 // Selected markers on top
      })

      // Format date for display
          const formatExpiryDate = (dateStr: string | null): string => {
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
            return parsedDate.toLocaleDateString('ar-LY', { year: 'numeric', month: 'short', day: 'numeric' })
          }

          const formattedExpiryDate = formatExpiryDate(billboard.expiryDate)

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 0; font-family: 'Manrope', 'Tajawal', sans-serif; direction: rtl; width: 280px; background: linear-gradient(145deg, #1a1a2e, #16162b); border-radius: 14px; overflow: hidden; border: 2px solid ${isSelected ? '#d4af37' : 'transparent'};">
                <!-- Image Section -->
                <div style="position: relative; height: 120px; overflow: hidden;">
                  <img src="${billboard.imageUrl || '/roadside-billboard.png'}" 
                       alt="${billboard.name}" 
                       style="width: 100%; height: 100%; object-fit: cover;"
                       onerror="this.src='https://lh3.googleusercontent.com/d/13yTnaEWp2tFSxCmg8AuXH1e9QvPNMYWq'" />
                  <div style="position: absolute; inset: 0; background: linear-gradient(to top, #1a1a2e, transparent 60%);"></div>
                  
                  <!-- Size Badge with distinct color -->
                  <div style="position: absolute; top: 8px; right: 8px; background: ${sizeColor.bg}; padding: 5px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; color: ${sizeColor.text}; border: 2px solid ${sizeColor.border}; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                    ${billboard.size}
                  </div>
                  
                  <!-- Status Badge -->
                  <div style="position: absolute; bottom: 8px; right: 8px; background: ${billboard.status === 'متاح' ? 'rgba(16,185,129,0.95)' : billboard.status === 'قريباً' ? 'rgba(245,158,11,0.95)' : 'rgba(239,68,68,0.95)'}; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; color: white; display: flex; align-items: center; gap: 4px;">
                    <span style="width: 5px; height: 5px; border-radius: 50%; background: white;"></span>
                    ${billboard.status}
                  </div>
                </div>
                
                <!-- Content Section -->
                <div style="padding: 12px;">
                  <h3 style="font-weight: 700; font-size: 13px; color: #fff; margin-bottom: 6px; line-height: 1.4;">${billboard.name}</h3>
                  
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px; padding: 6px; background: rgba(212,175,55,0.1); border-radius: 8px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <p style="color: #999; font-size: 10px; margin: 0; flex: 1;">${billboard.location}</p>
                  </div>
                  
                  ${billboard.status !== 'متاح' && daysRemaining !== null && daysRemaining > 0 ? `
                    <div style="background: rgba(245,158,11,0.1); padding: 8px; border-radius: 8px; margin-bottom: 8px;">
                      <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 2px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        <span style="font-weight: 700; color: #f59e0b; font-size: 11px;">متبقي ${daysRemaining} يوم</span>
                      </div>
                      <p style="color: #777; font-size: 9px; margin: 0;">تاريخ الإتاحة: ${formattedExpiryDate}</p>
                    </div>
                  ` : ''}
                  
                  <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px;">
                    ${billboard.area ? `<span style="background: rgba(245,158,11,0.15); color: #f59e0b; padding: 3px 8px; border-radius: 5px; font-size: 9px; font-weight: 600;">${billboard.area}</span>` : ''}
                    <span style="background: rgba(212,175,55,0.15); color: #d4af37; padding: 3px 8px; border-radius: 5px; font-size: 9px; font-weight: 600;">${billboard.municipality}</span>
                  </div>
                  
                  <!-- Selection Button -->
                  <button 
                    onclick="window.dispatchEvent(new CustomEvent('toggleBillboardSelection', { detail: '${billboard.id}' }))"
                    style="width: 100%; padding: 10px; border-radius: 10px; border: none; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.3s; ${isSelected 
                      ? 'background: linear-gradient(135deg, #d4af37, #b8860b); color: #1a1a1a;' 
                      : 'background: rgba(212,175,55,0.15); color: #d4af37; border: 1px solid rgba(212,175,55,0.3);'
                    }">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      ${isSelected 
                        ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
                        : '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>'
                      }
                    </svg>
                    ${isSelected ? 'تم الاختيار ✓' : 'اختيار للتحميل'}
                  </button>
                </div>
              </div>
            `,
          })

      marker.addListener("click", () => {
        // Close any previously open InfoWindow
        if (currentInfoWindow) {
          currentInfoWindow.close()
        }
        currentInfoWindow = infoWindow
        infoWindow.open(map, marker)
      })

      markers.push(marker)
      markersRef.current.push(marker)
    })

    if (window.markerClusterer && markers.length > 0) {
      const isMobile = window.innerWidth < 768
      
      clustererRef.current = new window.markerClusterer.MarkerClusterer({
        map,
        markers,
        gridSize: isMobile ? 80 : 60,
        minimumClusterSize: isMobile ? 3 : 2,
        renderer: {
          render: ({ count, position }: any) => {
            const size = Math.min(60 + count * 0.5, 80)
            const displayCount = count > 99 ? '99+' : String(count)
            return new window.google.maps.Marker({
              position,
              icon: {
                url: createClusterIcon(count),
                scaledSize: new window.google.maps.Size(size, size),
                anchor: new window.google.maps.Point(size / 2, size / 2),
                labelOrigin: new window.google.maps.Point(size / 2, size / 2)
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
  }

  useEffect(() => {
    if (mapInstanceRef.current && mapLoaded) {
      addBillboardMarkers(mapInstanceRef.current)
    }
  }, [billboards, mapLoaded, selectedBillboards])

  useEffect(() => {
    const handleShowImage = (event: any) => {
      onImageView(event.detail)
    }

    const handleToggleSelection = (event: any) => {
      if (onToggleSelection) {
        onToggleSelection(event.detail)
        // Refresh markers to update selection state
        if (mapInstanceRef.current) {
          addBillboardMarkers(mapInstanceRef.current)
        }
      }
    }

    document.addEventListener("showBillboardImage", handleShowImage)
    window.addEventListener("toggleBillboardSelection", handleToggleSelection)
    
    return () => {
      document.removeEventListener("showBillboardImage", handleShowImage)
      window.removeEventListener("toggleBillboardSelection", handleToggleSelection)
    }
  }, [onImageView, onToggleSelection])

  // Drawing mode handlers
  const startDrawingMode = useCallback(() => {
    setIsDrawingMode(true)
    setDrawingPoints([])
    if (drawingPolygonRef.current) {
      drawingPolygonRef.current.setMap(null)
      drawingPolygonRef.current = null
    }
  }, [])

  const cancelDrawingMode = useCallback(() => {
    setIsDrawingMode(false)
    setDrawingPoints([])
    if (drawingPolygonRef.current) {
      drawingPolygonRef.current.setMap(null)
      drawingPolygonRef.current = null
    }
  }, [])

  const finishDrawing = useCallback(() => {
    if (drawingPoints.length < 3 || !onSelectMultiple) {
      cancelDrawingMode()
      return
    }

    // Find all billboards inside the polygon
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

  // Check if point is inside polygon
  const isPointInPolygon = (point: { lat: number; lng: number }, polygon: { lat: number; lng: number }[]) => {
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

  // Handle map click for drawing
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return

    const clickListener = mapInstanceRef.current.addListener("click", (e: any) => {
      if (!isDrawingMode) {
        if (currentInfoWindow) {
          currentInfoWindow.close()
          currentInfoWindow = null
        }
        return
      }

      const newPoint = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      const newPoints = [...drawingPoints, newPoint]
      setDrawingPoints(newPoints)

      // Update or create polygon
      if (drawingPolygonRef.current) {
        drawingPolygonRef.current.setPath(newPoints)
      } else if (newPoints.length >= 2) {
        drawingPolygonRef.current = new window.google.maps.Polygon({
          paths: newPoints,
          strokeColor: "#d4af37",
          strokeOpacity: 0.9,
          strokeWeight: 3,
          fillColor: "#d4af37",
          fillOpacity: 0.2,
          map: mapInstanceRef.current,
        })
      }
    })

    return () => {
      window.google?.maps?.event?.removeListener(clickListener)
    }
  }, [mapLoaded, isDrawingMode, drawingPoints])

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
              
              {/* Drawing Mode Button */}
              {!isDrawingMode ? (
                <Button
                  size="icon"
                  variant="secondary"
                  className="w-10 h-10 rounded-xl bg-card/90 backdrop-blur-md border border-border/50 shadow-lg hover:bg-card"
                  onClick={startDrawingMode}
                  title="رسم منطقة للاختيار"
                >
                  <PenTool className="w-5 h-5" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="secondary"
                  className="w-10 h-10 rounded-xl bg-destructive/90 backdrop-blur-md border border-destructive/50 shadow-lg hover:bg-destructive"
                  onClick={cancelDrawingMode}
                  title="إلغاء الرسم"
                >
                  <X className="w-5 h-5 text-destructive-foreground" />
                </Button>
              )}
            </div>

            {/* Drawing Mode Instructions */}
            {isDrawingMode && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg border border-primary-foreground/20 z-10">
                <p className="text-sm font-bold text-primary-foreground text-center mb-2">
                  وضع رسم المنطقة
                </p>
                <p className="text-xs text-primary-foreground/80 text-center mb-2">
                  انقر على الخريطة لرسم نقاط المنطقة ({drawingPoints.length} نقطة)
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-xs"
                    onClick={finishDrawing}
                    disabled={drawingPoints.length < 3}
                  >
                    <CheckCircle2 className="w-4 h-4 ml-1" />
                    تأكيد ({drawingPoints.length >= 3 ? 'جاهز' : `${3 - drawingPoints.length} نقاط متبقية`})
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-primary-foreground hover:bg-primary-foreground/20"
                    onClick={cancelDrawingMode}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            )}

            {/* Selection Counter and Download */}
            {selectedCount > 0 && !isDrawingMode && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg border border-primary/30 z-10 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-foreground">{selectedCount}</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">لوحة مختارة</span>
                </div>
                {onDownloadSelected && (
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={onDownloadSelected}
                  >
                    <Download className="w-4 h-4 ml-1" />
                    تحميل
                  </Button>
                )}
              </div>
            )}

            {/* Legend - Status Colors */}
            <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-md rounded-2xl p-4 border border-border/50 shadow-lg max-h-[300px] overflow-y-auto">
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
              
              {/* Size Colors Legend */}
              <p className="text-xs font-bold text-foreground mb-2 pt-2 border-t border-border/50">ألوان المقاسات</p>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                {Array.from(new Set(billboards.map(b => b.size))).slice(0, 8).map(size => {
                  const colors = getSizeColor(size)
                  return (
                    <div key={size} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span 
                        className="w-4 h-4 rounded shadow-sm" 
                        style={{ backgroundColor: colors.bg, border: `2px solid ${colors.border}` }} 
                      />
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

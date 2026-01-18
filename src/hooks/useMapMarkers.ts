import { useMemo } from 'react'
import { Billboard } from '@/types'
import { MarkerData, MarkerIcon, MapPosition } from '@/types/map'

// Distinct colors for each size category
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

const sizeColorMap: Record<string, { bg: string, border: string, text: string }> = {}

export const getSizeColor = (size: string): { bg: string, border: string, text: string } => {
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

// Helper function to calculate days remaining
export const getDaysRemaining = (expiryDate: string | null): number | null => {
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

// Format date for display
export const formatExpiryDate = (dateStr: string | null): string => {
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

// Cache for pin icons
const pinIconCache: Record<string, { url: string, pinSize: number }> = {}

// Create modern pin SVG URL with elegant design
export const createPinSvgUrl = (size: string, status: string, isSelected: boolean = false) => {
  const cacheKey = `${size}-${status}-${isSelected}`
  if (pinIconCache[cacheKey]) return pinIconCache[cacheKey]
  
  const colors = getSizeColor(size)
  const statusColor = status === "متاح" ? "#10b981" : status === "قريباً" ? "#f59e0b" : "#ef4444"
  const pinSize = isSelected ? 48 : 38
  const w = pinSize + 16
  const h = pinSize + 28
  
  // Elegant modern pin design
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="pinBody${cacheKey.replace(/[^a-zA-Z0-9]/g, '')}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1"/>
        <stop offset="100%" style="stop-color:${adjustColor(colors.bg, -35)};stop-opacity:1"/>
      </linearGradient>
      <filter id="dropShadow${cacheKey.replace(/[^a-zA-Z0-9]/g, '')}" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.35)"/>
      </filter>
      <radialGradient id="statusGlow${cacheKey.replace(/[^a-zA-Z0-9]/g, '')}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:${statusColor};stop-opacity:1"/>
        <stop offset="100%" style="stop-color:${adjustColor(statusColor, -30)};stop-opacity:1"/>
      </radialGradient>
    </defs>
    
    <!-- Shadow ellipse -->
    <ellipse cx="${w/2}" cy="${h-4}" rx="${pinSize*0.35}" ry="4" fill="rgba(0,0,0,0.25)"/>
    
    <!-- Main pin group -->
    <g filter="url(#dropShadow${cacheKey.replace(/[^a-zA-Z0-9]/g, '')})">
      <!-- Pin body - teardrop shape -->
      <path d="M${w/2} ${h-8}
               C${w/2 - 3} ${h-14} ${w/2 - pinSize/2} ${h*0.55} ${w/2 - pinSize/2} ${pinSize/2 + 4}
               A${pinSize/2} ${pinSize/2} 0 1 1 ${w/2 + pinSize/2} ${pinSize/2 + 4}
               C${w/2 + pinSize/2} ${h*0.55} ${w/2 + 3} ${h-14} ${w/2} ${h-8}Z" 
            fill="url(#pinBody${cacheKey.replace(/[^a-zA-Z0-9]/g, '')})"
            stroke="${isSelected ? '#d4af37' : colors.border}"
            stroke-width="${isSelected ? 2.5 : 1.5}"/>
      
      <!-- Status circle -->
      <circle cx="${w/2}" cy="${pinSize/2 + 4}" r="${pinSize*0.32}" 
              fill="url(#statusGlow${cacheKey.replace(/[^a-zA-Z0-9]/g, '')})"
              stroke="rgba(255,255,255,0.35)" 
              stroke-width="1.5"/>
      
      <!-- Highlight shine -->
      <ellipse cx="${w/2 - pinSize*0.15}" cy="${pinSize/2 - 4}" rx="${pinSize*0.12}" ry="${pinSize*0.08}" 
               fill="rgba(255,255,255,0.45)"/>
    </g>
    
    <!-- Selection ring -->
    ${isSelected ? `
      <circle cx="${w/2}" cy="${pinSize/2 + 4}" r="${pinSize*0.45}" 
              fill="none" 
              stroke="#d4af37" 
              stroke-width="2"
              stroke-dasharray="5 3"
              opacity="0.8"/>
    ` : ''}
  </svg>`
  
  const result = {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    pinSize
  }
  
  pinIconCache[cacheKey] = result
  return result
}

// Helper to darken/lighten colors
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount))
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount))
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`
}

// Create marker icon
export const createMarkerIcon = (size: string, status: string, isSelected: boolean = false): MarkerIcon => {
  const { url, pinSize } = createPinSvgUrl(size, status, isSelected)
  const w = pinSize + 16
  const h = pinSize + 28
  
  return {
    url,
    size: { width: w, height: h },
    anchor: { x: w / 2, y: h - 6 },
    labelOrigin: { x: w / 2, y: h + 12 }
  }
}

// Parse billboard coordinates
export const parseBillboardCoordinates = (coordinates: string): MapPosition | null => {
  const coords = coordinates.split(",").map((coord) => Number.parseFloat(coord.trim()))
  if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return null
  return { lat: coords[0], lng: coords[1] }
}

// Hook to prepare marker data
export function useMapMarkers(
  billboards: Billboard[],
  selectedBillboards?: Set<string>
): MarkerData[] {
  return useMemo(() => {
    return billboards
      .map((billboard) => {
        const position = parseBillboardCoordinates(billboard.coordinates)
        if (!position) return null

        const isSelected = selectedBillboards?.has(billboard.id) || false
        const icon = createMarkerIcon(billboard.size, billboard.status, isSelected)

        return {
          id: billboard.id,
          position,
          title: billboard.name,
          icon,
          label: billboard.size,
          zIndex: isSelected ? 1000 : 1,
          data: billboard
        }
      })
      .filter((marker): marker is MarkerData => marker !== null)
  }, [billboards, selectedBillboards])
}

// Create modern info window content with glassmorphism
export const createInfoWindowContent = (billboard: Billboard): string => {
  const daysRemaining = getDaysRemaining(billboard.expiryDate)
  const sizeColor = getSizeColor(billboard.size)
  const formattedExpiryDate = formatExpiryDate(billboard.expiryDate)
  const statusColor = billboard.status === 'متاح' ? '#10b981' : billboard.status === 'قريباً' ? '#f59e0b' : '#ef4444'
  const statusBg = billboard.status === 'متاح' ? 'rgba(16,185,129,0.15)' : billboard.status === 'قريباً' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)'
  
  // Extract coordinates for Google Maps navigation
  const coords = billboard.coordinates.split(",").map((coord) => Number.parseFloat(coord.trim()))
  const hasValidCoords = coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])
  const googleMapsUrl = hasValidCoords 
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords[0]},${coords[1]}&travelmode=driving`
    : '#'

  return `
    <div style="
      font-family: 'Tajawal', 'Manrope', sans-serif; 
      direction: rtl; 
      width: 300px; 
      background: linear-gradient(145deg, rgba(26,26,46,0.98), rgba(20,20,35,0.98));
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 16px; 
      overflow: hidden; 
      border: 1px solid rgba(212,175,55,0.25);
      box-shadow: 
        0 25px 50px -12px rgba(0,0,0,0.6),
        0 0 0 1px rgba(255,255,255,0.05) inset,
        0 1px 0 rgba(255,255,255,0.1) inset;
    ">
      <!-- Image Section with overlay -->
      <div style="
        position: relative; 
        height: 140px; 
        background: linear-gradient(180deg, rgba(26,26,46,0.3), rgba(26,26,46,0.9)); 
        cursor: pointer;
        overflow: hidden;
      " onclick="document.dispatchEvent(new CustomEvent('showBillboardImage', {detail: '${billboard.imageUrl || '/roadside-billboard.png'}'}))">
        <img src="${billboard.imageUrl || '/roadside-billboard.png'}" 
             alt="${billboard.name}" 
             style="
               width: 100%; 
               height: 100%; 
               object-fit: cover;
               transition: transform 0.3s ease;
             "
             onerror="this.src='/roadside-billboard.png'" />
        
        <!-- Gradient overlay -->
        <div style="
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 40%, rgba(26,26,46,0.95) 100%);
          pointer-events: none;
        "></div>
        
        <!-- Zoom icon with modern style -->
        <div style="
          position: absolute; 
          bottom: 12px; 
          left: 12px; 
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px; 
          width: 32px; 
          height: 32px; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          transition: all 0.2s ease;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5">
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>
            <path d="M11 8v6M8 11h6"/>
          </svg>
        </div>
        
        <!-- Size Badge - Modern pill design -->
        <div style="
          position: absolute; 
          top: 12px; 
          right: 12px; 
          background: linear-gradient(135deg, ${sizeColor.bg}, ${adjustColor(sizeColor.bg, -20)});
          padding: 6px 14px; 
          border-radius: 20px; 
          font-size: 12px; 
          font-weight: 800; 
          color: ${sizeColor.text}; 
          letter-spacing: 0.5px;
          box-shadow: 0 4px 15px ${sizeColor.bg}40;
          border: 1px solid ${sizeColor.border};
        ">
          ${billboard.size}
        </div>
        
        <!-- Status Badge - Animated glow -->
        <div style="
          position: absolute; 
          top: 12px; 
          left: 12px; 
          background: ${statusBg};
          backdrop-filter: blur(8px);
          padding: 5px 12px; 
          border-radius: 20px; 
          font-size: 11px; 
          font-weight: 700; 
          color: ${statusColor}; 
          display: flex; 
          align-items: center; 
          gap: 6px;
          border: 1px solid ${statusColor}30;
          box-shadow: 0 0 20px ${statusColor}30;
        ">
          <span style="
            width: 8px; 
            height: 8px; 
            border-radius: 50%; 
            background: ${statusColor};
            box-shadow: 0 0 10px ${statusColor};
          "></span>
          ${billboard.status}
        </div>
      </div>
      
      <!-- Content Section -->
      <div style="padding: 16px;">
        <!-- Name with gold accent -->
        <h3 style="
          font-weight: 800; 
          font-size: 15px; 
          color: #fff; 
          margin: 0 0 12px 0;
          line-height: 1.4;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">${billboard.name}</h3>
        
        <!-- Location card -->
        <div style="
          display: flex; 
          align-items: flex-start; 
          gap: 10px; 
          padding: 12px 14px; 
          background: linear-gradient(135deg, rgba(212,175,55,0.08), rgba(212,175,55,0.03));
          border-radius: 12px;
          margin-bottom: 12px;
          border: 1px solid rgba(212,175,55,0.1);
        ">
          <div style="
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #d4af37, #b8860b);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" stroke-width="2.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <p style="color: #a0a0a0; font-size: 12px; margin: 0; line-height: 1.5; padding-top: 4px;">${billboard.location}</p>
        </div>
        
        ${billboard.status !== 'متاح' && daysRemaining !== null && daysRemaining > 0 ? `
          <!-- Timer with animated border -->
          <div style="
            background: linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05));
            padding: 10px 14px;
            border-radius: 12px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            border: 1px solid rgba(245,158,11,0.2);
          ">
            <div style="
              width: 32px;
              height: 32px;
              background: linear-gradient(135deg, #f59e0b, #d97706);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" stroke-width="2.5">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div>
              <span style="font-weight: 700; color: #f59e0b; font-size: 13px; display: block;">
                متبقي ${daysRemaining} يوم
              </span>
              <span style="color: #a0a0a0; font-size: 10px;">${formattedExpiryDate}</span>
            </div>
          </div>
        ` : ''}
        
        <!-- Tags with modern style -->
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px;">
          ${billboard.area ? `
            <span style="
              background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.05));
              color: #fbbf24; 
              padding: 6px 12px; 
              border-radius: 8px; 
              font-size: 11px; 
              font-weight: 700;
              border: 1px solid rgba(245,158,11,0.15);
            ">${billboard.area}</span>
          ` : ''}
          <span style="
            background: linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.05));
            color: #d4af37; 
            padding: 6px 12px; 
            border-radius: 8px; 
            font-size: 11px; 
            font-weight: 700;
            border: 1px solid rgba(212,175,55,0.15);
          ">${billboard.municipality}</span>
        </div>
        
        <!-- Navigation Button -->
        ${hasValidCoords ? `
          <a href="${googleMapsUrl}" target="_blank" style="
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 12px 16px;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            border-radius: 12px;
            color: #fff;
            font-size: 13px;
            font-weight: 700;
            text-decoration: none;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(59,130,246,0.3);
            border: 1px solid rgba(255,255,255,0.1);
          " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(59,130,246,0.4)'" 
             onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(59,130,246,0.3)'">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="3 11 22 2 13 21 11 13 3 11"/>
            </svg>
            التوجيه إلى الموقع
          </a>
        ` : ''}
      </div>
    </div>
  `
}


// Modern cluster icon with gradient
export const clusterIconUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50">
    <defs>
      <linearGradient id="clusterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#d4af37;stop-opacity:1"/>
        <stop offset="100%" style="stop-color:#b8860b;stop-opacity:1"/>
      </linearGradient>
      <filter id="clusterShadow">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.4)"/>
      </filter>
    </defs>
    <g filter="url(#clusterShadow)">
      <circle cx="25" cy="25" r="22" fill="url(#clusterGrad)"/>
      <circle cx="25" cy="25" r="17" fill="#1a1a2e"/>
      <circle cx="25" cy="25" r="17" fill="none" stroke="rgba(212,175,55,0.3)" stroke-width="1"/>
    </g>
  </svg>
`)}`

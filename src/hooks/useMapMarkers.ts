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

// Create pin SVG URL
export const createPinSvgUrl = (size: string, status: string, isSelected: boolean = false) => {
  const cacheKey = `${size}-${status}-${isSelected}`
  if (pinIconCache[cacheKey]) return pinIconCache[cacheKey]
  
  const colors = getSizeColor(size)
  const statusColor = status === "متاح" ? "#10b981" : status === "قريباً" ? "#f59e0b" : "#ef4444"
  const pinSize = isSelected ? 44 : 32
  const w = pinSize + 8
  const h = pinSize + 14
  
  const result = {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="M${w/2} 3C${w*0.22} 3 3 ${h*0.18} 3 ${h*0.4}c0 ${h*0.28} ${w/2-3} ${h*0.52} ${w/2-3} ${h*0.52}s${w/2-3}-${h*0.24} ${w/2-3}-${h*0.52}C${w-3} ${h*0.18} ${w*0.78} 3 ${w/2} 3z" fill="${colors.bg}" stroke="${isSelected ? '#d4af37' : colors.border}" stroke-width="${isSelected ? 3 : 2}"/><circle cx="${w/2}" cy="${h*0.36}" r="${pinSize*0.22}" fill="${statusColor}"/>${isSelected ? `<circle cx="${w/2}" cy="${h*0.36}" r="${pinSize*0.32}" fill="none" stroke="#d4af37" stroke-width="2"/>` : ''}</svg>`)}`,
    pinSize
  }
  
  pinIconCache[cacheKey] = result
  return result
}

// Create marker icon
export const createMarkerIcon = (size: string, status: string, isSelected: boolean = false): MarkerIcon => {
  const { url, pinSize } = createPinSvgUrl(size, status, isSelected)
  const w = pinSize + 8
  const h = pinSize + 14
  
  return {
    url,
    size: { width: w, height: h },
    anchor: { x: w / 2, y: h - 2 },
    labelOrigin: { x: w / 2, y: h + 8 }
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

// Create info window content
export const createInfoWindowContent = (billboard: Billboard): string => {
  const daysRemaining = getDaysRemaining(billboard.expiryDate)
  const sizeColor = getSizeColor(billboard.size)
  const formattedExpiryDate = formatExpiryDate(billboard.expiryDate)

  return `
    <div style="
      padding: 0; 
      font-family: 'Tajawal', 'Manrope', sans-serif; 
      direction: rtl; 
      width: 260px; 
      background: #1a1a2e;
      border-radius: 12px; 
      overflow: hidden; 
      border: 1px solid rgba(212,175,55,0.2);
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    ">
      <!-- Image Section -->
      <div style="position: relative; height: 110px; background: #1a1a2e; display: flex; align-items: center; justify-content: center; cursor: pointer;" onclick="document.dispatchEvent(new CustomEvent('showBillboardImage', {detail: '${billboard.imageUrl || '/roadside-billboard.png'}'}))">
        <img src="${billboard.imageUrl || '/roadside-billboard.png'}" 
             alt="${billboard.name}" 
             style="max-width: 100%; max-height: 100%; object-fit: contain;"
             onerror="this.src='/roadside-billboard.png'" />
        
        <!-- Zoom icon overlay -->
        <div style="position: absolute; bottom: 6px; left: 6px; background: rgba(0,0,0,0.6); border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            <path d="M11 8v6M8 11h6"/>
          </svg>
        </div>
        
        <!-- Size Badge -->
        <div style="
          position: absolute; 
          top: 6px; 
          right: 6px; 
          background: ${sizeColor.bg};
          padding: 4px 8px; 
          border-radius: 6px; 
          font-size: 10px; 
          font-weight: 700; 
          color: ${sizeColor.text}; 
          border: 1px solid ${sizeColor.border};
        ">
          ${billboard.size}
        </div>
        
        <!-- Status Badge -->
        <div style="
          position: absolute; 
          top: 6px; 
          left: 6px; 
          background: ${billboard.status === 'متاح' ? '#10b981' : billboard.status === 'قريباً' ? '#f59e0b' : '#ef4444'}; 
          padding: 3px 8px; 
          border-radius: 10px; 
          font-size: 9px; 
          font-weight: 600; 
          color: white; 
          display: flex; 
          align-items: center; 
          gap: 4px;
        ">
          <span style="width: 5px; height: 5px; border-radius: 50%; background: white;"></span>
          ${billboard.status}
        </div>
      </div>
      
      <!-- Content Section -->
      <div style="padding: 10px;">
        <!-- Name -->
        <h3 style="
          font-weight: 700; 
          font-size: 12px; 
          color: #fff; 
          margin: 0 0 6px 0;
          line-height: 1.3;
        ">${billboard.name}</h3>
        
        <!-- Location -->
        <div style="
          display: flex; 
          align-items: flex-start; 
          gap: 6px; 
          padding: 6px 8px; 
          background: rgba(212,175,55,0.08);
          border-radius: 6px;
          margin-bottom: 8px;
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <p style="color: #999; font-size: 10px; margin: 0; line-height: 1.4;">${billboard.location}</p>
        </div>
        
        ${billboard.status !== 'متاح' && daysRemaining !== null && daysRemaining > 0 ? `
          <!-- Timer -->
          <div style="
            background: rgba(245,158,11,0.1);
            padding: 6px 8px;
            border-radius: 6px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
          ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span style="font-weight: 600; color: #f59e0b; font-size: 10px;">
              متبقي ${daysRemaining} يوم - ${formattedExpiryDate}
            </span>
          </div>
        ` : ''}
        
        <!-- Tags -->
        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
          ${billboard.area ? `
            <span style="
              background: rgba(245,158,11,0.12);
              color: #fbbf24; 
              padding: 3px 8px; 
              border-radius: 4px; 
              font-size: 9px; 
              font-weight: 600;
            ">${billboard.area}</span>
          ` : ''}
          <span style="
            background: rgba(212,175,55,0.12);
            color: #d4af37; 
            padding: 3px 8px; 
            border-radius: 4px; 
            font-size: 9px; 
            font-weight: 600;
          ">${billboard.municipality}</span>
        </div>
      </div>
    </div>
  `
}

// Cluster icon
export const clusterIconUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#d4af37"/><circle cx="20" cy="20" r="14" fill="#1a1a2e"/></svg>`)}`

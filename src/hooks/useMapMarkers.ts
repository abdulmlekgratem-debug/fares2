import { useMemo } from 'react'
import { Billboard } from '@/types'
import { MarkerData, MarkerIcon, MapPosition } from '@/types/map'

// Clean, modern color palette with good satellite-map contrast
const colorPalette = [
  { main: "#E53935", accent: "#FF5252" },   // Red
  { main: "#1E88E5", accent: "#42A5F5" },   // Blue
  { main: "#43A047", accent: "#66BB6A" },   // Green
  { main: "#8E24AA", accent: "#AB47BC" },   // Purple
  { main: "#F4511E", accent: "#FF7043" },   // Deep Orange
  { main: "#00897B", accent: "#26A69A" },   // Teal
  { main: "#3949AB", accent: "#5C6BC0" },   // Indigo
  { main: "#D81B60", accent: "#EC407A" },   // Pink
  { main: "#6D4C41", accent: "#8D6E63" },   // Brown
  { main: "#00ACC1", accent: "#26C6DA" },   // Cyan
  { main: "#C0CA33", accent: "#D4E157" },   // Lime
  { main: "#FF8F00", accent: "#FFB300" },   // Amber
]

const sizeColorMap: Record<string, typeof colorPalette[0]> = {}

export const getSizeColor = (size: string): { bg: string, border: string, text: string } => {
  if (!sizeColorMap[size]) {
    let hash = 0
    for (let i = 0; i < size.length; i++) {
      hash = size.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % colorPalette.length
    sizeColorMap[size] = colorPalette[index]
  }
  return { bg: sizeColorMap[size].main, border: sizeColorMap[size].accent, text: "#fff" }
}

export const getDaysRemaining = (expiryDate: string | null): number | null => {
  if (!expiryDate) return null
  let parsedDate: Date | null = null
  if (expiryDate.includes('-') && expiryDate.length === 10 && expiryDate.indexOf('-') === 4) {
    const parts = expiryDate.split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0]), month = parseInt(parts[1]) - 1, day = parseInt(parts[2])
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) parsedDate = new Date(year, month, day)
    }
  }
  if (!parsedDate) {
    const parts = expiryDate.split(/[/-]/)
    if (parts.length === 3) {
      const day = parseInt(parts[0]), month = parseInt(parts[1]) - 1, year = parseInt(parts[2])
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 2000) parsedDate = new Date(year, month, day)
    }
  }
  if (!parsedDate || isNaN(parsedDate.getTime())) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.ceil((parsedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export const formatExpiryDate = (dateStr: string | null): string => {
  if (!dateStr) return '-'
  let parsedDate: Date | null = null
  if (dateStr.includes('-') && dateStr.length === 10 && dateStr.indexOf('-') === 4) {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      const y = parseInt(parts[0]), m = parseInt(parts[1]) - 1, d = parseInt(parts[2])
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) parsedDate = new Date(y, m, d)
    }
  }
  if (!parsedDate) {
    const parts = dateStr.split(/[/-]/)
    if (parts.length === 3) {
      const d = parseInt(parts[0]), m = parseInt(parts[1]) - 1, y = parseInt(parts[2])
      if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y > 2000) parsedDate = new Date(y, m, d)
    }
  }
  if (!parsedDate || isNaN(parsedDate.getTime())) return dateStr
  return parsedDate.toLocaleDateString('ar-LY', { year: 'numeric', month: 'short', day: 'numeric' })
}

const pinIconCache: Record<string, { url: string, pinSize: number }> = {}

/**
 * Google Maps-style premium pin — clean teardrop, bold size text, status dot
 * Inspired by real map pin aesthetics: solid color, white inner circle, crisp text
 */
export const createPinSvgUrl = (size: string, status: string, isSelected: boolean = false, daysRemaining?: number | null) => {
  const cacheKey = `${size}-${status}-${isSelected}-${daysRemaining ?? 'x'}-gpin-v1`
  if (pinIconCache[cacheKey]) return pinIconCache[cacheKey]
  
  if (!sizeColorMap[size]) getSizeColor(size)
  const colors = sizeColorMap[size]
  const main = colors.main
  const accent = colors.accent

  const isAvailable = status === "متاح"
  const isSoon = status === "قريباً"
  const statusColor = isAvailable ? "#4CAF50" : isSoon ? "#FF9800" : "#F44336"
  
  const pinH = isSelected ? 56 : 44
  const w = 48
  const h = pinH + 10
  const cx = w / 2
  
  // Pin geometry
  const headR = 16
  const headCy = headR + 4
  const tipY = pinH + 2
  
  const sizeLabel = size.length > 6 ? size.substring(0, 6) : size
  const fontSize = sizeLabel.length > 4 ? 7 : sizeLabel.length > 3 ? 8 : 9.5

  const showDays = isSoon && daysRemaining !== null && daysRemaining !== undefined && daysRemaining > 0 && daysRemaining <= 90

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="p${cacheKey.length}" x1="0.3" y1="0" x2="0.7" y2="1">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="${main}"/>
    </linearGradient>
    <filter id="sh" x="-30%" y="-10%" width="160%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="rgba(0,0,0,0.45)"/>
    </filter>
  </defs>

  <!-- Shadow on ground -->
  <ellipse cx="${cx}" cy="${h - 3}" rx="7" ry="2.5" fill="rgba(0,0,0,0.25)"/>

  ${isAvailable ? `
  <circle cx="${cx}" cy="${headCy}" r="${headR + 4}" fill="none" stroke="${statusColor}" stroke-width="1.5" opacity="0.3">
    <animate attributeName="r" values="${headR + 4};${headR + 16}" dur="1.8s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.4;0" dur="1.8s" repeatCount="indefinite"/>
  </circle>` : ''}

  <g filter="url(#sh)">
    <!-- Teardrop body -->
    <path d="M${cx} ${tipY}
             C${cx - 5} ${tipY - 12}, ${cx - headR - 4} ${headCy + 10}, ${cx - headR - 4} ${headCy}
             A${headR + 4} ${headR + 4} 0 1 1 ${cx + headR + 4} ${headCy}
             C${cx + headR + 4} ${headCy + 10}, ${cx + 5} ${tipY - 12}, ${cx} ${tipY}Z"
          fill="${main}"/>

    <!-- Light side gradient -->
    <path d="M${cx} ${tipY}
             C${cx - 5} ${tipY - 12}, ${cx - headR - 4} ${headCy + 10}, ${cx - headR - 4} ${headCy}
             A${headR + 4} ${headR + 4} 0 0 1 ${cx} ${headCy - headR - 4}
             L${cx} ${tipY}Z"
          fill="${accent}" opacity="0.5"/>

    <!-- Top highlight -->
    <ellipse cx="${cx - 4}" cy="${headCy - 8}" rx="7" ry="4" fill="rgba(255,255,255,0.3)" transform="rotate(-20 ${cx - 4} ${headCy - 8})"/>

    <!-- White inner circle -->
    <circle cx="${cx}" cy="${headCy}" r="${headR * 0.7}" fill="#fff"/>
    
    <!-- Status indicator ring -->
    <circle cx="${cx}" cy="${headCy}" r="${headR * 0.7}" fill="none" stroke="${statusColor}" stroke-width="2" opacity="0.8"/>

    <!-- Size text -->
    <text x="${cx}" y="${headCy + fontSize * 0.35}" text-anchor="middle" 
          font-family="Manrope,Arial,sans-serif" font-size="${fontSize}" font-weight="800" 
          fill="${main}">${sizeLabel}</text>
  </g>

  ${showDays ? `
  <g>
    <rect x="${cx - 14}" y="${tipY - 2}" width="28" height="13" rx="6.5" fill="#FF9800" stroke="#fff" stroke-width="1"/>
    <text x="${cx}" y="${tipY + 8}" text-anchor="middle" font-family="Manrope,sans-serif" font-size="7.5" font-weight="800" fill="#fff">${daysRemaining}d</text>
  </g>` : ''}

  ${isSelected ? `
  <circle cx="${cx}" cy="${headCy}" r="${headR + 8}" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="4 3" opacity="0.9">
    <animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${headCy}" to="360 ${cx} ${headCy}" dur="6s" repeatCount="indefinite"/>
  </circle>
  <circle cx="${cx + headR + 2}" cy="4" r="7" fill="#fff" stroke="${main}" stroke-width="1.5"/>
  <path d="M${cx + headR - 1} 4 l2 2 l3.5 -3.5" stroke="${main}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  ` : ''}
</svg>`

  const result = { url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`, pinSize: pinH }
  pinIconCache[cacheKey] = result
  return result
}

export const createMarkerIcon = (size: string, status: string, isSelected: boolean = false, daysRemaining?: number | null): MarkerIcon => {
  const { url, pinSize } = createPinSvgUrl(size, status, isSelected, daysRemaining)
  const w = 48
  const h = pinSize + 10
  return {
    url,
    size: { width: w, height: h },
    anchor: { x: w / 2, y: h - 3 },
    labelOrigin: { x: w / 2, y: h + 8 }
  }
}

export const parseBillboardCoordinates = (coordinates: string): MapPosition | null => {
  const coords = coordinates.split(",").map((coord) => Number.parseFloat(coord.trim()))
  if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return null
  return { lat: coords[0], lng: coords[1] }
}

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
        const days = getDaysRemaining(billboard.expiryDate || null)
        const icon = createMarkerIcon(billboard.size, billboard.status, isSelected, days)
        return { id: billboard.id, position, title: billboard.name, icon, label: billboard.size, zIndex: isSelected ? 1000 : 1, data: billboard }
      })
      .filter((marker): marker is MarkerData => marker !== null)
  }, [billboards, selectedBillboards])
}

export { createCompactPopupContent as createInfoWindowContent } from '@/components/map/MapPopupContent'

// Cluster icon — gold themed
export const clusterIconUrl = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50">
    <defs><filter id="cs"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.35)"/></filter></defs>
    <g filter="url(#cs)">
      <circle cx="25" cy="25" r="22" fill="#F4511E"/>
      <circle cx="25" cy="25" r="17" fill="#fff"/>
      <ellipse cx="20" cy="18" rx="7" ry="4" fill="rgba(244,81,30,0.08)" transform="rotate(-15,20,18)"/>
    </g>
  </svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
})()
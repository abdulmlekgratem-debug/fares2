// Map Provider Types - Abstraction Layer for Multiple Map Providers

export type MapProvider = 'google' | 'openstreetmap'

export interface MapPosition {
  lat: number
  lng: number
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface MarkerData {
  id: string
  position: MapPosition
  title: string
  icon?: MarkerIcon
  label?: string
  zIndex?: number
  data?: any
}

export interface MarkerIcon {
  url: string
  size: { width: number; height: number }
  anchor: { x: number; y: number }
  labelOrigin?: { x: number; y: number }
}

export interface ClusterOptions {
  gridSize: number
  minimumClusterSize: number
}

export interface MapConfig {
  center: MapPosition
  zoom: number
  minZoom?: number
  maxZoom?: number
  gestureHandling?: 'greedy' | 'cooperative' | 'none'
}

export interface MapStyleOption {
  id: 'roadmap' | 'satellite' | 'hybrid'
  label: string
  labelAr: string
}

export const MAP_STYLES: MapStyleOption[] = [
  { id: 'roadmap', label: 'Map', labelAr: 'خريطة' },
  { id: 'satellite', label: 'Satellite', labelAr: 'القمر الصناعي' },
  { id: 'hybrid', label: 'Hybrid', labelAr: 'هجين' }
]

// Tile layer config type
export interface TileLayerConfig {
  url: string
  attribution: string
  labels?: string
  maxZoom?: number
}

// OpenStreetMap tile providers
export const OSM_TILE_LAYERS: Record<string, TileLayerConfig> = {
  'google-nolabels': {
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    maxZoom: 20
  },
  'google-hybrid': {
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    maxZoom: 20
  },
  standard: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  },
  // mapbox-streets removed
  // Keep aliases for backward compatibility
  satellite: {
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    maxZoom: 20
  },
  hybrid: {
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    maxZoom: 20
  },
  'google-satellite': {
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    maxZoom: 20
  }
}

// Layer display info for selector UI
export interface LayerOption {
  id: string
  label: string
  labelAr: string
  icon: 'satellite' | 'globe' | 'map-pin' | 'map'
  description: string
}

export const LAYER_OPTIONS: LayerOption[] = [
  { id: 'google-nolabels', label: 'Google (No Labels)', labelAr: 'قوقل بدون مسميات', icon: 'satellite', description: 'صور فضائية بدون أسماء' },
  { id: 'google-hybrid', label: 'Google Hybrid', labelAr: 'قوقل هجين', icon: 'globe', description: 'صور فضائية + أسماء الشوارع' },
  { id: 'standard', label: 'OpenStreetMap', labelAr: 'خريطة عادية', icon: 'map-pin', description: 'خريطة الشوارع الكلاسيكية' },
]

export interface MapControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onToggleStyle: () => void
  onToggleProvider: () => void
  currentStyle: string
  currentProvider: MapProvider
  isDrawingMode: boolean
  onStartDrawing: () => void
  onCancelDrawing: () => void
}

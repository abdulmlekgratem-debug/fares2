import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Billboard } from '@/types'

interface ProgressiveMarkersOptions {
  batchSize?: number
  batchDelay?: number
  prioritizeViewport?: boolean
}

interface MarkerBatch {
  billboards: Billboard[]
  loaded: boolean
}

/**
 * Hook for progressive marker loading to improve map performance
 * Loads markers in batches with optional viewport prioritization
 */
export function useProgressiveMarkers(
  billboards: Billboard[],
  options: ProgressiveMarkersOptions = {}
) {
  const {
    batchSize = 50,
    batchDelay = 100,
    prioritizeViewport = true
  } = options

  const [loadedBillboards, setLoadedBillboards] = useState<Billboard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const loadingRef = useRef(false)
  const cancelRef = useRef(false)

  // Parse coordinates once and cache
  const billboardsWithCoords = useMemo(() => {
    return billboards.map(b => {
      const coords = b.coordinates.split(",").map(c => Number.parseFloat(c.trim()))
      return {
        billboard: b,
        lat: coords[0] || 0,
        lng: coords[1] || 0,
        valid: coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])
      }
    }).filter(b => b.valid)
  }, [billboards])

  // Sort billboards by distance from center (Libya center)
  const sortedBillboards = useMemo(() => {
    if (!prioritizeViewport) return billboardsWithCoords.map(b => b.billboard)
    
    const centerLat = 32.7
    const centerLng = 13.2
    
    return [...billboardsWithCoords]
      .sort((a, b) => {
        const distA = Math.sqrt(
          Math.pow(a.lat - centerLat, 2) + Math.pow(a.lng - centerLng, 2)
        )
        const distB = Math.sqrt(
          Math.pow(b.lat - centerLat, 2) + Math.pow(b.lng - centerLng, 2)
        )
        return distA - distB
      })
      .map(b => b.billboard)
  }, [billboardsWithCoords, prioritizeViewport])

  // Load billboards in batches
  const loadBatches = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    cancelRef.current = false
    setIsLoading(true)
    setLoadedBillboards([])
    setProgress(0)

    const total = sortedBillboards.length
    let loaded: Billboard[] = []

    for (let i = 0; i < total; i += batchSize) {
      if (cancelRef.current) break
      
      const batch = sortedBillboards.slice(i, i + batchSize)
      loaded = [...loaded, ...batch]
      
      setLoadedBillboards([...loaded])
      setProgress(Math.min(100, Math.round((loaded.length / total) * 100)))
      
      // Small delay between batches to allow UI to breathe
      if (i + batchSize < total) {
        await new Promise(resolve => setTimeout(resolve, batchDelay))
      }
    }

    setIsLoading(false)
    loadingRef.current = false
  }, [sortedBillboards, batchSize, batchDelay])

  // Start loading when billboards change
  useEffect(() => {
    cancelRef.current = true
    loadingRef.current = false
    
    // Small delay to cancel any pending operations
    const timeout = setTimeout(() => {
      loadBatches()
    }, 50)

    return () => {
      clearTimeout(timeout)
      cancelRef.current = true
    }
  }, [loadBatches])

  // Get billboards in current viewport (for external use)
  const getBillboardsInViewport = useCallback((
    bounds: { north: number; south: number; east: number; west: number }
  ) => {
    return billboardsWithCoords
      .filter(b => 
        b.lat <= bounds.north &&
        b.lat >= bounds.south &&
        b.lng <= bounds.east &&
        b.lng >= bounds.west
      )
      .map(b => b.billboard)
  }, [billboardsWithCoords])

  return {
    loadedBillboards,
    isLoading,
    progress,
    totalCount: billboards.length,
    loadedCount: loadedBillboards.length,
    getBillboardsInViewport
  }
}

/**
 * Hook for debounced marker updates
 */
export function useDebouncedMarkerUpdate<T>(
  value: T,
  delay: number = 150
): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook for tracking visible markers in viewport
 */
export function useViewportMarkers(
  map: any,
  billboards: Billboard[],
  mapProvider: 'google' | 'openstreetmap'
) {
  const [visibleBillboards, setVisibleBillboards] = useState<Billboard[]>([])
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // Parse coordinates once
  const billboardsWithCoords = useMemo(() => {
    return billboards.map(b => {
      const coords = b.coordinates.split(",").map(c => Number.parseFloat(c.trim()))
      return {
        billboard: b,
        lat: coords[0] || 0,
        lng: coords[1] || 0,
        valid: coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])
      }
    }).filter(b => b.valid)
  }, [billboards])

  const updateVisibleBillboards = useCallback(() => {
    if (!map) return

    let bounds: { north: number; south: number; east: number; west: number }

    if (mapProvider === 'google' && window.google?.maps) {
      const mapBounds = map.getBounds()
      if (!mapBounds) return
      
      const ne = mapBounds.getNorthEast()
      const sw = mapBounds.getSouthWest()
      bounds = {
        north: ne.lat(),
        south: sw.lat(),
        east: ne.lng(),
        west: sw.lng()
      }
    } else if (mapProvider === 'openstreetmap') {
      const mapBounds = map.getBounds()
      if (!mapBounds) return
      
      bounds = {
        north: mapBounds.getNorth(),
        south: mapBounds.getSouth(),
        east: mapBounds.getEast(),
        west: mapBounds.getWest()
      }
    } else {
      return
    }

    const visible = billboardsWithCoords
      .filter(b => 
        b.lat <= bounds.north &&
        b.lat >= bounds.south &&
        b.lng <= bounds.east &&
        b.lng >= bounds.west
      )
      .map(b => b.billboard)

    setVisibleBillboards(visible)
  }, [map, mapProvider, billboardsWithCoords])

  // Debounced update on map move
  const scheduleUpdate = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }
    updateTimeoutRef.current = setTimeout(updateVisibleBillboards, 100)
  }, [updateVisibleBillboards])

  useEffect(() => {
    if (!map) return

    if (mapProvider === 'google' && window.google?.maps) {
      const listener = map.addListener('idle', scheduleUpdate)
      updateVisibleBillboards()
      return () => {
        window.google.maps.event.removeListener(listener)
      }
    } else if (mapProvider === 'openstreetmap') {
      map.on('moveend', scheduleUpdate)
      updateVisibleBillboards()
      return () => {
        map.off('moveend', scheduleUpdate)
      }
    }
  }, [map, mapProvider, scheduleUpdate, updateVisibleBillboards])

  return visibleBillboards
}

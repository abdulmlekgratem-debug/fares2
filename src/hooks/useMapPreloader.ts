import { useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    google: any
    initMap: () => void
    MarkerClusterer: any
    __mapPreloaded?: boolean
    __mapLoading?: boolean
  }
}

// Preload Google Maps scripts immediately on page load
const preloadMapsImmediate = () => {
  if (window.__mapPreloaded || window.__mapLoading) return
  window.__mapLoading = true

  // Load both scripts in parallel for faster loading
  const loadGoogleMaps = new Promise<void>((resolve) => {
    if (window.google?.maps) {
      resolve()
      return
    }
    
    window.initMap = () => resolve()
    
    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/gh/somanchiu/Keyless-Google-Maps-API@v7.1/mapsJavaScriptAPI.js"
    script.async = true
    document.head.appendChild(script)
    
    // Fast timeout
    setTimeout(() => resolve(), 3000)
  })

  const loadClusterer = new Promise<void>((resolve) => {
    if (window.MarkerClusterer) {
      resolve()
      return
    }
    
    const script = document.createElement("script")
    script.src = "https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => resolve()
    document.head.appendChild(script)
    
    setTimeout(() => resolve(), 3000)
  })

  // Load both in parallel
  Promise.all([loadGoogleMaps, loadClusterer]).then(() => {
    // Quick poll for google.maps availability
    const checkReady = () => {
      if (window.google?.maps) {
        window.__mapPreloaded = true
        window.__mapLoading = false
      } else {
        setTimeout(checkReady, 25)
      }
    }
    checkReady()
  })
}

// Start preloading immediately when module loads
if (typeof window !== 'undefined') {
  // Use requestIdleCallback for non-blocking load, with fallback
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => preloadMapsImmediate(), { timeout: 100 })
  } else {
    setTimeout(preloadMapsImmediate, 50)
  }
}

export function useMapPreloader() {
  const [isReady, setIsReady] = useState(window.__mapPreloaded || false)
  const checkRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (window.__mapPreloaded) {
      setIsReady(true)
      return
    }

    // Start preloading if not already
    preloadMapsImmediate()

    // Fast polling to detect when ready
    checkRef.current = setInterval(() => {
      if (window.__mapPreloaded) {
        setIsReady(true)
        if (checkRef.current) clearInterval(checkRef.current)
      }
    }, 25)

    return () => {
      if (checkRef.current) clearInterval(checkRef.current)
    }
  }, [])

  return isReady
}

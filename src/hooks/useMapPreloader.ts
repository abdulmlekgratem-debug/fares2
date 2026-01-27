import { useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    google: any
    initMap: () => void
    markerClusterer: any
    __mapPreloaded?: boolean
    __mapLoading?: boolean
  }
}

// Start loading immediately when script is parsed
const preloadMapsImmediate = () => {
  if (window.__mapPreloaded || window.__mapLoading) return
  window.__mapLoading = true

  // Create script elements immediately
  const gmapsScript = document.createElement("script")
  gmapsScript.src = "https://cdn.jsdelivr.net/gh/somanchiu/Keyless-Google-Maps-API@v7.1/mapsJavaScriptAPI.js"
  gmapsScript.async = true
  
  const clustererScript = document.createElement("script")
  clustererScript.src = "https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js"
  clustererScript.async = true

  // Handle Google Maps load
  window.initMap = () => {
    if (window.google?.maps && window.markerClusterer) {
      window.__mapPreloaded = true
      window.__mapLoading = false
    }
  }

  gmapsScript.onload = () => {
    // Poll quickly for google.maps
    const check = setInterval(() => {
      if (window.google?.maps) {
        clearInterval(check)
        if (window.markerClusterer) {
          window.__mapPreloaded = true
          window.__mapLoading = false
        }
      }
    }, 10)
    setTimeout(() => clearInterval(check), 5000)
  }

  clustererScript.onload = () => {
    if (window.google?.maps) {
      window.__mapPreloaded = true
      window.__mapLoading = false
    }
  }

  // Append both scripts immediately
  document.head.appendChild(gmapsScript)
  document.head.appendChild(clustererScript)
}

// Start preloading immediately when module loads - no delay
if (typeof window !== 'undefined') {
  preloadMapsImmediate()
}

export function useMapPreloader() {
  const [isReady, setIsReady] = useState(window.__mapPreloaded || false)
  const checkRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (window.__mapPreloaded) {
      setIsReady(true)
      return
    }

    // Start preloading if not already
    preloadMapsImmediate()

    // Fast polling
    checkRef.current = setInterval(() => {
      if (window.__mapPreloaded || (window.google?.maps && window.markerClusterer)) {
        window.__mapPreloaded = true
        setIsReady(true)
        if (checkRef.current) clearInterval(checkRef.current)
      }
    }, 15)

    return () => {
      if (checkRef.current) clearInterval(checkRef.current)
    }
  }, [])

  return isReady
}

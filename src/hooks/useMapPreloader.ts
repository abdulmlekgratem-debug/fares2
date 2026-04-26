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

/**
 * تحميل خرائط Google فقط عند الحاجة (عند الاقتراب من قسم الخريطة)
 */
const loadMapsScripts = () => {
  if (window.__mapPreloaded || window.__mapLoading) return
  window.__mapLoading = true

  const gmapsScript = document.createElement("script")
  gmapsScript.src = "https://cdn.jsdelivr.net/gh/somanchiu/Keyless-Google-Maps-API@v7.1/mapsJavaScriptAPI.js"
  gmapsScript.async = true

  const clustererScript = document.createElement("script")
  clustererScript.src = "https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js"
  clustererScript.async = true

  window.initMap = () => {
    if (window.google?.maps && window.markerClusterer) {
      window.__mapPreloaded = true
      window.__mapLoading = false
    }
  }

  gmapsScript.onload = () => {
    const check = setInterval(() => {
      if (window.google?.maps) {
        clearInterval(check)
        if (window.markerClusterer) {
          window.__mapPreloaded = true
          window.__mapLoading = false
        }
      }
    }, 50)
    setTimeout(() => clearInterval(check), 10000)
  }

  clustererScript.onload = () => {
    if (window.google?.maps) {
      window.__mapPreloaded = true
      window.__mapLoading = false
    }
  }

  document.head.appendChild(gmapsScript)
  document.head.appendChild(clustererScript)
}

export function useMapPreloader() {
  const [isReady, setIsReady] = useState(window.__mapPreloaded || false)
  const checkRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (window.__mapPreloaded) {
      setIsReady(true)
      return
    }

    // استخدام IntersectionObserver لتحميل الخرائط عند الاقتراب من القسم
    const mapSection = document.getElementById('map-section')
    if (mapSection) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadMapsScripts()
            observerRef.current?.disconnect()
          }
        },
        { rootMargin: '600px' } // تحميل مبكر قبل الوصول بـ 600px
      )
      observerRef.current.observe(mapSection)
    } else {
      // fallback: تحميل بعد 5 ثوانٍ إذا لم يُوجد القسم
      const timer = setTimeout(loadMapsScripts, 5000)
      return () => clearTimeout(timer)
    }

    // مراقبة جاهزية الخرائط
    checkRef.current = setInterval(() => {
      if (window.__mapPreloaded || (window.google?.maps && window.markerClusterer)) {
        window.__mapPreloaded = true
        setIsReady(true)
        if (checkRef.current) clearInterval(checkRef.current)
      }
    }, 100)

    return () => {
      if (checkRef.current) clearInterval(checkRef.current)
      observerRef.current?.disconnect()
    }
  }, [])

  return isReady
}

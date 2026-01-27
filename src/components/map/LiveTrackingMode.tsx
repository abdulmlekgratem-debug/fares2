// Live Tracking Mode - Real-time GPS Navigation
import { useEffect, useState, useCallback, useRef } from 'react'
import { Billboard } from '@/types'
import { MapPin, Navigation, X, Gauge, Eye, Volume2, VolumeX, Locate, ChevronDown, ChevronUp, Moon, Sun, Circle, Share2, Trash2, CheckCircle2, Settings, ZoomOut, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LiveTrackingModeProps {
  isActive: boolean
  onClose: () => void
  billboards: Billboard[]
  onLocationUpdate: (location: { lat: number; lng: number; heading?: number; speed?: number }) => void
  onZoomToLocation: (lat: number, lng: number, zoom: number) => void
  onRequestLocation: () => void
  onRouteUpdate?: (route: RoutePoint[]) => void
  onVisitedBillboardsUpdate?: (visitedIds: Set<string>) => void
  onBillboardSelect?: (billboard: Billboard) => void
}

interface NearbyBillboard {
  billboard: Billboard
  distance: number
  direction: string
}

interface RoutePoint {
  lat: number
  lng: number
  timestamp: number
  speed?: number
}

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000 // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Get direction from heading
const getDirectionFromHeading = (heading: number): string => {
  const directions = ['↑ شمال', '↗ شمال شرق', '→ شرق', '↘ جنوب شرق', '↓ جنوب', '↙ جنوب غرب', '← غرب', '↖ شمال غرب']
  const index = Math.round(((heading % 360) + 360) % 360 / 45) % 8
  return directions[index]
}

// Get relative direction to a point
const getRelativeDirection = (currentLat: number, currentLng: number, targetLat: number, targetLng: number, heading: number): string => {
  const targetAngle = Math.atan2(targetLng - currentLng, targetLat - currentLat) * 180 / Math.PI
  let relativeAngle = targetAngle - heading
  if (relativeAngle < -180) relativeAngle += 360
  if (relativeAngle > 180) relativeAngle -= 360
  
  if (relativeAngle > -45 && relativeAngle <= 45) return 'أمامك ↑'
  if (relativeAngle > 45 && relativeAngle <= 135) return 'يمينك →'
  if (relativeAngle > -135 && relativeAngle <= -45) return 'يسارك ←'
  return 'خلفك ↓'
}

// Format distance
const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)} م`
  return `${(meters / 1000).toFixed(1)} كم`
}

// Format speed
const formatSpeed = (mps: number): string => {
  const kmh = mps * 3.6
  return `${Math.round(kmh)}`
}

export default function LiveTrackingMode({
  isActive,
  onClose,
  billboards,
  onLocationUpdate,
  onZoomToLocation,
  onRequestLocation,
  onRouteUpdate,
  onVisitedBillboardsUpdate,
  onBillboardSelect
}: LiveTrackingModeProps) {
  const [isTracking, setIsTracking] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [heading, setHeading] = useState<number>(0)
  const [speed, setSpeed] = useState<number>(0)
  const [nearbyBillboards, setNearbyBillboards] = useState<NearbyBillboard[]>([])
  const [soundEnabled, setSoundEnabled] = useState(false) // معطل افتراضياً
  const [showNearbyPanel, setShowNearbyPanel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accuracy, setAccuracy] = useState<number>(0)
  const [nightMode, setNightMode] = useState(false)
  
  // Route recording state - المسار يُرسم دائماً أثناء التتبع
  const [isRecording, setIsRecording] = useState(false) // فقط للحفظ/المشاركة
  const [trackPath, setTrackPath] = useState<RoutePoint[]>([]) // المسار الفعلي المعروض دائماً
  const [recordedRoute, setRecordedRoute] = useState<RoutePoint[]>([]) // المسار المحفوظ للمشاركة
  const [visitedBillboards, setVisitedBillboards] = useState<Set<string>>(new Set())
  const [totalDistance, setTotalDistance] = useState<number>(0)
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false)
  const [autoZoomOut, setAutoZoomOut] = useState(false)
  const [autoOpenCards, setAutoOpenCards] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(17)
  
  const watchIdRef = useRef<number | null>(null)
  // التنبيهات تعمل مرة واحدة للجلسة - لا تتكرر أبداً
  const announcedBillboardsRef = useRef<Set<string>>(new Set())
  const vibratedBillboardsRef = useRef<Set<string>>(new Set())
  const lastTrackPointRef = useRef<RoutePoint | null>(null)
  const lastRecordedPointRef = useRef<RoutePoint | null>(null)
  const lastAutoOpenedRef = useRef<string | null>(null)

  // استخدام ref للصوت لتجنب مشاكل useCallback
  const soundEnabledRef = useRef(soundEnabled)
  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  // Play notification sound with billboard info (size and landmark only) - مرة واحدة فقط للجلسة
  const playNotificationSound = useCallback((billboard: Billboard) => {
    // التحقق من تفعيل الصوت أولاً - إذا معطل لا نفعل شيء
    if (!soundEnabledRef.current) return
    
    // التحقق من أنه لم يتم الإعلان عن هذه اللوحة من قبل في هذه الجلسة
    if (announcedBillboardsRef.current.has(billboard.id)) return
    
    // إضافة اللوحة إلى قائمة الإعلانات - لن يتم الإعلان عنها مرة أخرى
    announcedBillboardsRef.current.add(billboard.id)
    
    // إلغاء أي كلام جاري
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
    
    // نطق "اقرب نقطة دالة" + المقاس (استبدال x بـ "في")
    const sizeText = billboard.size ? billboard.size.replace(/x/gi, ' في ') : 'لوحة قريبة'
    const landmarkText = billboard.landmark ? `، اقرب نقطة دالة ${billboard.landmark}` : ''
    const message = `لوحة ${sizeText}${landmarkText}`
    
    const utterance = new SpeechSynthesisUtterance(message)
    utterance.lang = 'ar-SA'
    utterance.rate = 1.0
    utterance.volume = 0.8
    speechSynthesis.speak(utterance)
  }, [])

  // الاهتزاز مرة واحدة فقط للجلسة
  const vibrateOnce = useCallback((billboard: Billboard) => {
    // لا تهتز إذا تم الاهتزاز لهذه اللوحة من قبل
    if (vibratedBillboardsRef.current.has(billboard.id)) return
    vibratedBillboardsRef.current.add(billboard.id)
    
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100])
    }
  }, [])

  // تسجيل نقطة المسار - يعمل دائماً أثناء التتبع (وليس فقط أثناء التسجيل)
  const trackPathPoint = useCallback((lat: number, lng: number, currentSpeed: number) => {
    const newPoint: RoutePoint = {
      lat,
      lng,
      timestamp: Date.now(),
      speed: currentSpeed
    }
    
    // تسجيل أول نقطة فوراً
    if (!lastTrackPointRef.current) {
      lastTrackPointRef.current = newPoint
      setTrackPath(prev => {
        const newPath = [...prev, newPoint]
        onRouteUpdate?.(newPath)
        return newPath
      })
      return
    }
    
    // تسجيل فقط إذا تحركت 5 أمتار على الأقل
    const dist = calculateDistance(
      lastTrackPointRef.current.lat,
      lastTrackPointRef.current.lng,
      lat,
      lng
    )
    
    if (dist < 5) return
    
    setTotalDistance(prev => prev + dist)
    lastTrackPointRef.current = newPoint
    
    setTrackPath(prev => {
      const newPath = [...prev, newPoint]
      onRouteUpdate?.(newPath)
      return newPath
    })
  }, [onRouteUpdate])

  // Update nearby billboards and check for visited ones
  const updateNearbyBillboards = useCallback((lat: number, lng: number, currentHeading: number) => {
    const nearby: NearbyBillboard[] = []
    let closestBillboard: NearbyBillboard | null = null
    
    billboards.forEach(billboard => {
      const coords = billboard.coordinates.split(',').map(c => parseFloat(c.trim()))
      if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return
      
      const distance = calculateDistance(lat, lng, coords[0], coords[1])
      
      // Mark as visited if within 100m (closer = more accurate)
      if (distance <= 100 && !visitedBillboards.has(billboard.id)) {
        setVisitedBillboards(prev => {
          const newSet = new Set(prev)
          newSet.add(billboard.id)
          onVisitedBillboardsUpdate?.(newSet)
          return newSet
        })
        
        // الإعلان عن اللوحة - مرة واحدة فقط للجلسة
        playNotificationSound(billboard)
        vibrateOnce(billboard)
      }
      
      // Only show billboards within 2km
      if (distance <= 2000) {
        const direction = getRelativeDirection(lat, lng, coords[0], coords[1], currentHeading)
        const nearbyItem = { billboard, distance, direction }
        nearby.push(nearbyItem)
        
        // Track closest billboard
        if (!closestBillboard || distance < closestBillboard.distance) {
          closestBillboard = nearbyItem
        }
        
        // الإعلان عند الاقتراب 100م - مرة واحدة فقط للجلسة
        if (distance <= 100) {
          playNotificationSound(billboard)
          vibrateOnce(billboard)
        }
      }
    })
    
    // Auto zoom out when approaching a billboard (within 300m)
    if (autoZoomOut && closestBillboard && closestBillboard.distance <= 300) {
      const targetZoom = 15 // Zoom out to see the billboard better
      if (currentZoom !== targetZoom) {
        setCurrentZoom(targetZoom)
        onZoomToLocation(lat, lng, targetZoom)
      }
    } else if (autoZoomOut && (!closestBillboard || closestBillboard.distance > 500)) {
      // Zoom back in when far from billboards
      const targetZoom = 17
      if (currentZoom !== targetZoom) {
        setCurrentZoom(targetZoom)
        onZoomToLocation(lat, lng, targetZoom)
      }
    }
    
    // Auto open card when approaching a billboard (within 100m)
    if (autoOpenCards && closestBillboard && closestBillboard.distance <= 100) {
      if (lastAutoOpenedRef.current !== closestBillboard.billboard.id) {
        // إغلاق النافذة السابقة أولاً
        if (lastAutoOpenedRef.current) {
          const closeEvent = new CustomEvent('closeBillboardInfoWindow')
          document.dispatchEvent(closeEvent)
        }
        lastAutoOpenedRef.current = closestBillboard.billboard.id
        // فتح الكرت عبر الحدث
        const event = new CustomEvent('openBillboardInfoWindow', { detail: closestBillboard.billboard.id })
        document.dispatchEvent(event)
      }
    } else if (lastAutoOpenedRef.current) {
      // إغلاق النافذة عند الابتعاد (أكثر من 150م)
      const wasOpenBillboard = billboards.find(b => b.id === lastAutoOpenedRef.current)
      if (wasOpenBillboard) {
        const coords = wasOpenBillboard.coordinates.split(',').map(c => parseFloat(c.trim()))
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          const distanceToOpen = calculateDistance(lat, lng, coords[0], coords[1])
          if (distanceToOpen > 150) {
            const closeEvent = new CustomEvent('closeBillboardInfoWindow')
            document.dispatchEvent(closeEvent)
            lastAutoOpenedRef.current = null
          }
        }
      }
    }
    
    // Sort by distance
    nearby.sort((a, b) => a.distance - b.distance)
    setNearbyBillboards(nearby.slice(0, 8))
  }, [billboards, playNotificationSound, vibrateOnce, visitedBillboards, onVisitedBillboardsUpdate, autoZoomOut, autoOpenCards, currentZoom, onZoomToLocation, onBillboardSelect])

  // لم تعد هناك حاجة لـ recordRoutePoint القديمة - تم استبدالها بـ trackPathPoint

  // Start tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد الموقع')
      return
    }
    
    setIsTracking(true)
    setError(null)
    
    // Request high accuracy position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading: posHeading, speed: posSpeed, accuracy: posAccuracy } = position.coords
        
        setCurrentLocation({ lat: latitude, lng: longitude })
        setHeading(posHeading || 0)
        setSpeed(posSpeed || 0)
        setAccuracy(posAccuracy || 0)
        
        // Update map with heading for arrow rotation
        onLocationUpdate({ lat: latitude, lng: longitude, heading: posHeading || 0, speed: posSpeed || 0 })
        
        // Zoom to location (street level) - only if not auto-zooming
        if (!autoZoomOut) {
          onZoomToLocation(latitude, longitude, 17)
        }
        
        // Update nearby billboards
        updateNearbyBillboards(latitude, longitude, posHeading || 0)
        
        // تسجيل نقطة المسار دائماً - يظهر على الخريطة
        trackPathPoint(latitude, longitude, posSpeed || 0)
      },
      (err) => {
        console.error('Geolocation error:', err)
        setError('فشل في تحديد الموقع. تأكد من تفعيل GPS.')
        setIsTracking(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,  // لا تستخدم مواقع مخزنة - للحصول على تحديثات فورية
        distanceFilter: 5  // تحديث كل 5 أمتار
      }
    )
  }, [onLocationUpdate, onZoomToLocation, updateNearbyBillboards, trackPathPoint, autoZoomOut])

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsTracking(false)
    // لا نمسح announcedBillboardsRef لأن التنبيهات تعمل مرة واحدة للجلسة فقط
    // Cancel any ongoing speech when stopping
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
  }, [])

  // Toggle recording - لحفظ المسار الحالي للمشاركة
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      // حفظ المسار الحالي للمشاركة
      setRecordedRoute([...trackPath])
      setIsRecording(false)
    } else {
      setRecordedRoute([])
      setIsRecording(true)
    }
  }, [isRecording, trackPath])

  // Clear recorded route
  const clearRoute = useCallback(() => {
    setTrackPath([])
    setRecordedRoute([])
    setTotalDistance(0)
    lastTrackPointRef.current = null
    lastRecordedPointRef.current = null
    setVisitedBillboards(new Set())
    // مسح قوائم التنبيهات للسماح بالتنبيه مرة أخرى
    announcedBillboardsRef.current.clear()
    vibratedBillboardsRef.current.clear()
    onVisitedBillboardsUpdate?.(new Set())
    onRouteUpdate?.([])
  }, [onRouteUpdate, onVisitedBillboardsUpdate])

  // Share route - مشاركة المسار الحالي
  const shareRoute = useCallback(async () => {
    const routeToShare = trackPath.length > 0 ? trackPath : recordedRoute
    if (routeToShare.length === 0) return
    
    const routeData = {
      route: routeToShare,
      visitedBillboards: Array.from(visitedBillboards),
      totalDistance,
      recordedAt: new Date().toISOString()
    }
    
    const shareText = `مسار التتبع المباشر\nالمسافة: ${formatDistance(totalDistance)}\nاللوحات التي تم الوصول إليها: ${visitedBillboards.size}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'مسار التتبع المباشر',
          text: shareText,
          url: window.location.href
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(JSON.stringify(routeData, null, 2))
      alert('تم نسخ بيانات المسار إلى الحافظة')
    }
  }, [trackPath, recordedRoute, visitedBillboards, totalDistance])

  // Handle close
  const handleClose = useCallback(() => {
    stopTracking()
    setIsRecording(false)
    onClose()
  }, [stopTracking, onClose])

  // Center on current location
  const centerOnLocation = useCallback(() => {
    if (currentLocation) {
      onZoomToLocation(currentLocation.lat, currentLocation.lng, 17)
    }
  }, [currentLocation, onZoomToLocation])

  // Effect to stop speech when soundEnabled is disabled
  useEffect(() => {
    if (!soundEnabled && 'speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
  }, [soundEnabled])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      // Cancel any ongoing speech on unmount
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel()
      }
    }
  }, [])

  // Auto-start tracking when activated
  useEffect(() => {
    if (isActive && !isTracking) {
      startTracking()
    } else if (!isActive && isTracking) {
      stopTracking()
    }
  }, [isActive, isTracking, startTracking, stopTracking])

  if (!isActive) return null

  return (
    <>
      {/* Top HUD Bar - Speed, Direction, Controls - Mobile Responsive */}
      <div className="absolute top-2 left-2 right-2 z-[2000] pointer-events-auto">
        <div className={`backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden transition-colors duration-500 ${
          nightMode 
            ? 'bg-zinc-950/95 border border-zinc-800/50' 
            : 'bg-black/90 border border-primary/30'
        }`}>
          {/* الصف الأول - المعلومات الأساسية */}
          <div className="flex items-center justify-between p-2 sm:p-3 gap-1 sm:gap-2">
            {/* Close Button */}
            <Button
              size="icon"
              variant="ghost"
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex-shrink-0 ${
                nightMode 
                  ? 'bg-zinc-800/50 hover:bg-zinc-700/50' 
                  : 'bg-destructive/20 hover:bg-destructive/40'
              }`}
              onClick={handleClose}
            >
              <X className={`w-4 h-4 sm:w-5 sm:h-5 ${nightMode ? 'text-zinc-400' : 'text-destructive'}`} />
            </Button>
            
            {/* Speed Display */}
            <div className={`flex items-center gap-1 sm:gap-2 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 ${
              nightMode ? 'bg-zinc-900/80' : 'bg-card/30'
            }`}>
              <Gauge className={`w-3 h-3 sm:w-4 sm:h-4 ${nightMode ? 'text-amber-600/80' : 'text-primary'}`} />
              <div className="flex items-baseline gap-0.5 sm:gap-1">
                <span className={`text-base sm:text-xl font-black tabular-nums ${
                  nightMode ? 'text-amber-100/90' : 'text-white'
                }`}>{formatSpeed(speed)}</span>
                <span className={`text-[8px] sm:text-[10px] ${nightMode ? 'text-zinc-500' : 'text-muted-foreground'}`}>كم/س</span>
              </div>
            </div>
            
            {/* Direction Display */}
            <div className={`flex items-center gap-1 sm:gap-2 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 ${
              nightMode ? 'bg-zinc-900/80' : 'bg-card/30'
            }`}>
              <div 
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-transform duration-300 ${
                  nightMode ? 'bg-amber-900/30' : 'bg-primary/30'
                }`}
                style={{ transform: `rotate(${heading}deg)` }}
              >
                <Navigation className={`w-3 h-3 sm:w-4 sm:h-4 ${nightMode ? 'text-amber-500/80' : 'text-primary'}`} />
              </div>
              <span className={`text-xs sm:text-sm font-bold hidden sm:block ${
                nightMode ? 'text-amber-100/80' : 'text-white'
              }`}>{getDirectionFromHeading(heading)}</span>
            </div>
            
            {/* Accuracy - Hidden on very small screens */}
            <div className="hidden xs:flex sm:flex items-center gap-1 text-[10px] sm:text-xs">
              <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                accuracy <= 15 
                  ? (nightMode ? 'bg-emerald-700' : 'bg-emerald-500') 
                  : accuracy <= 50 
                    ? (nightMode ? 'bg-amber-700' : 'bg-amber-500') 
                    : (nightMode ? 'bg-red-800' : 'bg-destructive')
              }`} />
              <span className={nightMode ? 'text-zinc-500' : 'text-muted-foreground'}>±{Math.round(accuracy)}م</span>
            </div>
            
          </div>
          
          {/* الصف الثاني - أزرار التحكم */}
          <div className={`flex items-center justify-center gap-1.5 px-2 pb-2 border-t pt-2 flex-wrap ${
            nightMode ? 'border-zinc-800/50' : 'border-border/20'
          }`}>
            {/* Settings Button - Moved here for mobile visibility */}
            <Button
              size="icon"
              variant="ghost"
              className={`w-8 h-8 rounded-xl flex-shrink-0 ${
                showSettings 
                  ? (nightMode ? 'bg-zinc-700' : 'bg-primary/30') 
                  : (nightMode ? 'hover:bg-zinc-800' : 'hover:bg-primary/20')
              }`}
              onClick={() => setShowSettings(!showSettings)}
              title="الإعدادات"
            >
              <Settings className={`w-4 h-4 ${showSettings ? (nightMode ? 'text-amber-400' : 'text-primary') : (nightMode ? 'text-amber-500/80' : 'text-primary')}`} />
            </Button>
            {/* Record Button */}
            <Button
              size="icon"
              variant="ghost"
              className={`w-8 h-8 rounded-xl ${
                isRecording 
                  ? 'bg-red-500/30 hover:bg-red-500/50' 
                  : (nightMode ? 'hover:bg-zinc-800' : 'hover:bg-primary/20')
              }`}
              onClick={toggleRecording}
              title={isRecording ? 'إيقاف التسجيل' : 'بدء التسجيل'}
            >
              <Circle className={`w-4 h-4 ${isRecording ? 'text-red-500 fill-red-500 animate-pulse' : (nightMode ? 'text-amber-500/80' : 'text-primary')}`} />
            </Button>
            
            {/* Share Button */}
            {trackPath.length > 0 && (
              <Button
                size="icon"
                variant="ghost"
                className={`w-8 h-8 rounded-xl ${nightMode ? 'hover:bg-zinc-800' : 'hover:bg-primary/20'}`}
                onClick={shareRoute}
                title="مشاركة المسار"
              >
                <Share2 className={`w-4 h-4 ${nightMode ? 'text-amber-500/80' : 'text-primary'}`} />
              </Button>
            )}
            
            {/* Clear Route Button */}
            {(trackPath.length > 0 || visitedBillboards.size > 0) && (
              <Button
                size="icon"
                variant="ghost"
                className={`w-8 h-8 rounded-xl ${nightMode ? 'hover:bg-zinc-800' : 'hover:bg-primary/20'}`}
                onClick={clearRoute}
                title="مسح المسار"
              >
                <Trash2 className={`w-4 h-4 ${nightMode ? 'text-zinc-500' : 'text-muted-foreground'}`} />
              </Button>
            )}
            
            {/* Night Mode Toggle */}
            <Button
              size="icon"
              variant="ghost"
              className={`w-8 h-8 rounded-xl ${
                nightMode 
                  ? 'bg-amber-900/30 hover:bg-amber-900/50' 
                  : 'hover:bg-primary/20'
              }`}
              onClick={() => setNightMode(!nightMode)}
              title="الوضع الليلي"
            >
              {nightMode ? (
                <Moon className="w-4 h-4 text-amber-500" />
              ) : (
                <Sun className="w-4 h-4 text-primary" />
              )}
            </Button>
            
            {/* Sound Toggle */}
            <Button
              size="icon"
              variant="ghost"
              className={`w-8 h-8 rounded-xl ${nightMode ? 'hover:bg-zinc-800' : 'hover:bg-primary/20'}`}
              onClick={() => {
                const newValue = !soundEnabled
                setSoundEnabled(newValue)
                if (!newValue && 'speechSynthesis' in window) {
                  speechSynthesis.cancel()
                }
              }}
              title={soundEnabled ? 'إيقاف الصوت' : 'تفعيل الصوت'}
            >
              {soundEnabled ? (
                <Volume2 className={`w-4 h-4 ${nightMode ? 'text-amber-500/80' : 'text-primary'}`} />
              ) : (
                <VolumeX className={`w-4 h-4 ${nightMode ? 'text-zinc-600' : 'text-muted-foreground'}`} />
              )}
            </Button>
            
            {/* Center Location */}
            <Button
              size="icon"
              variant="ghost"
              className={`w-8 h-8 rounded-xl ${nightMode ? 'hover:bg-zinc-800' : 'hover:bg-primary/20'}`}
              onClick={centerOnLocation}
              title="تركيز على موقعي"
            >
              <Locate className={`w-4 h-4 ${nightMode ? 'text-amber-500/80' : 'text-primary'}`} />
            </Button>
          </div>
          
          {/* Settings Panel */}
          {showSettings && (
            <div className={`px-4 py-3 border-t ${
              nightMode 
                ? 'bg-zinc-900/80 border-zinc-800/50' 
                : 'bg-card/30 border-border/30'
            }`}>
              <p className={`text-xs font-bold mb-3 ${nightMode ? 'text-amber-100/80' : 'text-foreground'}`}>خيارات التتبع</p>
              <div className="space-y-3">
                {/* Auto Zoom Out Option */}
                <button
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                    autoZoomOut 
                      ? (nightMode ? 'bg-cyan-900/30 border border-cyan-700/50' : 'bg-primary/20 border border-primary/30')
                      : (nightMode ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-card/50 hover:bg-card/80 border border-border/30')
                  }`}
                  onClick={() => setAutoZoomOut(!autoZoomOut)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      autoZoomOut 
                        ? (nightMode ? 'bg-cyan-800/50' : 'bg-primary/30') 
                        : (nightMode ? 'bg-zinc-700' : 'bg-muted')
                    }`}>
                      <ZoomOut className={`w-4 h-4 ${autoZoomOut ? (nightMode ? 'text-cyan-400' : 'text-primary') : (nightMode ? 'text-zinc-400' : 'text-muted-foreground')}`} />
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${nightMode ? 'text-amber-100/90' : 'text-foreground'}`}>تكبير عند الاقتراب</p>
                      <p className={`text-[10px] ${nightMode ? 'text-zinc-500' : 'text-muted-foreground'}`}>زوم أوت تلقائي عند الاقتراب من لوحة</p>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
                    autoZoomOut 
                      ? (nightMode ? 'bg-cyan-600' : 'bg-primary') 
                      : (nightMode ? 'bg-zinc-700' : 'bg-muted')
                  }`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      autoZoomOut ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </div>
                </button>
                
                {/* Auto Open Cards Option */}
                <button
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-colors ${
                    autoOpenCards 
                      ? (nightMode ? 'bg-cyan-900/30 border border-cyan-700/50' : 'bg-primary/20 border border-primary/30')
                      : (nightMode ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-card/50 hover:bg-card/80 border border-border/30')
                  }`}
                  onClick={() => setAutoOpenCards(!autoOpenCards)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      autoOpenCards 
                        ? (nightMode ? 'bg-cyan-800/50' : 'bg-primary/30') 
                        : (nightMode ? 'bg-zinc-700' : 'bg-muted')
                    }`}>
                      <CreditCard className={`w-4 h-4 ${autoOpenCards ? (nightMode ? 'text-cyan-400' : 'text-primary') : (nightMode ? 'text-zinc-400' : 'text-muted-foreground')}`} />
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${nightMode ? 'text-amber-100/90' : 'text-foreground'}`}>فتح البطاقة تلقائياً</p>
                      <p className={`text-[10px] ${nightMode ? 'text-zinc-500' : 'text-muted-foreground'}`}>عرض تفاصيل اللوحة عند الاقتراب منها</p>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
                    autoOpenCards 
                      ? (nightMode ? 'bg-cyan-600' : 'bg-primary') 
                      : (nightMode ? 'bg-zinc-700' : 'bg-muted')
                  }`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      autoOpenCards ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </div>
                </button>
              </div>
            </div>
          )}
          
          {/* Recording Status Bar - يظهر دائماً عند وجود مسار */}
          {(isTracking || trackPath.length > 0) && (
            <div className={`px-3 py-2 border-t flex items-center justify-between ${
              nightMode 
                ? 'bg-zinc-900/50 border-zinc-800/50' 
                : 'bg-card/20 border-border/30'
            }`}>
              <div className="flex items-center gap-3">
                {isTracking && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className={`text-xs font-medium ${nightMode ? 'text-emerald-400' : 'text-emerald-500'}`}>متصل</span>
                  </span>
                )}
                <span className={`text-xs ${nightMode ? 'text-zinc-400' : 'text-muted-foreground'}`}>
                  المسافة: {formatDistance(totalDistance)}
                </span>
                <span className={`text-xs ${nightMode ? 'text-zinc-400' : 'text-muted-foreground'}`}>
                  النقاط: {trackPath.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 ${nightMode ? 'text-emerald-600' : 'text-emerald-500'}`} />
                <span className={`text-xs font-medium ${nightMode ? 'text-emerald-600' : 'text-emerald-500'}`}>
                  {visitedBillboards.size} لوحة
                </span>
              </div>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className={`px-3 py-2 border-t flex items-center justify-between ${
              nightMode 
                ? 'bg-red-950/30 border-red-900/30' 
                : 'bg-destructive/20 border-destructive/30'
            }`}>
              <p className={`text-xs ${nightMode ? 'text-red-400/80' : 'text-destructive'}`}>{error}</p>
              <Button size="sm" variant="ghost" className={`text-xs h-7 ${nightMode ? 'text-zinc-400' : ''}`} onClick={startTracking}>
                إعادة المحاولة
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Nearby Billboards Panel - Bottom */}
      <div className="absolute bottom-2 left-2 right-2 z-[2000] pointer-events-auto">
        <div className={`backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden transition-colors duration-500 ${
          nightMode 
            ? 'bg-zinc-950/95 border border-zinc-800/50' 
            : 'bg-black/90 border border-primary/30'
        }`}>
          {/* Panel Header - Always Visible */}
          <button
            className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
              nightMode ? 'hover:bg-zinc-900/50' : 'hover:bg-primary/10'
            }`}
            onClick={() => setShowNearbyPanel(!showNearbyPanel)}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  nightMode 
                    ? 'bg-amber-900/20' 
                    : 'bg-primary/20'
                } ${isTracking ? 'animate-pulse' : ''}`}>
                  <Eye className={`w-5 h-5 ${nightMode ? 'text-amber-500/80' : 'text-primary'}`} />
                </div>
                {nearbyBillboards.length > 0 && (
                  <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    nightMode 
                      ? 'bg-amber-700 text-amber-100' 
                      : 'bg-primary text-primary-foreground'
                  }`}>
                    {nearbyBillboards.length}
                  </span>
                )}
              </div>
              <div className="text-right">
                <h3 className={`font-bold text-sm ${nightMode ? 'text-amber-100/90' : 'text-foreground'}`}>اللوحات القريبة</h3>
                <p className={`text-xs ${nightMode ? 'text-zinc-500' : 'text-muted-foreground'}`}>
                  {isTracking ? `${nearbyBillboards.length} لوحة في نطاق 2 كم` : 'التتبع متوقف'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Tracking Status */}
              <div className={`w-2 h-2 rounded-full ${
                isTracking 
                  ? (nightMode ? 'bg-amber-600 animate-pulse' : 'bg-emerald-500 animate-pulse') 
                  : (nightMode ? 'text-zinc-600' : 'bg-muted-foreground')
              }`} />
              {showNearbyPanel ? (
                <ChevronDown className={`w-5 h-5 ${nightMode ? 'text-zinc-500' : 'text-muted-foreground'}`} />
              ) : (
                <ChevronUp className={`w-5 h-5 ${nightMode ? 'text-zinc-500' : 'text-muted-foreground'}`} />
              )}
            </div>
          </button>

          {/* Panel Content - Expandable */}
          {showNearbyPanel && (
            <div className={`max-h-[180px] overflow-y-auto border-t ${
              nightMode ? 'border-zinc-800/50' : 'border-border/30'
            }`}>
              {nearbyBillboards.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <MapPin className={`w-8 h-8 mx-auto mb-2 ${nightMode ? 'text-zinc-600' : 'text-muted-foreground'}`} />
                  <p className={`text-sm ${nightMode ? 'text-zinc-500' : 'text-muted-foreground'}`}>لا توجد لوحات قريبة</p>
                  <p className={`text-xs mt-1 ${nightMode ? 'text-zinc-600' : 'text-muted-foreground/60'}`}>تحرك لاكتشاف اللوحات</p>
                </div>
              ) : (
                <div className={`divide-y ${nightMode ? 'divide-zinc-800/50' : 'divide-border/20'}`}>
                  {nearbyBillboards.map((item, index) => {
                    const isVisited = visitedBillboards.has(item.billboard.id)
                    return (
                      <div 
                        key={item.billboard.id}
                        className={`px-4 py-2.5 flex items-center gap-3 transition-opacity ${
                          item.distance <= 100 
                            ? (nightMode ? 'bg-amber-900/10' : 'bg-primary/15') 
                            : ''
                        } ${isVisited ? 'opacity-50' : ''}`}
                      >
                        {/* Rank / Visited Check */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isVisited
                            ? (nightMode ? 'bg-emerald-900/50 text-emerald-500' : 'bg-emerald-500/20 text-emerald-500')
                            : index === 0 
                              ? (nightMode ? 'bg-amber-700 text-amber-100' : 'bg-primary text-primary-foreground') 
                              : (nightMode ? 'bg-zinc-800 text-zinc-500' : 'bg-muted text-muted-foreground')
                        }`}>
                          {isVisited ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`font-bold text-sm ${nightMode ? 'text-amber-400' : 'text-primary'}`}>{item.billboard.size}</span>
                            {isVisited ? (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${nightMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-500/20 text-emerald-600'}`}>✓ تم الوصول</span>
                            ) : (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                item.billboard.status === 'متاح' 
                                  ? (nightMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-500/20 text-emerald-600') 
                                  : item.billboard.status === 'قريباً' 
                                    ? (nightMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-500/20 text-amber-600') 
                                    : (nightMode ? 'bg-red-900/30 text-red-400' : 'bg-red-500/20 text-red-600')
                              }`}>
                                {item.billboard.status}
                              </span>
                            )}
                          </div>
                          {item.billboard.landmark && (
                            <p className={`text-xs truncate ${
                              isVisited 
                                ? (nightMode ? 'text-zinc-600' : 'text-muted-foreground/60')
                                : (nightMode ? 'text-zinc-400' : 'text-muted-foreground')
                            }`}>
                              📍 {item.billboard.landmark}
                            </p>
                          )}
                          {!item.billboard.landmark && (
                            <p className={`text-xs truncate ${
                              isVisited 
                                ? (nightMode ? 'text-zinc-600 line-through' : 'text-muted-foreground/60 line-through')
                                : (nightMode ? 'text-zinc-400' : 'text-muted-foreground')
                            }`}>{item.billboard.name}</p>
                          )}
                        </div>
                        
                        {/* Distance */}
                        <div className="text-left flex-shrink-0">
                          <p className={`font-bold text-sm ${
                            isVisited
                              ? (nightMode ? 'text-zinc-500' : 'text-muted-foreground')
                              : item.distance <= 100 
                                ? (nightMode ? 'text-amber-500' : 'text-primary') 
                                : (nightMode ? 'text-amber-100/80' : 'text-foreground')
                          }`}>
                            {formatDistance(item.distance)}
                          </p>
                          <p className={`text-[10px] ${nightMode ? 'text-zinc-500' : 'text-muted-foreground'}`}>{item.direction}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Night mode overlay for reduced brightness */}
      {nightMode && (
        <div 
          className="fixed inset-0 pointer-events-none z-[1500] transition-opacity duration-500"
          style={{ 
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%)',
            mixBlendMode: 'multiply'
          }}
        />
      )}

      {/* Custom CSS for the live tracking marker on map */}
      <style>{`
        @keyframes tracking-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
        .live-tracking-marker {
          animation: tracking-pulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </>
  )
}

// Live Tracking Mode - Real-time GPS Navigation
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Billboard } from '@/types'
import { MapPin, X, Eye, Volume2, VolumeX, Locate, ChevronDown, ChevronUp, Moon, Sun, Circle, Share2, Trash2, CheckCircle2, Settings, ZoomOut, CreditCard, Activity, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSizeColor } from '@/hooks/useMapMarkers'

interface LiveTrackingModeProps {
  isActive: boolean
  onClose: () => void
  billboards: Billboard[]
  onLocationUpdate: (location: { lat: number; lng: number; heading?: number; speed?: number }) => void
  onZoomToLocation: (lat: number, lng: number, zoom: number) => void
  onPanToLocation?: (lat: number, lng: number) => void
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
  onPanToLocation,
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
  
  // Elapsed time tracking
  const [elapsedSec, setElapsedSec] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  
  useEffect(() => {
    if (!isTracking) {
      startTimeRef.current = null
      return
    }
    if (startTimeRef.current === null) startTimeRef.current = Date.now()
    const id = setInterval(() => {
      if (startTimeRef.current) setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [isTracking])
  
  const watchIdRef = useRef<number | null>(null)
  // التنبيهات تعمل مرة واحدة للجلسة - لا تتكرر أبداً
  const announcedBillboardsRef = useRef<Set<string>>(new Set())
  const vibratedBillboardsRef = useRef<Set<string>>(new Set())
  const lastTrackPointRef = useRef<RoutePoint | null>(null)
  const lastRecordedPointRef = useRef<RoutePoint | null>(null)
  const lastAutoOpenedRef = useRef<string | null>(null)
  // تكبير أولي قوي عند بدء التتبع - مرة واحدة فقط
  const initialZoomDoneRef = useRef(false)
  // Wake Lock للحفاظ على الشاشة مضاءة على الجوال
  const wakeLockRef = useRef<any>(null)
  // Retry للـ GPS عند الـ TIMEOUT
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    
    // ملاحظة: لم نعد نغير الزوم تلقائياً عند الاقتراب من اللوحات
    // المستخدم حر في التحكم بالزوم - الخريطة فقط تتمركز على موقعه (pan)
    // هذا يحترم زوم المستخدم ولا يرتد عند محاولة التكبير/التصغير
    
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
  }, [billboards, playNotificationSound, vibrateOnce, visitedBillboards, onVisitedBillboardsUpdate, autoOpenCards, onBillboardSelect])

  // لم تعد هناك حاجة لـ recordRoutePoint القديمة - تم استبدالها بـ trackPathPoint

  // طلب Wake Lock للحفاظ على شاشة الجوال مضاءة أثناء التتبع
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
      }
    } catch (e) {
      // تجاهل بصمت — wake lock اختياري
    }
  }, [])

  const releaseWakeLock = useCallback(() => {
    try {
      if (wakeLockRef.current) {
        wakeLockRef.current.release?.()
        wakeLockRef.current = null
      }
    } catch (e) { /* ignore */ }
  }, [])

  // Start tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد الموقع. حاول استخدام Chrome أو Safari.')
      return
    }

    // إعادة ضبط: السماح بتكبير أولي قوي مرة واحدة عند بدء جلسة جديدة
    initialZoomDoneRef.current = false
    setIsTracking(true)
    setError(null)

    // إلغاء أي retry سابق
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    // تفعيل wake lock للجوال
    requestWakeLock()

    // إلغاء watch قديم إن وُجد قبل بدء جديد (يمنع التضارب على iOS)
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    // Request high accuracy position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading: posHeading, speed: posSpeed, accuracy: posAccuracy } = position.coords

        setCurrentLocation({ lat: latitude, lng: longitude })
        setHeading(posHeading || 0)
        setSpeed(posSpeed || 0)
        setAccuracy(posAccuracy || 0)
        setError(null) // مسح أي خطأ سابق عند نجاح التحديث

        // Update map with heading for arrow rotation
        onLocationUpdate({ lat: latitude, lng: longitude, heading: posHeading || 0, speed: posSpeed || 0 })

        // ── منطق الزوم الجديد ──
        // أول تحديث: تكبير قوي إلى مستوى الشارع (zoom 18) مرة واحدة فقط
        // التحديثات اللاحقة: pan فقط (احترام زوم المستخدم)
        if (!initialZoomDoneRef.current) {
          onZoomToLocation(latitude, longitude, 18)
          initialZoomDoneRef.current = true
        } else if (onPanToLocation) {
          onPanToLocation(latitude, longitude)
        }
        // إذا لم تتوفر onPanToLocation (توافق رجعي): لا نفعل شيء — لا نريد إعادة الزوم

        // Update nearby billboards
        updateNearbyBillboards(latitude, longitude, posHeading || 0)

        // تسجيل نقطة المسار دائماً - يظهر على الخريطة
        trackPathPoint(latitude, longitude, posSpeed || 0)
      },
      (err) => {
        console.error('Geolocation error:', err)
        if (err.code === 1) {
          // PERMISSION_DENIED
          setError('لم يتم السماح بالوصول للموقع. فعّل الإذن من إعدادات المتصفح ثم أعد المحاولة.')
          setIsTracking(false)
          releaseWakeLock()
        } else if (err.code === 3) {
          // TIMEOUT — حاول تلقائياً بعد 3 ثوان
          setError('بطء في إشارة GPS، يُعاد المحاولة...')
          retryTimeoutRef.current = setTimeout(() => {
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current)
              watchIdRef.current = null
            }
            startTracking()
          }, 3000)
        } else {
          // POSITION_UNAVAILABLE أو غيره
          setError('فشل تحديد الموقع. تأكد من تفعيل GPS وأن السماء مكشوفة.')
          // أبقِ التتبع مفعلاً واسمح بمحاولة جديدة
          retryTimeoutRef.current = setTimeout(() => {
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current)
              watchIdRef.current = null
            }
            startTracking()
          }, 5000)
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,      // 20 ثانية — يكفي للشبكات/الأجهزة البطيئة
        maximumAge: 2000     // يقبل موقع عمره 2 ثانية كحد أقصى — يوفّر بطارية ويقلل الأخطاء
        // ملاحظة: distanceFilter ليس قياسياً في PositionOptions ويتم تجاهله — تمت إزالته
      }
    )
  }, [onLocationUpdate, onZoomToLocation, onPanToLocation, updateNearbyBillboards, trackPathPoint, requestWakeLock, releaseWakeLock])

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    setIsTracking(false)
    initialZoomDoneRef.current = false
    releaseWakeLock()
    // لا نمسح announcedBillboardsRef لأن التنبيهات تعمل مرة واحدة للجلسة فقط
    // Cancel any ongoing speech when stopping
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
  }, [releaseWakeLock])

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
        .then(() => console.log('تم نسخ البيانات'))
        .catch(() => console.warn('فشل النسخ'))
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
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      // تحرير wake lock
      try {
        wakeLockRef.current?.release?.()
      } catch (e) { /* ignore */ }
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

  const speedKmh = Math.round(speed * 3.6)
  const speedColor = speedKmh < 60 ? '#10b981' : speedKmh < 100 ? '#f59e0b' : '#ef4444'
  const speedPct = Math.min(speedKmh / 120, 1)
  
  // Speedometer arc geometry
  const RADIUS = 42
  const CIRC = Math.PI * RADIUS // half circle
  const dirText = useMemo(() => getDirectionFromHeading(heading), [heading])
  const headingDeg = Math.round(((heading % 360) + 360) % 360)
  
  const elapsedFmt = `${String(Math.floor(elapsedSec/3600)).padStart(2,'0')}:${String(Math.floor((elapsedSec%3600)/60)).padStart(2,'0')}:${String(elapsedSec%60).padStart(2,'0')}`
  
  const accColor = accuracy <= 15 ? '#10b981' : accuracy <= 50 ? '#f59e0b' : '#ef4444'
  const accBars = accuracy <= 15 ? 3 : accuracy <= 50 ? 2 : 1

  return (
    <>
      {/* ═══════════ TOP COCKPIT HUD ═══════════ */}
      <div className="absolute top-2 left-2 right-2 z-[2000] pointer-events-auto">
        <div
          className="rounded-2xl overflow-hidden shadow-2xl backdrop-blur-2xl"
          style={{
            background: 'linear-gradient(145deg, rgba(9,9,11,0.96) 0%, rgba(24,24,27,0.94) 100%)',
            border: '1px solid rgba(6,182,212,0.25)',
            boxShadow: '0 20px 60px -10px rgba(0,0,0,0.6), 0 0 30px rgba(6,182,212,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Top status strip */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-cyan-500/15 bg-zinc-950/40">
            <div className="flex items-center gap-2">
              <Radio className={`w-3 h-3 ${isTracking ? 'text-cyan-400' : 'text-zinc-600'}`} style={isTracking ? { animation: 'hud-blink 1.4s infinite' } : {}} />
              <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-cyan-400/80">
                {isTracking ? 'LIVE TRACKING' : 'STANDBY'}
              </span>
            </div>
            <div className="flex items-center gap-1.5" title={`دقة GPS: ±${Math.round(accuracy)}م`}>
              {[1,2,3].map(i => (
                <div key={i} className="w-[3px] rounded-full transition-colors" style={{
                  height: `${4 + i*3}px`,
                  background: i <= accBars ? accColor : 'rgba(255,255,255,0.12)',
                  boxShadow: i <= accBars ? `0 0 6px ${accColor}` : 'none',
                }}/>
              ))}
              <span className="text-[9px] font-mono font-bold ml-1" style={{ color: accColor }}>±{Math.round(accuracy)}m</span>
            </div>
            <Button size="icon" variant="ghost"
              className="w-6 h-6 rounded-md hover:bg-red-500/20"
              onClick={handleClose}>
              <X className="w-3 h-3 text-zinc-500" />
            </Button>
          </div>

          {/* Main HUD - Speedometer | Compass | Stats - مدمج على الجوال */}
          <div className="grid grid-cols-[auto_auto_1fr] gap-2 sm:gap-3 p-2 sm:p-4 items-center">
            
            {/* ── SPEEDOMETER ── */}
            <div className="flex flex-col items-center">
              <div className="relative w-[78px] h-[50px] sm:w-[110px] sm:h-[70px]">
                <svg viewBox="0 0 110 70" className="absolute inset-0 w-full h-full">
                  <defs>
                    <linearGradient id="speedTrack" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="#10b981"/>
                      <stop offset="50%" stop-color="#f59e0b"/>
                      <stop offset="100%" stop-color="#ef4444"/>
                    </linearGradient>
                  </defs>
                  {/* Track */}
                  <path d="M 13 60 A 42 42 0 0 1 97 60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" strokeLinecap="round"/>
                  {/* Tick marks */}
                  {[0,1,2,3,4,5,6].map(i => {
                    const a = Math.PI - (i / 6) * Math.PI
                    const x1 = 55 + Math.cos(a) * 38
                    const y1 = 60 - Math.sin(a) * 38
                    const x2 = 55 + Math.cos(a) * 46
                    const y2 = 60 - Math.sin(a) * 46
                    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>
                  })}
                  {/* Active arc */}
                  <path d="M 13 60 A 42 42 0 0 1 97 60" fill="none" stroke="url(#speedTrack)" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - speedPct)}
                    style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${speedColor})` }}/>
                </svg>
                {/* Center digital readout */}
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-0.5">
                  <span className="font-mono font-black tabular-nums leading-none text-[22px] sm:text-[32px]" style={{
                    color: speedColor,
                    textShadow: `0 0 12px ${speedColor}, 0 2px 4px rgba(0,0,0,0.6)`,
                  }}>
                    {speedKmh}
                  </span>
                  <span className="text-[7px] sm:text-[8px] font-mono font-bold tracking-[0.15em] text-zinc-500 mt-0.5">KM/H</span>
                </div>
              </div>
            </div>

            {/* ── COMPASS ── */}
            <div className="flex flex-col items-center">
              <div className="relative w-[48px] h-[48px] sm:w-[68px] sm:h-[68px] rounded-full"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, rgba(6,182,212,0.08), rgba(0,0,0,0.6))',
                  border: '1.5px solid rgba(6,182,212,0.3)',
                  boxShadow: 'inset 0 0 14px rgba(0,0,0,0.5), 0 0 12px rgba(6,182,212,0.1)',
                }}>
                {/* Cardinal letters */}
                <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[7px] sm:text-[9px] font-bold font-mono text-red-400">N</span>
                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[7px] sm:text-[9px] font-bold font-mono text-zinc-500">E</span>
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] sm:text-[9px] font-bold font-mono text-zinc-500">S</span>
                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[7px] sm:text-[9px] font-bold font-mono text-zinc-500">W</span>
                
                {/* Tick ring */}
                <svg className="absolute inset-1.5 w-[calc(100%-12px)] h-[calc(100%-12px)]" viewBox="0 0 60 60">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const a = (i * 15 - 90) * Math.PI / 180
                    const isMajor = i % 6 === 0
                    return <line key={i}
                      x1={30 + Math.cos(a) * (isMajor ? 22 : 24)}
                      y1={30 + Math.sin(a) * (isMajor ? 22 : 24)}
                      x2={30 + Math.cos(a) * 27}
                      y2={30 + Math.sin(a) * 27}
                      stroke="rgba(255,255,255,0.15)" strokeWidth={isMajor ? 1 : 0.5}/>
                  })}
                </svg>
                
                {/* Rotating needle */}
                <div className="absolute inset-0 flex items-center justify-center transition-transform duration-500 ease-out"
                  style={{ transform: `rotate(${heading}deg)` }}>
                  <svg width="24" height="24" viewBox="0 0 32 32" className="sm:w-8 sm:h-8">
                    <path d="M16 4 L20 16 L16 14 L12 16 Z" fill="#ef4444" stroke="#fff" strokeWidth="0.5" strokeLinejoin="round"/>
                    <path d="M16 28 L20 16 L16 18 L12 16 Z" fill="rgba(255,255,255,0.4)" stroke="#fff" strokeWidth="0.3" strokeLinejoin="round"/>
                    <circle cx="16" cy="16" r="2" fill="#fff"/>
                  </svg>
                </div>
              </div>
              <div className="mt-1 text-center">
                <div className="font-mono font-black text-[9px] sm:text-[11px] text-cyan-300 tabular-nums leading-none">{headingDeg}°</div>
              </div>
            </div>

            {/* ── STATS GRID ── */}
            <div className="grid grid-cols-2 gap-1 sm:gap-1.5 min-w-0">
              <div className="rounded-md sm:rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 bg-zinc-900/60 border border-cyan-500/10 min-w-0">
                <div className="text-[7px] sm:text-[8px] text-zinc-500 font-bold tracking-wider mb-0.5">المسافة</div>
                <div className="font-mono font-black text-[11px] sm:text-[13px] text-cyan-300 tabular-nums leading-none truncate">{formatDistance(totalDistance)}</div>
              </div>
              <div className="rounded-md sm:rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 bg-zinc-900/60 border border-emerald-500/10 min-w-0">
                <div className="text-[7px] sm:text-[8px] text-zinc-500 font-bold tracking-wider mb-0.5">اللوحات</div>
                <div className="font-mono font-black text-[11px] sm:text-[13px] text-emerald-300 tabular-nums leading-none">{visitedBillboards.size}</div>
              </div>
              <div className="rounded-md sm:rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 bg-zinc-900/60 border border-amber-500/10 min-w-0">
                <div className="text-[7px] sm:text-[8px] text-zinc-500 font-bold tracking-wider mb-0.5">النقاط</div>
                <div className="font-mono font-black text-[11px] sm:text-[13px] text-amber-300 tabular-nums leading-none">{trackPath.length}</div>
              </div>
              <div className="rounded-md sm:rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 bg-zinc-900/60 border border-fuchsia-500/10 min-w-0">
                <div className="text-[7px] sm:text-[8px] text-zinc-500 font-bold tracking-wider mb-0.5">الزمن</div>
                <div className="font-mono font-black text-[10px] sm:text-[11px] text-fuchsia-300 tabular-nums leading-none truncate">{elapsedFmt}</div>
              </div>
            </div>
          </div>

          {/* Control bar */}
          <div className="flex items-center justify-between gap-1 px-2 py-1.5 border-t border-cyan-500/15 bg-zinc-950/60">
            {/* Recording group */}
            <div className="flex items-center gap-0.5 rounded-lg bg-zinc-900/60 p-0.5">
              <button
                onClick={toggleRecording}
                title={isRecording ? 'إيقاف التسجيل' : 'بدء التسجيل'}
                className={`relative flex items-center gap-1 h-7 px-2 rounded-md transition-all ${isRecording ? 'bg-red-500/20' : 'hover:bg-zinc-800'}`}>
                <Circle className={`w-3 h-3 ${isRecording ? 'text-red-500 fill-red-500' : 'text-zinc-400'}`}
                  style={isRecording ? { animation: 'hud-blink 1s infinite' } : {}}/>
                {isRecording && <span className="text-[9px] font-mono font-black text-red-400 tracking-wider">REC</span>}
              </button>
              {trackPath.length > 0 && (
                <button onClick={shareRoute} title="مشاركة المسار"
                  className="w-7 h-7 rounded-md hover:bg-zinc-800 flex items-center justify-center">
                  <Share2 className="w-3 h-3 text-cyan-400/80" />
                </button>
              )}
              {(trackPath.length > 0 || visitedBillboards.size > 0) && (
                <button onClick={clearRoute} title="مسح المسار"
                  className="w-7 h-7 rounded-md hover:bg-zinc-800 flex items-center justify-center">
                  <Trash2 className="w-3 h-3 text-zinc-500" />
                </button>
              )}
            </div>

            {/* Settings group */}
            <div className="flex items-center gap-0.5 rounded-lg bg-zinc-900/60 p-0.5">
              <button onClick={() => setShowSettings(!showSettings)} title="الإعدادات"
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${showSettings ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-zinc-800 text-zinc-400'}`}>
                <Settings className="w-3 h-3" />
              </button>
              <button onClick={() => {
                const v = !soundEnabled
                setSoundEnabled(v)
                if (!v && 'speechSynthesis' in window) speechSynthesis.cancel()
              }} title={soundEnabled ? 'إيقاف الصوت' : 'تفعيل الصوت'}
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${soundEnabled ? 'bg-cyan-500/20 text-cyan-300' : 'hover:bg-zinc-800 text-zinc-500'}`}>
                {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              </button>
            </div>

            {/* View group */}
            <div className="flex items-center gap-0.5 rounded-lg bg-zinc-900/60 p-0.5">
              <button onClick={() => setNightMode(!nightMode)} title="الوضع الليلي"
                className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${nightMode ? 'bg-amber-500/20 text-amber-300' : 'hover:bg-zinc-800 text-zinc-400'}`}>
                {nightMode ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
              </button>
              <button onClick={centerOnLocation} title="تركيز على موقعي"
                className="w-7 h-7 rounded-md hover:bg-zinc-800 flex items-center justify-center text-cyan-400/80">
                <Locate className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="px-3 py-2.5 border-t border-cyan-500/15 bg-zinc-950/70 space-y-2 animate-fade-in">
              <p className="text-[10px] font-mono font-bold tracking-wider text-cyan-400/80 mb-2">SYSTEM PREFERENCES</p>
              {[
                { val: autoZoomOut, set: setAutoZoomOut, icon: ZoomOut, label: 'تكبير عند الاقتراب', sub: 'زوم تلقائي عند اقتراب لوحة' },
                { val: autoOpenCards, set: setAutoOpenCards, icon: CreditCard, label: 'فتح البطاقة تلقائياً', sub: 'عرض تفاصيل اللوحة عند الاقتراب' },
              ].map((opt, i) => (
                <button key={i} onClick={() => opt.set(!opt.val)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                    opt.val ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-900'
                  }`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${opt.val ? 'bg-cyan-500/20' : 'bg-zinc-800'}`}>
                      <opt.icon className={`w-3.5 h-3.5 ${opt.val ? 'text-cyan-300' : 'text-zinc-500'}`} />
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-bold ${opt.val ? 'text-cyan-100' : 'text-zinc-300'}`}>{opt.label}</p>
                      <p className="text-[9px] text-zinc-500">{opt.sub}</p>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${opt.val ? 'bg-cyan-500' : 'bg-zinc-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${opt.val ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-3 py-2 border-t border-red-900/40 bg-red-950/40 flex items-center justify-between">
              <p className="text-[11px] text-red-400 font-medium">{error}</p>
              <button onClick={startTracking} className="text-[10px] font-bold text-red-300 hover:text-red-100 px-2 py-1 rounded bg-red-900/30">
                إعادة المحاولة
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ NEARBY BILLBOARDS PANEL ═══════════ */}
      <div className="absolute bottom-2 left-2 right-2 z-[2000] pointer-events-auto">
        <div className="rounded-2xl overflow-hidden shadow-2xl backdrop-blur-2xl"
          style={{
            background: 'linear-gradient(145deg, rgba(9,9,11,0.96) 0%, rgba(24,24,27,0.94) 100%)',
            border: '1px solid rgba(6,182,212,0.25)',
            boxShadow: '0 -10px 40px -10px rgba(0,0,0,0.5), 0 0 30px rgba(6,182,212,0.06)',
          }}>
          <button onClick={() => setShowNearbyPanel(!showNearbyPanel)}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-cyan-500/5 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-500/15 border border-cyan-500/30 ${isTracking ? 'animate-pulse' : ''}`}>
                  <Eye className="w-4 h-4 text-cyan-300" />
                </div>
                {nearbyBillboards.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-mono font-black flex items-center justify-center bg-cyan-400 text-zinc-950 shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                    {nearbyBillboards.length}
                  </span>
                )}
              </div>
              <div className="text-right">
                <h3 className="font-bold text-[13px] text-cyan-100" style={{ fontFamily: 'Doran, sans-serif' }}>اللوحات القريبة</h3>
                <p className="text-[10px] font-mono text-zinc-500 tracking-wider">
                  {isTracking ? `${nearbyBillboards.length} في نطاق 2KM` : 'TRACKING IDLE'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className={`w-3.5 h-3.5 ${isTracking ? 'text-emerald-400' : 'text-zinc-600'}`} 
                style={isTracking ? { animation: 'hud-blink 1.4s infinite' } : {}}/>
              {showNearbyPanel ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronUp className="w-4 h-4 text-zinc-500" />}
            </div>
          </button>

          {showNearbyPanel && (
            <div className="max-h-[200px] overflow-y-auto border-t border-cyan-500/15 animate-fade-in">
              {nearbyBillboards.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <MapPin className="w-7 h-7 mx-auto mb-2 text-zinc-700" />
                  <p className="text-[11px] text-zinc-500 font-medium">لا توجد لوحات قريبة</p>
                  <p className="text-[9px] mt-1 text-zinc-600 font-mono">SCAN: 2.0KM RADIUS</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/40">
                  {nearbyBillboards.map((item, index) => {
                    const isVisited = visitedBillboards.has(item.billboard.id)
                    const sizeColor = getSizeColor(item.billboard.size)
                    // Distance bar fill: closest = full, 2km = empty
                    const fillPct = Math.max(0, Math.min(100, (1 - item.distance / 2000) * 100))
                    return (
                      <div key={item.billboard.id}
                        className={`relative px-3 py-2 flex items-center gap-2.5 transition-all ${
                          item.distance <= 100 ? 'bg-cyan-500/8' : 'hover:bg-zinc-900/50'
                        } ${isVisited ? 'opacity-60' : ''}`}>
                        {/* Size accent stripe */}
                        <div className="absolute right-0 top-0 bottom-0 w-[3px]" style={{ background: sizeColor.bg, boxShadow: `0 0 8px ${sizeColor.bg}` }}/>
                        
                        {/* Rank badge */}
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-mono font-black flex-shrink-0"
                          style={{
                            background: isVisited ? 'rgba(16,185,129,0.15)' : index === 0 ? sizeColor.bg : 'rgba(255,255,255,0.06)',
                            color: isVisited ? '#34d399' : index === 0 ? '#fff' : '#a1a1aa',
                            boxShadow: index === 0 && !isVisited ? `0 0 12px ${sizeColor.bg}55` : 'none',
                          }}>
                          {isVisited ? <CheckCircle2 className="w-3.5 h-3.5" /> : index + 1}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-mono font-black text-[11px] text-white px-1.5 py-0.5 rounded leading-none"
                              style={{ background: sizeColor.bg }}>
                              {item.billboard.size}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold leading-none ${
                              isVisited ? 'bg-emerald-500/15 text-emerald-400' :
                              item.billboard.status === 'متاح' ? 'bg-emerald-500/15 text-emerald-400' :
                              item.billboard.status === 'قريباً' ? 'bg-amber-500/15 text-amber-400' :
                              'bg-red-500/15 text-red-400'
                            }`}>
                              {isVisited ? '✓ تم الوصول' : item.billboard.status}
                            </span>
                          </div>
                          <p className={`text-[10px] truncate ${isVisited ? 'text-zinc-600' : 'text-zinc-400'}`}>
                            📍 {item.billboard.landmark || item.billboard.name}
                          </p>
                          {/* Distance progress */}
                          <div className="mt-1 h-[2px] rounded-full bg-zinc-800/60 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${fillPct}%`,
                                background: `linear-gradient(90deg, ${sizeColor.bg}, ${sizeColor.border})`,
                                boxShadow: item.distance <= 100 ? `0 0 6px ${sizeColor.bg}` : 'none',
                              }}/>
                          </div>
                        </div>

                        {/* Distance + direction */}
                        <div className="text-left flex-shrink-0 mr-1">
                          <p className="font-mono font-black text-[12px] tabular-nums leading-none"
                            style={{ color: item.distance <= 100 ? '#67e8f9' : '#e4e4e7' }}>
                            {formatDistance(item.distance)}
                          </p>
                          <p className="text-[9px] text-zinc-500 mt-0.5 font-bold">{item.direction}</p>
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

      {/* Night mode overlay */}
      {nightMode && (
        <div className="fixed inset-0 pointer-events-none z-[1500] transition-opacity duration-500"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.35) 100%)',
            mixBlendMode: 'multiply'
          }}/>
      )}
    </>
  )
}

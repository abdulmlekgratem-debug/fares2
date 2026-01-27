import { useState, useCallback, useEffect, useRef } from 'react'
import { Billboard } from '@/types'
import { Navigation, X, MapPin, Clock, ChevronDown, ChevronUp, RotateCcw, Volume2, VolumeX, Route, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getRouteFromOSRM, formatDistance, formatDuration } from '@/services/routingService'

interface NavigationPoint {
  billboard: Billboard
  lat: number
  lng: number
  distance?: number
  duration?: string
  instruction?: string
  reached?: boolean
}

interface NavigationModeProps {
  isActive: boolean
  onClose: () => void
  billboards: Billboard[]
  selectedBillboards: Set<string>
  userLocation: { lat: number; lng: number } | null
  onRequestLocation: () => void
  onRouteUpdate?: (route: { lat: number; lng: number }[], currentIndex: number) => void
  onCurrentLocationUpdate?: (location: { lat: number; lng: number }) => void
}

// Haversine formula for distance calculation
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Get direction between two points
const getDirection = (lat1: number, lng1: number, lat2: number, lng2: number): string => {
  const dLng = lng2 - lng1
  const dLat = lat2 - lat1
  const angle = Math.atan2(dLng, dLat) * 180 / Math.PI
  
  if (angle >= -22.5 && angle < 22.5) return 'شمالاً'
  if (angle >= 22.5 && angle < 67.5) return 'شمال شرق'
  if (angle >= 67.5 && angle < 112.5) return 'شرقاً'
  if (angle >= 112.5 && angle < 157.5) return 'جنوب شرق'
  if (angle >= 157.5 || angle < -157.5) return 'جنوباً'
  if (angle >= -157.5 && angle < -112.5) return 'جنوب غرب'
  if (angle >= -112.5 && angle < -67.5) return 'غرباً'
  return 'شمال غرب'
}

// Get turn instruction
const getTurnInstruction = (prevDir: string, currentDir: string): string => {
  const directions = ['شمالاً', 'شمال شرق', 'شرقاً', 'جنوب شرق', 'جنوباً', 'جنوب غرب', 'غرباً', 'شمال غرب']
  const prevIndex = directions.indexOf(prevDir)
  const currentIndex = directions.indexOf(currentDir)
  
  if (prevIndex === -1 || currentIndex === -1) return 'استمر'
  
  let diff = currentIndex - prevIndex
  if (diff > 4) diff -= 8
  if (diff < -4) diff += 8
  
  if (diff === 0) return 'استمر مباشرة'
  if (diff === 1 || diff === 2) return 'انعطف يميناً'
  if (diff === -1 || diff === -2) return 'انعطف يساراً'
  if (Math.abs(diff) >= 3) return 'استدر للخلف'
  return 'استمر'
}

export default function NavigationMode({
  isActive,
  onClose,
  billboards,
  selectedBillboards,
  userLocation,
  onRequestLocation,
  onRouteUpdate,
  onCurrentLocationUpdate
}: NavigationModeProps) {
  const [navigationPoints, setNavigationPoints] = useState<NavigationPoint[]>([])
  const [currentPointIndex, setCurrentPointIndex] = useState(0)
  const [totalDistance, setTotalDistance] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [realRouteCoordinates, setRealRouteCoordinates] = useState<{ lat: number; lng: number }[]>([])
  const watchIdRef = useRef<number | null>(null)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [arrivalMessage, setArrivalMessage] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousDirectionRef = useRef<string>('')

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.volume = 0.7
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Play arrival sound
  const playArrivalSound = useCallback(() => {
    if (isMuted || !audioRef.current) return
    
    // Create a simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (e) {
      console.log('Audio not supported')
    }
  }, [isMuted])

  // Initialize navigation points from selected billboards
  useEffect(() => {
    if (!isActive || selectedBillboards.size === 0) {
      setNavigationPoints([])
      return
    }

    const points: NavigationPoint[] = []
    
    billboards.forEach(billboard => {
      if (!selectedBillboards.has(billboard.id)) return
      
      const coords = billboard.coordinates.split(',').map(c => parseFloat(c.trim()))
      if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return
      
      points.push({
        billboard,
        lat: coords[0],
        lng: coords[1],
        reached: false
      })
    })

    // Smart sorting - find optimal route using nearest neighbor algorithm
    if (userLocation && points.length > 1) {
      const sortedPoints: NavigationPoint[] = []
      const remaining = [...points]
      let currentPos = userLocation
      
      while (remaining.length > 0) {
        let nearestIndex = 0
        let nearestDistance = Infinity
        
        remaining.forEach((point, index) => {
          const dist = calculateDistance(currentPos.lat, currentPos.lng, point.lat, point.lng)
          if (dist < nearestDistance) {
            nearestDistance = dist
            nearestIndex = index
          }
        })
        
        const nearest = remaining.splice(nearestIndex, 1)[0]
        sortedPoints.push(nearest)
        currentPos = { lat: nearest.lat, lng: nearest.lng }
      }
      
      points.length = 0
      points.push(...sortedPoints)
    }

    // Calculate distances and instructions
    let total = 0
    const startLat = userLocation?.lat || (points[0]?.lat || 0)
    const startLng = userLocation?.lng || (points[0]?.lng || 0)
    
    points.forEach((point, index) => {
      const prevLat = index === 0 ? startLat : points[index - 1].lat
      const prevLng = index === 0 ? startLng : points[index - 1].lng
      
      const distance = calculateDistance(prevLat, prevLng, point.lat, point.lng)
      const direction = getDirection(prevLat, prevLng, point.lat, point.lng)
      const estimatedMinutes = Math.round(distance / 0.5)
      
      point.distance = distance
      point.duration = estimatedMinutes < 60 ? `${estimatedMinutes} دقيقة` : `${Math.floor(estimatedMinutes / 60)}س ${estimatedMinutes % 60}د`
      point.instruction = `توجه ${direction} لمسافة ${distance.toFixed(1)} كم`
      
      total += distance
    })
    
    setNavigationPoints(points)
    setTotalDistance(total)
    setCurrentPointIndex(0)
  }, [isActive, billboards, selectedBillboards, userLocation])
  
  // Fetch real route from OSRM when navigation points change
  useEffect(() => {
    const fetchRealRoute = async () => {
      if (navigationPoints.length === 0) {
        setRealRouteCoordinates([])
        if (onRouteUpdate) onRouteUpdate([], 0)
        return
      }

      setIsLoadingRoute(true)
      setRouteError(null)

      try {
        // Build waypoints array: user location (if available) + all navigation points
        const waypoints = userLocation 
          ? [userLocation, ...navigationPoints.map(p => ({ lat: p.lat, lng: p.lng }))]
          : navigationPoints.map(p => ({ lat: p.lat, lng: p.lng }))

        // Get real road route from OSRM
        const result = await getRouteFromOSRM(waypoints)

        if (result.success) {
          setRealRouteCoordinates(result.coordinates)
          setTotalDistance(result.distance / 1000) // Convert to km
          setTotalDuration(result.duration)
          
          // Update navigation points with real distances
          // This is approximate - we distribute the total among segments
          if (result.distance > 0 && navigationPoints.length > 0) {
            const segmentDistance = result.distance / navigationPoints.length / 1000
            const segmentDuration = result.duration / navigationPoints.length
            
            setNavigationPoints(prev => prev.map((point, index) => ({
              ...point,
              distance: segmentDistance,
              duration: formatDuration(segmentDuration),
              instruction: `توجه عبر الطريق - ${formatDistance(segmentDistance * 1000)}`
            })))
          }

          // Send real route to map
          if (onRouteUpdate) {
            onRouteUpdate(result.coordinates, currentPointIndex)
          }
        } else {
          // Fallback to straight lines
          setRouteError('لم نتمكن من حساب المسار، يتم استخدام خطوط مستقيمة')
          const fallbackRoute = userLocation 
            ? [userLocation, ...navigationPoints.map(p => ({ lat: p.lat, lng: p.lng }))]
            : navigationPoints.map(p => ({ lat: p.lat, lng: p.lng }))
          setRealRouteCoordinates(fallbackRoute)
          if (onRouteUpdate) {
            onRouteUpdate(fallbackRoute, currentPointIndex)
          }
        }
      } catch (error) {
        console.error('Route fetch error:', error)
        setRouteError('حدث خطأ في حساب المسار')
        // Fallback
        const fallbackRoute = userLocation 
          ? [userLocation, ...navigationPoints.map(p => ({ lat: p.lat, lng: p.lng }))]
          : navigationPoints.map(p => ({ lat: p.lat, lng: p.lng }))
        setRealRouteCoordinates(fallbackRoute)
        if (onRouteUpdate) {
          onRouteUpdate(fallbackRoute, currentPointIndex)
        }
      } finally {
        setIsLoadingRoute(false)
      }
    }

    fetchRealRoute()
  }, [navigationPoints.length, userLocation?.lat, userLocation?.lng])

  // Update route on map when current index changes (without refetching)
  useEffect(() => {
    if (realRouteCoordinates.length > 0 && onRouteUpdate) {
      onRouteUpdate(realRouteCoordinates, currentPointIndex)
    }
  }, [currentPointIndex])

  // Start real-time tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم خدمة تحديد الموقع')
      return
    }

    setIsTracking(true)
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setCurrentLocation(newLocation)
        
        // Update parent component
        if (onCurrentLocationUpdate) {
          onCurrentLocationUpdate(newLocation)
        }

        // Check if user reached current point (within 100 meters)
        if (navigationPoints[currentPointIndex] && !navigationPoints[currentPointIndex].reached) {
          const point = navigationPoints[currentPointIndex]
          const distance = calculateDistance(
            position.coords.latitude,
            position.coords.longitude,
            point.lat,
            point.lng
          )
          
          // Dynamic arrival threshold based on speed
          const arrivalThreshold = 0.1 // 100 meters
          
          if (distance < arrivalThreshold) {
            // Mark as reached
            setNavigationPoints(prev => {
              const updated = [...prev]
              updated[currentPointIndex] = { ...updated[currentPointIndex], reached: true }
              return updated
            })
            
            // Show arrival message
            setArrivalMessage(`🎉 وصلت إلى: ${point.billboard.name}`)
            playArrivalSound()
            
            // Clear message after 3 seconds
            setTimeout(() => setArrivalMessage(null), 3000)
            
            // Move to next point
            if (currentPointIndex < navigationPoints.length - 1) {
              const nextIndex = currentPointIndex + 1
              setCurrentPointIndex(nextIndex)
              
              // Update route on map
              if (onRouteUpdate) {
                const remainingPoints = navigationPoints.slice(nextIndex).map(p => ({ lat: p.lat, lng: p.lng }))
                onRouteUpdate([newLocation, ...remainingPoints], nextIndex)
              }
            }
          } else {
            // Update direction instructions dynamically
            const currentDirection = getDirection(
              position.coords.latitude,
              position.coords.longitude,
              point.lat,
              point.lng
            )
            
            // Get turn instruction if direction changed
            if (previousDirectionRef.current && previousDirectionRef.current !== currentDirection) {
              const turnInstruction = getTurnInstruction(previousDirectionRef.current, currentDirection)
              setNavigationPoints(prev => {
                const updated = [...prev]
                updated[currentPointIndex] = {
                  ...updated[currentPointIndex],
                  instruction: `${turnInstruction} ثم ${currentDirection} - ${distance.toFixed(1)} كم`
                }
                return updated
              })
            }
            
            previousDirectionRef.current = currentDirection
          }
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        setIsTracking(false)
        alert('حدث خطأ في تتبع الموقع. يرجى التأكد من تفعيل GPS.')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000
      }
    )
  }, [navigationPoints, currentPointIndex, playArrivalSound, onRouteUpdate, onCurrentLocationUpdate])

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsTracking(false)
  }, [])

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  // Reset when closed
  useEffect(() => {
    if (!isActive) {
      stopTracking()
      setCurrentPointIndex(0)
      setArrivalMessage(null)
      previousDirectionRef.current = ''
    }
  }, [isActive, stopTracking])

  // Open Google Maps navigation
  const openGoogleMapsNavigation = useCallback(() => {
    if (navigationPoints.length === 0) return
    
    const destination = navigationPoints[navigationPoints.length - 1]
    const origin = userLocation 
      ? `${userLocation.lat},${userLocation.lng}` 
      : navigationPoints[0] ? `${navigationPoints[0].lat},${navigationPoints[0].lng}` : ''
    
    if (navigationPoints.length === 1) {
      // Single destination
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination.lat},${destination.lng}&travelmode=driving`, '_blank')
    } else {
      // Multiple waypoints
      const waypointsStr = navigationPoints.slice(0, -1).map(p => `${p.lat},${p.lng}`).join('|')
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination.lat},${destination.lng}&waypoints=${waypointsStr}&travelmode=driving`, '_blank')
    }
  }, [navigationPoints, userLocation])

  // Skip to specific point
  const skipToPoint = useCallback((index: number) => {
    setCurrentPointIndex(index)
    if (onRouteUpdate && currentLocation) {
      const remainingPoints = navigationPoints.slice(index).map(p => ({ lat: p.lat, lng: p.lng }))
      onRouteUpdate([currentLocation, ...remainingPoints], index)
    }
  }, [navigationPoints, currentLocation, onRouteUpdate])

  if (!isActive) return null

  const currentPoint = navigationPoints[currentPointIndex]
  const distanceToNext = currentLocation && currentPoint 
    ? calculateDistance(currentLocation.lat, currentLocation.lng, currentPoint.lat, currentPoint.lng)
    : currentPoint?.distance || 0
  
  const completedCount = navigationPoints.filter(p => p.reached).length
  const progressPercent = navigationPoints.length > 0 ? (completedCount / navigationPoints.length) * 100 : 0

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[2000] animate-fade-in">
      {/* Arrival Message */}
      {arrivalMessage && (
        <div className="mb-3 bg-emerald-500/95 backdrop-blur-xl rounded-xl p-3 shadow-lg border border-emerald-400/50 animate-pulse">
          <div className="flex items-center justify-center gap-2 text-white font-bold">
            <CheckCircle2 className="w-5 h-5" />
            <span>{arrivalMessage}</span>
          </div>
        </div>
      )}
      
      <div className="bg-card/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-primary/30 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary via-gold-light to-primary p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary-foreground" />
            <span className="font-bold text-primary-foreground text-sm">وضع الملاحة الذكي</span>
            {isTracking && (
              <span className="flex items-center gap-1 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                مباشر
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8 text-primary-foreground hover:bg-destructive"
              onClick={() => {
                stopTracking()
                onClose()
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1 bg-muted/30">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {isExpanded && (
          <>
            {/* Loading indicator */}
            {isLoadingRoute && (
              <div className="p-3 border-b border-border/50 bg-primary/10 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-primary font-medium">جاري حساب المسار الأمثل...</span>
              </div>
            )}
            
            {/* Route error warning */}
            {routeError && !isLoadingRoute && (
              <div className="p-2 bg-amber-500/20 border-b border-amber-500/30 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-amber-600 dark:text-amber-400">{routeError}</span>
              </div>
            )}
            
            {/* Summary */}
            <div className="p-3 border-b border-border/50 bg-muted/30">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">{completedCount}/{navigationPoints.length} نقطة</span>
                </div>
                <div className="flex items-center gap-4">
                  {totalDuration > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      <span className="text-muted-foreground text-xs">{formatDuration(totalDuration)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span className="text-muted-foreground">{formatDistance(totalDistance * 1000)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Navigation */}
            {currentPoint && (
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold ${
                    currentPoint.reached ? 'bg-emerald-500' : 'bg-gradient-to-br from-primary to-gold-dark text-primary-foreground'
                  }`}>
                    {currentPoint.reached ? '✓' : currentPointIndex + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground text-sm line-clamp-1">{currentPoint.billboard.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {currentPoint.instruction}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
                  <div className="text-center">
                    <p className="text-2xl font-black text-primary">{distanceToNext.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">كم متبقي</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{currentPoint.duration}</p>
                    <p className="text-xs text-muted-foreground">الوقت المتوقع</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{currentPointIndex + 1}/{navigationPoints.length}</p>
                    <p className="text-xs text-muted-foreground">النقطة</p>
                  </div>
                </div>
                
                {/* Next point preview */}
                {navigationPoints[currentPointIndex + 1] && (
                  <div className="mt-3 p-2 bg-muted/30 rounded-lg border border-border/30">
                    <p className="text-[10px] text-muted-foreground mb-1">التالي:</p>
                    <p className="text-xs font-medium text-foreground truncate">
                      {navigationPoints[currentPointIndex + 1].billboard.name}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Points List */}
            <div className="max-h-48 overflow-y-auto p-2">
              {navigationPoints.map((point, index) => (
                <div
                  key={point.billboard.id}
                  className={`flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer ${
                    index === currentPointIndex ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'
                  } ${point.reached ? 'opacity-60' : ''}`}
                  onClick={() => skipToPoint(index)}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    point.reached
                      ? 'bg-emerald-500 text-white'
                      : index === currentPointIndex 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {point.reached ? '✓' : index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${point.reached ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {point.billboard.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{point.distance?.toFixed(1)} كم</p>
                  </div>
                  {point.reached && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="p-3 border-t border-border/50 space-y-2">
              <div className="flex gap-2">
                {!userLocation ? (
                  <Button
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={onRequestLocation}
                  >
                    <MapPin className="w-4 h-4 ml-2" />
                    تحديد موقعي
                  </Button>
                ) : !isTracking ? (
                  <Button
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={startTracking}
                  >
                    <Navigation className="w-4 h-4 ml-2" />
                    بدء التتبع المباشر
                  </Button>
                ) : (
                  <Button
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    onClick={stopTracking}
                  >
                    <RotateCcw className="w-4 h-4 ml-2" />
                    إيقاف التتبع
                  </Button>
                )}
              </div>
              
              {/* Google Maps Button - More prominent */}
              <Button
                variant="outline"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 font-bold py-3 shadow-lg"
                onClick={openGoogleMapsNavigation}
              >
                <Route className="w-5 h-5 ml-2" />
                <span>أكمل المسار في خرائط جوجل</span>
                <span className="mr-2 bg-white/20 text-[10px] px-2 py-0.5 rounded-full">
                  {navigationPoints.length} محطات
                </span>
              </Button>
            </div>
            
            {/* Warning if no GPS */}
            {isTracking && !currentLocation && (
              <div className="px-3 pb-3">
                <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 rounded-lg p-2 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>جاري تحديد موقعك... تأكد من تفعيل GPS</span>
                </div>
              </div>
            )}
          </>
        )}

        {!isExpanded && currentPoint && (
          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                currentPoint.reached ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground'
              }`}>
                {currentPoint.reached ? '✓' : currentPointIndex + 1}
              </div>
              <span className="text-sm font-medium text-foreground truncate max-w-[150px]">{currentPoint.billboard.name}</span>
            </div>
            <span className="text-sm font-bold text-primary">{distanceToNext.toFixed(1)} كم</span>
          </div>
        )}
      </div>
    </div>
  )
}
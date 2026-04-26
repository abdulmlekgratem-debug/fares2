// OSRM Routing Service for real road directions

export interface RoutePoint {
  lat: number
  lng: number
}

export interface RouteResult {
  coordinates: RoutePoint[]
  distance: number // in meters
  duration: number // in seconds
  success: boolean
  error?: string
}

// Use OSRM public demo server (free, no API key required)
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1'

/**
 * Simplify route by keeping only essential points
 * Uses Douglas-Peucker-like approach: keep start, end, and sampled points
 */
function simplifyRoute(points: RoutePoint[], maxPoints: number): RoutePoint[] {
  if (points.length <= maxPoints) return points
  
  const step = Math.ceil(points.length / maxPoints)
  const simplified: RoutePoint[] = []
  
  for (let i = 0; i < points.length; i += step) {
    simplified.push(points[i])
  }
  
  // Always include the last point
  if (simplified[simplified.length - 1] !== points[points.length - 1]) {
    simplified.push(points[points.length - 1])
  }
  
  return simplified
}

/**
 * Get driving route between multiple waypoints using OSRM
 * Returns actual road-following coordinates instead of straight lines
 */
export async function getRouteFromOSRM(waypoints: RoutePoint[]): Promise<RouteResult> {
  if (waypoints.length < 2) {
    return {
      coordinates: waypoints,
      distance: 0,
      duration: 0,
      success: false,
      error: 'At least 2 waypoints required'
    }
  }

  try {
    // Build coordinates string: lng,lat;lng,lat;...
    const coordsString = waypoints
      .map(p => `${p.lng},${p.lat}`)
      .join(';')

    // Request route with full geometry
    const url = `${OSRM_BASE_URL}/driving/${coordsString}?overview=full&geometries=geojson&steps=false`

    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`OSRM request failed: ${response.status}`)
    }

    const data = await response.json()

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      // Fallback to straight lines if no route found
      return {
        coordinates: waypoints,
        distance: 0,
        duration: 0,
        success: false,
        error: data.message || 'No route found'
      }
    }

    const route = data.routes[0]
    const rawCoordinates: RoutePoint[] = route.geometry.coordinates.map(
      (coord: [number, number]) => ({
        lat: coord[1],
        lng: coord[0]
      })
    )

    // Simplify the route to reduce points (keep every Nth point)
    // This prevents heavy rendering on the map
    const simplifiedCoordinates = simplifyRoute(rawCoordinates, 50)

    return {
      coordinates: simplifiedCoordinates,
      distance: route.distance, // meters
      duration: route.duration, // seconds
      success: true
    }
  } catch (error) {
    console.error('OSRM routing error:', error)
    // Fallback to straight lines on error
    return {
      coordinates: waypoints,
      distance: 0,
      duration: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Format distance in a human-readable way
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} م`
  }
  return `${(meters / 1000).toFixed(1)} كم`
}

/**
 * Format duration in a human-readable way
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes} دقيقة`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}س ${remainingMinutes}د`
}

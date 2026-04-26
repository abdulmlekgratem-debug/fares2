/**
 * Hook لإدارة فلاتر البحث على اللوحات الإعلانية
 * يتولى حساب الخيارات، تطبيق الفلاتر، وإرجاع النتائج
 */

import { useState, useEffect, useMemo } from "react"
import { Billboard } from "@/types"
import { parseExpiryDate } from "@/utils/dateUtils"

interface NearbyLocation {
  lat: number
  lng: number
  radius: number
}

interface UseBillboardFiltersReturn {
  // State
  searchTerm: string
  setSearchTerm: (v: string) => void
  selectedMunicipalities: string[]
  setSelectedMunicipalities: (v: string[]) => void
  selectedCities: string[]
  setSelectedCities: (v: string[]) => void
  selectedAreas: string[]
  setSelectedAreas: (v: string[]) => void
  selectedSizes: string[]
  setSelectedSizes: (v: string[]) => void
  selectedAvailability: string
  setSelectedAvailability: (v: string) => void
  nearbyLocation: NearbyLocation | null
  setNearbyLocation: (v: NearbyLocation | null) => void

  // Computed
  filteredBillboards: Billboard[]
  filteredBillboardsForMap: Billboard[]
  municipalities: string[]
  cities: string[]
  areas: string[]
  sizes: string[]
  availabilityOptions: { value: string; label: string; count: number }[]
}

export function useBillboardFilters(billboards: Billboard[]): UseBillboardFiltersReturn {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMunicipalities, setSelectedMunicipalities] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedAvailability, setSelectedAvailability] = useState("available")
  const [nearbyLocation, setNearbyLocation] = useState<NearbyLocation | null>(null)

  // Unique filter options
  const municipalities = useMemo(
    () => Array.from(new Set(billboards.map(b => b.municipality).filter(Boolean))),
    [billboards]
  )
  const cities = useMemo(
    () => Array.from(new Set(billboards.map(b => b.city).filter(Boolean))),
    [billboards]
  )
  const areas = useMemo(
    () => Array.from(new Set(billboards.map(b => b.area).filter(Boolean))),
    [billboards]
  )
  const sizes = useMemo(
    () => Array.from(new Set(billboards.map(b => b.size).filter(Boolean))),
    [billboards]
  )

  // Availability options with counts
  const availabilityOptions = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const options: { value: string; label: string; count: number }[] = []

    const availableCount = billboards.filter(b => b.status === "متاح").length
    options.push({ value: "available", label: `متاح (${availableCount})`, count: availableCount })

    const soonDate = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000)
    const soonCount = billboards.filter(b => {
      if (b.status === "متاح") return false
      const expiry = parseExpiryDate(b.expiryDate)
      return expiry && expiry <= soonDate && expiry > now
    }).length
    options.push({ value: "soon", label: `قريباً (${soonCount})`, count: soonCount })

    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
    for (let i = 1; i <= 12; i++) {
      const targetMonth = (currentMonth + i) % 12
      const targetYear = currentYear + Math.floor((currentMonth + i) / 12)
      const monthStart = new Date(targetYear, targetMonth, 1)
      const monthEnd = new Date(targetYear, targetMonth + 1, 0)
      const monthCount = billboards.filter(b => {
        if (b.status === "متاح") return false
        const expiry = parseExpiryDate(b.expiryDate)
        return expiry && expiry >= monthStart && expiry <= monthEnd
      }).length
      if (monthCount > 0) {
        options.push({
          value: `month-${targetMonth + 1}-${targetYear}`,
          label: `${monthNames[targetMonth]} ${targetYear} (${monthCount})`,
          count: monthCount,
        })
      }
    }
    return options
  }, [billboards])

  // Apply filters except availability (used for the map which has its own status filter)
  const filteredBillboardsForMap = useMemo(() => {
    let filtered = billboards

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(b =>
        b.name.toLowerCase().includes(term) ||
        b.location.toLowerCase().includes(term) ||
        b.municipality.toLowerCase().includes(term) ||
        b.city.toLowerCase().includes(term) ||
        b.area.toLowerCase().includes(term) ||
        b.billboardType.toLowerCase().includes(term)
      )
    }

    if (selectedMunicipalities.length > 0) {
      filtered = filtered.filter(b => selectedMunicipalities.includes(b.municipality))
    }
    if (selectedCities.length > 0) {
      filtered = filtered.filter(b => selectedCities.includes(b.city))
    }
    if (selectedAreas.length > 0) {
      filtered = filtered.filter(b => selectedAreas.includes(b.area))
    }
    if (selectedSizes.length > 0) {
      filtered = filtered.filter(b => selectedSizes.includes(b.size))
    }

    if (nearbyLocation) {
      const { lat: userLat, lng: userLng, radius } = nearbyLocation
      filtered = filtered.filter(b => {
        const coords = b.coordinates.split(',').map(c => parseFloat(c.trim()))
        if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return false
        const R = 6371
        const dLat = (coords[0] - userLat) * Math.PI / 180
        const dLng = (coords[1] - userLng) * Math.PI / 180
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(userLat * Math.PI / 180) * Math.cos(coords[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= radius
      })
    }

    return filtered
  }, [billboards, searchTerm, selectedMunicipalities, selectedCities, selectedAreas, selectedSizes, nearbyLocation])

  // Apply all filters
  const filteredBillboards = useMemo(() => {
    let filtered = billboards

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(b =>
        b.name.toLowerCase().includes(term) ||
        b.location.toLowerCase().includes(term) ||
        b.municipality.toLowerCase().includes(term) ||
        b.city.toLowerCase().includes(term) ||
        b.area.toLowerCase().includes(term) ||
        b.billboardType.toLowerCase().includes(term)
      )
    }

    if (selectedMunicipalities.length > 0) {
      filtered = filtered.filter(b => selectedMunicipalities.includes(b.municipality))
    }

    if (selectedCities.length > 0) {
      filtered = filtered.filter(b => selectedCities.includes(b.city))
    }

    if (selectedAreas.length > 0) {
      filtered = filtered.filter(b => selectedAreas.includes(b.area))
    }

    if (selectedSizes.length > 0) {
      filtered = filtered.filter(b => selectedSizes.includes(b.size))
    }

    if (selectedAvailability !== "all") {
      const now = new Date()
      if (selectedAvailability === "available") {
        filtered = filtered.filter(b => b.status === "متاح")
      } else if (selectedAvailability === "soon") {
        const soonDate = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(b => {
          if (b.status === "متاح") return false
          const expiry = parseExpiryDate(b.expiryDate)
          return expiry && expiry <= soonDate && expiry > now
        })
      } else if (selectedAvailability.startsWith("month-")) {
        const parts = selectedAvailability.split("-")
        const targetMonth = parseInt(parts[1]) - 1
        const targetYear = parseInt(parts[2])
        const monthStart = new Date(targetYear, targetMonth, 1)
        const monthEnd = new Date(targetYear, targetMonth + 1, 0)
        filtered = filtered.filter(b => {
          if (b.status === "متاح") return false
          const expiry = parseExpiryDate(b.expiryDate)
          return expiry && expiry >= monthStart && expiry <= monthEnd
        })
      }
    }

    if (nearbyLocation) {
      const { lat: userLat, lng: userLng, radius } = nearbyLocation
      filtered = filtered.filter(b => {
        const coords = b.coordinates.split(',').map(c => parseFloat(c.trim()))
        if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return false
        const R = 6371
        const dLat = (coords[0] - userLat) * Math.PI / 180
        const dLng = (coords[1] - userLng) * Math.PI / 180
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(userLat * Math.PI / 180) * Math.cos(coords[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= radius
      })
    }

    return filtered
  }, [billboards, searchTerm, selectedMunicipalities, selectedCities, selectedAreas, selectedSizes, selectedAvailability, nearbyLocation])

  return {
    searchTerm, setSearchTerm,
    selectedMunicipalities, setSelectedMunicipalities,
    selectedCities, setSelectedCities,
    selectedAreas, setSelectedAreas,
    selectedSizes, setSelectedSizes,
    selectedAvailability, setSelectedAvailability,
    nearbyLocation, setNearbyLocation,
    filteredBillboards,
    filteredBillboardsForMap,
    municipalities, cities, areas, sizes,
    availabilityOptions,
  }
}

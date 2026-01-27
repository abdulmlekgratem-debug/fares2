"use client"

/**
 * مكون البحث والفلاتر - Search and Filters Component
 * يحتوي على شريط البحث وفلاتر البلديات والمدن والمناطق والمقاسات والحالة
 * يتضمن أزرار التحكم في العرض والطباعة وعرض الخريطة
 */

import { Search, Grid, List, FileDown, FileSpreadsheet, Map, RotateCcw, Filter, Sparkles, Locate, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MultiSelect } from "@/components/ui/multi-select"
import { Tooltip } from "@/components/ui/tooltip"
import { useRipple } from "@/hooks/useRipple"
import { useState, useCallback } from "react"

interface SearchFiltersProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedMunicipalities: string[]
  setSelectedMunicipalities: (municipalities: string[]) => void
  selectedCities: string[]
  setSelectedCities: (cities: string[]) => void
  selectedAreas: string[]
  setSelectedAreas: (areas: string[]) => void
  selectedSizes: string[]
  setSelectedSizes: (sizes: string[]) => void
  selectedAvailability: string
  setSelectedAvailability: (availability: string) => void
  viewMode: "grid" | "list"
  setViewMode: (mode: "grid" | "list") => void
  showMap: boolean
  setShowMap: (show: boolean) => void
  municipalities: string[]
  cities: string[]
  areas: string[]
  sizes: string[]
  availabilityOptions: { value: string; label: string }[]
  totalCount: number
  onPrint: () => void
  onExcel?: () => void
  onNearbyFilter?: (lat: number, lng: number, radius: number) => void
  isNearbyActive?: boolean
  onClearNearby?: () => void
}

export default function SearchFilters({
  searchTerm,
  setSearchTerm,
  selectedMunicipalities,
  setSelectedMunicipalities,
  selectedCities,
  setSelectedCities,
  selectedAreas,
  setSelectedAreas,
  selectedSizes,
  setSelectedSizes,
  selectedAvailability,
  setSelectedAvailability,
  viewMode,
  setViewMode,
  showMap,
  setShowMap,
  municipalities,
  cities,
  areas,
  sizes,
  availabilityOptions,
  totalCount,
  onPrint,
  onExcel,
  onNearbyFilter,
  isNearbyActive = false,
  onClearNearby,
}: SearchFiltersProps) {
  const excelButtonRipple = useRipple<HTMLButtonElement>()
  const [isLocating, setIsLocating] = useState(false)
  // Ripple hooks for buttons
  const mapButtonRipple = useRipple<HTMLButtonElement>()
  const pdfButtonRipple = useRipple<HTMLButtonElement>()
  const gridButtonRipple = useRipple<HTMLButtonElement>()
  const listButtonRipple = useRipple<HTMLButtonElement>()
  const clearButtonRipple = useRipple<HTMLButtonElement>()

  // حساب عدد الفلاتر النشطة
  const activeFiltersCount = 
    selectedMunicipalities.length + 
    selectedCities.length + 
    selectedAreas.length + 
    selectedSizes.length +
    (searchTerm ? 1 : 0) +
    (isNearbyActive ? 1 : 0)

  // دالة مسح جميع الفلاتر
  const clearAllFilters = () => {
    setSearchTerm("")
    setSelectedMunicipalities([])
    setSelectedCities([])
    setSelectedAreas([])
    setSelectedSizes([])
    onClearNearby?.()
  }

  // دالة تحديد الموقع والفلترة
  const handleNearbyFilter = useCallback(() => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم تحديد الموقع')
      return
    }
    
    setIsLocating(true)
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setIsLocating(false)
        onNearbyFilter?.(latitude, longitude, 10) // 10km radius
      },
      (error) => {
        setIsLocating(false)
        console.error('Geolocation error:', error)
        if (error.code === 1) {
          alert('تم رفض إذن الموقع. يرجى السماح بالوصول للموقع من إعدادات المتصفح.')
        } else {
          alert('تعذر تحديد الموقع. تأكد من تفعيل GPS.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [onNearbyFilter])

  return (
    <div className="relative z-10 mb-8 md:mb-12">
      {/* Background with glassmorphism effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-card/98 via-card/95 to-card/98 backdrop-blur-xl rounded-2xl md:rounded-3xl border border-border/40 shadow-xl md:shadow-2xl" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/3 via-transparent to-primary/3 rounded-2xl md:rounded-3xl" />
      
      <div className="relative p-4 sm:p-6 md:p-8">
        {/* Header Section - Compact */}
        <div className="text-center mb-4 md:mb-6">
          <div className="inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-primary/10 rounded-xl mb-2 md:mb-3 border border-primary/20">
            <Search className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
            <span className="text-xs md:text-sm font-bold text-primary" style={{ fontFamily: 'Doran, Tajawal, sans-serif' }}>محرك البحث المتقدم</span>
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-foreground mb-1 md:mb-2 tracking-tight" style={{ fontFamily: 'Doran, Tajawal, sans-serif' }}>
            ابحث عن موقعك الإعلاني المثالي
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground font-medium max-w-xl mx-auto" style={{ fontFamily: 'Manrope, sans-serif' }}>
            اكتشف أفضل المواقع الإعلانية في ليبيا
          </p>
        </div>

        {/* Search Input - Compact */}
        <div className="relative max-w-2xl mx-auto mb-4 md:mb-6">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="relative flex items-center">
              <Search className="absolute right-3 md:right-4 top-1/2 transform -translate-y-1/2 text-primary w-4 h-4 md:w-5 md:h-5 z-10" />
              <Input
                type="text"
                placeholder="ابحث عن اللوحات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 md:pr-12 pl-4 text-right bg-background/80 border border-border/50 focus:border-primary focus:bg-background rounded-xl py-2.5 md:py-3.5 text-sm md:text-base text-foreground placeholder:text-muted-foreground shadow-sm transition-all duration-300"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              />
            </div>
          </div>
        </div>

        {/* Filters Grid - Modern Compact Layout */}
        <div className="relative z-[50] bg-background/50 rounded-xl md:rounded-2xl p-3 md:p-5 border border-border/30 mb-4 md:mb-6 transition-all duration-300 hover:bg-background/60 hover:border-border/40">
          {/* Filter Header with Counter and Clear Button */}
          <div className="flex items-center justify-between mb-3 md:mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-3.5 md:h-4 bg-primary rounded-full" />
                <Filter className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-foreground" style={{ fontFamily: 'Doran, Tajawal, sans-serif' }}>فلترة النتائج</span>
              </div>
              
              {/* Active Filters Counter */}
              {activeFiltersCount > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/15 rounded-lg border border-primary/30 animate-scale-in">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-bold text-primary">{activeFiltersCount} فلتر</span>
                </div>
              )}
              
              <span className="text-[10px] text-muted-foreground bg-background/60 px-2 py-1 rounded-lg border border-border/30">
                {totalCount} نتيجة
              </span>
            </div>

            {/* Clear All Filters Button */}
            {activeFiltersCount > 0 && (
              <Button
                ref={clearButtonRipple.elementRef}
                onClick={(e) => {
                  clearButtonRipple.createRipple(e)
                  clearAllFilters()
                }}
                variant="ghost"
                size="sm"
                className="group flex items-center gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg px-2 py-1 transition-all duration-300 animate-scale-in"
              >
                <RotateCcw className="w-3 h-3 transition-transform duration-300 group-hover:-rotate-180" />
                <span className="text-xs font-semibold">مسح</span>
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="space-y-1.5 transition-all duration-200 hover:scale-[1.01]">
              <label className="text-[10px] md:text-xs font-semibold text-muted-foreground pr-1 flex items-center gap-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <span className="w-1 h-1 bg-primary rounded-full opacity-60"></span>
                البلدية
                {selectedMunicipalities.length > 0 && (
                  <span className="text-[9px] bg-primary/20 text-primary px-1 py-0.5 rounded">{selectedMunicipalities.length}</span>
                )}
              </label>
              <MultiSelect
                values={selectedMunicipalities}
                onValuesChange={setSelectedMunicipalities}
                options={municipalities}
                placeholder="جميع البلديات"
                allLabel="جميع البلديات"
                className="w-full border-border/40 hover:border-primary/50 bg-background/70 rounded-lg text-sm transition-all duration-200"
                searchable
              />
            </div>

            <div className="space-y-1.5 transition-all duration-200 hover:scale-[1.01]">
              <label className="text-[10px] md:text-xs font-semibold text-muted-foreground pr-1 flex items-center gap-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <span className="w-1 h-1 bg-primary rounded-full opacity-60"></span>
                المدينة
                {selectedCities.length > 0 && (
                  <span className="text-[9px] bg-primary/20 text-primary px-1 py-0.5 rounded">{selectedCities.length}</span>
                )}
              </label>
              <MultiSelect
                values={selectedCities}
                onValuesChange={setSelectedCities}
                options={cities}
                placeholder="جميع المدن"
                allLabel="جميع المدن"
                className="w-full border-border/40 hover:border-primary/50 bg-background/70 rounded-lg text-sm transition-all duration-200"
                searchable
              />
            </div>

            <div className="space-y-1.5 transition-all duration-200 hover:scale-[1.01]">
              <label className="text-[10px] md:text-xs font-semibold text-muted-foreground pr-1 flex items-center gap-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <span className="w-1 h-1 bg-primary rounded-full opacity-60"></span>
                المنطقة
                {selectedAreas.length > 0 && (
                  <span className="text-[9px] bg-primary/20 text-primary px-1 py-0.5 rounded">{selectedAreas.length}</span>
                )}
              </label>
              <MultiSelect
                values={selectedAreas}
                onValuesChange={setSelectedAreas}
                options={areas}
                placeholder="جميع المناطق"
                allLabel="جميع المناطق"
                className="w-full border-border/40 hover:border-primary/50 bg-background/70 rounded-lg text-sm transition-all duration-200"
                searchable
              />
            </div>

            <div className="space-y-1.5 transition-all duration-200 hover:scale-[1.01]">
              <label className="text-[10px] md:text-xs font-semibold text-muted-foreground pr-1 flex items-center gap-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <span className="w-1 h-1 bg-primary rounded-full opacity-60"></span>
                المقاس
                {selectedSizes.length > 0 && (
                  <span className="text-[9px] bg-primary/20 text-primary px-1 py-0.5 rounded">{selectedSizes.length}</span>
                )}
              </label>
              <MultiSelect
                values={selectedSizes}
                onValuesChange={setSelectedSizes}
                options={sizes}
                placeholder="جميع المقاسات"
                allLabel="جميع المقاسات"
                className="w-full border-border/40 hover:border-primary/50 bg-background/70 rounded-lg text-sm transition-all duration-200"
                searchable
              />
            </div>
          </div>
        </div>

        {/* Nearby Filter Button - زر القريب مني */}
        <div className="flex justify-center mb-4 md:mb-6">
          {isNearbyActive ? (
            <Button
              onClick={onClearNearby}
              className="group relative h-10 md:h-12 px-4 md:px-6 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all duration-300"
            >
              <span className="flex items-center gap-2">
                <Locate className="w-4 h-4 md:w-5 md:h-5" />
                <span>القريب مني (نشط)</span>
                <X className="w-3.5 h-3.5 md:w-4 md:h-4 opacity-70 group-hover:opacity-100" />
              </span>
            </Button>
          ) : (
            <Button
              onClick={handleNearbyFilter}
              disabled={isLocating}
              className="group relative h-10 md:h-12 px-4 md:px-6 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm bg-gradient-to-br from-card via-card to-secondary text-foreground border border-border/60 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
            >
              <span className="flex items-center gap-2">
                {isLocating ? (
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                ) : (
                  <Locate className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                )}
                <span>{isLocating ? "جاري تحديد الموقع..." : "أظهر اللوحات القريبة مني"}</span>
              </span>
            </Button>
          )}
        </div>

        {/* Action Buttons - Professional Design */}
        <div className="relative z-[10] flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4 bg-gradient-to-r from-transparent via-background/30 to-transparent py-3 md:py-4 px-2 md:px-6 rounded-xl md:rounded-2xl">
          {/* Map Toggle Button - Premium Design */}
          <Tooltip content={showMap ? "اضغط لإخفاء الخريطة التفاعلية" : "اضغط لعرض مواقع اللوحات على الخريطة"} side="bottom">
            <Button
              ref={mapButtonRipple.elementRef}
              onClick={(e) => {
                mapButtonRipple.createRipple(e)
                setShowMap(!showMap)
              }}
              className={`group relative overflow-hidden h-10 md:h-14 px-4 md:px-8 rounded-xl md:rounded-2xl font-bold text-xs md:text-base transition-all duration-400 ${
                showMap 
                  ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/50 scale-[1.02]' 
                  : 'bg-gradient-to-br from-card via-card to-secondary text-foreground border border-border/60 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10'
              }`}
            >
              {/* Animated background shimmer */}
              <div className={`absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out`} />
              {/* Glow effect */}
              <div className={`absolute -inset-1 bg-gradient-to-r ${showMap ? 'from-emerald-400/30 to-emerald-600/30' : 'from-primary/0 to-primary/0 group-hover:from-primary/20 group-hover:to-primary/20'} rounded-xl md:rounded-2xl blur-lg transition-all duration-500 opacity-0 group-hover:opacity-100`} />
              <span className="relative z-10 flex items-center gap-1.5 md:gap-3">
                <div className={`p-1 md:p-1.5 rounded-md md:rounded-lg ${showMap ? 'bg-white/20' : 'bg-primary/10'} transition-colors duration-300`}>
                  <Map className={`w-4 h-4 md:w-5 md:h-5 transition-all duration-300 ${showMap ? 'text-white' : 'text-primary'}`} />
                </div>
                <span className="font-bold hidden sm:inline">{showMap ? "إخفاء الخريطة" : "عرض الخريطة"}</span>
                <span className="font-bold sm:hidden">{showMap ? "إخفاء" : "خريطة"}</span>
              </span>
            </Button>
          </Tooltip>

          {/* PDF Export Button - Premium Design */}
          <Tooltip content="تصدير قائمة اللوحات المحددة كملف PDF" side="bottom">
            <Button
              ref={pdfButtonRipple.elementRef}
              onClick={(e) => {
                pdfButtonRipple.createRipple(e)
                onPrint()
              }}
              className="group relative overflow-hidden h-10 md:h-14 px-4 md:px-8 rounded-xl md:rounded-2xl font-bold text-xs md:text-base bg-gradient-to-br from-primary via-primary to-primary/80 hover:from-primary/95 hover:via-primary/90 hover:to-primary/85 text-primary-foreground shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-400 hover:scale-[1.02] active:scale-[0.98]"
            >
              {/* Animated background shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out" />
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-primary/30 rounded-xl md:rounded-2xl blur-lg transition-all duration-500 opacity-0 group-hover:opacity-100" />
              <span className="relative z-10 flex items-center gap-1.5 md:gap-3">
                <div className="p-1 md:p-1.5 rounded-md md:rounded-lg bg-white/20 transition-colors duration-300">
                  <FileDown className="w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" />
                </div>
                <span className="font-bold">PDF</span>
              </span>
            </Button>
          </Tooltip>

          {/* Excel Export Button - Premium Design */}
          {onExcel && (
            <Tooltip content="تصدير قائمة اللوحات كملف Excel" side="bottom">
              <Button
                ref={excelButtonRipple.elementRef}
                onClick={(e) => {
                  excelButtonRipple.createRipple(e)
                  onExcel()
                }}
                className="group relative overflow-hidden h-10 md:h-14 px-4 md:px-8 rounded-xl md:rounded-2xl font-bold text-xs md:text-base bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-400 hover:via-emerald-500 hover:to-emerald-600 text-white shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40 transition-all duration-400 hover:scale-[1.02] active:scale-[0.98]"
              >
                {/* Animated background shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out" />
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400/30 to-emerald-600/30 rounded-xl md:rounded-2xl blur-lg transition-all duration-500 opacity-0 group-hover:opacity-100" />
                <span className="relative z-10 flex items-center gap-1.5 md:gap-3">
                  <div className="p-1 md:p-1.5 rounded-md md:rounded-lg bg-white/20 transition-colors duration-300">
                    <FileSpreadsheet className="w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" />
                  </div>
                  <span className="font-bold">Excel</span>
                </span>
              </Button>
            </Tooltip>
          )}

          {/* View Mode Toggle - Premium Design */}
          <div className="flex items-center h-10 md:h-14 bg-gradient-to-br from-card via-card to-secondary rounded-xl md:rounded-2xl p-1 md:p-1.5 border border-border/60 shadow-lg">
            <Tooltip content="عرض شبكي للوحات" side="bottom">
              <Button
                ref={gridButtonRipple.elementRef}
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  gridButtonRipple.createRipple(e)
                  setViewMode("grid")
                }}
                className={`h-8 md:h-11 rounded-lg md:rounded-xl px-3 md:px-5 transition-all duration-300 ${
                  viewMode === "grid" 
                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl" 
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}
              >
                <Grid className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-200 ${viewMode === "grid" ? "scale-110" : ""}`} />
              </Button>
            </Tooltip>
            <Tooltip content="عرض قائمة للوحات" side="bottom">
              <Button
                ref={listButtonRipple.elementRef}
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  listButtonRipple.createRipple(e)
                  setViewMode("list")
                }}
                className={`h-8 md:h-11 rounded-lg md:rounded-xl px-3 md:px-5 transition-all duration-300 ${
                  viewMode === "list" 
                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl" 
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}
              >
                <List className={`w-4 h-4 md:w-5 md:h-5 transition-transform duration-200 ${viewMode === "list" ? "scale-110" : ""}`} />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
}

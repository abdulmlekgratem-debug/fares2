"use client"

/**
 * مكون البحث والفلاتر - Search and Filters Component
 * يحتوي على شريط البحث وفلاتر البلديات والمدن والمناطق والمقاسات والحالة
 * يتضمن أزرار التحكم في العرض والطباعة وعرض الخريطة
 */

import { Search, MapPin, Grid, List, FileDown, Map, RotateCcw, Filter, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MultiSelect } from "@/components/ui/multi-select"
import { Tooltip } from "@/components/ui/tooltip"
import { useRipple } from "@/hooks/useRipple"

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
}: SearchFiltersProps) {
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
    (searchTerm ? 1 : 0)

  // دالة مسح جميع الفلاتر
  const clearAllFilters = () => {
    setSearchTerm("")
    setSelectedMunicipalities([])
    setSelectedCities([])
    setSelectedAreas([])
    setSelectedSizes([])
  }

  return (
    <div className="relative z-10 mb-12">
      {/* Background with glassmorphism effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-card/95 via-card/90 to-card/95 backdrop-blur-xl rounded-3xl border border-border/50 shadow-2xl" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl" />
      
      <div className="relative p-8 md:p-10">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4 border border-primary/20">
            <Search className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-primary">محرك البحث المتقدم</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3 tracking-tight">
            ابحث عن موقعك الإعلاني المثالي
          </h2>
          <p className="text-lg text-muted-foreground font-medium max-w-2xl mx-auto">
            اكتشف أفضل المواقع الإعلانية في ليبيا مع خدماتنا المتميزة
          </p>
        </div>

        {/* Search Input - Enhanced */}
        <div className="relative max-w-3xl mx-auto mb-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="relative flex items-center">
              <Search className="absolute right-5 top-1/2 transform -translate-y-1/2 text-primary w-6 h-6 z-10" />
              <Input
                type="text"
                placeholder="ابحث عن اللوحات (الاسم، الموقع، البلدية، المدينة)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-14 pl-6 text-right bg-background/80 border-2 border-border/50 focus:border-primary focus:bg-background rounded-2xl py-5 text-lg text-foreground placeholder:text-muted-foreground shadow-inner transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Filters Grid - Modern Layout with Animations */}
        <div className="relative z-[50] bg-background/40 rounded-2xl p-6 border border-border/30 mb-8 transition-all duration-500 hover:bg-background/50 hover:shadow-lg hover:border-border/50">
          {/* Filter Header with Counter and Clear Button */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-primary rounded-full animate-pulse" />
                <Filter className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">فلترة النتائج</span>
              </div>
              
              {/* Active Filters Counter */}
              {activeFiltersCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/15 rounded-full border border-primary/30 animate-scale-in">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-bold text-primary">{activeFiltersCount} فلتر نشط</span>
                </div>
              )}
              
              <span className="text-xs text-muted-foreground bg-background/60 px-3 py-1 rounded-full border border-border/30 transition-all duration-300">
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
                className="group flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg px-4 py-2 transition-all duration-300 animate-scale-in"
              >
                <RotateCcw className="w-4 h-4 transition-transform duration-300 group-hover:-rotate-180" />
                <span className="text-sm font-semibold">مسح الكل</span>
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2 transform transition-all duration-300 hover:scale-[1.02]" style={{ animationDelay: '0ms' }}>
              <label className="text-xs font-semibold text-muted-foreground pr-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-primary rounded-full opacity-60"></span>
                البلدية
                {selectedMunicipalities.length > 0 && (
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{selectedMunicipalities.length}</span>
                )}
              </label>
              <MultiSelect
                values={selectedMunicipalities}
                onValuesChange={setSelectedMunicipalities}
                options={municipalities}
                placeholder="جميع البلديات"
                allLabel="جميع البلديات"
                className="w-full border-border/50 hover:border-primary/50 bg-background/60 rounded-xl transition-all duration-300"
                searchable
              />
            </div>

            <div className="space-y-2 transform transition-all duration-300 hover:scale-[1.02]" style={{ animationDelay: '50ms' }}>
              <label className="text-xs font-semibold text-muted-foreground pr-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-primary rounded-full opacity-60"></span>
                المدينة
                {selectedCities.length > 0 && (
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{selectedCities.length}</span>
                )}
              </label>
              <MultiSelect
                values={selectedCities}
                onValuesChange={setSelectedCities}
                options={cities}
                placeholder="جميع المدن"
                allLabel="جميع المدن"
                className="w-full border-border/50 hover:border-primary/50 bg-background/60 rounded-xl transition-all duration-300"
                searchable
              />
            </div>

            <div className="space-y-2 transform transition-all duration-300 hover:scale-[1.02]" style={{ animationDelay: '100ms' }}>
              <label className="text-xs font-semibold text-muted-foreground pr-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-primary rounded-full opacity-60"></span>
                المنطقة
                {selectedAreas.length > 0 && (
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{selectedAreas.length}</span>
                )}
              </label>
              <MultiSelect
                values={selectedAreas}
                onValuesChange={setSelectedAreas}
                options={areas}
                placeholder="جميع المناطق"
                allLabel="جميع المناطق"
                className="w-full border-border/50 hover:border-primary/50 bg-background/60 rounded-xl transition-all duration-300"
                searchable
              />
            </div>

            <div className="space-y-2 transform transition-all duration-300 hover:scale-[1.02]" style={{ animationDelay: '150ms' }}>
              <label className="text-xs font-semibold text-muted-foreground pr-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-primary rounded-full opacity-60"></span>
                المقاس
                {selectedSizes.length > 0 && (
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{selectedSizes.length}</span>
                )}
              </label>
              <MultiSelect
                values={selectedSizes}
                onValuesChange={setSelectedSizes}
                options={sizes}
                placeholder="جميع المقاسات"
                allLabel="جميع المقاسات"
                className="w-full border-border/50 hover:border-primary/50 bg-background/60 rounded-xl transition-all duration-300"
                searchable
              />
            </div>
          </div>
        </div>

        {/* Action Buttons - Professional Design */}
        <div className="relative z-[10] flex flex-wrap items-center justify-center gap-4 bg-gradient-to-r from-transparent via-background/30 to-transparent py-4 px-6 rounded-2xl">
          {/* Map Toggle Button - Premium Design */}
          <Tooltip content={showMap ? "اضغط لإخفاء الخريطة التفاعلية" : "اضغط لعرض مواقع اللوحات على الخريطة"} side="bottom">
            <Button
              ref={mapButtonRipple.elementRef}
              onClick={(e) => {
                mapButtonRipple.createRipple(e)
                setShowMap(!showMap)
              }}
              className={`group relative overflow-hidden h-14 px-8 rounded-2xl font-bold text-base transition-all duration-400 ${
                showMap 
                  ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/50 scale-[1.02]' 
                  : 'bg-gradient-to-br from-card via-card to-secondary text-foreground border border-border/60 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10'
              }`}
            >
              {/* Animated background shimmer */}
              <div className={`absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out`} />
              {/* Glow effect */}
              <div className={`absolute -inset-1 bg-gradient-to-r ${showMap ? 'from-emerald-400/30 to-emerald-600/30' : 'from-primary/0 to-primary/0 group-hover:from-primary/20 group-hover:to-primary/20'} rounded-2xl blur-lg transition-all duration-500 opacity-0 group-hover:opacity-100`} />
              <span className="relative z-10 flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${showMap ? 'bg-white/20' : 'bg-primary/10'} transition-colors duration-300`}>
                  <Map className={`w-5 h-5 transition-all duration-300 ${showMap ? 'text-white' : 'text-primary'}`} />
                </div>
                <span className="font-bold">{showMap ? "إخفاء الخريطة" : "عرض الخريطة"}</span>
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
              className="group relative overflow-hidden h-14 px-8 rounded-2xl font-bold text-base bg-gradient-to-br from-primary via-primary to-primary/80 hover:from-primary/95 hover:via-primary/90 hover:to-primary/85 text-primary-foreground shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-400 hover:scale-[1.02] active:scale-[0.98]"
            >
              {/* Animated background shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-out" />
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-primary/30 rounded-2xl blur-lg transition-all duration-500 opacity-0 group-hover:opacity-100" />
              <span className="relative z-10 flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-white/20 transition-colors duration-300">
                  <FileDown className="w-5 h-5 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5" />
                </div>
                <span className="font-bold">تصدير PDF</span>
              </span>
            </Button>
          </Tooltip>

          {/* View Mode Toggle - Premium Design */}
          <div className="flex items-center h-14 bg-gradient-to-br from-card via-card to-secondary rounded-2xl p-1.5 border border-border/60 shadow-lg">
            <Tooltip content="عرض شبكي للوحات" side="bottom">
              <Button
                ref={gridButtonRipple.elementRef}
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  gridButtonRipple.createRipple(e)
                  setViewMode("grid")
                }}
                className={`h-11 rounded-xl px-5 transition-all duration-300 ${
                  viewMode === "grid" 
                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl" 
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}
              >
                <Grid className={`w-5 h-5 transition-transform duration-200 ${viewMode === "grid" ? "scale-110" : ""}`} />
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
                className={`h-11 rounded-xl px-5 transition-all duration-300 ${
                  viewMode === "list" 
                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl" 
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                }`}
              >
                <List className={`w-5 h-5 transition-transform duration-200 ${viewMode === "list" ? "scale-110" : ""}`} />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
}

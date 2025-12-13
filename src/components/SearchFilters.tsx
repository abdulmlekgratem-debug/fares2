"use client"

/**
 * مكون البحث والفلاتر - Search and Filters Component
 * يحتوي على شريط البحث وفلاتر البلديات والمدن والمناطق والمقاسات والحالة
 * يتضمن أزرار التحكم في العرض والطباعة وعرض الخريطة
 */

import { Search, MapPin, Grid, List, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MultiSelect } from "@/components/ui/multi-select"

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
  return (
    <div className="relative z-[100000] glass rounded-2xl p-8 mb-12 gold-border-glow">
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4 tracking-tight">
            ابحث عن موقعك الإعلاني المثالي
          </h2>
          <p className="text-lg text-muted-foreground font-semibold">
            اكتشف أفضل المواقع الإعلانية في ليبيا مع خدماتنا المتميزة
          </p>
        </div>

        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-primary w-6 h-6" />
          <Input
            type="text"
            placeholder="ابحث عن اللوحات (الاسم، الموقع، البلدية، المدينة)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-12 text-right bg-input border-2 border-border focus:border-primary rounded-xl py-4 text-lg text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-center">
          <div className="flex flex-wrap gap-4">
            <MultiSelect
              values={selectedMunicipalities}
              onValuesChange={setSelectedMunicipalities}
              options={municipalities}
              placeholder="جميع البلديات"
              allLabel="جميع البلديات"
              className="w-52 border-border hover:border-primary/50"
              searchable
            />

            <MultiSelect
              values={selectedCities}
              onValuesChange={setSelectedCities}
              options={cities}
              placeholder="جميع المدن"
              allLabel="جميع المدن"
              className="w-52 border-border hover:border-primary/50"
              searchable
            />

            <MultiSelect
              values={selectedAreas}
              onValuesChange={setSelectedAreas}
              options={areas}
              placeholder="جميع المناطق"
              allLabel="جميع المناطق"
              className="w-52 border-border hover:border-primary/50"
              searchable
            />

            <MultiSelect
              values={selectedSizes}
              onValuesChange={setSelectedSizes}
              options={sizes}
              placeholder="جميع المقاسات"
              allLabel="جميع المقاسات"
              className="w-48 border-border hover:border-primary/50"
              searchable
            />
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => setShowMap(!showMap)}
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold px-6 py-3 rounded-xl border border-border transition-all duration-300"
            >
              <MapPin className="w-5 h-5 ml-2" />
              {showMap ? "إخفاء الخريطة" : "عرض الخريطة"}
            </Button>

            <Button
              onClick={onPrint}
              className="bg-gradient-to-r from-primary to-gold-dark hover:from-primary/90 hover:to-gold-dark/90 text-primary-foreground font-bold px-6 py-3 rounded-xl shadow-gold transition-all duration-300"
            >
              <FileDown className="w-5 h-5 ml-2" />
              حفظ التقرير PDF
            </Button>

            <div className="flex items-center gap-2 bg-secondary rounded-xl p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("grid")}
                className={`rounded-lg ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className={`rounded-lg ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

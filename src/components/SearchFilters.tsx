"use client"

/**
 * مكون البحث والفلاتر - Search and Filters Component
 * يحتوي على شريط البحث وفلاتر البلديات والمقاسات والحالة
 * يتضمن أزرار التحكم في العرض والطباعة وعرض الخريطة
 */

import { Search, MapPin, Grid, List, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SearchFiltersProps {
  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedMunicipality: string
  setSelectedMunicipality: (municipality: string) => void
  selectedSize: string
  setSelectedSize: (size: string) => void
  selectedAvailability: string
  setSelectedAvailability: (availability: string) => void
  viewMode: "grid" | "list"
  setViewMode: (mode: "grid" | "list") => void
  showMap: boolean
  setShowMap: (show: boolean) => void
  municipalities: string[]
  sizes: string[]
  onPrint: () => void
}

export default function SearchFilters({
  searchTerm,
  setSearchTerm,
  selectedMunicipality,
  setSelectedMunicipality,
  selectedSize,
  setSelectedSize,
  selectedAvailability,
  setSelectedAvailability,
  viewMode,
  setViewMode,
  showMap,
  setShowMap,
  municipalities,
  sizes,
  onPrint,
}: SearchFiltersProps) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mb-12 border-4 border-yellow-300">
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">ابحث عن موقعك الإعلاني المثالي</h2>
          <p className="text-xl text-gray-700 font-semibold">
            اكتشف أفضل المواقع الإعلانية في ليبيا مع خدماتنا المتميزة
          </p>
        </div>

               <div className="relative max-w-2xl mx-auto">
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
            <Input
              type="text"
              placeholder="ابحث عن اللوحات (الاسم، الموقع، البلدية، المنطقة)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-12 text-right border-2 border-yellow-300 focus:border-yellow-500 rounded-full py-4 text-lg shadow-lg"
            />
          </div>

          <div className="flex flex-wrap gap-6 items-center justify-center">
            <div className="flex flex-wrap gap-4">
              <Select value={selectedMunicipality} onValueChange={setSelectedMunicipality}>
                <SelectTrigger className="w-48 border-2 border-yellow-300 rounded-full text-gray-900">
                  <SelectValue placeholder="جميع البلديات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع البلديات</SelectItem>
                  {municipalities.map((municipality) => (
                    <SelectItem key={municipality} value={municipality}>
                      {municipality}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSize} onValueChange={setSelectedSize}>
                <SelectTrigger className="w-48 border-2 border-yellow-300 rounded-full text-gray-900">
                  <SelectValue placeholder="جميع المقاسات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المقاسات</SelectItem>
                  {sizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedAvailability} onValueChange={setSelectedAvailability}>
                <SelectTrigger className="w-48 border-2 border-yellow-300 rounded-full text-gray-900">
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="available">متاحة</SelectItem>
                  <SelectItem value="soon">متاحة قريباً</SelectItem>
                </SelectContent>
              </Select>
            </div>


          <div className="flex items-center gap-4">
            <Button
              onClick={() => setShowMap(!showMap)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-black px-6 py-3 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              <MapPin className="w-5 h-5 ml-2" />
              {showMap ? "إخفاء الخريطة" : "عرض الخريطة"}
            </Button>

            <button
              onClick={onPrint}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-yellow-400"
            >
              <FileDown className="w-5 h-5" />
              <span className="text-sm">حفظ التقرير PDF</span>
            </button>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="bg-yellow-500 hover:bg-yellow-600 text-black rounded-full"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="bg-yellow-500 hover:bg-yellow-600 text-black rounded-full"
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

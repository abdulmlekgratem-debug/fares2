import { MapPin, Maximize2, Clock, ZoomIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Billboard } from "@/types"
import { DisplayMode } from "@/hooks/useDisplayMode"

interface BillboardCardProps {
  billboard: Billboard
  isSelected: boolean
  onToggleSelection: (billboardId: string) => void
  onViewImage: (imageUrl: string) => void
  onShowMap: (billboard: Billboard) => void
  displayMode?: DisplayMode
}

// Helper function to calculate days remaining
const getDaysRemaining = (expiryDate: string | null): number | null => {
  if (!expiryDate) return null
  
  let parsedDate: Date | null = null
  const trimmedDate = expiryDate.trim()
  
  // Try ISO format (YYYY-MM-DD) - handles 2026-02-18
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmedDate)) {
    const parts = trimmedDate.split('-')
    const year = parseInt(parts[0])
    const month = parseInt(parts[1]) - 1
    const day = parseInt(parts[2])
    if (!isNaN(year) && !isNaN(month) && !isNaN(day) && year >= 2020) {
      parsedDate = new Date(year, month, day)
    }
  }
  
  // Try DD/MM/YYYY or DD-MM-YYYY format
  if (!parsedDate && /^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(trimmedDate)) {
    const parts = trimmedDate.split(/[/-]/)
    const day = parseInt(parts[0])
    const month = parseInt(parts[1]) - 1
    const year = parseInt(parts[2])
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year >= 2020) {
      parsedDate = new Date(year, month, day)
    }
  }
  
  if (!parsedDate || isNaN(parsedDate.getTime())) return null
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffTime = parsedDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

export default function BillboardCard({ 
  billboard, 
  isSelected, 
  onToggleSelection, 
  onViewImage, 
  onShowMap,
  displayMode = 'comfortable'
}: BillboardCardProps) {
  const daysRemaining = getDaysRemaining(billboard.expiryDate)
  const isCompact = displayMode === 'compact'
  
  return (
    <Card
      className={`group relative overflow-hidden bg-card border border-border/30 flex flex-col cursor-pointer transition-all duration-500 ease-out ${
        isCompact ? 'rounded-xl' : 'rounded-2xl md:rounded-3xl'
      } ${
        isSelected 
          ? "ring-2 ring-primary shadow-[0_8px_40px_rgba(212,175,55,0.35)] scale-[1.02] border-primary/50" 
          : "hover:shadow-[0_25px_60px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_25px_60px_rgba(0,0,0,0.5)] hover:-translate-y-2 hover:border-primary/30 hover:bg-card/95"
      }`}
      style={{
        transform: isSelected ? 'scale(1.02)' : undefined,
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Image Section - Full height display */}
      <div className={`relative overflow-hidden bg-muted ${
        isCompact ? 'aspect-[4/3]' : 'aspect-[16/10]'
      }`}>
        {/* Main Image - Full coverage without cropping */}
        <img
          src={billboard.imageUrl || "/roadside-billboard.png"}
          alt={billboard.name}
          className="absolute inset-0 w-full h-full object-contain bg-gradient-to-br from-muted via-muted/90 to-secondary/20 transition-transform duration-700 group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "https://lh3.googleusercontent.com/d/13yTnaEWp2tFSxCmg8AuXH1e9QvPNMYWq";
          }}
        />
        
        {/* Top Overlay Gradient - Subtle */}
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />
        
        {/* Bottom Overlay Gradient - Subtle */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 via-black/20 to-transparent pointer-events-none" />
        
        {/* Selection Checkbox */}
        <div className={`absolute z-20 ${isCompact ? 'top-2 left-2' : 'top-3 left-3'}`}>
          <label className="cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelection(billboard.id)}
              className="sr-only peer"
            />
            <div className={`rounded-full border-2 flex items-center justify-center transition-all duration-300 backdrop-blur-md shadow-lg ${
              isCompact ? 'w-5 h-5' : 'w-7 h-7'
            } ${
              isSelected 
                ? "bg-primary border-primary scale-110" 
                : "bg-white/20 border-white/60 hover:border-primary hover:bg-primary/20"
            }`}>
              {isSelected && (
                <svg className={`text-primary-foreground ${isCompact ? 'w-3 h-3' : 'w-4 h-4'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </label>
        </div>

        {/* Size Badge */}
        <Badge className={`absolute z-20 bg-gradient-to-r from-primary/90 to-primary/70 backdrop-blur-md text-primary-foreground font-bold rounded-full border-0 shadow-lg ${
          isCompact 
            ? 'top-2 right-2 text-[9px] px-2 py-0.5' 
            : 'top-3 right-3 text-xs px-3 py-1.5'
        }`}>
          <Maximize2 className={`opacity-80 ${isCompact ? 'w-2.5 h-2.5 ml-0.5' : 'w-3 h-3 ml-1'}`} />
          {billboard.size}
        </Badge>
        
        {/* Zoom Button - appears on hover */}
        <Button
          size="sm"
          className={`absolute z-20 opacity-0 group-hover:opacity-100 bg-white/90 dark:bg-black/70 backdrop-blur-md hover:bg-primary text-foreground hover:text-primary-foreground rounded-full font-bold h-auto border border-border/30 transition-all duration-300 shadow-lg hover:scale-110 ${
            isCompact 
              ? 'inset-0 m-auto w-8 h-8 p-0' 
              : 'inset-0 m-auto w-12 h-12 p-0'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onViewImage(billboard.imageUrl);
          }}
        >
          <ZoomIn className={isCompact ? 'w-4 h-4' : 'w-6 h-6'} />
        </Button>

        {/* Status Badge */}
        <div
          className={`absolute z-20 rounded-full font-bold backdrop-blur-md border-0 shadow-lg flex items-center ${
            isCompact 
              ? 'bottom-2 right-2 px-2 py-1 text-[9px] gap-1' 
              : 'bottom-3 right-3 px-4 py-2 text-xs gap-2'
          } ${
            billboard.status === "متاح"
              ? "bg-emerald-500 text-white"
              : billboard.status === "قريباً"
                ? "bg-amber-500 text-white"
                : "bg-rose-500 text-white"
          }`}
        >
          <span className={`rounded-full animate-pulse ${
            isCompact ? 'w-1.5 h-1.5' : 'w-2 h-2'
          } ${
            billboard.status === "متاح" ? "bg-white" : "bg-white/80"
          }`} />
          {billboard.status}
        </div>
      </div>

      {/* Content Section */}
      <CardContent className={`relative flex-1 flex flex-col bg-gradient-to-b from-card to-card/95 ${
        isCompact ? 'p-2 sm:p-3' : 'p-3 sm:p-4 md:p-5'
      }`}>
        {/* Billboard Name */}
        <h3 className={`font-black text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors duration-300 ${
          isCompact ? 'text-xs sm:text-sm mb-1.5' : 'text-sm sm:text-base md:text-lg mb-2 md:mb-3'
        }`}>
          {billboard.name}
        </h3>

        {/* Location Info */}
        <div className={`flex items-center border border-border/50 ${
          isCompact 
            ? 'gap-1.5 mb-2 p-1.5 rounded-lg bg-muted/50' 
            : 'gap-2 md:gap-3 mb-3 md:mb-4 p-2 md:p-3 rounded-xl bg-muted/50'
        }`}>
          <div className={`rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-md ${
            isCompact ? 'w-6 h-6' : 'w-8 h-8 md:w-10 md:h-10 md:rounded-xl'
          }`}>
            <MapPin className={`text-primary-foreground ${isCompact ? 'w-3 h-3' : 'w-4 h-4 md:w-5 md:h-5'}`} />
          </div>
          <div className="text-right flex-1 min-w-0">
            <p className={`font-bold text-foreground truncate ${isCompact ? 'text-[10px]' : 'text-xs sm:text-sm'}`}>
              {billboard.location}
            </p>
            <p className={`text-muted-foreground truncate ${isCompact ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>
              {billboard.municipality}
            </p>
          </div>
        </div>

        {/* Days Remaining Badge */}
        {billboard.status !== "متاح" && daysRemaining !== null && daysRemaining > 0 && (
          <div className={`bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30 flex items-center ${
            isCompact 
              ? 'mb-2 p-1.5 rounded-lg gap-1.5' 
              : 'mb-3 md:mb-4 p-2 md:p-3 rounded-lg md:rounded-xl gap-2 md:gap-3'
          }`}>
            <div className={`rounded-md bg-amber-500/20 flex items-center justify-center ${
              isCompact ? 'w-5 h-5' : 'w-6 h-6 md:w-8 md:h-8 md:rounded-lg'
            }`}>
              <Clock className={`text-amber-500 ${isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3 md:w-4 md:h-4'}`} />
            </div>
            <div>
              <span className={`font-black text-amber-600 dark:text-amber-400 ${isCompact ? 'text-[10px]' : 'text-xs md:text-sm'}`}>
                متبقي {daysRemaining} يوم
              </span>
              <p className={`text-amber-600/70 dark:text-amber-400/70 ${isCompact ? 'text-[8px]' : 'text-[10px] md:text-xs'}`}>
                حتى الإتاحة
              </p>
            </div>
          </div>
        )}

        {/* Tags Row */}
        <div className={`flex flex-wrap items-center mb-auto ${
          isCompact ? 'gap-1 pb-1.5' : 'gap-1.5 md:gap-2 pb-2 md:pb-3'
        }`}>
          {billboard.area && (
            <Badge className={`bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-0 text-amber-700 dark:text-amber-300 rounded-full font-bold shadow-sm ${
              isCompact ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs'
            }`}>
              {billboard.area}
            </Badge>
          )}
          {billboard.city && billboard.city !== billboard.municipality && (
            <Badge className={`bg-muted/80 border-0 text-muted-foreground rounded-full font-medium shadow-sm ${
              isCompact ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs'
            }`}>
              {billboard.city}
            </Badge>
          )}
          {billboard.billboardType && (
            <Badge className={`bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-0 text-blue-700 dark:text-blue-300 rounded-full font-bold shadow-sm ${
              isCompact ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs'
            }`}>
              {billboard.billboardType}
            </Badge>
          )}
          {billboard.facesCount && (
            <Badge className={`bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-0 text-purple-700 dark:text-purple-300 rounded-full font-bold shadow-sm ${
              isCompact ? 'px-1.5 py-0.5 text-[8px]' : 'px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs'
            }`}>
              {billboard.facesCount}
            </Badge>
          )}
        </div>
      </CardContent>
      
      {/* Map Button */}
      <Button
        className={`w-full bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-black rounded-none transition-all duration-300 shadow-inner group-hover:shadow-[inset_0_-4px_20px_rgba(0,0,0,0.1)] ${
          isCompact 
            ? 'py-2 text-[10px] sm:text-xs rounded-b-xl' 
            : 'py-3 md:py-5 text-xs sm:text-sm md:text-base rounded-b-2xl md:rounded-b-3xl'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onShowMap(billboard);
        }}
      >
        <MapPin className={isCompact ? 'w-3 h-3 ml-1' : 'w-4 h-4 md:w-5 md:h-5 ml-1.5 md:ml-2 group-hover:animate-bounce'} />
        عرض الموقع على الخريطة
      </Button>
    </Card>
  )
}

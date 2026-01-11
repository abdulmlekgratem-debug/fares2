import { MapPin, Eye, Calendar, Maximize2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Billboard } from "@/types"

interface BillboardCardProps {
  billboard: Billboard
  isSelected: boolean
  onToggleSelection: (billboardId: string) => void
  onViewImage: (imageUrl: string) => void
  onShowMap: (billboard: Billboard) => void
}

// Helper function to calculate days remaining
const getDaysRemaining = (expiryDate: string | null): number | null => {
  if (!expiryDate) return null
  
  let parsedDate: Date | null = null
  
  // Try ISO format (YYYY-MM-DD)
  if (expiryDate.includes('-') && expiryDate.length === 10 && expiryDate.indexOf('-') === 4) {
    const parts = expiryDate.split('-')
    if (parts.length === 3) {
      const year = parseInt(parts[0])
      const month = parseInt(parts[1]) - 1
      const day = parseInt(parts[2])
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        parsedDate = new Date(year, month, day)
      }
    }
  }
  
  // Try DD/MM/YYYY format
  if (!parsedDate) {
    const parts = expiryDate.split(/[/-]/)
    if (parts.length === 3) {
      const day = parseInt(parts[0])
      const month = parseInt(parts[1]) - 1
      const year = parseInt(parts[2])
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 2000) {
        parsedDate = new Date(year, month, day)
      }
    }
  }
  
  if (!parsedDate || isNaN(parsedDate.getTime())) return null
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffTime = parsedDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

export default function BillboardCard({ billboard, isSelected, onToggleSelection, onViewImage, onShowMap }: BillboardCardProps) {
  const daysRemaining = getDaysRemaining(billboard.expiryDate)
  
  return (
    <Card
      className={`group relative overflow-hidden bg-card border-0 rounded-3xl flex flex-col cursor-pointer transition-all duration-300 ${
        isSelected 
          ? "ring-2 ring-primary shadow-[0_8px_30px_rgba(212,175,55,0.3)] scale-[1.02]" 
          : "hover:shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:-translate-y-1"
      }`}
    >
      {/* Image Section */}
      <div className="relative h-52 md:h-56 overflow-hidden">
        {/* Blurred Background Image */}
        <div 
          className="absolute inset-0 scale-125 blur-2xl opacity-50"
          style={{
            backgroundImage: `url(${billboard.imageUrl || "/roadside-billboard.png"})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        {/* Gradient Background Fallback */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-card to-primary/10" />
        
        {/* Main Image Container */}
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <img
            src={billboard.imageUrl || "/roadside-billboard.png"}
            alt={billboard.name}
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "https://lh3.googleusercontent.com/d/13yTnaEWp2tFSxCmg8AuXH1e9QvPNMYWq";
            }}
          />
        </div>
        
        {/* Top Overlay Gradient */}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />
        
        {/* Bottom Overlay Gradient */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
        
        {/* Selection Checkbox */}
        <div className="absolute top-3 left-3 z-20">
          <label className="cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelection(billboard.id)}
              className="sr-only peer"
            />
            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 backdrop-blur-md shadow-lg ${
              isSelected 
                ? "bg-primary border-primary scale-110" 
                : "bg-white/20 border-white/60 hover:border-primary hover:bg-primary/20"
            }`}>
              {isSelected && (
                <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </label>
        </div>

        {/* Size Badge */}
        <Badge className="absolute top-3 right-3 z-20 bg-white/90 dark:bg-black/70 backdrop-blur-md text-foreground font-bold text-xs px-3 py-1.5 rounded-full border-0 shadow-lg">
          <Maximize2 className="w-3 h-3 ml-1 opacity-60" />
          {billboard.size}
        </Badge>
        
        {/* View Image Button */}
        <Button
          size="sm"
          className="absolute bottom-3 left-3 z-20 bg-white/90 dark:bg-white/20 backdrop-blur-md hover:bg-primary text-foreground dark:text-white hover:text-primary-foreground rounded-full px-4 py-2 text-xs font-bold h-auto border-0 transition-all duration-300 shadow-lg hover:scale-105"
          onClick={(e) => {
            e.stopPropagation();
            onViewImage(billboard.imageUrl);
          }}
        >
          <Eye className="w-4 h-4 ml-1" />
          عرض
        </Button>

        {/* Status Badge */}
        <div
          className={`absolute bottom-3 right-3 z-20 px-4 py-2 rounded-full font-bold text-xs backdrop-blur-md border-0 shadow-lg flex items-center gap-2 ${
            billboard.status === "متاح"
              ? "bg-emerald-500 text-white"
              : billboard.status === "قريباً"
                ? "bg-amber-500 text-white"
                : "bg-rose-500 text-white"
          }`}
        >
          <span className={`w-2 h-2 rounded-full animate-pulse ${
            billboard.status === "متاح" ? "bg-white" : "bg-white/80"
          }`} />
          {billboard.status}
        </div>
      </div>

      {/* Content Section */}
      <CardContent className="p-5 relative flex-1 flex flex-col bg-gradient-to-b from-card to-card/95">
        {/* Billboard Name */}
        <h3 className="text-lg font-black text-foreground leading-tight mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-300">
          {billboard.name}
        </h3>

        {/* Location Info */}
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-muted/50 border border-border/50">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-md">
            <MapPin className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="text-right flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{billboard.location}</p>
            <p className="text-xs text-muted-foreground truncate">{billboard.municipality}</p>
          </div>
        </div>

        {/* Days Remaining Badge */}
        {billboard.status !== "متاح" && daysRemaining !== null && daysRemaining > 0 && (
          <div className="mb-4 p-3 bg-gradient-to-r from-amber-500/15 to-orange-500/10 rounded-xl border border-amber-500/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                متبقي {daysRemaining} يوم
              </span>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">حتى الإتاحة</p>
            </div>
          </div>
        )}

        {/* Tags Row */}
        <div className="flex flex-wrap items-center gap-2 mb-auto pb-3">
          {billboard.area && (
            <Badge className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-0 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
              {billboard.area}
            </Badge>
          )}
          {billboard.city && billboard.city !== billboard.municipality && (
            <Badge className="bg-muted/80 border-0 text-muted-foreground px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
              {billboard.city}
            </Badge>
          )}
          {billboard.billboardType && (
            <Badge className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-0 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
              {billboard.billboardType}
            </Badge>
          )}
          {billboard.facesCount && (
            <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-0 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
              {billboard.facesCount}
            </Badge>
          )}
        </div>
      </CardContent>
      
      {/* Map Button */}
      <Button
        className="w-full bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-black py-5 rounded-none rounded-b-3xl transition-all duration-300 text-base shadow-inner group-hover:shadow-[inset_0_-4px_20px_rgba(0,0,0,0.1)]"
        onClick={(e) => {
          e.stopPropagation();
          onShowMap(billboard);
        }}
      >
        <MapPin className="w-5 h-5 ml-2 group-hover:animate-bounce" />
        عرض الموقع على الخريطة
      </Button>
    </Card>
  )
}

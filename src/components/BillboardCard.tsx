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
      className={`group relative overflow-hidden bg-card border-0 rounded-2xl flex flex-col cursor-pointer transition-shadow duration-200 ${
        isSelected 
          ? "ring-2 ring-primary shadow-gold" 
          : "hover:shadow-lg hover:shadow-primary/20"
      }`}
    >
      {/* Image Section */}
      <div className="relative h-56 overflow-hidden">
        {/* Selection Checkbox */}
        <div className="absolute top-4 left-4 z-20">
          <label className="cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelection(billboard.id)}
              className="sr-only peer"
            />
            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors duration-200 backdrop-blur-md ${
              isSelected 
                ? "bg-primary border-primary shadow-gold" 
                : "bg-background/60 border-foreground/20 hover:border-primary"
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
        <Badge className="absolute top-4 right-4 z-20 bg-background/80 backdrop-blur-md text-foreground font-bold text-sm px-4 py-2 rounded-full border border-primary/30 shadow-lg">
          {billboard.size}
        </Badge>

        {/* Image */}
        <img
          src={billboard.imageUrl || "/roadside-billboard.png"}
          alt={billboard.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "https://lh3.googleusercontent.com/d/13yTnaEWp2tFSxCmg8AuXH1e9QvPNMYWq";
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent" />
        
        {/* View Image Button */}
        <Button
          size="sm"
          className="absolute bottom-4 left-4 z-20 bg-background/80 backdrop-blur-md hover:bg-primary text-foreground hover:text-primary-foreground rounded-full px-4 py-2 border border-primary/30 transition-colors duration-200"
          onClick={() => onViewImage(billboard.imageUrl)}
        >
          <Maximize2 className="w-4 h-4 ml-2" />
          عرض
        </Button>

        {/* Status Badge */}
        <Badge
          className={`absolute bottom-4 right-4 z-20 px-4 py-2 rounded-full font-bold text-sm backdrop-blur-md border ${
            billboard.status === "متاح"
              ? "bg-emerald-500/90 text-white border-emerald-400/50"
              : billboard.status === "قريباً"
                ? "bg-amber-500/90 text-white border-amber-400/50"
                : "bg-red-500/90 text-white border-red-400/50"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ml-2 inline-block ${
            billboard.status === "متاح" ? "bg-white" : "bg-white"
          }`} />
          {billboard.status}
        </Badge>
      </div>

      {/* Content Section */}
      <CardContent className="p-5 relative flex-1 flex flex-col">
        {/* Billboard Name */}
        <h3 className="text-lg font-extrabold text-foreground leading-tight mb-2 line-clamp-2">
          {billboard.name}
        </h3>

        {/* Location Info */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 border border-primary/20">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div className="text-right flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{billboard.location}</p>
          </div>
        </div>

        {/* Days Remaining Badge */}
        {billboard.status !== "متاح" && daysRemaining !== null && daysRemaining > 0 && (
          <div className="mb-3 p-3 bg-gradient-to-r from-amber-500/10 to-amber-500/5 rounded-lg border border-amber-500/20">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                متبقي {daysRemaining} يوم
              </span>
            </div>
          </div>
        )}

        {/* Tags Row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {billboard.area && (
            <Badge variant="outline" className="bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded text-xs font-bold">
              {billboard.area}
            </Badge>
          )}
          <Badge variant="outline" className="bg-primary/15 border-primary/30 text-primary px-3 py-1.5 rounded text-xs font-bold">
            {billboard.municipality}
          </Badge>
          {billboard.city && billboard.city !== billboard.municipality && (
            <Badge variant="outline" className="bg-secondary/50 border-border/50 text-foreground/80 px-3 py-1.5 rounded text-xs font-medium">
              {billboard.city}
            </Badge>
          )}
        </div>

        {/* Billboard Type & Faces Count */}
        <div className="flex flex-wrap items-center gap-2 mb-auto pb-4">
          {billboard.billboardType && (
            <Badge variant="outline" className="bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded text-xs font-bold">
              {billboard.billboardType}
            </Badge>
          )}
          {billboard.facesCount && (
            <Badge variant="outline" className="bg-purple-500/15 border-purple-500/30 text-purple-600 dark:text-purple-400 px-3 py-1.5 rounded text-xs font-bold">
              {billboard.facesCount}
            </Badge>
          )}
        </div>
      </CardContent>
      
      {/* Map Button */}
      <Button
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-none rounded-b-2xl transition-colors duration-200"
        onClick={() => onShowMap(billboard)}
      >
        <MapPin className="w-4 h-4 ml-2" />
        عرض الموقع
      </Button>
    </Card>
  )
}

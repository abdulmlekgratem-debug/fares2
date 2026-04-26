import { MapPin, Clock, ZoomIn, Navigation, Copy, Check } from "lucide-react"
import { useState } from "react"
import { Billboard } from "@/types"
import { DisplayMode } from "@/hooks/useDisplayMode"
import { getDaysRemaining } from "@/utils/dateUtils"

const FONT_DORAN = { fontFamily: 'Doran, Tajawal, sans-serif' }
const FONT_MONO  = { fontFamily: 'Manrope, monospace' }

interface BillboardCardProps {
  billboard: Billboard
  isSelected: boolean
  onToggleSelection: (billboardId: string) => void
  onViewImage: (imageUrl: string) => void
  onShowMap: (billboard: Billboard) => void
  displayMode?: DisplayMode
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 bg-secondary hover:bg-primary/15 text-muted-foreground hover:text-primary"
      title="نسخ اسم اللوحة"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
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

  const statusConfig: Record<string, { gradient: string, dot: string, label: string, glow: string }> = {
    "متاح": { gradient: "from-emerald-500 to-emerald-600", dot: "bg-white", label: "متاح", glow: "shadow-emerald-500/40" },
    "قريباً": { gradient: "from-amber-500 to-orange-500", dot: "bg-white", label: "قريباً", glow: "shadow-amber-500/40" },
    "محجوز": { gradient: "from-rose-500 to-red-600", dot: "bg-white", label: "محجوز", glow: "shadow-rose-500/40" },
  }
  const status = statusConfig[billboard.status] || statusConfig["محجوز"]

  const whatsappMsg = `مرحباً، أريد الاستفسار عن لوحة:\n${billboard.name}\nالمقاس: ${billboard.size}\nالموقع: ${billboard.location}\nالحالة: ${billboard.status}`

  return (
    <div
      className={`group relative flex flex-col overflow-hidden cursor-pointer billboard-card-enter border border-border hover:border-primary/40 ${
        isCompact ? 'rounded-xl' : 'rounded-2xl'
      } ${isSelected ? 'ring-2 ring-primary shadow-gold' : ''}`}
      style={{ 
        background: 'hsl(var(--card))', 
        ...FONT_DORAN,
        transition: 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.6s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.4s ease',
        boxShadow: isSelected 
          ? undefined
          : '0 2px 16px -2px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-8px)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 25px 60px -12px hsl(var(--primary) / 0.15), 0 12px 30px -8px rgba(0,0,0,0.12)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.transform = '';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 16px -2px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)'
        }
      }}
    >
      {/* Top accent - gold bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] z-30 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-transparent via-primary to-transparent" style={{ 
        transition: 'opacity 0.5s ease',
      }} />

      {/* ═══ IMAGE SECTION ═══ */}
      <div className={`relative overflow-hidden ${isCompact ? 'aspect-[3/2]' : 'aspect-[3/2]'}`}>
        <img
          src={billboard.imageUrl || "/roadside-billboard.png"}
          alt={billboard.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
          decoding="async"
          onError={(e) => { (e.target as HTMLImageElement).src = "/roadside-billboard.png" }}
        />
        
        {/* Cinematic overlay */}
        <div className="absolute inset-0 pointer-events-none z-[1]" style={{
          background: `
            linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 30%, transparent 50%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0.75) 100%),
            linear-gradient(135deg, rgba(0,0,0,0.1) 0%, transparent 60%)
          `
        }} />

        {/* Checkbox */}
        <label className="absolute z-20 top-3 left-3 cursor-pointer" onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={isSelected} onChange={() => onToggleSelection(billboard.id)} className="sr-only" />
          <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center transition-all duration-300 ${
            isSelected 
              ? "bg-primary border-0 shadow-gold" 
              : "border-[1.5px] border-white/60 bg-black/20 backdrop-blur-sm hover:border-white hover:bg-black/30"
          }`}>
            {isSelected && (
              <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </label>

        {/* Size badge - gold accent */}
        <div className="absolute z-20 top-3 right-3 flex items-center rounded-lg overflow-hidden shadow-gold">
          <div className="px-2.5 py-1.5 flex items-center gap-1.5 bg-primary/90 backdrop-blur-sm">
            <span className="font-black text-primary-foreground text-[11px] tracking-wider leading-none" style={FONT_MONO}>
              {billboard.size}
            </span>
          </div>
        </div>

        {/* Zoom on hover */}
        <button
          className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-400"
          onClick={(e) => { e.stopPropagation(); onViewImage(billboard.imageUrl) }}
        >
          <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-lg border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition-all duration-200 hover:scale-110">
            <ZoomIn className="w-4.5 h-4.5" />
          </div>
        </button>

        {/* Status pill */}
        <div className={`absolute z-20 bottom-3 left-3 bg-gradient-to-r ${status.gradient} text-white shadow-lg ${status.glow} rounded-full font-bold flex items-center gap-1.5 px-2.5 py-1 text-[10px]`} style={FONT_DORAN}>
          <span className={`w-[5px] h-[5px] rounded-full ${status.dot} ${billboard.status === 'متاح' ? 'animate-pulse' : ''}`} />
          {billboard.status}
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className={`flex-1 flex flex-col ${isCompact ? 'p-3 gap-2' : 'px-4 pt-4 pb-2 gap-2.5'}`}>
        
        {/* Name + Copy */}
        <div className="flex items-center gap-1.5">
          <h3 className={`font-black text-foreground leading-tight line-clamp-1 flex-1 min-w-0 transition-colors duration-300 hover:text-primary ${
            isCompact ? 'text-[13px]' : 'text-[15px]'
          }`} style={FONT_MONO}>
            {billboard.name}
          </h3>
          <CopyButton text={billboard.name} />
        </div>

        {/* Location */}
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 bg-primary/10">
            <MapPin className="w-3 h-3 text-primary" />
          </div>
          <div className="text-right flex-1 min-w-0">
            <p className={`font-semibold text-foreground/80 leading-snug line-clamp-2 ${isCompact ? 'text-[10px]' : 'text-[11px]'}`} style={FONT_DORAN}>
              {billboard.landmark || billboard.location}
            </p>
            <p className="text-muted-foreground text-[10px] mt-0.5" style={FONT_DORAN}>
              {billboard.municipality}
            </p>
          </div>
        </div>

        {/* Days remaining */}
        {billboard.status !== "متاح" && daysRemaining !== null && daysRemaining > 0 && (
          <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 bg-accent/10 border border-accent/20">
            <Clock className="w-3 h-3 text-accent flex-shrink-0" />
            <span className="font-bold text-accent text-[10px]" style={FONT_MONO}>
              متبقي {daysRemaining} يوم
            </span>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1 mt-auto">
          {billboard.area && (
            <span className="inline-flex items-center rounded-md font-semibold px-1.5 py-0.5 text-[9px] bg-primary/10 text-primary" style={FONT_DORAN}>{billboard.area}</span>
          )}
          {billboard.billboardType.trim() && (
            <span className="inline-flex items-center bg-secondary text-muted-foreground rounded-md font-semibold px-1.5 py-0.5 text-[9px]" style={FONT_DORAN}>{billboard.billboardType}</span>
          )}
          {billboard.facesCount.trim() && (
            <span className="inline-flex items-center bg-secondary text-muted-foreground rounded-md font-semibold px-1.5 py-0.5 text-[9px]" style={FONT_MONO}>{billboard.facesCount}</span>
          )}
          {billboard.city && billboard.city !== billboard.municipality && (
            <span className="inline-flex items-center bg-muted text-muted-foreground rounded-md font-medium px-1.5 py-0.5 text-[9px]" style={FONT_DORAN}>{billboard.city}</span>
          )}
        </div>
      </div>
      
      {/* ═══ BUTTONS ═══ */}
      <div className={`flex items-stretch gap-1.5 ${isCompact ? 'p-2.5' : 'px-4 pb-4 pt-1'}`}>
        <button
          className="flex-1 h-9 flex items-center justify-center gap-1.5 font-bold rounded-xl text-[11px] transition-all duration-300 active:scale-[0.97] bg-primary text-primary-foreground shadow-gold hover:shadow-[0_6px_24px_hsl(var(--primary)/0.4)]"
          style={FONT_DORAN}
          onClick={(e) => { e.stopPropagation(); onShowMap(billboard) }}
        >
          <Navigation className="w-3.5 h-3.5" />
          عرض الموقع
        </button>
        <button
          className="h-9 px-3 flex items-center justify-center gap-1.5 font-bold rounded-xl text-[11px]
            bg-[#25D366] text-white
            hover:bg-[#1fba59] active:scale-[0.97]
            shadow-[0_2px_10px_rgba(37,211,102,0.15)] hover:shadow-[0_6px_20px_rgba(37,211,102,0.25)]
            transition-all duration-300"
          style={FONT_DORAN}
          onClick={(e) => {
            e.stopPropagation()
            window.open(`https://wa.me/218913228908?text=${encodeURIComponent(whatsappMsg)}`, '_blank')
          }}
        >
          <WhatsAppIcon className="w-3.5 h-3.5" />
          واتساب
        </button>
      </div>
    </div>
  )
}
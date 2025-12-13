/**
 * مكون الإحصائيات السريعة - Stats Section Component
 * يعرض إحصائيات اللوحات المتاحة والقريبة حسب المقاس والبلدية
 */

import { useState } from "react"
import { ChevronDown, ChevronUp, BarChart3, Building2, Ruler } from "lucide-react"
import { Billboard } from "@/types"
import { Button } from "@/components/ui/button"

interface StatsSectionProps {
  billboards: Billboard[]
}

export default function StatsSection({ billboards }: StatsSectionProps) {
  const [showStats, setShowStats] = useState(false)

  // إحصائيات حسب المقاس
  const statsBySize = (() => {
    const sizeStats: { [key: string]: { available: number; soon: number } } = {}
    
    billboards.forEach(b => {
      const size = b.size || "غير محدد"
      if (!sizeStats[size]) {
        sizeStats[size] = { available: 0, soon: 0 }
      }
      if (b.status === "متاح") {
        sizeStats[size].available++
      } else if (b.status === "قريباً") {
        sizeStats[size].soon++
      }
    })
    
    return Object.entries(sizeStats)
      .filter(([_, stats]) => stats.available > 0 || stats.soon > 0)
      .sort((a, b) => (b[1].available + b[1].soon) - (a[1].available + a[1].soon))
  })()

  // إحصائيات حسب البلدية
  const statsByMunicipality = (() => {
    const munStats: { [key: string]: { available: number; soon: number } } = {}
    
    billboards.forEach(b => {
      const mun = b.municipality || "غير محدد"
      if (!munStats[mun]) {
        munStats[mun] = { available: 0, soon: 0 }
      }
      if (b.status === "متاح") {
        munStats[mun].available++
      } else if (b.status === "قريباً") {
        munStats[mun].soon++
      }
    })
    
    return Object.entries(munStats)
      .filter(([_, stats]) => stats.available > 0 || stats.soon > 0)
      .sort((a, b) => (b[1].available + b[1].soon) - (a[1].available + a[1].soon))
  })()

  const totalAvailable = billboards.filter(b => b.status === "متاح").length
  const totalSoon = billboards.filter(b => b.status === "قريباً").length

  return (
    <div className="mb-6">
      <Button
        onClick={() => setShowStats(!showStats)}
        variant="outline"
        className="w-full flex items-center justify-between gap-2 border-primary/30 hover:bg-primary/5 py-3"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground">إحصائيات سريعة</span>
          <span className="text-sm text-muted-foreground">
            (متاح: <span className="text-emerald-500 font-bold">{totalAvailable}</span> | 
            قريباً: <span className="text-amber-500 font-bold">{totalSoon}</span>)
          </span>
        </div>
        {showStats ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </Button>

      {showStats && (
        <div className="mt-4 grid md:grid-cols-2 gap-6 p-6 bg-card/50 rounded-xl border border-border">
          {/* إحصائيات حسب المقاس */}
          <div>
            <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Ruler className="w-5 h-5 text-primary" />
              حسب المقاس
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {statsBySize.map(([size, stats]) => (
                <div key={size} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
                  <span className="font-semibold text-foreground text-sm">{size}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-500 font-bold">
                      متاح: {stats.available}
                    </span>
                    {stats.soon > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-500 font-bold">
                        قريباً: {stats.soon}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* إحصائيات حسب البلدية */}
          <div>
            <h4 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              حسب البلدية
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {statsByMunicipality.map(([mun, stats]) => (
                <div key={mun} className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
                  <span className="font-semibold text-foreground text-sm">{mun}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-500 font-bold">
                      متاح: {stats.available}
                    </span>
                    {stats.soon > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-500 font-bold">
                        قريباً: {stats.soon}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

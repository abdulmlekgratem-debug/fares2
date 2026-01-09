/**
 * مكون حوار الطباعة - Print Dialog Component
 * يتيح للمستخدم اختيار طباعة PDF بالشعار أو بدونه وبالصور أو بدونها مع خيارات الأسعار
 */

import { useState, useMemo } from "react"
import { FileDown, Image, ImageOff, Camera, CameraOff, DollarSign, Percent, Tag, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RENTAL_PERIODS, getPrice, formatPrice, calculateDiscountedPrice, calculateDiscountPercentage } from "@/services/pricingService"
import { Billboard } from "@/types"

export interface PricingOptions {
  includePricing: boolean
  period: string
  discounts: {
    [level: string]: {
      type: 'percentage' | 'fixed'
      value: number
    }
  }
}

interface PrintDialogProps {
  isOpen: boolean
  onClose: () => void
  onPrint: (includeLogo: boolean, includeImages: boolean, pricingOptions?: PricingOptions) => void
  billboards?: Billboard[]
}

export default function PrintDialog({ isOpen, onClose, onPrint, billboards = [] }: PrintDialogProps) {
  const [includeLogo, setIncludeLogo] = useState(true)
  const [includeImages, setIncludeImages] = useState(true)
  const [includePricing, setIncludePricing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('monthly')
  const [discounts, setDiscounts] = useState<{ [level: string]: { type: 'percentage' | 'fixed', value: number } }>({})

  // استخراج الفئات الفريدة من اللوحات المحددة
  const uniqueLevels = useMemo(() => {
    const levels = new Set<string>()
    billboards.forEach(billboard => {
      const level = billboard.level?.toUpperCase() || 'A'
      levels.add(level)
    })
    return Array.from(levels).sort()
  }, [billboards])

  // حساب ملخص الأسعار
  const pricingSummary = useMemo(() => {
    if (!includePricing || billboards.length === 0) return null

    const levelSummary: { [level: string]: { count: number, total: number, discounted: number } } = {}
    let grandTotal = 0
    let grandDiscounted = 0

    billboards.forEach(billboard => {
      const level = billboard.level?.toUpperCase() || 'A'
      const price = getPrice(level, billboard.size, selectedPeriod, 'company')
      
      if (!levelSummary[level]) {
        levelSummary[level] = { count: 0, total: 0, discounted: 0 }
      }
      
      levelSummary[level].count++
      levelSummary[level].total += price
      
      const discount = discounts[level] || { type: 'percentage', value: 0 }
      const discountedPrice = calculateDiscountedPrice(price, discount.type, discount.value)
      levelSummary[level].discounted += discountedPrice
      
      grandTotal += price
      grandDiscounted += discountedPrice
    })

    const totalDiscountPercentage = calculateDiscountPercentage(grandTotal, grandDiscounted)

    return { levelSummary, grandTotal, grandDiscounted, totalDiscountPercentage }
  }, [billboards, includePricing, selectedPeriod, discounts])

  if (!isOpen) return null

  const handleDiscountChange = (level: string, field: 'type' | 'value', value: string | number) => {
    setDiscounts(prev => ({
      ...prev,
      [level]: {
        type: prev[level]?.type || 'percentage',
        value: prev[level]?.value || 0,
        [field]: field === 'value' ? Number(value) || 0 : value
      }
    }))
  }

  const handlePrint = () => {
    const pricingOptions: PricingOptions = {
      includePricing,
      period: selectedPeriod,
      discounts
    }
    onPrint(includeLogo, includeImages, pricingOptions)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full gold-border-glow my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-black text-foreground mb-6 text-center">
          خيارات طباعة التقرير
        </h3>
        
        {/* خيار الشعار */}
        <p className="text-sm text-muted-foreground mb-2 font-bold">رأس التقرير:</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setIncludeLogo(true)}
            className={`p-3 rounded-md border-2 transition-all duration-300 flex items-center gap-3 ${
              includeLogo
                ? "border-primary bg-primary/10 shadow-gold"
                : "border-border bg-secondary/30 hover:border-primary/50"
            }`}
          >
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
              includeLogo ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}>
              <Image className="w-5 h-5" />
            </div>
            <div className="text-right flex-1">
              <p className="font-bold text-foreground">بالشعار</p>
            </div>
          </button>
          
          <button
            onClick={() => setIncludeLogo(false)}
            className={`p-3 rounded-md border-2 transition-all duration-300 flex items-center gap-3 ${
              !includeLogo
                ? "border-primary bg-primary/10 shadow-gold"
                : "border-border bg-secondary/30 hover:border-primary/50"
            }`}
          >
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
              !includeLogo ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}>
              <ImageOff className="w-5 h-5" />
            </div>
            <div className="text-right flex-1">
              <p className="font-bold text-foreground">بدون شعار</p>
            </div>
          </button>
        </div>
        
        {/* خيار الصور */}
        <p className="text-sm text-muted-foreground mb-2 font-bold">صور اللوحات:</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setIncludeImages(true)}
            className={`p-3 rounded-md border-2 transition-all duration-300 flex items-center gap-3 ${
              includeImages
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-border bg-secondary/30 hover:border-emerald-500/50"
            }`}
          >
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
              includeImages ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"
            }`}>
              <Camera className="w-5 h-5" />
            </div>
            <div className="text-right flex-1">
              <p className="font-bold text-foreground">مع الصور</p>
            </div>
          </button>
          
          <button
            onClick={() => setIncludeImages(false)}
            className={`p-3 rounded-md border-2 transition-all duration-300 flex items-center gap-3 ${
              !includeImages
                ? "border-amber-500 bg-amber-500/10"
                : "border-border bg-secondary/30 hover:border-amber-500/50"
            }`}
          >
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
              !includeImages ? "bg-amber-500 text-white" : "bg-secondary text-muted-foreground"
            }`}>
              <CameraOff className="w-5 h-5" />
            </div>
            <div className="text-right flex-1">
              <p className="font-bold text-foreground">بدون صور</p>
            </div>
          </button>
        </div>

        {/* خيار الأسعار */}
        <p className="text-sm text-muted-foreground mb-2 font-bold">الأسعار:</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setIncludePricing(true)}
            className={`p-3 rounded-md border-2 transition-all duration-300 flex items-center gap-3 ${
              includePricing
                ? "border-blue-500 bg-blue-500/10"
                : "border-border bg-secondary/30 hover:border-blue-500/50"
            }`}
          >
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
              includePricing ? "bg-blue-500 text-white" : "bg-secondary text-muted-foreground"
            }`}>
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="text-right flex-1">
              <p className="font-bold text-foreground">مع الأسعار</p>
            </div>
          </button>
          
          <button
            onClick={() => setIncludePricing(false)}
            className={`p-3 rounded-md border-2 transition-all duration-300 flex items-center gap-3 ${
              !includePricing
                ? "border-gray-500 bg-gray-500/10"
                : "border-border bg-secondary/30 hover:border-gray-500/50"
            }`}
          >
            <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
              !includePricing ? "bg-gray-500 text-white" : "bg-secondary text-muted-foreground"
            }`}>
              <Tag className="w-5 h-5" />
            </div>
            <div className="text-right flex-1">
              <p className="font-bold text-foreground">بدون أسعار</p>
            </div>
          </button>
        </div>

        {/* خيارات الأسعار التفصيلية */}
        {includePricing && (
          <div className="bg-secondary/30 rounded-md p-4 mb-4 border border-border space-y-5">
            {/* اختيار المدة */}
            <div>
              <label className="text-sm font-bold text-foreground mb-3 block">مدة الإيجار:</label>
              <div className="flex flex-wrap gap-2">
                {RENTAL_PERIODS.map(period => (
                  <button
                    key={period.value}
                    onClick={() => setSelectedPeriod(period.value)}
                    className={`px-4 py-2 text-sm font-bold transition-all rounded-md border ${
                      selectedPeriod === period.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background/80 text-foreground border-border hover:border-primary/50 hover:bg-secondary/50"
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            {/* التخفيضات حسب الفئة */}
            <div>
              <label className="text-sm font-bold text-foreground mb-3 block flex items-center gap-2">
                <Percent className="w-4 h-4 text-primary" />
                التخفيضات حسب الفئة:
              </label>
              <div className="space-y-2">
                {uniqueLevels.map(level => (
                  <div key={level} className="flex items-center gap-3 bg-background/60 rounded-md border border-border p-3">
                    <span className="w-16 text-sm font-black text-primary">فئة {level}</span>
                    <select
                      value={discounts[level]?.type || 'percentage'}
                      onChange={(e) => handleDiscountChange(level, 'type', e.target.value)}
                      className="bg-secondary rounded-md border border-border px-3 py-2 text-sm text-foreground font-bold"
                    >
                      <option value="percentage">نسبة %</option>
                      <option value="fixed">قيمة ثابتة</option>
                    </select>
                    <Input
                      type="number"
                      min="0"
                      value={discounts[level]?.value || 0}
                      onChange={(e) => handleDiscountChange(level, 'value', e.target.value)}
                      className="w-24 h-10 text-sm font-bold"
                      placeholder="0"
                    />
                    <span className="text-sm font-bold text-muted-foreground">
                      {discounts[level]?.type === 'percentage' ? '%' : 'د.ل'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ملخص الأسعار */}
            {pricingSummary && billboards.length > 0 && (
              <div className="bg-background/60 rounded-md border border-primary/50 p-4">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                  <Calculator className="w-5 h-5 text-primary" />
                  <span className="text-base font-black text-foreground">ملخص الأسعار ({billboards.length} لوحة)</span>
                </div>
                
                <div className="space-y-3">
                  {Object.entries(pricingSummary.levelSummary).map(([level, data]) => (
                    <div key={level} className="flex justify-between items-center py-2 border-b border-border/30">
                      <span className="text-sm font-bold text-foreground">فئة {level} <span className="text-muted-foreground font-normal">({data.count} لوحة)</span></span>
                      <div className="text-left">
                        {data.total !== data.discounted ? (
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground line-through text-sm">
                              {formatPrice(data.total)}
                            </span>
                            <span className="text-primary font-black text-base">{formatPrice(data.discounted)}</span>
                          </div>
                        ) : (
                          <span className="text-foreground font-black text-base">{formatPrice(data.total)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-3 mt-2 border-t border-primary/50">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-black text-foreground">الإجمالي</span>
                      <div className="text-left">
                        {pricingSummary.grandTotal !== pricingSummary.grandDiscounted ? (
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground line-through text-sm">
                              {formatPrice(pricingSummary.grandTotal)}
                            </span>
                            <span className="text-primary text-xl font-black">{formatPrice(pricingSummary.grandDiscounted)}</span>
                          </div>
                        ) : (
                          <span className="text-primary text-xl font-black">{formatPrice(pricingSummary.grandTotal)}</span>
                        )}
                      </div>
                    </div>
                    {pricingSummary.totalDiscountPercentage > 0 && (
                      <div className="flex justify-between items-center text-emerald-500 text-sm mt-2 font-bold">
                        <span>نسبة التخفيض الإجمالية</span>
                        <span>{pricingSummary.totalDiscountPercentage.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="flex gap-4 sticky bottom-0 bg-card pt-4 border-t border-border mt-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-border text-muted-foreground hover:bg-secondary"
          >
            إلغاء
          </Button>
          <Button
            onClick={handlePrint}
            className="flex-1 bg-gradient-to-r from-primary to-gold-dark hover:from-primary/90 hover:to-gold-dark/90 text-primary-foreground font-bold shadow-gold"
          >
            <FileDown className="w-5 h-5 ml-2" />
            طباعة التقرير
          </Button>
        </div>
      </div>
    </div>
  )
}

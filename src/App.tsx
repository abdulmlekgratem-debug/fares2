import { useState, useMemo } from "react"
import { formatExpiryDate } from "@/utils/dateUtils"
import { createPortal } from "react-dom"
import { Search, MessageCircle, Mail, Download, CheckSquare, Square, FileSpreadsheet, RefreshCw, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"

import SearchFilters from "@/components/SearchFilters"
import BillboardCard from "@/components/BillboardCard"
import InteractiveMap from "@/components/InteractiveMap"
import EmailDialog from "@/components/EmailDialog"
import PrintDialog, { PricingOptions } from "@/components/PrintDialog"
import { getPrice, formatPrice, calculateDiscountedPrice, RENTAL_PERIODS, loadPricingFromExcel } from "@/services/pricingService"
import MapSidePanel from "@/components/MapSidePanel"
import Footer from "@/components/Footer"
import StatsSection from "@/components/StatsSection"
import DynamicBackground from "@/components/DynamicBackground"
import ClientLogos from "@/components/ClientLogos"
import UpdateNotice from "@/components/UpdateNotice"
import SectionNavigator from "@/components/SectionNavigator"
import DisplayModeToggle from "@/components/DisplayModeToggle"
import HeroSlider from "@/components/HeroSlider"
import BillboardCardSkeleton from "@/components/BillboardCardSkeleton"
import StatsSectionSkeleton from "@/components/StatsSectionSkeleton"
import { Billboard } from "@/types"
import { useTheme } from "@/hooks/useTheme"
import { useParallax } from "@/hooks/useParallax"
import { useMapPreloader } from "@/hooks/useMapPreloader"
import { useDisplayMode } from "@/hooks/useDisplayMode"
import { useBillboardData } from "@/hooks/useBillboardData"
import { useBillboardFilters } from "@/hooks/useBillboardFilters"

export default function App() {
  const { theme, toggleTheme } = useTheme()
  useParallax()
  const displayMode = useDisplayMode()
  useMapPreloader()

  // Data loading
  const { billboards, loading, loadError, reload } = useBillboardData()

  // Filters
  const filters = useBillboardFilters(billboards)

  // UI state
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [cardsPerRow, setCardsPerRow] = useState(4)
  const [showAllBillboards, setShowAllBillboards] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedBillboards, setSelectedBillboards] = useState<Set<string>>(new Set())
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [showPrintDialog, setShowPrintDialog] = useState(false)
  const [showSelectedPrintDialog, setShowSelectedPrintDialog] = useState(false)
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [emailMessage, setEmailMessage] = useState("")
  const [mapPanelBillboard, setMapPanelBillboard] = useState<Billboard | null>(null)
  const [showMapPanel, setShowMapPanel] = useState(false)
  const [isMapFullscreen, setIsMapFullscreen] = useState(false)

  const skeletonCount = 12
  const itemsPerPage = cardsPerRow * 2

  const { filteredBillboards, filteredBillboardsForMap } = filters

  const totalPages = Math.ceil(filteredBillboards.length / itemsPerPage)
  const paginatedBillboards = showAllBillboards
    ? filteredBillboards.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : filteredBillboards

  // Selection helpers
  const toggleBillboardSelection = (billboardId: string) => {
    const newSelected = new Set(selectedBillboards)
    if (newSelected.has(billboardId)) newSelected.delete(billboardId)
    else newSelected.add(billboardId)
    setSelectedBillboards(newSelected)
  }

  const selectMultipleBillboards = (billboardIds: string[]) => {
    const newSelected = new Set(selectedBillboards)
    billboardIds.forEach(id => newSelected.add(id))
    setSelectedBillboards(newSelected)
  }

  const clearSelection = () => setSelectedBillboards(new Set())

  // Email send
  const sendSelectedBillboards = async () => {
    if (selectedBillboards.size === 0 || !customerEmail || !customerName) return

    const selectedData = billboards.filter(b => selectedBillboards.has(b.id))

    try {
      const subject = `طلب حجز لوحات إعلانية - ${customerName}`
      const body = `
السلام عليكم ورحمة الله وبركاته

تفاصيل العميل:
الاسم: ${customerName}
البريد الإلكتروني: ${customerEmail}
رقم الهاتف: ${customerPhone || "غير محدد"}

رسالة العميل:
${emailMessage || "لا توجد رسالة إضافية"}

اللوحات المختارة (${selectedBillboards.size} لوحة):
${selectedData.map((b, i) => `${i + 1}. ${b.name}\n   الموقع: ${b.location}\n   المنطقة: ${b.area}\n   الحالة: ${b.status === "متاح" ? "متاحة" : "غير متاحة"}\n   `).join("")}

مع تحيات موقع الفارس الذهبي للدعاية والإعلان
      `.trim()

      const mailtoLink = `mailto:g.faris.business@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      window.open(mailtoLink, "_blank")

      toast({ title: "تم الإرسال", description: "تم فتح برنامج البريد الإلكتروني بتفاصيل اللوحات" })
      setShowEmailDialog(false)
      clearSelection()
      setCustomerEmail(""); setCustomerName(""); setCustomerPhone(""); setEmailMessage("")
    } catch (error) {
      console.error("Error creating email:", error)
      toast({ title: "خطأ", description: "حدث خطأ، يرجى المحاولة مرة أخرى", variant: "destructive" })
    }
  }

  // PDF Print
  const handlePrint = async (
    includeLogo: boolean,
    includeImages: boolean = true,
    customBillboardsOrPricing?: Billboard[] | PricingOptions,
    pricingOptions?: PricingOptions
  ) => {
    let customBillboards: Billboard[] | undefined
    let pricing: PricingOptions | undefined

    if (Array.isArray(customBillboardsOrPricing)) {
      customBillboards = customBillboardsOrPricing
      pricing = pricingOptions
    } else {
      pricing = customBillboardsOrPricing
    }

    const billboardsToPrint = customBillboards || filteredBillboards

    const QRCode = await import('qrcode')
    const qrCodes: { [key: string]: string } = {}
    for (const billboard of billboardsToPrint) {
      if (billboard.coordinates) {
        try {
          qrCodes[billboard.id] = await QRCode.toDataURL(
            `https://www.google.com/maps?q=${billboard.coordinates}`,
            { width: 80, margin: 1, color: { dark: '#000000', light: '#ffffff' } }
          )
        } catch (e) { console.error('QR error:', e) }
      }
    }

    const headerImage = includeLogo
      ? `<img src="${window.location.origin}/mt.svg" alt="رأس التقرير" class="header-image" />`
      : `<img src="${window.location.origin}/mtb.svg" alt="رأس التقرير" class="header-image" />`

    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>المساحات الإعلانية المتاحة - الفارس الذهبي</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          @font-face { font-family: 'Manrope'; src: url('${window.location.origin}/fonts/Manrope-Regular.otf') format('opentype'); font-weight: 400; }
          @font-face { font-family: 'Manrope'; src: url('${window.location.origin}/fonts/Manrope-Medium.otf') format('opentype'); font-weight: 500; }
          @font-face { font-family: 'Manrope'; src: url('${window.location.origin}/fonts/Manrope-SemiBold.ttf') format('truetype'); font-weight: 600; }
          @font-face { font-family: 'Manrope'; src: url('${window.location.origin}/fonts/Manrope-Bold.otf') format('opentype'); font-weight: 700; }
          @font-face { font-family: 'Manrope'; src: url('${window.location.origin}/fonts/Manrope-ExtraBold.otf') format('opentype'); font-weight: 800; }
          @page { size: A4 portrait; margin: 10mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Doran', 'Manrope', 'Tajawal', 'Arial', sans-serif; direction: rtl; background: #ffffff; color: #000; line-height: 1.3; font-size: 9px; }
          .header-section { width: 100%; margin-bottom: 10px; }
          .header-image { width: 100%; height: auto; display: block; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 8px; background: #ffffff; }
          th { background: #000000; color: #E8CC64; font-weight: 700; font-size: 8px; height: 30px; border: 1px solid #000000; padding: 4px 2px; }
          td { border: 1px solid #000000; padding: 2px; text-align: center; vertical-align: middle; background: #ffffff; color: #000; }
          td.number-cell { background: #E8CC64; padding: 2px; font-weight: 700; font-size: 9px; color: #000; width: 60px; }
          td.image-cell { background: #ffffff; padding: 0; width: 70px; }
          .billboard-image { width: 100%; height: auto; max-height: 55px; object-fit: contain; display: block; margin: 0 auto; }
          .billboard-number { color: #000; font-weight: 700; font-size: 9px; }
          .status-available { color: #16a34a; font-weight: 700; font-size: 8px; }
          td.qr-cell { width: 60px; padding: 2px; vertical-align: middle; }
          .qr-code { width: 100%; height: auto; max-height: 55px; display: block; margin: 0 auto; cursor: pointer; }
          .qr-link { display: block; text-align: center; }
          .image-placeholder { width: 100%; height: 55px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 7px; color: #666; text-align: center; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; background: #ffffff !important; }
            .no-print { display: none; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            td, th, .billboard-image, .image-placeholder, td.image-cell, td.number-cell { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header-section">${headerImage}</div>
        ${pricing?.includePricing ? `<div style="margin-bottom: 8px; padding: 6px 10px; background: #000000; display: inline-block;"><span style="font-size: 9px; color: #E8CC64; font-weight: 700;">مدة الإيجار: ${RENTAL_PERIODS.find(p => p.value === pricing.period)?.label || pricing.period}</span></div>` : ''}
        <table>
          <thead>
            <tr>
              <th style="width: 3%;">م</th>
              <th style="width: 7%;">الكود</th>
              ${includeImages ? '<th style="width: 7%;">صورة</th>' : ''}
              <th style="width: ${includeImages ? (pricing?.includePricing ? '12%' : '18%') : (pricing?.includePricing ? '18%' : '24%')};">الموقع</th>
              <th style="width: 8%;">المنطقة</th>
              <th style="width: 7%;">البلدية</th>
              <th style="width: 5%;">المقاس</th>
              <th style="width: 4%;">الأوجه</th>
              <th style="width: 5%;">النوع</th>
              ${pricing?.includePricing ? `<th style="width: 4%;">الفئة</th><th style="width: 7%;">السعر</th><th style="width: 7%;">بعد الخصم</th>` : `<th style="width: 5%;">الحالة</th>`}
              <th style="width: 5%;">QR</th>
            </tr>
          </thead>
          <tbody>
            ${billboardsToPrint.map((billboard, index) => {
              const exportCode = billboard.name || billboard.id || `GF-${String(index + 1).padStart(4, "0")}`
              const level = billboard.level?.toUpperCase() || 'A'
              const price = pricing?.includePricing ? getPrice(level, billboard.size, pricing.period, 'company') : 0
              const discount = pricing?.discounts?.[level] || { type: 'percentage', value: 0 }
              const discountedPrice = pricing?.includePricing ? calculateDiscountedPrice(price, discount.type, discount.value) : 0
              return `
              <tr style="height: 60px;">
                <td class="number-cell"><div class="billboard-number">${index + 1}</div></td>
                <td style="font-size: 8px; font-weight: 800; color: #1a1a2e; background: #f5f5f5; padding: 4px; white-space: nowrap;"><span dir="ltr" style="direction:ltr; unicode-bidi:bidi-override; display:inline-block;">${exportCode}</span></td>
                ${includeImages ? `<td class="image-cell">${billboard.imageUrl ? `<img src="${billboard.imageUrl}" alt="صورة" class="billboard-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="image-placeholder" style="display:none;"><span>صورة</span></div>` : `<div class="image-placeholder"><span>صورة</span></div>`}</td>` : ''}
                <td style="font-weight: 500; text-align: right; padding: 4px; font-size: 8px;">${billboard.location}</td>
                <td style="font-size: 8px; padding: 2px;">${billboard.area}</td>
                <td style="font-size: 8px; padding: 2px;">${billboard.municipality}</td>
                <td style="font-weight: 600; font-size: 8px; color: #000000;">${billboard.size}</td>
                <td style="font-size: 9px; padding: 2px; font-weight: 700;">${billboard.facesCount || '-'}</td>
                <td style="font-size: 8px; padding: 2px;">${billboard.billboardType || '-'}</td>
                ${pricing?.includePricing
                  ? `<td style="font-size: 8px; padding: 2px; font-weight: 700; background: #f0f0f0;">${level}</td><td style="font-size: 8px; padding: 2px; font-weight: 600;">${price > 0 ? formatPrice(price) : '-'}</td><td style="font-size: 8px; padding: 2px; font-weight: 700; color: ${discountedPrice < price ? '#16a34a' : '#000'};">${discountedPrice > 0 ? formatPrice(discountedPrice) : '-'}</td>`
                  : `<td style="color: ${billboard.status === 'متاح' ? '#16a34a' : '#b45309'}; font-weight: 600; font-size: 8px;">${billboard.status === 'متاح' ? 'متاح' : formatExpiryDate(billboard.expiryDate)}</td>`
                }
                <td class="qr-cell" style="padding: 2px;">${qrCodes[billboard.id] ? `<a href="https://www.google.com/maps?q=${billboard.coordinates}" target="_blank" class="qr-link" title="اضغط لفتح الموقع"><img src="${qrCodes[billboard.id]}" class="qr-code" style="width: 50px; height: 50px; object-fit: contain;" alt="QR" /></a>` : '<span style="color: #999; font-size: 7px;">-</span>'}</td>
              </tr>`
            }).join("")}
          </tbody>
        </table>
        ${pricing?.includePricing ? (() => {
          const levelSummary: { [level: string]: { count: number; total: number; discounted: number } } = {}
          let grandTotal = 0; let grandDiscounted = 0
          billboardsToPrint.forEach(b => {
            const level = b.level?.toUpperCase() || 'A'
            const price = getPrice(level, b.size, pricing.period, 'company')
            if (!levelSummary[level]) levelSummary[level] = { count: 0, total: 0, discounted: 0 }
            levelSummary[level].count++; levelSummary[level].total += price
            const disc = pricing.discounts?.[level] || { type: 'percentage', value: 0 }
            const dp = calculateDiscountedPrice(price, disc.type, disc.value)
            levelSummary[level].discounted += dp; grandTotal += price; grandDiscounted += dp
          })
          const totalDiscountPercentage = grandTotal > 0 ? ((grandTotal - grandDiscounted) / grandTotal * 100) : 0
          return `<table style="width: 100%; font-size: 8px; border-collapse: collapse; border-top: none;">
            <thead>
              <tr style="background: #000000;"><th colspan="5" style="padding: 4px 8px; text-align: center; color: #FFD700; font-size: 11px; font-weight: 900; border: 1px solid #000; border-top: none; letter-spacing: 1px;">ملخص الأسعار</th></tr>
              <tr style="background: #000000;"><th style="padding: 4px; text-align: right; border: 1px solid #000; color: #FFD700; font-weight: 700; font-size: 8px;">الفئة</th><th style="padding: 4px; text-align: center; border: 1px solid #000; color: #FFD700; font-weight: 700; font-size: 8px;">العدد</th><th style="padding: 4px; text-align: center; border: 1px solid #000; color: #FFD700; font-weight: 700; font-size: 8px;">المجموع</th><th style="padding: 4px; text-align: center; border: 1px solid #000; color: #FFD700; font-weight: 700; font-size: 8px;">بعد الخصم</th><th style="padding: 4px; text-align: center; border: 1px solid #000; color: #FFD700; font-weight: 700; font-size: 8px;">الخصم</th></tr>
            </thead>
            <tbody>
              ${Object.entries(levelSummary).map(([l, d]) => `<tr><td style="padding: 3px; border: 1px solid #000; font-weight: 600; background: #fff; color: #000; font-size: 7px;">فئة ${l}</td><td style="padding: 3px; border: 1px solid #000; text-align: center; background: #fff; color: #000; font-size: 7px;">${d.count}</td><td style="padding: 3px; border: 1px solid #000; text-align: center; background: #fff; color: #000; font-size: 7px;">${formatPrice(d.total)}</td><td style="padding: 3px; border: 1px solid #000; text-align: center; background: #fff; color: #000; font-size: 7px;">${formatPrice(d.discounted)}</td><td style="padding: 3px; border: 1px solid #000; text-align: center; background: #fff; color: #000; font-size: 7px;">${d.total > 0 ? ((d.total - d.discounted) / d.total * 100).toFixed(1) + '%' : '-'}</td></tr>`).join('')}
              <tr style="background: #E8CC64;"><td style="padding: 4px; border: 1px solid #000; color: #000; font-weight: 700; font-size: 8px;">الإجمالي</td><td style="padding: 4px; border: 1px solid #000; text-align: center; color: #000; font-weight: 700; font-size: 8px;">${billboardsToPrint.length}</td><td style="padding: 4px; border: 1px solid #000; text-align: center; color: #000; font-weight: 700; font-size: 8px;">${formatPrice(grandTotal)}</td><td style="padding: 4px; border: 1px solid #000; text-align: center; color: #000; font-weight: 700; font-size: 8px;">${formatPrice(grandDiscounted)}</td><td style="padding: 4px; border: 1px solid #000; text-align: center; color: #000; font-weight: 700; font-size: 8px;">${totalDiscountPercentage.toFixed(1)}%</td></tr>
            </tbody>
          </table>`
        })() : ''}
        <script>
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          window.onload = function() {
            if (isMobile) {
              document.body.style.background = 'white';
              const printBtn = document.createElement('button');
              printBtn.innerHTML = 'حفظ كـ PDF';
              printBtn.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#E8CC64;color:#000;padding:12px 30px;border:none;border-radius:25px;font-weight:bold;font-size:16px;z-index:9999;cursor:pointer;box-shadow:0 4px 15px rgba(0,0,0,0.3);';
              printBtn.onclick = function() { this.style.display = 'none'; window.print(); setTimeout(function() { printBtn.style.display = 'block'; }, 1000); };
              document.body.insertBefore(printBtn, document.body.firstChild);
            } else {
              setTimeout(function() { window.print(); setTimeout(function() { window.close(); }, 1000); }, 800);
            }
          };
        </script>
      </body>
      </html>
    `

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      const blob = new Blob([printContent], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const newWindow = window.open(url, '_blank')
      if (!newWindow) {
        const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.click()
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } else {
      const printWindow = window.open("", "_blank")
      if (!printWindow) return
      printWindow.document.write(printContent)
      printWindow.document.close()
    }
  }

  // Excel export
  const handleExcelExport = async (data?: Billboard[]) => {
    const XLSX = await import('xlsx')
    const source = data || filteredBillboards
    const excelData = source.map((b, i) => ({
      'م': i + 1,
      'الكود': b.name || b.id || `GF-${String(i + 1).padStart(4, "0")}`,
      'الموقع': b.location,
      'البلدية': b.municipality,
      'المدينة': b.city,
      'المنطقة': b.area,
      'المقاس': b.size,
      'عدد الأوجه': b.facesCount || '-',
      'النوع': b.billboardType || '-',
      'الحالة': b.status,
      'تاريخ الانتهاء': b.expiryDate || '-',
      'الإحداثيات': b.coordinates,
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)
    ws['!cols'] = [{ wch: 5 }, { wch: 16 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 25 }]
    const sheetName = data ? 'اللوحات المحددة' : 'اللوحات الإعلانية'
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
    const today = new Date().toLocaleDateString('ar-LY', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')
    const fileName = data ? `اللوحات_المحددة_${data.length}_${today}.xlsx` : `اللوحات_الإعلانية_${today}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Error screen
  if (loadError && billboards.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <WifiOff className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-xl font-black text-foreground mb-2" style={{ fontFamily: 'Doran, Tajawal, sans-serif' }}>
            تعذّر تحميل البيانات
          </h2>
          <p className="text-muted-foreground mb-6 text-sm">تأكد من اتصالك بالإنترنت ثم حاول مجدداً</p>
          <Button onClick={reload} className="gap-2 bg-primary text-primary-foreground">
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {!isMapFullscreen && <DynamicBackground />}

      {!isMapFullscreen && (
        <HeroSlider
          totalBillboards={billboards.filter(b => b.status === "متاح").length}
          theme={theme}
          toggleTheme={toggleTheme}
          onScrollToBillboards={() => document.getElementById('billboards-section')?.scrollIntoView({ behavior: 'smooth' })}
        />
      )}

      {!isMapFullscreen && <UpdateNotice />}

      {!isMapFullscreen && (
        <SectionNavigator hideWhenMapOpen={showMapPanel} theme={theme} toggleTheme={toggleTheme} />
      )}

      <main id="billboards-section" className={`container mx-auto px-4 py-12 relative z-10 page-transition ${isMapFullscreen ? 'hidden' : ''}`}>
        {loading ? (
          <div className="mb-8 animate-pulse space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="h-10 w-64 bg-muted rounded-xl" />
              <div className="h-10 w-32 bg-muted rounded-xl" />
              <div className="h-10 w-32 bg-muted rounded-xl" />
              <div className="h-10 w-28 bg-muted rounded-xl" />
              <div className="h-10 w-28 bg-muted rounded-xl" />
            </div>
          </div>
        ) : (
          <SearchFilters
            searchTerm={filters.searchTerm}
            setSearchTerm={filters.setSearchTerm}
            selectedMunicipalities={filters.selectedMunicipalities}
            setSelectedMunicipalities={filters.setSelectedMunicipalities}
            selectedCities={filters.selectedCities}
            setSelectedCities={filters.setSelectedCities}
            selectedAreas={filters.selectedAreas}
            setSelectedAreas={filters.setSelectedAreas}
            selectedSizes={filters.selectedSizes}
            setSelectedSizes={filters.setSelectedSizes}
            selectedAvailability={filters.selectedAvailability}
            setSelectedAvailability={filters.setSelectedAvailability}
            viewMode={viewMode}
            setViewMode={setViewMode}
            showMap={showMap}
            setShowMap={setShowMap}
            municipalities={filters.municipalities}
            cities={filters.cities}
            areas={filters.areas}
            sizes={filters.sizes}
            availabilityOptions={filters.availabilityOptions}
            totalCount={billboards.length}
            onPrint={() => setShowPrintDialog(true)}
            onExcel={() => handleExcelExport()}
            onNearbyFilter={(lat, lng, radius) => filters.setNearbyLocation({ lat, lng, radius })}
            isNearbyActive={filters.nearbyLocation !== null}
            onClearNearby={() => filters.setNearbyLocation(null)}
          />
        )}

        {showMap && (
          <InteractiveMap
            billboards={filteredBillboardsForMap}
            onImageView={setSelectedImage}
            selectedBillboards={selectedBillboards}
            onToggleSelection={toggleBillboardSelection}
            onSelectMultiple={selectMultipleBillboards}
            onDownloadSelected={() => { if (selectedBillboards.size > 0) setShowSelectedPrintDialog(true) }}
            onFullscreenChange={setIsMapFullscreen}
          />
        )}

        {loading ? <StatsSectionSkeleton /> : <StatsSection billboards={billboards} id="stats-section" />}

        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <DisplayModeToggle mode={displayMode.mode} onToggle={displayMode.toggleMode} />

            <div className="hidden md:flex items-center gap-1 bg-muted/50 rounded-full p-1 border border-border/50">
              {[3, 4, 5, 6].map(num => (
                <button
                  key={num}
                  onClick={() => setCardsPerRow(num)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    cardsPerRow === num
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {num}
                </button>
              ))}
              <span className="text-xs text-muted-foreground px-2">كروت/صف</span>
            </div>

            <p className={`text-muted-foreground ${displayMode.textBase} font-semibold ml-4`}>
              عرض <span className="font-black text-primary">{paginatedBillboards.length}</span> من أصل{" "}
              <span className="font-black text-primary">{filteredBillboards.length}</span> لوحة
            </p>

            <Button
              onClick={() => {
                const allIds = filteredBillboards.map(b => b.id)
                const allSelected = allIds.every(id => selectedBillboards.has(id))
                const newSelected = new Set(selectedBillboards)
                if (allSelected) allIds.forEach(id => newSelected.delete(id))
                else allIds.forEach(id => newSelected.add(id))
                setSelectedBillboards(newSelected)
              }}
              variant="outline"
              size="sm"
              className="rounded-full px-4 py-2 text-sm font-bold border-primary/50 hover:bg-primary/10 gap-2"
            >
              {filteredBillboards.every(b => selectedBillboards.has(b.id)) && filteredBillboards.length > 0 ? (
                <><Square className="w-4 h-4" />إلغاء تحديد الكل</>
              ) : (
                <><CheckSquare className="w-4 h-4" />تحديد الكل ({filteredBillboards.length})</>
              )}
            </Button>

            {filters.availabilityOptions.map(option => (
              <Button
                key={option.value}
                onClick={() => filters.setSelectedAvailability(option.value)}
                variant={filters.selectedAvailability === option.value ? "default" : "outline"}
                size="sm"
                className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
                  filters.selectedAvailability === option.value
                    ? "bg-primary text-primary-foreground shadow-gold"
                    : "border-border hover:border-primary/50 hover:bg-primary/10"
                }`}
              >
                {option.label}
              </Button>
            ))}

            {filters.selectedAvailability !== "all" && (
              <Button
                onClick={() => filters.setSelectedAvailability("all")}
                variant="ghost"
                size="sm"
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                عرض الكل ({billboards.length})
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {!showAllBillboards && billboards.length > 8 && (
              <Button
                onClick={() => setShowAllBillboards(true)}
                className="bg-gradient-to-r from-primary to-gold-dark hover:from-primary/90 hover:to-gold-dark/90 text-primary-foreground font-black px-8 py-3 rounded-full shadow-gold transform hover:scale-105 transition-all duration-300"
              >
                عرض جميع اللوحات ({billboards.length})
              </Button>
            )}
            {showAllBillboards && (
              <Button
                onClick={() => { setShowAllBillboards(false); setCurrentPage(1) }}
                variant="outline"
                className="border-2 border-primary/50 text-primary hover:bg-primary/10 font-black px-6 py-3 rounded-full"
              >
                عرض أقل
              </Button>
            )}
          </div>
        </div>

        {/* Floating Selection Bar */}
        {selectedBillboards.size > 0 && typeof document !== 'undefined' && createPortal(
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto max-w-[90vw] md:max-w-fit bg-background/60 backdrop-blur-md border border-primary/20 rounded-xl p-2 md:p-3 z-[1000000] shadow-xl">
            <div className="flex items-center justify-center gap-2 md:gap-3">
              <Badge className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full font-bold text-sm md:text-base">
                {selectedBillboards.size} لوحة مختارة
              </Badge>
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={clearSelection} variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10 bg-transparent text-xs md:text-sm">إلغاء التحديد</Button>
                <Button onClick={() => setShowEmailDialog(true)} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 md:px-6 text-xs md:text-sm">
                  <Mail className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />إرسال
                </Button>
                <Button onClick={() => setShowSelectedPrintDialog(true)} size="sm" className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 md:px-6 text-xs md:text-sm">
                  <Download className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />PDF
                </Button>
                <Button onClick={() => handleExcelExport(billboards.filter(b => selectedBillboards.has(b.id)))} size="sm" variant="outline" className="border-border text-foreground hover:bg-muted px-3 md:px-6 text-xs md:text-sm">
                  <FileSpreadsheet className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />Excel
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

        <EmailDialog
          isOpen={showEmailDialog}
          onClose={() => setShowEmailDialog(false)}
          selectedBillboards={selectedBillboards}
          billboards={billboards}
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerEmail={customerEmail}
          setCustomerEmail={setCustomerEmail}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          emailMessage={emailMessage}
          setEmailMessage={setEmailMessage}
          onSend={sendSelectedBillboards}
        />

        <PrintDialog
          isOpen={showPrintDialog}
          onClose={() => setShowPrintDialog(false)}
          onPrint={(includeLogo, includeImages, pricingOptions) => handlePrint(includeLogo, includeImages, pricingOptions)}
          billboards={filteredBillboards}
        />

        <PrintDialog
          isOpen={showSelectedPrintDialog}
          onClose={() => setShowSelectedPrintDialog(false)}
          onPrint={(includeLogo, includeImages, pricingOptions) => {
            const selectedData = billboards.filter(b => selectedBillboards.has(b.id))
            handlePrint(includeLogo, includeImages, selectedData, pricingOptions)
          }}
          billboards={billboards.filter(b => selectedBillboards.has(b.id))}
        />

        <MapSidePanel
          billboard={mapPanelBillboard}
          isOpen={showMapPanel}
          onClose={() => { setShowMapPanel(false); setMapPanelBillboard(null) }}
          onViewImage={setSelectedImage}
        />

        {/* Pagination Top */}
        {showAllBillboards && totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mb-8 mt-4">
            <Button variant="outline" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50">السابق</Button>
            <span className="px-4 py-2 text-foreground font-bold">صفحة {currentPage} من {totalPages}</span>
            <Button variant="outline" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50">التالي</Button>
          </div>
        )}

        {/* Billboard Cards */}
        <div className="relative py-12 -mt-4" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)', width: '100vw' }}>
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--primary) / 0.03) 50%, hsl(var(--background)) 100%)` }} />
          </div>
          <div
            className="billboard-grid relative z-10 grid gap-3 md:gap-4 lg:gap-5 px-4 md:px-6 lg:px-10 xl:px-14"
            style={{ gridTemplateColumns: `repeat(1, 1fr)` }}
          >
            <style>{`
              @media (min-width: 640px) { .billboard-grid { grid-template-columns: repeat(2, 1fr) !important; } }
              @media (min-width: 768px) { .billboard-grid { grid-template-columns: repeat(3, 1fr) !important; } }
              @media (min-width: 1024px) { .billboard-grid { grid-template-columns: repeat(${Math.min(cardsPerRow, 4)}, 1fr) !important; } }
              @media (min-width: 1280px) { .billboard-grid { grid-template-columns: repeat(${cardsPerRow}, 1fr) !important; } }
            `}</style>
            {loading
              ? Array.from({ length: skeletonCount }).map((_, i) => (
                  <BillboardCardSkeleton key={i} isCompact={displayMode.mode === 'compact'} />
                ))
              : paginatedBillboards.map((billboard, index) => (
                  <div
                    key={billboard.id}
                    className="billboard-card-stagger"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <BillboardCard
                      billboard={billboard}
                      isSelected={selectedBillboards.has(billboard.id)}
                      onToggleSelection={toggleBillboardSelection}
                      onViewImage={setSelectedImage}
                      onShowMap={b => { setMapPanelBillboard(b); setShowMapPanel(true) }}
                      displayMode={displayMode.mode}
                    />
                  </div>
                ))}
          </div>
        </div>

        {/* Pagination Bottom */}
        {showAllBillboards && totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-12">
            <Button variant="outline" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50">السابق</Button>
            {(() => {
              const maxVisible = 5
              let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
              let end = Math.min(totalPages, start + maxVisible - 1)
              if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
              return Array.from({ length: end - start + 1 }, (_, i) => {
                const p = start + i
                return (
                  <Button key={p} variant={currentPage === p ? "default" : "outline"} onClick={() => setCurrentPage(p)} className={`w-12 h-12 ${currentPage === p ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>{p}</Button>
                )
              })
            })()}
            <Button variant="outline" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50">التالي</Button>
          </div>
        )}

        {filteredBillboards.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center border border-primary/30">
              <Search className="w-12 h-12 text-primary" />
            </div>
            <p className="text-foreground text-xl mb-4 font-bold">لا توجد لوحات تطابق معايير البحث</p>
            <p className="text-muted-foreground font-semibold">جرب تغيير معايير البحث أو الفلاتر</p>
          </div>
        )}
      </main>

      {!isMapFullscreen && (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50">
          <a
            href="https://wa.me/218913228908?text=مرحباً، أريد الاستفسار عن اللوحات الإعلانية المتاحة"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-11 h-11 md:w-14 md:h-14 bg-[hsl(142,72%,45%)] hover:bg-[hsl(142,72%,38%)] text-white rounded-full shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300 animate-pulse hover:animate-none"
          >
            <MessageCircle className="w-5 h-5 md:w-7 md:h-7" />
          </a>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[1000002] backdrop-blur-md" onClick={() => setSelectedImage(null)}>
          <Button
            className="fixed top-4 right-4 z-[1000003] bg-card/90 text-foreground hover:bg-destructive hover:text-destructive-foreground rounded-full px-4 py-2 shadow-xl border border-border/50 backdrop-blur-md"
            onClick={e => { e.stopPropagation(); setSelectedImage(null) }}
          >
            ✕ إغلاق
          </Button>
          <div className="relative w-full h-full overflow-auto flex items-center justify-center p-4 md:p-8" onClick={e => e.stopPropagation()}>
            <img src={selectedImage} alt="عرض اللوحة" className="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl cursor-zoom-out" onClick={() => setSelectedImage(null)} />
          </div>
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm md:hidden z-[1000003]">اضغط على الصورة للإغلاق</div>
        </div>
      )}

      {!isMapFullscreen && <ClientLogos />}
      {!isMapFullscreen && <Footer id="footer" />}
    </div>
  )
}

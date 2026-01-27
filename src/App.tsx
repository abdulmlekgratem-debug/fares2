import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Search, MessageCircle, Mail, Download, CheckSquare, Square, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// Header removed - now integrated into HeroSlider
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
import { loadBillboardsFromExcel } from "@/services/billboardService"
import { Billboard } from "@/types"
import { useTheme } from "@/hooks/useTheme"
import { useParallax } from "@/hooks/useParallax"
import { useMapPreloader } from "@/hooks/useMapPreloader"
import { useDisplayMode } from "@/hooks/useDisplayMode"

export default function App() {
  const { theme, toggleTheme } = useTheme()
  useParallax() // For parallax effects
  const displayMode = useDisplayMode()
  
  // Preload map in background on app mount
  useMapPreloader()
  const [billboards, setBillboards] = useState<Billboard[]>([])
  const [filteredBillboards, setFilteredBillboards] = useState<Billboard[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMunicipalities, setSelectedMunicipalities] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedAvailability, setSelectedAvailability] = useState("available")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [cardsPerRow, setCardsPerRow] = useState(4)
  const [showAllBillboards, setShowAllBillboards] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
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
  const [nearbyLocation, setNearbyLocation] = useState<{ lat: number; lng: number; radius: number } | null>(null)
  const [isMapFullscreen, setIsMapFullscreen] = useState(false)

  // Dynamic items per page - always show complete rows (2 rows worth)
  const itemsPerPage = cardsPerRow * 2

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // تحميل البيانات مع timeout للأجهزة البطيئة
        const loadWithTimeout = async <T,>(
          promise: Promise<T>, 
          timeoutMs: number,
          fallback: T
        ): Promise<T> => {
          const timeoutPromise = new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
          )
          try {
            return await Promise.race([promise, timeoutPromise])
          } catch {
            console.warn('[App] تجاوز الوقت المحدد، استخدام البيانات الاحتياطية')
            return fallback
          }
        }
        
        // تحميل البيانات والأسعار معاً مع timeout 20 ثانية
        const [data] = await Promise.all([
          loadWithTimeout(loadBillboardsFromExcel(), 20000, []),
          loadWithTimeout(loadPricingFromExcel(), 15000, undefined)
        ])
        
        if (data.length > 0) {
          setBillboards(data)
          setFilteredBillboards(data)
        } else {
          console.warn('[App] لم يتم تحميل أي بيانات')
        }
      } catch (error) {
        console.error('Error loading billboards:', error)
      } finally {
        setLoading(false)
      }
    }
    
    // تأخير بسيط للسماح للواجهة بالظهور أولاً
    const timer = setTimeout(loadData, 100)
    return () => clearTimeout(timer)
  }, [])

  // Helper function to parse date from string (supports both YYYY-MM-DD and DD/MM/YYYY)
  const parseExpiryDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null
    
    const trimmedDate = dateStr.trim()
    
    // Try ISO format first (YYYY-MM-DD) - handles 2026-02-18
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmedDate)) {
      const parts = trimmedDate.split('-')
      const year = parseInt(parts[0])
      const month = parseInt(parts[1]) - 1
      const day = parseInt(parts[2])
      if (!isNaN(year) && !isNaN(month) && !isNaN(day) && year >= 2020) {
        return new Date(year, month, day)
      }
    }
    
    // Try DD/MM/YYYY or DD-MM-YYYY format
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(trimmedDate)) {
      const parts = trimmedDate.split(/[/-]/)
      const day = parseInt(parts[0])
      const month = parseInt(parts[1]) - 1
      const year = parseInt(parts[2])
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year >= 2020) {
        return new Date(year, month, day)
      }
    }
    
    return null
  }

  // Generate availability options based on expiry dates
  const availabilityOptions = (() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    const options: { value: string; label: string; count: number }[] = []
    
    // Count available now (status === "متاح")
    const availableCount = billboards.filter(b => b.status === "متاح").length
    options.push({ value: "available", label: `متاح (${availableCount})`, count: availableCount })
    
    // Count soon (within 20 days)
    const soonDate = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000)
    const soonCount = billboards.filter(b => {
      if (b.status === "متاح") return false
      const expiry = parseExpiryDate(b.expiryDate)
      return expiry && expiry <= soonDate && expiry > now
    }).length
    options.push({ value: "soon", label: `قريباً (${soonCount})`, count: soonCount })
    
    // Generate monthly options for next 12 months
    for (let i = 1; i <= 12; i++) {
      const targetMonth = (currentMonth + i) % 12
      const targetYear = currentYear + Math.floor((currentMonth + i) / 12)
      const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
      
      const monthStart = new Date(targetYear, targetMonth, 1)
      const monthEnd = new Date(targetYear, targetMonth + 1, 0)
      
      const monthCount = billboards.filter(b => {
        if (b.status === "متاح") return false
        const expiry = parseExpiryDate(b.expiryDate)
        return expiry && expiry >= monthStart && expiry <= monthEnd
      }).length
      
      if (monthCount > 0) {
        options.push({
          value: `month-${targetMonth + 1}-${targetYear}`,
          label: `${monthNames[targetMonth]} ${targetYear} (${monthCount})`,
          count: monthCount
        })
      }
    }
    
    return options
  })()

  useEffect(() => {
    let filtered = billboards

    if (searchTerm) {
      filtered = filtered.filter(
        (billboard) =>
          billboard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          billboard.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          billboard.municipality.toLowerCase().includes(searchTerm.toLowerCase()) ||
          billboard.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
          billboard.area.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (selectedMunicipalities.length > 0) {
      filtered = filtered.filter((billboard) => selectedMunicipalities.includes(billboard.municipality))
    }

    if (selectedCities.length > 0) {
      filtered = filtered.filter((billboard) => selectedCities.includes(billboard.city))
    }

    if (selectedAreas.length > 0) {
      filtered = filtered.filter((billboard) => selectedAreas.includes(billboard.area))
    }

    if (selectedSizes.length > 0) {
      filtered = filtered.filter((billboard) => selectedSizes.includes(billboard.size))
    }

    if (selectedAvailability !== "all") {
      const now = new Date()
      
      if (selectedAvailability === "available") {
        filtered = filtered.filter((billboard) => billboard.status === "متاح")
      } else if (selectedAvailability === "soon") {
        const soonDate = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter((billboard) => {
          if (billboard.status === "متاح") return false
          const expiry = parseExpiryDate(billboard.expiryDate)
          return expiry && expiry <= soonDate && expiry > now
        })
      } else if (selectedAvailability.startsWith("month-")) {
        const parts = selectedAvailability.split("-")
        const targetMonth = parseInt(parts[1]) - 1
        const targetYear = parseInt(parts[2])
        const monthStart = new Date(targetYear, targetMonth, 1)
        const monthEnd = new Date(targetYear, targetMonth + 1, 0)
        
        filtered = filtered.filter((billboard) => {
          if (billboard.status === "متاح") return false
          const expiry = parseExpiryDate(billboard.expiryDate)
          return expiry && expiry >= monthStart && expiry <= monthEnd
        })
      }
    }

    // Nearby filter - فلتر القريب مني
    if (nearbyLocation) {
      const { lat: userLat, lng: userLng, radius } = nearbyLocation
      filtered = filtered.filter(billboard => {
        const coords = billboard.coordinates.split(',').map(c => parseFloat(c.trim()))
        if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return false
        
        const billboardLat = coords[0]
        const billboardLng = coords[1]
        
        // Haversine formula for distance calculation
        const R = 6371 // Earth's radius in km
        const dLat = (billboardLat - userLat) * Math.PI / 180
        const dLng = (billboardLng - userLng) * Math.PI / 180
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(userLat * Math.PI / 180) * Math.cos(billboardLat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        const distance = R * c
        
        return distance <= radius
      })
    }

    if (!showAllBillboards) {
      filtered = filtered.slice(0, 8)
      setCurrentPage(1)
    }

    setFilteredBillboards(filtered)
    
    // Reset to last available page if current page exceeds total pages
    const newTotalPages = Math.ceil(filtered.length / itemsPerPage)
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages)
    } else if (newTotalPages === 0) {
      setCurrentPage(1)
    }
  }, [searchTerm, selectedMunicipalities, selectedCities, selectedAreas, selectedSizes, selectedAvailability, billboards, showAllBillboards, currentPage, itemsPerPage, nearbyLocation])

  const municipalities = Array.from(new Set(billboards.map((b) => b.municipality).filter(Boolean)))
  const cities = Array.from(new Set(billboards.map((b) => b.city).filter(Boolean)))
  const areas = Array.from(new Set(billboards.map((b) => b.area).filter(Boolean)))
  const sizes = Array.from(new Set(billboards.map((b) => b.size).filter(Boolean)))

  const totalPages = Math.ceil(filteredBillboards.length / itemsPerPage)
  const paginatedBillboards = showAllBillboards
    ? filteredBillboards.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : filteredBillboards

  const toggleBillboardSelection = (billboardId: string) => {
    const newSelected = new Set(selectedBillboards)
    if (newSelected.has(billboardId)) {
      newSelected.delete(billboardId)
    } else {
      newSelected.add(billboardId)
    }
    setSelectedBillboards(newSelected)
  }

  const selectMultipleBillboards = (billboardIds: string[]) => {
    const newSelected = new Set(selectedBillboards)
    billboardIds.forEach(id => newSelected.add(id))
    setSelectedBillboards(newSelected)
  }

  const clearSelection = () => {
    setSelectedBillboards(new Set())
  }

  const handleDownloadSelected = () => {
    if (selectedBillboards.size > 0) {
      setShowSelectedPrintDialog(true)
    }
  }

  const sendSelectedBillboards = async () => {
    if (selectedBillboards.size === 0 || !customerEmail || !customerName) return

    const selectedBillboardsData = billboards.filter((b) => selectedBillboards.has(b.id))

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
${selectedBillboardsData
  .map(
    (billboard, index) =>
      `${index + 1}. ${billboard.name}
   الموقع: ${billboard.location}
   المنطقة: ${billboard.area}
   الحالة: ${billboard.status === "متاح" ? "متاحة" : "غير متاحة"}
   
`,
  )
  .join("")}

مع تحيات موقع الفارس الذهبي للدعاية والإعلان
      `.trim()

      const mailtoLink = `mailto:g.faris.business@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

      window.open(mailtoLink, "_blank")

      alert("تم فتح برنامج البريد الإلكتروني مع تفاصيل اللوحات المختارة!")
      setShowEmailDialog(false)
      clearSelection()
      setCustomerEmail("")
      setCustomerName("")
      setCustomerPhone("")
      setEmailMessage("")
    } catch (error) {
      console.error("Error creating email:", error)
      alert("حدث خطأ، يرجى المحاولة مرة أخرى")
    }
  }

  const handlePrint = async (includeLogo: boolean, includeImages: boolean = true, customBillboardsOrPricing?: Billboard[] | PricingOptions, pricingOptions?: PricingOptions) => {
    // Handle both old signature (customBillboards as 3rd param) and new signature (pricingOptions as 3rd or 4th param)
    let customBillboards: Billboard[] | undefined
    let pricing: PricingOptions | undefined
    
    if (Array.isArray(customBillboardsOrPricing)) {
      customBillboards = customBillboardsOrPricing
      pricing = pricingOptions
    } else {
      pricing = customBillboardsOrPricing
    }
    
    const billboardsToPrint = customBillboards || filteredBillboards
    // Helper to format expiry date for PDF
    const formatExpiryForPDF = (dateStr: string | null): string => {
      if (!dateStr) return '-'
      let parsedDate: Date | null = null
      if (dateStr.includes('-') && dateStr.length === 10 && dateStr.indexOf('-') === 4) {
        const parts = dateStr.split('-')
        if (parts.length === 3) {
          const year = parseInt(parts[0])
          const month = parseInt(parts[1]) - 1
          const day = parseInt(parts[2])
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            parsedDate = new Date(year, month, day)
          }
        }
      }
      if (!parsedDate) {
        const parts = dateStr.split(/[/-]/)
        if (parts.length === 3) {
          const day = parseInt(parts[0])
          const month = parseInt(parts[1]) - 1
          const year = parseInt(parts[2])
          if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 2000) {
            parsedDate = new Date(year, month, day)
          }
        }
      }
      if (!parsedDate || isNaN(parsedDate.getTime())) return dateStr
      return parsedDate.toLocaleDateString('ar-LY', { year: 'numeric', month: 'short', day: 'numeric' })
    }

    // Generate QR codes for all billboards
    const QRCode = await import('qrcode')
    const qrCodes: { [key: string]: string } = {}
    
    for (const billboard of billboardsToPrint) {
      if (billboard.coordinates) {
        const mapUrl = `https://www.google.com/maps?q=${billboard.coordinates}`
        try {
          qrCodes[billboard.id] = await QRCode.toDataURL(mapUrl, {
            width: 80,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' }
          })
        } catch (e) {
          console.error('QR generation error:', e)
        }
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
          @font-face {
            font-family: 'Manrope';
            src: url('${window.location.origin}/fonts/Manrope-Regular.otf') format('opentype');
            font-weight: 400;
          }
          @font-face {
            font-family: 'Manrope';
            src: url('${window.location.origin}/fonts/Manrope-Medium.otf') format('opentype');
            font-weight: 500;
          }
          @font-face {
            font-family: 'Manrope';
            src: url('${window.location.origin}/fonts/Manrope-SemiBold.ttf') format('truetype');
            font-weight: 600;
          }
          @font-face {
            font-family: 'Manrope';
            src: url('${window.location.origin}/fonts/Manrope-Bold.otf') format('opentype');
            font-weight: 700;
          }
          @font-face {
            font-family: 'Manrope';
            src: url('${window.location.origin}/fonts/Manrope-ExtraBold.otf') format('opentype');
            font-weight: 800;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Doran', 'Manrope', 'Tajawal', 'Arial', sans-serif; 
            direction: rtl; 
            background: #ffffff;
            color: #000;
            line-height: 1.3;
            font-size: 9px;
          }
          .header-section { 
            width: 100%;
            margin-bottom: 10px;
          }
          .header-image {
            width: 100%;
            height: auto;
            display: block;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 8px;
            background: #ffffff;
          }
          th {
            background: #000000;
            color: #E8CC64;
            font-weight: 700;
            font-size: 8px;
            height: 30px;
            border: 1px solid #000000;
            padding: 4px 2px;
          }
          td {
            border: 1px solid #000000;
            padding: 2px;
            text-align: center;
            vertical-align: middle;
            background: #ffffff;
            color: #000;
          }
          td.number-cell {
            background: #E8CC64;
            padding: 2px;
            font-weight: 700;
            font-size: 9px;
            color: #000;
            width: 60px;
          }
          td.image-cell {
            background: #ffffff;
            padding: 0;
            width: 70px;
          }
          .billboard-image {
            width: 100%;
            height: auto;
            max-height: 55px;
            object-fit: contain;
            display: block;
            margin: 0 auto;
          }
          .billboard-number {
            color: #000;
            font-weight: 700;
            font-size: 9px;
          }
          .status-available {
            color: #16a34a;
            font-weight: 700;
            font-size: 8px;
          }
          td.qr-cell {
            width: 60px;
            padding: 2px;
            vertical-align: middle;
          }
          .qr-code {
            width: 100%;
            height: auto;
            max-height: 55px;
            display: block;
            margin: 0 auto;
            cursor: pointer;
          }
          .qr-link {
            display: block;
            text-align: center;
          }
          .image-placeholder {
            width: 100%;
            height: 55px;
            background: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 7px;
            color: #666;
            text-align: center;
          }
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
              background: #ffffff !important;
            }
            .no-print { display: none; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            td, th, .billboard-image, .image-placeholder, td.image-cell, td.number-cell {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-section">
          ${headerImage}
        </div>

        ${pricing?.includePricing ? `
        <div style="margin-bottom: 8px; padding: 6px 10px; background: #000000; display: inline-block;">
          <span style="font-size: 9px; color: #E8CC64; font-weight: 700;">مدة الإيجار: ${RENTAL_PERIODS.find(p => p.value === pricing.period)?.label || pricing.period}</span>
        </div>
        ` : ''}

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
              ${pricing?.includePricing ? `
              <th style="width: 4%;">الفئة</th>
              <th style="width: 7%;">السعر</th>
              <th style="width: 7%;">بعد الخصم</th>
              ` : `
              <th style="width: 5%;">الحالة</th>
              `}
              <th style="width: 5%;">QR</th>
            </tr>
          </thead>
          <tbody>
            ${billboardsToPrint
              .map((billboard, index) => {
                const exportCode = billboard.name || billboard.id || `GF-${String(index + 1).padStart(4, "0")}`
                const level = billboard.level?.toUpperCase() || 'A'
                const price = pricing?.includePricing ? getPrice(level, billboard.size, pricing.period, 'company') : 0
                const discount = pricing?.discounts?.[level] || { type: 'percentage', value: 0 }
                const discountedPrice = pricing?.includePricing ? calculateDiscountedPrice(price, discount.type, discount.value) : 0
                
                return `
              <tr style="height: 60px;">
                <td class="number-cell"><div class="billboard-number">${index + 1}</div></td>
                <td style="font-size: 8px; font-weight: 800; color: #1a1a2e; background: #f5f5f5; padding: 4px; white-space: nowrap;">
                  <span dir="ltr" style="direction:ltr; unicode-bidi:bidi-override; display:inline-block;">${exportCode}</span>
                </td>
                ${includeImages ? `
                <td class="image-cell">
                  ${
                    billboard.imageUrl
                      ? `
                    <img src="${billboard.imageUrl}"
                         alt="صورة اللوحة ${billboard.name}"
                         class="billboard-image"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="image-placeholder" style="display:none;">
                      <span>صورة</span>
                    </div>
                  `
                      : `
                    <div class="image-placeholder">
                      <span>صورة</span>
                    </div>
                  `
                  }
                </td>
                ` : ''}
                <td style="font-weight: 500; text-align: right; padding: 4px; font-size: 8px;">${billboard.location}</td>
                <td style="font-size: 8px; padding: 2px;">${billboard.area}</td>
                <td style="font-size: 8px; padding: 2px;">${billboard.municipality}</td>
                <td style="font-weight: 600; font-size: 8px; color: #000000;">${billboard.size}</td>
                <td style="font-size: 9px; padding: 2px; font-weight: 700;">${billboard.facesCount || '-'}</td>
                <td style="font-size: 8px; padding: 2px;">${billboard.billboardType || '-'}</td>
                ${pricing?.includePricing ? `
                <td style="font-size: 8px; padding: 2px; font-weight: 700; background: #f0f0f0;">${level}</td>
                <td style="font-size: 8px; padding: 2px; font-weight: 600;">${price > 0 ? formatPrice(price) : '-'}</td>
                <td style="font-size: 8px; padding: 2px; font-weight: 700; color: ${discountedPrice < price ? '#16a34a' : '#000'};">${discountedPrice > 0 ? formatPrice(discountedPrice) : '-'}</td>
                ` : `
                <td style="color: ${billboard.status === 'متاح' ? '#16a34a' : '#b45309'}; font-weight: 600; font-size: 8px;">${billboard.status === 'متاح' ? 'متاح' : formatExpiryForPDF(billboard.expiryDate)}</td>
                `}
                <td class="qr-cell" style="padding: 2px;">
                  ${
                    qrCodes[billboard.id]
                      ? `
                    <a href="https://www.google.com/maps?q=${billboard.coordinates}" 
                       target="_blank" 
                       class="qr-link"
                       title="اضغط لفتح الموقع على الخريطة">
                      <img src="${qrCodes[billboard.id]}" class="qr-code" style="width: 50px; height: 50px; object-fit: contain;" alt="QR" />
                    </a>
                  `
                      : '<span style="color: #999; font-size: 7px;">-</span>'
                  }
                </td>
              </tr>
            `})
              .join("")}
          </tbody>
        </table>

        ${pricing?.includePricing ? `
          <table style="width: 100%; font-size: 8px; border-collapse: collapse; border-top: none;">
            <thead>
              <tr style="background: #000000;">
                <th colspan="5" style="padding: 4px 8px; text-align: center; color: #FFD700; font-size: 11px; font-weight: 900; border: 1px solid #000; border-top: none; letter-spacing: 1px;">ملخص الأسعار</th>
              </tr>
              <tr style="background: #000000;">
                <th style="padding: 4px; text-align: right; border: 1px solid #000; color: #FFD700; font-weight: 700; font-size: 8px;">الفئة</th>
                <th style="padding: 4px; text-align: center; border: 1px solid #000; color: #FFD700; font-weight: 700; font-size: 8px;">العدد</th>
                <th style="padding: 4px; text-align: center; border: 1px solid #000; color: #FFD700; font-weight: 700; font-size: 8px;">المجموع</th>
                <th style="padding: 4px; text-align: center; border: 1px solid #000; color: #FFD700; font-weight: 700; font-size: 8px;">بعد الخصم</th>
                <th style="padding: 4px; text-align: center; border: 1px solid #000; color: #FFD700; font-weight: 700; font-size: 8px;">الخصم</th>
              </tr>
            </thead>
            <tbody>
          ${(() => {
            const levelSummary: { [level: string]: { count: number, total: number, discounted: number } } = {}
            let grandTotal = 0
            let grandDiscounted = 0
            
            billboardsToPrint.forEach(billboard => {
              const level = billboard.level?.toUpperCase() || 'A'
              const price = getPrice(level, billboard.size, pricing.period, 'company')
              
              if (!levelSummary[level]) {
                levelSummary[level] = { count: 0, total: 0, discounted: 0 }
              }
              
              levelSummary[level].count++
              levelSummary[level].total += price
              
              const discount = pricing.discounts?.[level] || { type: 'percentage', value: 0 }
              const discountedPrice = calculateDiscountedPrice(price, discount.type, discount.value)
              levelSummary[level].discounted += discountedPrice
              
              grandTotal += price
              grandDiscounted += discountedPrice
            })
            
            const totalDiscountPercentage = grandTotal > 0 ? ((grandTotal - grandDiscounted) / grandTotal * 100) : 0
            
            return `
                ${Object.entries(levelSummary).map(([level, data]) => `
                  <tr>
                    <td style="padding: 3px; border: 1px solid #000; font-weight: 600; background: #fff; color: #000; font-size: 7px;">فئة ${level}</td>
                    <td style="padding: 3px; border: 1px solid #000; text-align: center; background: #fff; color: #000; font-size: 7px;">${data.count}</td>
                    <td style="padding: 3px; border: 1px solid #000; text-align: center; background: #fff; color: #000; font-size: 7px;">${formatPrice(data.total)}</td>
                    <td style="padding: 3px; border: 1px solid #000; text-align: center; background: #fff; color: #000; font-size: 7px;">${formatPrice(data.discounted)}</td>
                    <td style="padding: 3px; border: 1px solid #000; text-align: center; background: #fff; color: #000; font-size: 7px;">${data.total > 0 ? ((data.total - data.discounted) / data.total * 100).toFixed(1) + '%' : '-'}</td>
                  </tr>
                `).join('')}
                <tr style="background: #E8CC64;">
                  <td style="padding: 4px; border: 1px solid #000; color: #000; font-weight: 700; font-size: 8px;">الإجمالي</td>
                  <td style="padding: 4px; border: 1px solid #000; text-align: center; color: #000; font-weight: 700; font-size: 8px;">${billboardsToPrint.length}</td>
                  <td style="padding: 4px; border: 1px solid #000; text-align: center; color: #000; font-weight: 700; font-size: 8px;">${formatPrice(grandTotal)}</td>
                  <td style="padding: 4px; border: 1px solid #000; text-align: center; color: #000; font-weight: 700; font-size: 8px;">${formatPrice(grandDiscounted)}</td>
                  <td style="padding: 4px; border: 1px solid #000; text-align: center; color: #000; font-weight: 700; font-size: 8px;">${totalDiscountPercentage.toFixed(1)}%</td>
                </tr>
            `
          })()}
            </tbody>
          </table>
        ` : ''}

        <script>
          // تحسين للهاتف - استخدام طباعة مباشرة بدون نافذة منبثقة
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          
          window.onload = function() {
            if (isMobile) {
              // على الهاتف: عرض المحتوى مباشرة للحفظ كـ PDF
              document.body.style.background = 'white';
              // إضافة زر للطباعة/الحفظ
              const printBtn = document.createElement('button');
              printBtn.innerHTML = 'حفظ كـ PDF';
              printBtn.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#E8CC64;color:#000;padding:12px 30px;border:none;border-radius:25px;font-weight:bold;font-size:16px;z-index:9999;cursor:pointer;box-shadow:0 4px 15px rgba(0,0,0,0.3);';
              printBtn.onclick = function() {
                this.style.display = 'none';
                window.print();
                setTimeout(function() { printBtn.style.display = 'block'; }, 1000);
              };
              document.body.insertBefore(printBtn, document.body.firstChild);
            } else {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              }, 800);
            }
          };
        </script>
      </body>
      </html>
    `

    // للهاتف: فتح في نفس النافذة أو تبويب جديد بطريقة آمنة
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    
    if (isMobile) {
      // إنشاء Blob وفتحه
      const blob = new Blob([printContent], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      
      // فتح في نافذة جديدة
      const newWindow = window.open(url, '_blank')
      if (!newWindow) {
        // إذا تم حظر النافذة المنبثقة، استخدم رابط
        const link = document.createElement('a')
        link.href = url
        link.target = '_blank'
        link.click()
      }
      
      // تنظيف URL بعد فترة
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } else {
      const printWindow = window.open("", "_blank")
      if (!printWindow) return

      printWindow.document.write(printContent)
      printWindow.document.close()
    }
  }

  // Excel export function with same structure as PDF
  const handleExcelExport = async () => {
    const XLSX = await import('xlsx')
    
    // Prepare data with numbering and code columns
    const excelData = filteredBillboards.map((billboard, index) => ({
      'م': index + 1,
      'الكود': billboard.name || billboard.id || `GF-${String(index + 1).padStart(4, "0")}`,
      'الموقع': billboard.location,
      'البلدية': billboard.municipality,
      'المدينة': billboard.city,
      'المنطقة': billboard.area,
      'المقاس': billboard.size,
      'عدد الأوجه': billboard.facesCount || '-',
      'النوع': billboard.billboardType || '-',
      'الحالة': billboard.status,
      'تاريخ الانتهاء': billboard.expiryDate || '-',
      'الإحداثيات': billboard.coordinates
    }))

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },   // م
      { wch: 16 },  // الكود
      { wch: 40 },  // الموقع
      { wch: 15 },  // البلدية
      { wch: 15 },  // المدينة
      { wch: 15 },  // المنطقة
      { wch: 12 },  // المقاس
      { wch: 10 },  // عدد الأوجه
      { wch: 12 },  // النوع
      { wch: 10 },  // الحالة
      { wch: 15 },  // تاريخ الانتهاء
      { wch: 25 },  // الإحداثيات
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'اللوحات الإعلانية')

    // Generate file and download
    const today = new Date().toLocaleDateString('ar-LY', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')
    XLSX.writeFile(wb, `اللوحات_الإعلانية_${today}.xlsx`)
  }

  // Excel export for selected billboards only
  const handleExcelExportSelected = async () => {
    if (selectedBillboards.size === 0) return
    
    const selectedData = billboards.filter(b => selectedBillboards.has(b.id))
    const XLSX = await import('xlsx')
    
    const excelData = selectedData.map((billboard, index) => ({
      'م': index + 1,
      'الكود': billboard.name || billboard.id || `GF-${String(index + 1).padStart(4, "0")}`,
      'الموقع': billboard.location,
      'البلدية': billboard.municipality,
      'المدينة': billboard.city,
      'المنطقة': billboard.area,
      'المقاس': billboard.size,
      'عدد الأوجه': billboard.facesCount || '-',
      'النوع': billboard.billboardType || '-',
      'الحالة': billboard.status,
      'تاريخ الانتهاء': billboard.expiryDate || '-',
      'الإحداثيات': billboard.coordinates
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    ws['!cols'] = [
      { wch: 5 }, { wch: 16 }, { wch: 40 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
      { wch: 15 }, { wch: 25 }
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'اللوحات المحددة')

    const today = new Date().toLocaleDateString('ar-LY', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')
    XLSX.writeFile(wb, `اللوحات_المحددة_${selectedData.length}_${today}.xlsx`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-primary via-gold-light to-primary rounded-full flex items-center justify-center shadow-gold ring-4 ring-primary/30 animate-pulse mb-4">
              <img src="logo-symbol.svg" alt="رمز الشركة" className="w-16 h-16 object-contain" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-foreground mb-4 tracking-tight">جاري تحميل البيانات...</h2>
          <p className="text-lg font-semibold text-muted-foreground">يتم قراءة البيانات</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Dynamic Background with Fractal Glass Effect - hidden when map is fullscreen */}
      {!isMapFullscreen && <DynamicBackground />}

      {/* Hero Slider with integrated Header - hidden when map is fullscreen */}
      {!isMapFullscreen && (
        <HeroSlider 
          totalBillboards={billboards.filter(b => b.status === "متاح").length} 
          theme={theme}
          toggleTheme={toggleTheme}
          onScrollToBillboards={() => {
            document.getElementById('billboards-section')?.scrollIntoView({ behavior: 'smooth' })
          }}
        />
      )}

      {/* تنبيه التحديث المستمر - hidden when map is fullscreen */}
      {!isMapFullscreen && <UpdateNotice />}

      {/* Section Navigator - يختفي عند فتح لوحة الخريطة أو ملء الشاشة */}
      {!isMapFullscreen && (
        <SectionNavigator hideWhenMapOpen={showMapPanel} theme={theme} toggleTheme={toggleTheme} />
      )}

      <main id="billboards-section" className={`container mx-auto px-4 py-12 relative z-10 page-transition ${isMapFullscreen ? 'hidden' : ''}`}>
        <SearchFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedMunicipalities={selectedMunicipalities}
          setSelectedMunicipalities={setSelectedMunicipalities}
          selectedCities={selectedCities}
          setSelectedCities={setSelectedCities}
          selectedAreas={selectedAreas}
          setSelectedAreas={setSelectedAreas}
          selectedSizes={selectedSizes}
          setSelectedSizes={setSelectedSizes}
          selectedAvailability={selectedAvailability}
          setSelectedAvailability={setSelectedAvailability}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showMap={showMap}
          setShowMap={setShowMap}
          municipalities={municipalities}
          cities={cities}
          areas={areas}
          sizes={sizes}
          availabilityOptions={availabilityOptions}
          totalCount={billboards.length}
          onPrint={() => setShowPrintDialog(true)}
          onExcel={handleExcelExport}
          onNearbyFilter={(lat, lng, radius) => setNearbyLocation({ lat, lng, radius })}
          isNearbyActive={nearbyLocation !== null}
          onClearNearby={() => setNearbyLocation(null)}
        />

        {showMap && (
          <InteractiveMap
            billboards={filteredBillboards}
            onImageView={setSelectedImage}
            selectedBillboards={selectedBillboards}
            onToggleSelection={toggleBillboardSelection}
            onSelectMultiple={selectMultipleBillboards}
            onDownloadSelected={handleDownloadSelected}
            onFullscreenChange={setIsMapFullscreen}
          />
        )}

        {/* Stats Section */}
        <StatsSection billboards={billboards} id="stats-section" />

        {/* Quick Filters + Count + Display Mode Toggle + Cards Per Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <DisplayModeToggle mode={displayMode.mode} onToggle={displayMode.toggleMode} />
            
            {/* Cards Per Row Selector - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-1 bg-muted/50 rounded-full p-1 border border-border/50">
              {[3, 4, 5, 6].map((num) => (
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
            
            {/* Select All / Deselect All Button */}
            <Button
              onClick={() => {
                const allFilteredIds = filteredBillboards.map(b => b.id)
                const allSelected = allFilteredIds.every(id => selectedBillboards.has(id))
                
                if (allSelected) {
                  // Deselect all filtered
                  const newSelected = new Set(selectedBillboards)
                  allFilteredIds.forEach(id => newSelected.delete(id))
                  setSelectedBillboards(newSelected)
                } else {
                  // Select all filtered
                  const newSelected = new Set(selectedBillboards)
                  allFilteredIds.forEach(id => newSelected.add(id))
                  setSelectedBillboards(newSelected)
                }
              }}
              variant="outline"
              size="sm"
              className="rounded-full px-4 py-2 text-sm font-bold border-primary/50 hover:bg-primary/10 gap-2"
            >
              {filteredBillboards.every(b => selectedBillboards.has(b.id)) && filteredBillboards.length > 0 ? (
                <>
                  <Square className="w-4 h-4" />
                  إلغاء تحديد الكل
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4" />
                  تحديد الكل ({filteredBillboards.length})
                </>
              )}
            </Button>
            
            {/* Quick Filter Buttons */}
            {availabilityOptions.map((option) => (
              <Button
                key={option.value}
                onClick={() => setSelectedAvailability(option.value)}
                variant={selectedAvailability === option.value ? "default" : "outline"}
                size="sm"
                className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${
                  selectedAvailability === option.value
                    ? "bg-primary text-primary-foreground shadow-gold"
                    : "border-border hover:border-primary/50 hover:bg-primary/10"
                }`}
              >
                {option.label}
              </Button>
            ))}
            
            {selectedAvailability !== "all" && (
              <Button
                onClick={() => setSelectedAvailability("all")}
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
                onClick={() => {
                  setShowAllBillboards(false)
                  setCurrentPage(1)
                }}
                variant="outline"
                className="border-2 border-primary/50 text-primary hover:bg-primary/10 font-black px-6 py-3 rounded-full"
              >
                عرض أقل
              </Button>
            )}
          </div>
        </div>


        {selectedBillboards.size > 0 && typeof document !== 'undefined' && createPortal(
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto max-w-[90vw] md:max-w-fit bg-background/40 backdrop-blur-sm border border-primary/20 rounded-xl p-2 md:p-3 z-[1000000]">
            <div className="flex items-center justify-center gap-2 md:gap-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-bold text-sm md:text-base">
                  {selectedBillboards.size} لوحة مختارة
                </Badge>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  onClick={clearSelection}
                  variant="outline"
                  size="sm"
                  className="text-red-400 border-red-500/30 hover:bg-red-500/10 bg-transparent text-xs md:text-sm"
                >
                  إلغاء التحديد
                </Button>
                <Button
                  onClick={() => setShowEmailDialog(true)}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 md:px-6 text-xs md:text-sm"
                >
                  <Mail className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
                  إرسال
                </Button>
                <Button
                  onClick={() => setShowSelectedPrintDialog(true)}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 md:px-6 text-xs md:text-sm"
                >
                  <Download className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
                  PDF
                </Button>
                <Button
                  onClick={() => handleExcelExportSelected()}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 md:px-6 text-xs md:text-sm"
                >
                  <FileSpreadsheet className="w-3 h-3 md:w-4 md:h-4 ml-1 md:ml-2" />
                  Excel
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
            const selectedBillboardsData = billboards.filter((b) => selectedBillboards.has(b.id))
            handlePrint(includeLogo, includeImages, selectedBillboardsData, pricingOptions)
          }}
          billboards={billboards.filter((b) => selectedBillboards.has(b.id))}
        />

        <MapSidePanel
          billboard={mapPanelBillboard}
          isOpen={showMapPanel}
          onClose={() => {
            setShowMapPanel(false)
            setMapPanelBillboard(null)
          }}
          onViewImage={setSelectedImage}
        />

        {showAllBillboards && totalPages > 1 && (
          <>
            {/* Pagination buttons above cards */}
            <div className="flex justify-center items-center gap-2 mb-8 mt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
              >
                السابق
              </Button>

              <span className="px-4 py-2 text-foreground font-bold">
                صفحة {currentPage} من {totalPages}
              </span>

              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
              >
                التالي
              </Button>
            </div>
          </>
        )}

        {/* Billboard Cards Section with Light Background */}
        <div className="relative py-12 -mt-4" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)', width: '100vw' }}>
          {/* Simple Gradient Background - Performance Optimized */}
          <div className="absolute inset-0 z-0">
            {/* Static gradient background */}
            <div 
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, 
                  hsl(var(--background)) 0%,
                  hsl(var(--primary) / 0.05) 50%,
                  hsl(var(--background)) 100%)`
              }}
            />
            {/* Simple glow - no animation */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[50%] bg-primary/8 rounded-full blur-[80px]" />
          </div>
          
          {/* Cards Grid - 1 card on mobile, dynamic columns on desktop */}
          <div
            className="billboard-grid relative z-10 grid gap-4 md:gap-5 px-4 md:px-6 lg:px-12 xl:px-16 grid-cols-1"
            style={{
              ['--cards-per-row' as string]: cardsPerRow
            }}
          >
            {paginatedBillboards.map((billboard) => (
                <BillboardCard
                  key={billboard.id}
                  billboard={billboard}
                  isSelected={selectedBillboards.has(billboard.id)}
                  onToggleSelection={toggleBillboardSelection}
                  onViewImage={setSelectedImage}
                  onShowMap={(b) => {
                    setMapPanelBillboard(b)
                    setShowMapPanel(true)
                  }}
                  displayMode={displayMode.mode}
                />
              ))}
          </div>
        </div>

        {showAllBillboards && totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-12">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
            >
              السابق
            </Button>

            {(() => {
              const maxVisiblePages = 5
              let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
              let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
              
              if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1)
              }
              
              return Array.from({ length: endPage - startPage + 1 }, (_, i) => {
                const pageNum = startPage + i
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-12 h-12 ${
                      currentPage === pageNum
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {pageNum}
                  </Button>
                )
              })
            })()}

            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
            >
              التالي
            </Button>
          </div>
        )}

        {filteredBillboards.length === 0 && (
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
            className="flex items-center justify-center w-11 h-11 md:w-14 md:h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300 animate-pulse hover:animate-none"
          >
            <MessageCircle className="w-5 h-5 md:w-7 md:h-7" />
          </a>
        </div>
      )}

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[1000002] backdrop-blur-md"
          onClick={() => setSelectedImage(null)}
        >
          {/* Close Button - Always Visible */}
          <Button
            className="fixed top-4 right-4 z-[1000003] bg-card/90 text-foreground hover:bg-destructive hover:text-destructive-foreground rounded-full px-4 py-2 shadow-xl border border-border/50 backdrop-blur-md"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(null);
            }}
          >
            ✕ إغلاق
          </Button>
          
          {/* Image Container with Scroll */}
          <div 
            className="relative w-full h-full overflow-auto flex items-center justify-center p-4 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt="عرض اللوحة"
              className="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl cursor-zoom-out"
              onClick={() => setSelectedImage(null)}
            />
          </div>
          
          {/* Bottom hint for mobile */}
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm md:hidden z-[1000003]">
            اضغط على الصورة للإغلاق
          </div>
        </div>
      )}

      {!isMapFullscreen && <ClientLogos />}
      {!isMapFullscreen && <Footer id="footer" />}
    </div>
  )
}

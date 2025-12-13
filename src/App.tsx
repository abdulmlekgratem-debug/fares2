import { useState, useEffect } from "react"
import { Search, MapPin, Star, Award, Users, MessageCircle, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import Header from "@/components/Header"
import SearchFilters from "@/components/SearchFilters"
import BillboardCard from "@/components/BillboardCard"
import InteractiveMap from "@/components/InteractiveMap"
import EmailDialog from "@/components/EmailDialog"
import PrintDialog from "@/components/PrintDialog"
import Footer from "@/components/Footer"
import StatsSection from "@/components/StatsSection"
import { loadBillboardsFromExcel } from "@/services/billboardService"
import { Billboard } from "@/types"
import { useTheme } from "@/hooks/useTheme"

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const [billboards, setBillboards] = useState<Billboard[]>([])
  const [filteredBillboards, setFilteredBillboards] = useState<Billboard[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMunicipalities, setSelectedMunicipalities] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedAvailability, setSelectedAvailability] = useState("available")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showAllBillboards, setShowAllBillboards] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedBillboards, setSelectedBillboards] = useState<Set<string>>(new Set())
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [showPrintDialog, setShowPrintDialog] = useState(false)
  const [customerEmail, setCustomerEmail] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [emailMessage, setEmailMessage] = useState("")

  const itemsPerPage = 12

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const data = await loadBillboardsFromExcel()
        setBillboards(data)
        setFilteredBillboards(data)
      } catch (error) {
        console.error('Error loading billboards:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  // Helper function to parse date from string (supports both YYYY-MM-DD and DD/MM/YYYY)
  const parseExpiryDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null
    
    // Try ISO format first (YYYY-MM-DD)
    if (dateStr.includes('-') && dateStr.length === 10 && dateStr.indexOf('-') === 4) {
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        const year = parseInt(parts[0])
        const month = parseInt(parts[1]) - 1
        const day = parseInt(parts[2])
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
          return new Date(year, month, day)
        }
      }
    }
    
    // Try DD/MM/YYYY or DD-MM-YYYY format
    const parts = dateStr.split(/[/-]/)
    if (parts.length === 3) {
      const day = parseInt(parts[0])
      const month = parseInt(parts[1]) - 1
      const year = parseInt(parts[2])
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 2000) {
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

    if (!showAllBillboards) {
      filtered = filtered.slice(0, 8)
      setCurrentPage(1)
    }

    setFilteredBillboards(filtered)
  }, [searchTerm, selectedMunicipalities, selectedCities, selectedAreas, selectedSizes, selectedAvailability, billboards, showAllBillboards])

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

  const clearSelection = () => {
    setSelectedBillboards(new Set())
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

  const handlePrint = async (includeLogo: boolean, includeImages: boolean = true) => {
    // Generate QR codes for all billboards
    const QRCode = await import('qrcode')
    const qrCodes: { [key: string]: string } = {}
    
    for (const billboard of filteredBillboards) {
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

        <table>
          <thead>
            <tr>
              <th style="width: 6%;">رقم</th>
              ${includeImages ? '<th style="width: 10%;">صورة</th>' : ''}
              <th style="width: ${includeImages ? '20%' : '28%'};">الموقع</th>
              <th style="width: 10%;">البلدية</th>
              <th style="width: 10%;">المنطقة</th>
              <th style="width: 8%;">المقاس</th>
              <th style="width: 6%;">الأوجه</th>
              <th style="width: 8%;">النوع</th>
              <th style="width: 6%;">الحالة</th>
              <th style="width: 6%;">QR</th>
            </tr>
          </thead>
          <tbody>
            ${filteredBillboards
              .map(
                (billboard, index) => `
              <tr style="height: 60px;">
                <td class="number-cell"><div class="billboard-number">TR-${String(index + 1).padStart(4, "0")}</div></td>
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
                <td style="font-size: 8px; padding: 2px;">${billboard.municipality}</td>
                <td style="font-size: 8px; padding: 2px;">${billboard.area}</td>
                <td style="font-weight: 600; font-size: 8px; color: #000000;">${billboard.size}</td>
                <td style="font-size: 9px; padding: 2px; font-weight: 700;">${billboard.facesCount || '-'}</td>
                <td style="font-size: 8px; padding: 2px;">${billboard.billboardType || '-'}</td>
                <td style="color: #000000; font-weight: 600; font-size: 8px;">متاح</td>
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
            `,
              )
              .join("")}
          </tbody>
        </table>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 1000);
            }, 800);
          };
        </script>
      </body>
      </html>
    `

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    printWindow.document.write(printContent)
    printWindow.document.close()
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
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <Header theme={theme} toggleTheme={toggleTheme} />

      <section className="relative z-10 py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10" />
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight leading-tight text-foreground">
            الرائدون في عالم الدعاية والإعلان
          </h2>
          <p className="text-xl md:text-2xl mb-8 max-w-4xl mx-auto leading-relaxed font-bold text-muted-foreground">
            نحن نقدم حلول إعلانية متكاملة ومبتكرة تضمن وصول رسالتك إلى الجمهور المناسب
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">
            <div className="glass gold-border-glow rounded-2xl p-6 card-hover">
              <Award className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-3xl font-black mb-2 text-foreground">+20</h3>
              <p className="text-lg font-bold text-muted-foreground">سنة خبرة</p>
            </div>
            <div className="glass gold-border-glow rounded-2xl p-6 card-hover">
              <Users className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-3xl font-black mb-2 text-foreground">+800</h3>
              <p className="text-lg font-bold text-muted-foreground">عميل راضي</p>
            </div>
            <div className="glass gold-border-glow rounded-2xl p-6 card-hover">
              <MapPin className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-2xl font-black mb-2 text-foreground">مواقع كافية لحملتك</h3>
              <p className="text-lg font-bold text-muted-foreground"></p>
            </div>
            <div className="glass gold-border-glow rounded-2xl p-6 card-hover">
              <Star className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-3xl font-black mb-2 text-foreground">100%</h3>
              <p className="text-lg font-bold text-muted-foreground">جودة مضمونة</p>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12 relative z-10">
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
        />

        {showMap && <InteractiveMap billboards={filteredBillboards} onImageView={setSelectedImage} />}

        {/* Stats Section */}
        <StatsSection billboards={billboards} />

        {/* Quick Filters + Count */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground text-lg font-semibold ml-4">
              عرض <span className="font-black text-primary">{paginatedBillboards.length}</span> من أصل{" "}
              <span className="font-black text-primary">{filteredBillboards.length}</span> لوحة
            </p>
            
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


        {selectedBillboards.size > 0 && (
          <div className="fixed bottom-20 left-4 right-4 glass gold-border-glow rounded-xl p-4 z-50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
                  {selectedBillboards.size} لوحة مختارة
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={clearSelection}
                  variant="outline"
                  size="sm"
                  className="text-red-400 border-red-500/30 hover:bg-red-500/10 bg-transparent"
                >
                  إلغاء التحديد
                </Button>
                <Button
                  onClick={() => setShowEmailDialog(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                >
                  <Mail className="w-4 h-4 ml-2" />
                  إرسال القائمة
                </Button>
              </div>
            </div>
          </div>
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
          onPrint={handlePrint}
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

        <div
          className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}
        >
          {paginatedBillboards.map((billboard) => (
            <BillboardCard
              key={billboard.id}
              billboard={billboard}
              isSelected={selectedBillboards.has(billboard.id)}
              onToggleSelection={toggleBillboardSelection}
              onViewImage={setSelectedImage}
            />
          ))}
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

      <div className="fixed bottom-6 right-6 z-50">
        <a
          href="https://wa.me/218913228908?text=مرحباً، أريد الاستفسار عن اللوحات الإعلانية المتاحة"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-16 h-16 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 animate-pulse hover:animate-none"
        >
          <MessageCircle className="w-8 h-8" />
        </a>
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-6xl max-h-full">
            <img
              src={selectedImage || "https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg"}
              alt="عرض اللوحة"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <Button
              className="absolute top-4 right-4 bg-card text-foreground hover:bg-secondary rounded-full px-6 py-2 shadow-lg border border-border"
              onClick={() => setSelectedImage(null)}
            >
              إغلاق
            </Button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

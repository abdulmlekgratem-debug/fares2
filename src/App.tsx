import { useState, useEffect } from "react"
import { Search, MapPin, Star, Award, Users, MessageCircle, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import Header from "@/components/Header"
import SearchFilters from "@/components/SearchFilters"
import BillboardCard from "@/components/BillboardCard"
import InteractiveMap from "@/components/InteractiveMap"
import EmailDialog from "@/components/EmailDialog"
import Footer from "@/components/Footer"
import { loadBillboardsFromExcel } from "@/services/billboardService"
import { Billboard } from "@/types"

export default function App() {
  const [billboards, setBillboards] = useState<Billboard[]>([])
  const [filteredBillboards, setFilteredBillboards] = useState<Billboard[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMunicipality, setSelectedMunicipality] = useState("all")
  const [selectedSize, setSelectedSize] = useState("all")
  const [selectedAvailability, setSelectedAvailability] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showAllBillboards, setShowAllBillboards] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedBillboards, setSelectedBillboards] = useState<Set<string>>(new Set())
  const [showEmailDialog, setShowEmailDialog] = useState(false)
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
        setFilteredBillboards(data.slice(0, 8))
      } catch (error) {
        console.error('Error loading billboards:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  useEffect(() => {
    let filtered = billboards

    if (searchTerm) {
      filtered = filtered.filter(
        (billboard) =>
          billboard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          billboard.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          billboard.municipality.toLowerCase().includes(searchTerm.toLowerCase()) ||
          billboard.area.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (selectedMunicipality !== "all") {
      filtered = filtered.filter((billboard) => billboard.municipality === selectedMunicipality)
    }

    if (selectedSize !== "all") {
      filtered = filtered.filter((billboard) => billboard.size === selectedSize)
    }

    if (selectedAvailability !== "all") {
      const isAvailable = selectedAvailability === "available" || selectedAvailability === "متاحة"
      const isSoon = selectedAvailability === "soon" || selectedAvailability === "متاحة قريباً"
      filtered = filtered.filter((billboard) => {
        if (isAvailable) {
          return billboard.status === "متاح"
        } else if (isSoon) {
          return billboard.status === "قريباً"
        }
        return true
      })
    }

    if (!showAllBillboards) {
      filtered = filtered.slice(0, 8)
      setCurrentPage(1)
    }

    setFilteredBillboards(filtered)
  }, [searchTerm, selectedMunicipality, selectedSize, selectedAvailability, billboards, showAllBillboards])

  const municipalities = Array.from(new Set(billboards.map((b) => b.municipality)))
  const sizes = Array.from(new Set(billboards.map((b) => b.size)))

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

  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>المساحات الإعلانية المتاحة - الفارس الذهبي</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4;
            margin: 12mm;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Tajawal', 'Arial', sans-serif; 
            direction: rtl; 
            background: white;
            color: #000;
            line-height: 1.3;
            font-size: 10px;
          }
          .header { 
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px; 
            padding: 12px 0;
            border-bottom: 2px solid #D4AF37;
          }
          .logo-section {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo { 
            width: 70px; 
            height: 70px; 
            object-fit: contain;
          }
          .company-info {
            text-align: right;
          }
          .company-name-ar { 
            font-size: 16px; 
            font-weight: 700; 
            color: #000; 
            margin-bottom: 2px;
          }
          .company-name-en { 
            font-size: 12px; 
            color: #666;
            font-weight: 400;
          }
          .title-section {
            text-align: center;
            flex: 1;
          }
          .report-title {
            font-size: 18px;
            font-weight: 700;
            color: #000;
            background: #D4AF37;
            padding: 6px 18px;
            border-radius: 20px;
            display: inline-block;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 9px;
          }
          th, td {
            border: 1px solid #D4AF37;
            padding: 4px 3px;
            text-align: center;
            vertical-align: middle;
          }
          th {
            background: #D4AF37;
            color: #000;
            font-weight: 700;
            font-size: 10px;
            height: 35px;
          }
          tr:nth-child(even) {
            background: #FFFEF7;
          }
          .billboard-image {
            width: 60px;
            height: 45px;
            object-fit: cover;
            border-radius: 3px;
            border: 1px solid #D4AF37;
            display: block;
            margin: 0 auto;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          .billboard-number {
            color: #000;
            font-weight: 700;
            font-size: 9px;
            padding: 2px;
          }
          .status-available {
            color: #059669;
            font-weight: 700;
            font-size: 8px;
          }
          .coordinates-link {
            color: #1D4ED8;
            text-decoration: underline;
            font-size: 8px;
            font-weight: 500;
            display: inline-block;
            padding: 2px 4px;
          }
          .image-placeholder {
            width: 60px;
            height: 45px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border: 1px solid #D4AF37;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 7px;
            color: #666;
            text-align: center;
            margin: 0 auto;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .no-print { display: none; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            .billboard-image, .image-placeholder {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        </style>
     </head>
      <body>
        <div class="header">
          <div class="logo-section">
            <img src="${window.location.origin}/logofares.svg" alt="شعار الشركة" class="logo" onerror="this.style.display='none'" />
            <div class="company-info">
              <div class="company-name-ar">الفــــارس الذهبــــي</div>
              <div class="company-name-en">AL FARES AL DAHABI</div>
              <div class="company-name-ar" style="font-size: 10px;">للدعــــــايــة والإعــــلان</div>
            </div>
          </div>
          <div class="title-section">
            <div class="report-title">المساحات الإعلانية المتاحة</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 16%;">صورة الوحة</th>
              <th style="width: 12%;">رقم الوحة</th>
              <th style="width: 22%;">موقع الوحة</th>
              <th style="width: 14%;">البلدية</th>
              <th style="width: 14%;">المنطقة</th>
              <th style="width: 12%;">المقاس</th>
              <th style="width: 10%;">الحالة</th>
              <th style="width: 16%;">عرض على الخريطة</th>
            </tr>
          </thead>
          <tbody>
            ${filteredBillboards
              .map(
                (billboard, index) => `
              <tr style="height: 60px;">
                <td>
                  ${
                    billboard.imageUrl
                      ? `
                    <img src="${billboard.imageUrl}"
                         alt="صورة اللوحة ${billboard.name}"
                         class="billboard-image"
                         onload="this.style.display='block'"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="image-placeholder" style="display:none;">
                      <span>صورة<br>اللوحة</span>
                    </div>
                  `
                      : `
                    <div class="image-placeholder">
                      <span>صورة<br>اللوحة</span>
                    </div>
                  `
                  }
                </td>
                <td><div class="billboard-number">TR-${String(index + 1).padStart(6, "0")}</div></td>
                <td style="font-weight: 500; text-align: right; padding-right: 6px; font-size: 9px;">${billboard.location}</td>
                <td style="font-size: 8px;">${billboard.municipality}</td>
                <td style="font-size: 8px;">${billboard.area}</td>
                <td style="font-weight: 500; font-size: 8px;">${billboard.size}</td>
                <td><span class="status-available">متاح</span></td>
                <td>
                  ${
                    billboard.coordinates
                      ? `
                    <a href="https://www.google.com/maps?q=${billboard.coordinates}"
                       target="_blank"
                       class="coordinates-link">
                      عرض الموقع
                    </a>
                  `
                      : '<span style="color: #666; font-size: 8px;">غير متوفر</span>'
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
            }, 500);
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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-full flex items-center justify-center shadow-2xl ring-4 ring-yellow-400/30 animate-pulse mb-4">
              <img src="logo-symbol.svg" alt="رمز الشركة" className="w-16 h-16 object-contain" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">جاري تحميل البيانات...</h2>
          <p className="text-lg font-semibold text-gray-700">يتم قراءة البيانات</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 relative overflow-hidden">
      <div className="fixed top-1/2 right-4 transform -translate-y-1/2 opacity-20 pointer-events-none z-0">
        <img src="/logo-symbol.svg" alt="رمز الشركة" className="w-[600px] h-[600px] object-contain" />
      </div>

      <Header />


      {!showAllBillboards && (
        <section className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 text-black py-16 relative z-10">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-5xl md:text-6xl font-black mb-6 tracking-tight leading-tight">
              الرائدون في عالم الدعاية والإعلان
            </h2>
            <p className="text-xl md:text-2xl mb-8 max-w-4xl mx-auto leading-relaxed font-bold">
              نحن نقدم حلول إعلانية متكاملة ومبتكرة تضمن وصول رسالتك إلى الجمهور المناسب في الوقت المناسب
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-12">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <Award className="w-12 h-12 mx-auto mb-4 text-black" />
                <h3 className="text-3xl font-black mb-2">+20</h3>
                <p className="text-lg font-bold">سنة خبرة</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <Users className="w-12 h-12 mx-auto mb-4 text-black" />
                <h3 className="text-3xl font-black mb-2">+800</h3>
                <p className="text-lg font-bold">عميل راضي</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-black" />
                <h3 className="text-3xl font-black mb-2"> نملك مواقع كافية لحملتك الإعلانية</h3>
                <p className="text-lg font-bold"></p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <Star className="w-12 h-12 mx-auto mb-4 text-black" />
                <h3 className="text-3xl font-black mb-2">100%</h3>
                <p className="text-lg font-bold">جودة مضمونة</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <main className="container mx-auto px-4 py-12 relative z-10">
        <SearchFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedMunicipality={selectedMunicipality}
          setSelectedMunicipality={setSelectedMunicipality}
          selectedSize={selectedSize}
          setSelectedSize={setSelectedSize}
          selectedAvailability={selectedAvailability}
          setSelectedAvailability={setSelectedAvailability}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showMap={showMap}
          setShowMap={setShowMap}
          municipalities={municipalities}
          sizes={sizes}
          onPrint={handlePrint}
        />

        {showMap && <InteractiveMap billboards={filteredBillboards} onImageView={setSelectedImage} />}

        <div className="flex items-center justify-between mb-8">
          <p className="text-gray-700 text-lg font-semibold">
            عرض <span className="font-black text-yellow-600">{paginatedBillboards.length}</span> من أصل
            <span className="font-black text-yellow-600">{filteredBillboards.length}</span> لوحة متاحة
          </p>

          {!showAllBillboards && billboards.length > 8 && (
            <Button
              onClick={() => setShowAllBillboards(true)}
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-black px-8 py-3 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300"
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
              className="border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-50 font-black px-6 py-3 rounded-full"
            >
              عرض أقل
            </Button>
          )}
        </div>

        <div
          className={`grid gap-8 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"}`}
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

        {selectedBillboards.size > 0 && (
          <div className="fixed bottom-20 left-4 right-4 bg-white rounded-xl shadow-2xl border-2 border-green-500 p-4 z-50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">
                  {selectedBillboards.size} لوحة مختارة
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={clearSelection}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50 bg-transparent"
                >
                  إلغاء التحديد
                </Button>
                <Button
                  onClick={() => setShowEmailDialog(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6"
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

        {showAllBillboards && totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-12">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="border-yellow-400 text-yellow-600 hover:bg-yellow-50"
            >
              السابق
            </Button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-12 h-12 ${
                    currentPage === pageNum
                      ? "bg-yellow-500 text-black hover:bg-yellow-600"
                      : "border-yellow-400 text-yellow-600 hover:bg-yellow-50"
                  }`}
                >
                  {pageNum}
                </Button>
              )
            })}

            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="border-yellow-400 text-yellow-600 hover:bg-yellow-50"
            >
              التالي
            </Button>
          </div>
        )}

        {filteredBillboards.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-yellow-100 rounded-full flex items-center justify-center">
              <Search className="w-12 h-12 text-yellow-500" />
            </div>
            <p className="text-gray-600 text-xl mb-4 font-bold">لا توجد لوحات تطابق معايير البحث</p>
            <p className="text-gray-500 font-semibold">جرب تغيير معايير البحث أو الفلاتر</p>
          </div>
        )}
      </main>

      <div className="fixed bottom-6 right-6 z-50">
        <a
          href="https://wa.me/218913228908?text=مرحباً، أريد الاستفسار عن اللوحات الإعلانية المتاحة"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 animate-pulse hover:animate-none"
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
              className="absolute top-4 right-4 bg-white text-black hover:bg-gray-100 rounded-full px-6 py-2 shadow-lg"
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

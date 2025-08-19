"use client"

/**
 * مكون نافذة الإيميل والواتساب - Email and WhatsApp Dialog Component
 * يعرض نموذج لإرسال قائمة اللوحات المختارة عبر البريد الإلكتروني أو الواتساب
 * يتضمن حقول معلومات العميل وعرض اللوحات المختارة
 */

import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Billboard {
  id: string
  name: string
  location: string
  municipality: string
  city: string
  area: string
  size: string
  level: string
  status: string
  expiryDate: string | null
  coordinates: string
  imageUrl: string
  gpsLink: string
}

interface EmailDialogProps {
  isOpen: boolean
  onClose: () => void
  selectedBillboards: Set<string>
  billboards: Billboard[]
  customerName: string
  setCustomerName: (name: string) => void
  customerEmail: string
  setCustomerEmail: (email: string) => void
  customerPhone: string
  setCustomerPhone: (phone: string) => void
  emailMessage: string
  setEmailMessage: (message: string) => void
  onSend: () => void
}

export default function EmailDialog({
  isOpen,
  onClose,
  selectedBillboards,
  billboards,
  customerName,
  setCustomerName,
  customerEmail,
  setCustomerEmail,
  customerPhone,
  setCustomerPhone,
  emailMessage,
  setEmailMessage,
  onSend,
}: EmailDialogProps) {
  const sendViaWhatsApp = () => {
    const selectedBillboardsList = billboards
      .filter((b) => selectedBillboards.has(b.id))
      .map(
        (billboard, index) =>
          `${index + 1}. ${billboard.name}\n   📍 ${billboard.location}\n   📏 ${billboard.size}\n   🏢 ${billboard.municipality}\n`,
      )
      .join("\n")

    const message = `السلام عليكم ورحمة الله وبركاته

أرغب في الاستفسار عن اللوحات الإعلانية التالية:

👤 الاسم: ${customerName}
📧 البريد الإلكتروني: ${customerEmail || "غير متوفر"}
📱 رقم الهاتف: ${customerPhone || "غير متوفر"}

📋 اللوحات المختارة (${selectedBillboards.size}):
${selectedBillboardsList}

${emailMessage ? `💬 ملاحظات إضافية:\n${emailMessage}\n\n` : ""}

شكراً لكم
الفارس الذهبي للدعاية والإعلان`

    const whatsappUrl = `https://wa.me/218913228908?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-right mb-4">إرسال قائمة اللوحات المختارة</h3>

        <div className="space-y-4 text-right">
          {/* الاسم */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">الاسم *</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-right"
              placeholder="أدخل اسمك"
              required
            />
          </div>

          {/* البريد الإلكتروني (اختياري) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-right"
              placeholder="أدخل بريدك الإلكتروني (اختياري)"
            />
          </div>

          {/* رقم الهاتف */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">رقم الهاتف</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-right"
              placeholder="أدخل رقم هاتفك"
            />
          </div>

          {/* رسالة إضافية */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">رسالة إضافية</label>
            <textarea
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-right h-24 resize-none"
              placeholder="أضف أي ملاحظات أو متطلبات خاصة..."
            />
          </div>

          {/* اللوحات المختارة */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">اللوحات المختارة ({selectedBillboards.size}):</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {billboards
                .filter((b) => selectedBillboards.has(b.id))
                .map((billboard) => (
                  <div key={billboard.id} className="text-xs bg-white p-2 rounded border">
                    <span className="font-bold">{billboard.name}</span> - {billboard.location}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* الأزرار */}
        <div className="flex gap-2 mt-6">
          <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent">
            إلغاء
          </Button>
          <Button
            onClick={sendViaWhatsApp}
            disabled={!customerName}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
          >
            <MessageCircle className="w-4 h-4 ml-2" />
            واتساب
          </Button>

          {/* زر الإيميل مخفي مؤقتًا */}
          {false && (
            <Button
              onClick={onSend}
              disabled={!customerName}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              إيميل
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

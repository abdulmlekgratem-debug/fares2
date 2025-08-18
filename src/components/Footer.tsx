"use client"

/**
 * مكون تذييل الصفحة - Footer Component
 * يحتوي على معلومات الشركة وطرق التواصل والموقع
 * يعرض الشعار ومعلومات الاتصال وروابط التواصل الاجتماعي
 */

import { Phone, MessageCircle, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-black via-gray-900 to-black text-white py-12 mt-16 relative z-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-right">
          <div>
            <div className="flex items-center justify-center md:justify-start mb-6">
              <div className="flex items-center gap-3">
                <img src="new-logo.svg" alt="رمز الشركة" className="h-16 object-contain" />
              </div>
            </div>
            <p className="text-gray-400 font-semibold">شريكك المثالي في عالم الدعاية والإعلان</p>
          </div>

          <div>
            <h4 className="text-xl font-black text-yellow-400 mb-6">تواصل معنا</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-center md:justify-start">
                <Phone className="w-5 h-5 text-yellow-400 ml-3" />
                <a
                  href="tel:+218913228908"
                  className="text-gray-300 hover:text-yellow-400 transition-colors duration-300 hover:underline"
                >
                  +218.91.322.8908
                </a>
              </div>
              <div className="flex items-center justify-center md:justify-start">
                <Phone className="w-5 h-5 text-yellow-400 ml-3" />
                <a
                  href="tel:+218913228908"
                  className="text-gray-300 hover:text-yellow-400 transition-colors duration-300 hover:underline"
                >
                  +218.91.322.8908
                </a>
              </div>
              <div className="flex items-center justify-center md:justify-start">
                <MessageCircle className="w-5 h-5 text-green-400 ml-3" />
                <a
                  href="https://wa.me/218913228908?text=مرحباً، أريد الاستفسار عن اللوحات الإعلانية المتاحة"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-green-400 transition-colors duration-300 hover:underline"
                >
                  واتساب: +218.91.322.8908
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xl font-black text-yellow-400 mb-6">موقعنا</h4>
            <div className="space-y-4">
              <p className="text-gray-300 font-semibold">زليتن - ليبيا</p>
              <p className="text-gray-300 font-semibold">بجوار مدرسة عقبة بن نافع</p>
              <Button
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-black px-6 py-2 rounded-full transform hover:scale-105 transition-all duration-300"
                onClick={() => window.open("https://www.google.com/maps?q=32.4847,14.5959", "_blank")}
              >
                <MapPin className="w-4 h-4 ml-2" />
                عرض على الخريطة
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <p className="text-gray-400 font-semibold">© 2024 جميع الحقوق محفوظة</p>
        </div>
      </div>
    </footer>
  )
}

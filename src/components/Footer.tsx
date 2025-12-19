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
    <footer className="bg-gradient-to-r from-background via-card to-background border-t border-border/50 py-12 mt-16 relative z-10">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
      <div className="container mx-auto px-4 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-right">
          <div>
            <div className="flex items-center justify-center md:justify-start mb-6">
              <div className="flex items-center gap-3">
                <img src="new-logo.svg" alt="رمز الشركة" className="h-16 object-contain drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]" />
              </div>
            </div>
            <p className="text-muted-foreground font-semibold">شريكك المثالي في عالم الدعاية والإعلان</p>
          </div>

          <div>
            <h4 className="text-xl font-black text-primary mb-6">تواصل معنا</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-center md:justify-start">
                <Phone className="w-5 h-5 text-primary ml-3" />
                <a
                  href="tel:+218913228908"
                  className="text-muted-foreground hover:text-primary transition-colors duration-300 hover:underline"
                >
                  +218.91.322.8908
                </a>
              </div>
              <div className="flex items-center justify-center md:justify-start">
                <Phone className="w-5 h-5 text-primary ml-3" />
                <a
                  href="tel:+218913228908"
                  className="text-muted-foreground hover:text-primary transition-colors duration-300 hover:underline"
                >
                  +218.91.322.8908
                </a>
              </div>
              <div className="flex items-center justify-center md:justify-start">
                <MessageCircle className="w-5 h-5 text-emerald-400 ml-3" />
                <a
                  href="https://wa.me/218913228908?text=مرحباً، أريد الاستفسار عن اللوحات الإعلانية المتاحة"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-emerald-400 transition-colors duration-300 hover:underline"
                >
                  واتساب: +218.91.322.8908
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xl font-black text-primary mb-6">موقعنا</h4>
            <div className="space-y-4">
              <p className="text-muted-foreground font-semibold">زليتن - ليبيا</p>
              <p className="text-muted-foreground font-semibold">بجوار مدرسة عقبة بن نافع</p>
              <Button
                className="bg-gradient-to-r from-primary to-gold-dark hover:from-primary/90 hover:to-gold-dark/90 text-primary-foreground font-black px-6 py-2 rounded-full shadow-gold transform hover:scale-105 transition-all duration-300"
                onClick={() => window.open("https://www.google.com/maps?q=32.4847,14.5959", "_blank")}
              >
                <MapPin className="w-4 h-4 ml-2" />
                عرض على الخريطة
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-border/50 mt-8 pt-8 text-center">
          <p className="text-muted-foreground font-semibold">© 2024 جميع الحقوق محفوظة</p>
        </div>
      </div>
    </footer>
  )
}
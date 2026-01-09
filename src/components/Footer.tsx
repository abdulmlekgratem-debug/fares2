"use client"

/**
 * مكون تذييل الصفحة - Footer Component
 * يحتوي على معلومات الشركة وطرق التواصل والموقع
 * يعرض الشعار ومعلومات الاتصال وروابط التواصل الاجتماعي
 */

import { Phone, MapPin, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

// Custom SVG icons for better quality
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-card/50 backdrop-blur-sm border-t border-border/30 mt-16">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Main footer content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 mb-12">
          {/* Logo and description */}
          <div className="lg:col-span-1 text-center lg:text-right">
            <div className="flex items-center justify-center lg:justify-start mb-6">
              <img 
                src="new-logo.svg" 
                alt="الفارس الذهبي" 
                className="h-20 object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:drop-shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all duration-500" 
              />
            </div>
            <p className="text-muted-foreground font-medium leading-relaxed">
              شريكك المثالي في عالم الدعاية والإعلان
            </p>
            
            {/* Social icons */}
            <div className="flex items-center justify-center lg:justify-start gap-3 mt-6">
              <a
                href="https://www.facebook.com/AL.FARES.AL.DAHABI.LY"
                target="_blank"
                rel="noopener noreferrer"
                className="group w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg hover:shadow-blue-500/30 hover:scale-110 transition-all duration-300"
              >
                <FacebookIcon className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
              </a>
              <a
                href="https://wa.me/218913228908?text=مرحباً، أريد الاستفسار عن اللوحات الإعلانية المتاحة"
                target="_blank"
                rel="noopener noreferrer"
                className="group w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg hover:shadow-emerald-500/30 hover:scale-110 transition-all duration-300"
              >
                <WhatsAppIcon className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>

          {/* Contact info */}
          <div className="lg:col-span-1 text-center lg:text-right">
            <h4 className="text-lg font-bold text-foreground mb-6 flex items-center justify-center lg:justify-start gap-2">
              <span className="w-8 h-1 bg-gradient-to-r from-primary to-primary/50 rounded-full" />
              تواصل معنا
            </h4>
            <div className="space-y-4">
              <a
                href="tel:+218913228908"
                className="group flex items-center justify-center lg:justify-start gap-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Phone className="w-4 h-4 text-primary" />
                </span>
                <span className="font-medium" dir="ltr">+218 91 322 8908</span>
              </a>
              <a
                href="tel:+218913228908"
                className="group flex items-center justify-center lg:justify-start gap-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Phone className="w-4 h-4 text-primary" />
                </span>
                <span className="font-medium" dir="ltr">+218 91 322 8908</span>
              </a>
              <a
                href="mailto:g.faris.business@gmail.com"
                className="group flex items-center justify-center lg:justify-start gap-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Mail className="w-4 h-4 text-primary" />
                </span>
                <span className="font-medium text-sm" dir="ltr">g.faris.business@gmail.com</span>
              </a>
            </div>
          </div>

          {/* Quick contact */}
          <div className="lg:col-span-1 text-center lg:text-right">
            <h4 className="text-lg font-bold text-foreground mb-6 flex items-center justify-center lg:justify-start gap-2">
              <span className="w-8 h-1 bg-gradient-to-r from-primary to-primary/50 rounded-full" />
              تواصل سريع
            </h4>
            <div className="space-y-3">
              <a
                href="https://wa.me/218913228908?text=مرحباً، أريد الاستفسار عن اللوحات الإعلانية المتاحة"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/20 transition-all group"
              >
                <WhatsAppIcon className="w-5 h-5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">راسلنا على واتساب</span>
              </a>
              <a
                href="https://www.facebook.com/AL.FARES.AL.DAHABI.LY"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/20 transition-all group"
              >
                <FacebookIcon className="w-5 h-5 text-blue-500" />
                <span className="text-blue-600 dark:text-blue-400 font-medium">تابعنا على فيسبوك</span>
              </a>
            </div>
          </div>

          {/* Location */}
          <div className="lg:col-span-1 text-center lg:text-right">
            <h4 className="text-lg font-bold text-foreground mb-6 flex items-center justify-center lg:justify-start gap-2">
              <span className="w-8 h-1 bg-gradient-to-r from-primary to-primary/50 rounded-full" />
              موقعنا
            </h4>
            <div className="space-y-4">
              <div className="flex items-start justify-center lg:justify-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </span>
                <div className="text-right">
                  <p className="text-foreground font-medium">زليتن - ليبيا</p>
                  <p className="text-muted-foreground text-sm">بجوار مدرسة عقبة بن نافع</p>
                </div>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-bold rounded-xl shadow-lg hover:shadow-primary/20 hover:scale-[1.02] transition-all duration-300"
                onClick={() => window.open("https://www.google.com/maps?q=32.4847,14.5959", "_blank")}
              >
                <MapPin className="w-4 h-4 ml-2" />
                عرض على الخريطة
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/30 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              جميع الحقوق محفوظة © الفارس الذهبي للدعاية والإعلان {new Date().getFullYear()}
            </p>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span>صُنع بـ</span>
              <span className="text-red-500 animate-pulse">❤</span>
              <span>في ليبيا</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
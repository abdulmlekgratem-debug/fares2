/**
 * مكون رأس الصفحة - Header Component
 * يحتوي على شعار الشركة وزر الحجز الرئيسي
 * يعرض اسم الشركة باللغتين العربية والإنجليزية
 */

import { Button } from "@/components/ui/button"

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-black via-gray-900 to-black text-white shadow-2xl border-b-4 border-yellow-500 relative z-10">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 rtl:space-x-reverse">
            <div className="relative">
              <div className="flex items-center gap-4 flex-row">
                <img src="/new-logo.svg" alt="شعار الشركة" className="h-20 object-contain" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full animate-pulse"></div>
            </div>
          </div>
          <Button className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-black px-8 py-3 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 text-lg">
            احجز موقعك الآن
          </Button>
        </div>
      </div>
    </header>
  )
}

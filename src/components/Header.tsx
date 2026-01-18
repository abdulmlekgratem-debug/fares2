/**
 * مكون رأس الصفحة - Header Component
 * تصميم Hero مع خلفية مدينة طرابلس وتأثير Parallax
 */

import { Button } from "@/components/ui/button"
import { Check, Clock, MapPinned, ChevronDown } from "lucide-react"
import ThemeToggle from "./ThemeToggle"
import tripoliSkyline from "@/assets/tripoli-skyline.jpg"
import { useParallax } from "@/hooks/useParallax"
import { useCountUp } from "@/hooks/useCountUp"

interface HeaderProps {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  totalBillboards?: number
}

export default function Header({ theme, toggleTheme, totalBillboards = 274 }: HeaderProps) {
  const { scrollY, getOpacity } = useParallax()
  
  // Count up animations
  const qualityCount = useCountUp({ end: 100, duration: 2000, delay: 600, suffix: '%' })
  const serviceCount = useCountUp({ end: 24, duration: 1500, delay: 700, suffix: '/7' })
  const billboardsCount = useCountUp({ end: totalBillboards, duration: 2500, delay: 800, prefix: '+' })
  
  // Calculate blur based on scroll
  const blurAmount = Math.min(scrollY * 0.02, 10)
  
  return (
    <header className="relative min-h-[90vh] overflow-hidden">
      {/* Background Image with Parallax & Blur */}
      <div 
        className="absolute inset-0 z-0 will-change-transform"
        style={{
          transform: `translateY(${scrollY * 0.4}px) scale(${1 + scrollY * 0.0003})`,
          filter: `blur(${blurAmount}px)`,
        }}
      >
        <img 
          src={tripoliSkyline} 
          alt="مدينة طرابلس" 
          className="w-full h-full object-cover"
          style={{ opacity: getOpacity(0, 600) }}
        />
        {/* Golden Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1508]/90 via-[#2a2510]/85 to-[#3a3518]/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1508]/60 via-transparent to-[#1a1508]/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#d4af37]/10 via-transparent to-transparent" />
      </div>

      {/* Theme Toggle - Fixed Position */}
      <div className="absolute top-6 left-6 z-20">
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
      </div>

      {/* Content with Parallax */}
      <div 
        className="relative z-10 container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[90vh] will-change-transform"
        style={{
          transform: `translateY(${scrollY * 0.2}px)`,
          opacity: getOpacity(0, 400),
        }}
      >
        {/* Logo Section */}
        <div 
          className="flex justify-center mb-10 animate-fade-in-scale"
          style={{ transform: `translateY(${scrollY * -0.1}px)` }}
        >
          <div className="bg-card/80 backdrop-blur-sm p-4 rounded-2xl border border-primary/30 shadow-xl">
            <img 
              src="/new-logo.svg" 
              alt="الفارس الذهبي" 
              className="h-20 md:h-24 object-contain drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]" 
            />
          </div>
        </div>

        {/* Main Title with Parallax */}
        <div 
          className="text-center mb-10"
          style={{ transform: `translateY(${scrollY * -0.05}px)` }}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 animate-fade-in-up animate-delay-200">
            <span className="text-primary">احجز</span>
            <span className="text-white"> أفضل المواقع</span>
          </h1>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 animate-fade-in-up animate-delay-300">
            <span className="text-primary">الإعلانية</span>
            <span className="text-white"> في المدينة</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-300 mb-2 animate-fade-in-up animate-delay-400">
            منصة متكاملة لحجز وإدارة اللوحات الإعلانية الطرقية
          </p>
          <p className="text-base md:text-lg text-primary font-semibold animate-fade-in-up animate-delay-500">
            بأسعار تنافسية وخدمة مميزة على مدار الساعة
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 text-lg rounded-xl shadow-gold animate-slide-in-right animate-delay-500"
            onClick={() => document.getElementById('billboards')?.scrollIntoView({ behavior: 'smooth' })}
          >
            ▶ ابدأ الحجز الآن
          </Button>
          <Button 
            variant="outline"
            className="border-2 border-gray-400 text-white hover:bg-white/10 font-bold px-8 py-6 text-lg rounded-xl animate-slide-in-left animate-delay-500"
            onClick={() => document.getElementById('stats')?.scrollIntoView({ behavior: 'smooth' })}
          >
            شاهد العروض
          </Button>
        </div>

        {/* Stats Cards with Count Up */}
        <div 
          className="flex flex-wrap justify-center gap-4 mb-12"
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        >
          <div 
            ref={qualityCount.elementRef} 
            className="bg-card/60 backdrop-blur-sm border border-primary/30 rounded-xl px-8 py-6 text-center min-w-[150px] animate-fade-in-up animate-delay-600"
          >
            <Check className="w-6 h-6 text-primary mx-auto mb-2" />
            <div className="text-3xl font-black text-white">{qualityCount.displayValue}</div>
            <div className="text-sm text-gray-400">ضمان الجودة</div>
          </div>
          <div 
            ref={serviceCount.elementRef}
            className="bg-card/60 backdrop-blur-sm border border-primary/30 rounded-xl px-8 py-6 text-center min-w-[150px] animate-fade-in-up animate-delay-700"
          >
            <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
            <div className="text-3xl font-black text-white">{serviceCount.displayValue}</div>
            <div className="text-sm text-gray-400">خدمة العملاء</div>
          </div>
          <div 
            ref={billboardsCount.elementRef}
            className="bg-card/60 backdrop-blur-sm border border-primary/30 rounded-xl px-8 py-6 text-center min-w-[150px] animate-fade-in-up animate-delay-800"
          >
            <MapPinned className="w-6 h-6 text-primary mx-auto mb-2" />
            <div className="text-3xl font-black text-primary">{billboardsCount.displayValue}</div>
            <div className="text-sm text-gray-400">لوحة متاحة</div>
          </div>
        </div>

        {/* Scroll Down Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce animate-delay-800">
          <ChevronDown className="w-8 h-8 text-primary" />
        </div>
      </div>
    </header>
  )
}
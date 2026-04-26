import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, MapPin, Check, Clock, LayoutGrid } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { useParallax } from '../hooks/useParallax'
import { loadCitySlides } from '../services/mediaService'

const fallbackCityImages = [
  { src: '/city/tripoli.jpg', name: 'طرابلس' },
  { src: '/city/misrata.jpg', name: 'مصراتة' },
  { src: '/city/zliten.jpg', name: 'زليتن' },
]

interface HeroSliderProps {
  totalBillboards: number
  theme: 'light' | 'dark'
  toggleTheme: () => void
  onScrollToBillboards?: () => void
}

function useCountUpOnView(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasStarted) {
          setHasStarted(true)
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [hasStarted])

  useEffect(() => {
    if (!hasStarted) return
    const startTime = Date.now()
    const animate = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(end * easeOutQuart))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [end, duration, hasStarted])

  return { count, ref }
}

export default function HeroSlider({ totalBillboards, theme, toggleTheme, onScrollToBillboards }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [cityImages, setCityImages] = useState<{ src: string; name: string }[]>(fallbackCityImages)
  const { scrollY } = useParallax()

  useEffect(() => {
    const loadSlides = async () => {
      try {
        const slides = await loadCitySlides()
        if (slides.length > 0) {
          setCityImages(slides.map(slide => ({ src: slide.imageUrl, name: slide.cityName })))
        }
      } catch (error) {
        console.error('[HeroSlider] خطأ في تحميل الصور:', error)
      }
    }
    loadSlides()
  }, [])

  const billboardCounter = useCountUpOnView(totalBillboards, 2500)
  const qualityCounter = useCountUpOnView(100, 2000)
  const serviceCounter = useCountUpOnView(24, 1500)

  const nextSlide = useCallback(() => {
    if (isTransitioning || cityImages.length <= 1) return
    setIsTransitioning(true)
    setCurrentIndex((prev) => (prev + 1) % cityImages.length)
    setTimeout(() => setIsTransitioning(false), 1200)
  }, [isTransitioning, cityImages.length])

  const prevSlide = useCallback(() => {
    if (isTransitioning || cityImages.length <= 1) return
    setIsTransitioning(true)
    setCurrentIndex((prev) => (prev - 1 + cityImages.length) % cityImages.length)
    setTimeout(() => setIsTransitioning(false), 1200)
  }, [isTransitioning, cityImages.length])

  useEffect(() => {
    if (cityImages.length <= 1) return
    const timer = setInterval(nextSlide, 8000)
    return () => clearInterval(timer)
  }, [nextSlide, cityImages.length])

  useEffect(() => {
    if (cityImages.length === 0) return
    const img = new Image()
    img.onload = () => setTimeout(() => setImageLoaded(true), 100)
    img.onerror = () => setImageLoaded(true)
    img.src = cityImages[0].src
    const timer = setTimeout(() => {
      cityImages.slice(1).forEach(city => { const p = new Image(); p.src = city.src })
    }, 2000)
    return () => clearTimeout(timer)
  }, [cityImages])

  const currentCity = cityImages[currentIndex] || cityImages[0]
  const parallaxOffset = scrollY * 0.3

  return (
    <section className="relative bg-black" id="hero-section">
      {/* Top Bar - Always Dark */}
      <div className="relative z-50 bg-black border-b border-primary/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-20 md:h-28 relative">
            <div className="absolute left-4">
              <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 blur-3xl rounded-full scale-150 bg-primary/30" />
                <img 
                  src="/new-logo.svg" 
                  alt="الفارس الذهبي" 
                  className="relative h-14 md:h-20 object-contain transition-all duration-500 hover:scale-105 drop-shadow-[0_0_20px_rgba(212,175,55,0.6)]"
                />
              </div>
            </div>
            <div className="absolute right-4 w-10" />
          </div>
        </div>
      </div>

      {/* Hero Slider */}
      <div className="relative h-[90vh] md:h-screen overflow-hidden">
        {/* Background Images */}
        {cityImages.map((city, index) => {
          const isActive = index === currentIndex
          const kenBurns = index % 2 === 0 ? 'ken-burns-zoom-in' : 'ken-burns-zoom-out'
          return (
            <div
              key={city.src}
              className={`absolute inset-0 transition-opacity duration-1200 ease-out ${isActive ? 'opacity-100' : 'opacity-0'}`}
            >
              <div 
                className={`absolute inset-[-15%] bg-cover bg-center ${isActive && imageLoaded ? kenBurns : ''}`}
                style={{ 
                  backgroundImage: `url(${city.src})`,
                  transform: `translateY(${isActive ? parallaxOffset : 0}px)`,
                  animationDuration: '12s',
                }}
              />
              {/* Complex overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/90" />
              <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.5)]" />
              {/* Noise texture overlay */}
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.5\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }} />
            </div>
          )
        })}

        {/* Content */}
        <div 
          className="relative h-full flex flex-col justify-center z-10 pt-8 md:pt-12 pb-36 md:pb-44"
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        >
          <div className="container mx-auto px-4 md:px-8 lg:px-12 xl:px-16" dir="rtl">
            <div className="w-full max-w-lg lg:max-w-2xl xl:max-w-3xl mr-0 ml-auto">
              <div className={`transition-all duration-1000 ${imageLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-16'}`}>
                
                {/* City Badge */}
                <div className="flex justify-start mb-5 md:mb-6">
                  <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-md border border-primary/30 rounded-xl px-4 py-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span 
                      className="text-sm md:text-base font-bold text-white"
                      key={currentCity.name}
                      style={{ fontFamily: 'Tajawal, sans-serif' }}
                    >
                      <span className="inline-block animate-fade-in">{currentCity.name}</span>
                    </span>
                  </div>
                </div>

                {/* Main Title - Larger, editorial */}
                <h1 
                  className="text-[2.75rem] sm:text-6xl md:text-7xl lg:text-8xl xl:text-[6.5rem] font-black mb-5 md:mb-7 tracking-tight"
                  style={{ 
                    fontFamily: 'Doran, Tajawal, sans-serif',
                    lineHeight: '1.15',
                    letterSpacing: '-0.02em',
                  }}
                >
                  <span className="block text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
                    استعرض أفضل المواقع
                  </span>
                  <span className="block mt-2 md:mt-3">
                    <span 
                      className="text-transparent bg-clip-text"
                      style={{
                        backgroundImage: 'linear-gradient(135deg, hsl(43 100% 50%), hsl(50 100% 70%), hsl(43 100% 50%), hsl(35 90% 45%))',
                        backgroundSize: '200% auto',
                        WebkitBackgroundClip: 'text',
                        filter: 'drop-shadow(0 0 40px rgba(212,175,55,0.4))',
                      }}
                    >
                      الإعلانية
                    </span>
                    <span className="text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]"> في المدينة</span>
                  </span>
                </h1>

                {/* Gold decorative divider */}
                <div className="flex items-center gap-3 mb-6 md:mb-8">
                  <div className="h-[2px] w-12 bg-gradient-to-l from-primary to-transparent" />
                  <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" />
                  <div className="h-[2px] w-24 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
                </div>
                
                {/* Description */}
                <p 
                  className="text-base sm:text-lg md:text-xl text-white/85 max-w-xl"
                  style={{ fontFamily: 'Tajawal, sans-serif', fontWeight: 400, lineHeight: '1.8' }}
                >
                  اكتشف لوحاتنا الإعلانية المتميزة في أفضل المواقع
                  <br />
                  بأسعار تنافسية وخدمة مميزة على مدار الساعة
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Arrows */}
          <div className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3">
            <button
              onClick={prevSlide}
              className="w-11 h-11 md:w-13 md:h-13 rounded-full bg-black/30 backdrop-blur-md border border-white/15 text-white hover:bg-primary/20 hover:border-primary/40 transition-all flex items-center justify-center group"
              aria-label="الصورة السابقة"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={nextSlide}
              className="w-11 h-11 md:w-13 md:h-13 rounded-full bg-black/30 backdrop-blur-md border border-white/15 text-white hover:bg-primary/20 hover:border-primary/40 transition-all flex items-center justify-center group"
              aria-label="الصورة التالية"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Slide indicators - elegant line style */}
          <div className="absolute bottom-36 md:bottom-44 right-4 md:right-8 lg:right-12 xl:right-16 flex items-center gap-1.5">
            {cityImages.map((city, index) => (
              <button
                key={index}
                onClick={() => {
                  if (!isTransitioning) {
                    setIsTransitioning(true)
                    setCurrentIndex(index)
                    setTimeout(() => setIsTransitioning(false), 1200)
                  }
                }}
                className="group relative py-2"
                aria-label={`انتقل إلى ${city.name}`}
              >
                <div className={`h-[3px] rounded-full transition-all duration-700 ease-out ${
                  index === currentIndex 
                    ? 'w-10 md:w-14 bg-gradient-to-r from-primary via-yellow-300 to-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]' 
                    : 'w-2 md:w-3 bg-white/30 group-hover:bg-white/60 group-hover:w-4'
                }`} />
              </button>
            ))}
            {/* Slide counter */}
            <span className="text-white/40 text-[11px] font-mono ml-3 tabular-nums" style={{ fontFamily: 'Manrope, monospace' }}>
              {String(currentIndex + 1).padStart(2, '0')}/{String(cityImages.length).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="bg-black/80 backdrop-blur-xl border-t border-primary/15">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-3 divide-x divide-primary/10 rtl:divide-x-reverse">
                {[
                  { ref: billboardCounter.ref, value: `+${billboardCounter.count}`, label: 'لوحة إعلانية', icon: LayoutGrid },
                  { ref: serviceCounter.ref, value: `${serviceCounter.count}/7`, label: 'خدمة العملاء', icon: Clock },
                  { ref: qualityCounter.ref, value: `${qualityCounter.count}%`, label: 'ضمان الجودة', icon: Check },
                ].map((stat, i) => (
                  <div key={i} ref={stat.ref} className="py-4 md:py-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1.5">
                      <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-primary/8 border border-primary/15 flex items-center justify-center">
                        <stat.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-xl md:text-2xl lg:text-3xl font-black text-primary tabular-nums" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        {stat.value}
                      </span>
                    </div>
                    <p className="text-[10px] md:text-xs text-white/50" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ken-burns-zoom-in {
          0% { transform: scale(1) translateY(var(--parallax-offset, 0)); }
          100% { transform: scale(1.15) translateY(var(--parallax-offset, 0)); }
        }
        @keyframes ken-burns-zoom-out {
          0% { transform: scale(1.15) translateY(var(--parallax-offset, 0)); }
          100% { transform: scale(1) translateY(var(--parallax-offset, 0)); }
        }
        .ken-burns-zoom-in { animation: ken-burns-zoom-in 12s ease-out forwards; }
        .ken-burns-zoom-out { animation: ken-burns-zoom-out 12s ease-out forwards; }
      `}</style>
    </section>
  )
}

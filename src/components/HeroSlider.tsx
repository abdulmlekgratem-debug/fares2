import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, MapPin, Check, Clock, LayoutGrid } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { useParallax } from '../hooks/useParallax'
import { loadCitySlides } from '../services/mediaService'

// الصور الافتراضية في حال فشل التحميل من الشيت
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

// Custom hook for counting animation with intersection observer
function useCountUpOnView(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Intersection observer to trigger animation when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasStarted) {
          setHasStarted(true)
        }
      },
      { threshold: 0.5 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [hasStarted])

  // Animation effect
  useEffect(() => {
    if (!hasStarted) return

    const startTime = Date.now()
    const animate = () => {
      const now = Date.now()
      const progress = Math.min((now - startTime) / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const currentValue = Math.floor(end * easeOutQuart)
      setCount(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
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

  // تحميل صور السلايدر من الشيت مع تحديث تلقائي كل دقيقة
  useEffect(() => {
    const loadSlides = async () => {
      try {
        const slides = await loadCitySlides()
        if (slides.length > 0) {
          setCityImages(slides.map(slide => ({
            src: slide.imageUrl,
            name: slide.cityName
          })))
          console.log('[HeroSlider] تم تحميل', slides.length, 'صورة من الشيت')
        } else {
          console.log('[HeroSlider] لا توجد صور في الشيت، استخدام الصور الافتراضية')
        }
      } catch (error) {
        console.error('[HeroSlider] خطأ في تحميل الصور:', error)
      }
    }
    loadSlides()
    
    // لا نستخدم تحديث تلقائي لمنع إعادة تحميل غير مرغوب فيها
    // const interval = setInterval(loadSlides, 300000)
    // return () => clearInterval(interval)
  }, [])

  // Animated counters with intersection observer
  const billboardCounter = useCountUpOnView(totalBillboards, 2500)
  const qualityCounter = useCountUpOnView(100, 2000)
  const serviceCounter = useCountUpOnView(24, 1500)

  const nextSlide = useCallback(() => {
    if (isTransitioning || cityImages.length <= 1) return
    setIsTransitioning(true)
    setCurrentIndex((prev) => (prev + 1) % cityImages.length)
    setTimeout(() => setIsTransitioning(false), 1200)
  }, [isTransitioning])

  const prevSlide = useCallback(() => {
    if (isTransitioning || cityImages.length <= 1) return
    setIsTransitioning(true)
    setCurrentIndex((prev) => (prev - 1 + cityImages.length) % cityImages.length)
    setTimeout(() => setIsTransitioning(false), 1200)
  }, [isTransitioning])

  // Auto-advance slides
  useEffect(() => {
    if (cityImages.length <= 1) return
    const timer = setInterval(nextSlide, 8000)
    return () => clearInterval(timer)
  }, [nextSlide])

  // Preload images and trigger animation
  useEffect(() => {
    const loadPromises = cityImages.map((city) => {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = resolve
        img.onerror = resolve // Continue even if image fails
        img.src = city.src
      })
    })
    Promise.all(loadPromises).then(() => {
      setTimeout(() => setImageLoaded(true), 100)
    })
  }, [])

  const currentCity = cityImages[currentIndex] || cityImages[0]
  const parallaxOffset = scrollY * 0.3

  return (
    <section className="relative" id="hero-section">
      {/* Fixed Top Bar with Centered Logo - Always Dark */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-primary/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-20 md:h-28 relative">
            {/* Theme Toggle - Left */}
            <div className="absolute left-4">
              <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </div>

            {/* Centered Logo - Luxurious and Large */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                {/* Golden Glow Behind Logo */}
                <div className="absolute inset-0 blur-3xl rounded-full scale-150 bg-primary/30" />
                <img 
                  src="/new-logo.svg" 
                  alt="الفارس الذهبي" 
                  className="relative h-14 md:h-20 object-contain transition-all duration-500 hover:scale-105 drop-shadow-[0_0_20px_rgba(212,175,55,0.6)]"
                />
              </div>
            </div>

            {/* Empty Right Side for Balance */}
            <div className="absolute right-4 w-10" />
          </div>
        </div>
      </div>

      {/* Hero Slider */}
      <div className="relative h-[90vh] md:h-screen overflow-hidden">
        {/* Background Images with Ken Burns Effect */}
        {cityImages.map((city, index) => {
          const isActive = index === currentIndex
          // Ken Burns: alternate between zoom-in and zoom-out for different images
          const kenBurnsDirection = index % 2 === 0 ? 'ken-burns-zoom-in' : 'ken-burns-zoom-out'
          
          return (
            <div
              key={city.src}
              className={`absolute inset-0 transition-opacity duration-1200 ease-out ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div 
                className={`absolute inset-[-15%] bg-cover bg-center ${
                  isActive && imageLoaded ? kenBurnsDirection : ''
                }`}
                style={{ 
                  backgroundImage: `url(${city.src})`,
                  transform: `translateY(${isActive ? parallaxOffset : 0}px)`,
                  animationDuration: '12s',
                }}
              />
              {/* Gradient Overlays - Right side darker for text */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/90" />
              <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/20 to-transparent" />
              
              {/* Subtle vignette effect */}
              <div className="absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.5)]" />
            </div>
          )
        })}

        {/* Content Container - RIGHT aligned */}
        <div 
          className="relative h-full flex flex-col justify-center z-10 pt-20 md:pt-28 pb-36 md:pb-44"
          style={{ transform: `translateY(${scrollY * 0.1}px)` }}
        >
          {/* Main Content - Positioned on RIGHT */}
          <div className="container mx-auto px-4 md:px-8 lg:px-12 xl:px-16" dir="rtl">
            <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl mr-0 ml-auto">
              <div 
                className={`transition-all duration-1000 ${
                  imageLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-16'
                }`}
              >
                {/* City Badge */}
                <div className="flex justify-start mb-4 md:mb-5">
                  <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-md border border-primary/30 rounded-xl px-3 md:px-4 py-1.5 md:py-2">
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

                {/* Main Title - RIGHT aligned with better spacing */}
                <h1 
                  className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6 md:mb-8"
                  style={{ 
                    fontFamily: 'Doran, Tajawal, sans-serif',
                    lineHeight: '1.5',
                  }}
                >
                  <span className="block text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                    استعرض أفضل المواقع
                  </span>
                  <span className="block mt-3 md:mt-4">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-yellow-300 to-primary drop-shadow-[0_0_30px_rgba(212,175,55,0.5)]">
                      الإعلانية
                    </span>
                    <span className="text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"> في المدينة</span>
                  </span>
                </h1>
                
                {/* Description - RIGHT aligned with Tajawal font */}
                <p 
                  className="text-sm sm:text-base md:text-lg text-white/90 leading-relaxed"
                  style={{ fontFamily: 'Tajawal, sans-serif', fontWeight: 400 }}
                >
                  اكتشف لوحاتنا الإعلانية المتميزة في أفضل المواقع
                  <br />
                  بأسعار تنافسية وخدمة مميزة على مدار الساعة
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Arrows - Left Side */}
          <div className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 md:gap-3">
            <button
              onClick={prevSlide}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 text-white hover:bg-primary/30 hover:border-primary/50 transition-all flex items-center justify-center group"
              aria-label="الصورة السابقة"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={nextSlide}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 text-white hover:bg-primary/30 hover:border-primary/50 transition-all flex items-center justify-center group"
              aria-label="الصورة التالية"
            >
              <ChevronRight className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Dots Indicator - Bottom Right */}
          <div className="absolute bottom-36 md:bottom-44 right-4 md:right-8 lg:right-12 xl:right-16 flex gap-2">
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
                className={`h-1.5 md:h-2 rounded-full transition-all duration-500 ${
                  index === currentIndex 
                    ? 'w-8 md:w-10 bg-gradient-to-r from-primary to-yellow-400' 
                    : 'w-1.5 md:w-2 bg-white/40 hover:bg-primary/60'
                }`}
                aria-label={`انتقل إلى ${city.name}`}
              />
            ))}
          </div>
        </div>

        {/* Stats Bar - Bottom Fixed */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="bg-black/85 backdrop-blur-xl border-t border-primary/20">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-3 divide-x divide-primary/15 rtl:divide-x-reverse">
                {/* Billboard Count */}
                <div ref={billboardCounter.ref} className="py-3 md:py-5 text-center group cursor-default">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <LayoutGrid className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    </div>
                    <span 
                      className="text-xl md:text-2xl lg:text-3xl font-black text-primary tabular-nums"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      +{billboardCounter.count}
                    </span>
                  </div>
                  <p className="text-[10px] md:text-xs text-muted-foreground" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                    لوحة إعلانية
                  </p>
                </div>
                
                {/* 24/7 Support */}
                <div ref={serviceCounter.ref} className="py-3 md:py-5 text-center group cursor-default">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Clock className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    </div>
                    <span 
                      className="text-xl md:text-2xl lg:text-3xl font-black text-primary"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      {serviceCounter.count}/7
                    </span>
                  </div>
                  <p className="text-[10px] md:text-xs text-muted-foreground" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                    خدمة العملاء
                  </p>
                </div>
                
                {/* Quality Guarantee */}
                <div ref={qualityCounter.ref} className="py-3 md:py-5 text-center group cursor-default">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Check className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    </div>
                    <span 
                      className="text-xl md:text-2xl lg:text-3xl font-black text-primary tabular-nums"
                      style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                      {qualityCounter.count}%
                    </span>
                  </div>
                  <p className="text-[10px] md:text-xs text-muted-foreground" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                    ضمان الجودة
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ken Burns Animation Styles */}
      <style>{`
        @keyframes ken-burns-zoom-in {
          0% {
            transform: scale(1) translateY(var(--parallax-offset, 0));
          }
          100% {
            transform: scale(1.15) translateY(var(--parallax-offset, 0));
          }
        }
        
        @keyframes ken-burns-zoom-out {
          0% {
            transform: scale(1.15) translateY(var(--parallax-offset, 0));
          }
          100% {
            transform: scale(1) translateY(var(--parallax-offset, 0));
          }
        }
        
        .ken-burns-zoom-in {
          animation: ken-burns-zoom-in 12s ease-out forwards;
        }
        
        .ken-burns-zoom-out {
          animation: ken-burns-zoom-out 12s ease-out forwards;
        }
      `}</style>
    </section>
  )
}

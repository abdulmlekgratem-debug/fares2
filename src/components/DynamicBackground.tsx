import { useMemo, useEffect, useState } from 'react'
import { useParallax } from '@/hooks/useParallax'

// Detect low-end devices
function isLowEndDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check for low memory (if available)
  const nav = navigator as any
  if (nav.deviceMemory && nav.deviceMemory < 4) return true
  
  // Check for slow CPU (if available)
  if (nav.hardwareConcurrency && nav.hardwareConcurrency < 4) return true
  
  // Check screen size - smaller screens usually mean mobile
  if (window.innerWidth < 768) return true
  
  return false
}

export default function DynamicBackground() {
  const { scrollY } = useParallax()
  const [isLowEnd, setIsLowEnd] = useState(false)
  
  useEffect(() => {
    setIsLowEnd(isLowEndDevice())
  }, [])
  
  // Reduce stripes for low-end devices
  const stripeCount = isLowEnd ? 8 : 20
  
  const stripes = useMemo(() => 
    Array.from({ length: stripeCount }).map((_, i) => ({
      id: i,
      delay: i * 0.15,
      duration: 4 + (i % 3) * 0.5,
      parallaxSpeed: 0.02 + (i % 3) * 0.01
    })), [stripeCount]
  )

  // Simplified background for low-end devices
  if (isLowEnd) {
    return (
      <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
        {/* Simple gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background" />
        
        {/* Simple center glow */}
        <div 
          className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2"
          style={{
            background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.3) 0%, transparent 50%)',
            filter: 'blur(40px)',
          }}
        />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
      {/* Base gradient with parallax */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-background via-background to-background"
        style={{ transform: `translateY(${scrollY * 0.05}px)` }}
      />
      
      {/* Vertical Stripes - Reduced for performance */}
      <div className="absolute inset-0 flex">
        {stripes.map((stripe) => (
          <div
            key={stripe.id}
            className="flex-1 relative"
            style={{
              animation: `stripeGlow ${stripe.duration}s ease-in-out infinite`,
              animationDelay: `${stripe.delay}s`,
              transform: `translateY(${scrollY * stripe.parallaxSpeed}px)`
            }}
          >
            <div 
              className="absolute inset-0"
              style={{
                background: stripe.id % 2 === 0
                  ? 'linear-gradient(180deg, transparent 0%, hsl(var(--primary) / 0.15) 30%, hsl(var(--primary) / 0.4) 50%, hsl(var(--primary) / 0.15) 70%, transparent 100%)'
                  : 'linear-gradient(180deg, transparent 0%, hsl(var(--primary) / 0.08) 35%, hsl(var(--primary) / 0.25) 50%, hsl(var(--primary) / 0.08) 65%, transparent 100%)',
                filter: 'blur(1px)'
              }}
            />
          </div>
        ))}
      </div>

      {/* Center Glow - Aurora Effect */}
      <div 
        className="absolute top-1/2 left-1/2 w-[120%] h-[80%]"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.5) 0%, hsl(var(--primary) / 0.2) 30%, transparent 60%)',
          filter: 'blur(60px)',
          animation: 'centerPulse 6s ease-in-out infinite',
          transform: `translate(-50%, calc(-50% + ${scrollY * -0.1}px))`
        }}
      />

      {/* Top Glow Blob */}
      <div 
        className="absolute -top-1/4 left-1/4 w-[80%] h-[60%] rounded-full"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.4) 0%, transparent 60%)',
          filter: 'blur(80px)',
          animation: 'blobMove1 15s ease-in-out infinite',
          transform: `translateY(${scrollY * 0.15}px)`
        }}
      />

      {/* Bottom Glow Blob */}
      <div 
        className="absolute -bottom-1/4 right-1/4 w-[70%] h-[50%] rounded-full"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.35) 0%, transparent 55%)',
          filter: 'blur(70px)',
          animation: 'blobMove2 18s ease-in-out infinite',
          transform: `translateY(${scrollY * -0.12}px)`
        }}
      />

      {/* CSS Animations */}
      <style>{`
        @keyframes stripeGlow {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }
        
        @keyframes centerPulse {
          0%, 100% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.15);
          }
        }
        
        @keyframes blobMove1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(10%, 15%) scale(1.1);
          }
          66% {
            transform: translate(-5%, 10%) scale(0.95);
          }
        }
        
        @keyframes blobMove2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-15%, -10%) scale(1.05);
          }
          66% {
            transform: translate(10%, -5%) scale(1.1);
          }
        }
      `}</style>
    </div>
  )
}

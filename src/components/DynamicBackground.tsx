import { useMemo } from 'react'
import { useParallax } from '@/hooks/useParallax'

export default function DynamicBackground() {
  const { scrollY } = useParallax()
  
  const stripes = useMemo(() => 
    Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      delay: i * 0.08,
      duration: 3 + (i % 5) * 0.4,
      parallaxSpeed: 0.02 + (i % 5) * 0.01
    })), []
  )

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
      {/* Base gradient with parallax */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-background via-background to-background"
        style={{ transform: `translateY(${scrollY * 0.05}px)` }}
      />
      
      {/* Vertical Stripes - Fractal Glass Effect with Parallax */}
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

      {/* Center Glow - Aurora Effect with Parallax */}
      <div 
        className="absolute top-1/2 left-1/2 w-[120%] h-[80%]"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.5) 0%, hsl(var(--primary) / 0.2) 30%, transparent 60%)',
          filter: 'blur(60px)',
          animation: 'centerPulse 6s ease-in-out infinite',
          transform: `translate(-50%, calc(-50% + ${scrollY * -0.1}px))`
        }}
      />

      {/* Top Glow Blob with Parallax */}
      <div 
        className="absolute -top-1/4 left-1/4 w-[80%] h-[60%] rounded-full"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.4) 0%, transparent 60%)',
          filter: 'blur(80px)',
          animation: 'blobMove1 15s ease-in-out infinite',
          transform: `translateY(${scrollY * 0.15}px)`
        }}
      />

      {/* Bottom Glow Blob with Parallax */}
      <div 
        className="absolute -bottom-1/4 right-1/4 w-[70%] h-[50%] rounded-full"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.35) 0%, transparent 55%)',
          filter: 'blur(70px)',
          animation: 'blobMove2 18s ease-in-out infinite',
          transform: `translateY(${scrollY * -0.12}px)`
        }}
      />

      {/* Middle Floating Blob with Parallax */}
      <div 
        className="absolute top-1/3 right-1/3 w-[50%] h-[40%] rounded-full"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.3) 0%, transparent 50%)',
          filter: 'blur(90px)',
          animation: 'blobMove1 20s ease-in-out infinite reverse',
          transform: `translateY(${scrollY * 0.08}px)`
        }}
      />

      {/* Flowing Wave Effect with Parallax */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, transparent 0%, hsl(var(--primary) / 0.1) 25%, transparent 50%, hsl(var(--primary) / 0.1) 75%, transparent 100%)',
          backgroundSize: '200% 200%',
          animation: 'waveFlow 8s linear infinite',
          transform: `translateY(${scrollY * 0.03}px)`
        }}
      />

      {/* Shimmer Overlay with Parallax */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute top-0 left-0 w-1/2 h-full"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.15) 50%, transparent 100%)',
            animation: 'shimmerMove 5s ease-in-out infinite',
            transform: `translateY(${scrollY * -0.05}px)`
          }}
        />
      </div>

      {/* Noise/Grain Texture */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />

      {/* CSS Animations */}
      <style>{`
        @keyframes stripeGlow {
          0%, 100% {
            opacity: 0.6;
            transform: scaleY(1);
          }
          50% {
            opacity: 1;
            transform: scaleY(1.02);
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
        
        @keyframes waveFlow {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: 200% 200%;
          }
        }
        
        @keyframes shimmerMove {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </div>
  )
}
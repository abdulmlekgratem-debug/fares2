import { useState, useEffect } from 'react';

const SUPPORTED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'];
const MAX_LOGOS = 50;

interface LogoItem {
  index: number;
  src: string;
}

export default function ClientLogos() {
  const [logos, setLogos] = useState<LogoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const loadLogos = async () => {
      const loadedLogos: LogoItem[] = [];
      
      for (let i = 1; i <= MAX_LOGOS; i++) {
        let found = false;
        
        for (const ext of SUPPORTED_EXTENSIONS) {
          const src = `/co/${i}.${ext}`;
          const exists = await checkImageExists(src);
          
          if (exists) {
            loadedLogos.push({ index: i, src });
            found = true;
            break;
          }
        }
        
        if (!found && i > loadedLogos.length + 3) {
          break;
        }
      }
      
      loadedLogos.sort((a, b) => a.index - b.index);
      setLogos(loadedLogos);
      setLoading(false);
    };

    loadLogos();
  }, []);

  const checkImageExists = (src: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    });
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-muted/50 to-background overflow-hidden">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            عملاؤنا المميزون
          </h2>
          <div className="flex justify-center items-center gap-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-32 h-32 bg-muted animate-pulse rounded-2xl"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (logos.length === 0) {
    return null;
  }

  // Duplicate logos for seamless infinite scroll
  const duplicatedLogos = [...logos, ...logos, ...logos];

  return (
    <section className="py-10 md:py-16 bg-gradient-to-b from-muted/50 to-background overflow-hidden">
      <div className="container mx-auto px-4 mb-6 md:mb-10">
        <h2 className="text-xl md:text-3xl font-bold text-center text-foreground">
          عملاؤنا المميزون
        </h2>
        <p className="text-center text-muted-foreground mt-2 text-sm md:text-base">
          نفتخر بثقة أكبر الشركات والمؤسسات
        </p>
      </div>
      
      <div 
        className="relative w-full"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Gradient overlays for fade effect - smaller on mobile */}
        <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
        
        <div 
          className={`flex gap-4 md:gap-8 ${isPaused ? 'animation-paused' : ''}`}
          style={{
            animation: 'marquee 25s linear infinite',
            width: 'fit-content',
            willChange: 'transform',
          }}
        >
          {duplicatedLogos.map((logo, idx) => (
            <div
              key={`${logo.index}-${idx}`}
              className="group relative flex-shrink-0"
            >
              <div className="w-20 h-20 md:w-32 lg:w-36 md:h-32 lg:h-36 bg-card rounded-xl md:rounded-2xl shadow-md md:shadow-lg flex items-center justify-center p-2 md:p-4 transition-transform duration-300 ease-out md:hover:scale-110 border border-border/50">
                <img
                  src={logo.src}
                  alt={`عميل ${logo.index}`}
                  className="max-w-full max-h-full object-contain filter grayscale md:group-hover:grayscale-0 transition-all duration-300"
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
        .animation-paused {
          animation-play-state: paused !important;
        }
      `}</style>
    </section>
  );
}
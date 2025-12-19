import { useState, useEffect } from 'react';

export function useParallax() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    // Use passive listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return {
    scrollY,
    getParallaxStyle: (speed: number = 0.5) => ({
      transform: `translateY(${scrollY * speed}px)`,
    }),
    getOpacity: (fadeStart: number = 0, fadeEnd: number = 500) => {
      if (scrollY < fadeStart) return 1;
      if (scrollY > fadeEnd) return 0;
      return 1 - (scrollY - fadeStart) / (fadeEnd - fadeStart);
    },
    getScale: (baseScale: number = 1, scaleSpeed: number = 0.0002) => ({
      transform: `scale(${baseScale + scrollY * scaleSpeed})`,
    }),
  };
}

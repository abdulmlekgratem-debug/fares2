import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronUp, ChevronDown, MapPin, LayoutGrid, Users, BarChart3, Phone, Sun, Moon, ChevronRight } from 'lucide-react';

// Haptic feedback utility
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const durations = { light: 10, medium: 20, heavy: 30 };
    navigator.vibrate(durations[style]);
  }
};

interface Section {
  id: string;
  icon: React.ReactNode;
  label: string;
}

const sections: Section[] = [
  { id: 'hero-section', icon: <MapPin className="w-3 h-3 md:w-4 md:h-4" />, label: 'الرئيسية' },
  { id: 'billboards-section', icon: <LayoutGrid className="w-3 h-3 md:w-4 md:h-4" />, label: 'اللوحات' },
  { id: 'stats-section', icon: <BarChart3 className="w-3 h-3 md:w-4 md:h-4" />, label: 'الإحصائيات' },
  { id: 'clients-section', icon: <Users className="w-3 h-3 md:w-4 md:h-4" />, label: 'العملاء' },
  { id: 'footer', icon: <Phone className="w-3 h-3 md:w-4 md:h-4" />, label: 'التواصل' },
];

interface SectionNavigatorProps {
  hideWhenMapOpen?: boolean;
  theme?: 'light' | 'dark';
  toggleTheme?: () => void;
}

export default function SectionNavigator({ hideWhenMapOpen = false, theme = 'dark', toggleTheme }: SectionNavigatorProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Mobile collapsed state - starts collapsed (hidden)
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  // Draggable state for desktop
  const [position, setPosition] = useState({ y: 50 }); // percentage from top
  const dragRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 150;
      setIsVisible(scrolled);

      if (!isAnimating) {
        const scrollPosition = window.scrollY + window.innerHeight / 3;
        
        let foundSection = 0;
        for (let i = 0; i < sections.length; i++) {
          const element = document.getElementById(sections[i].id);
          if (element) {
            const rect = element.getBoundingClientRect();
            const elementTop = rect.top + window.scrollY;
            if (scrollPosition >= elementTop) {
              foundSection = i;
            }
          }
        }
        setCurrentSection(foundSection);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isAnimating]);

  const scrollToSection = useCallback((index: number) => {
    if (index < 0 || index >= sections.length) return;
    
    triggerHaptic('light');
    
    const element = document.getElementById(sections[index].id);
    if (element) {
      setIsAnimating(true);
      setCurrentSection(index);
      
      const headerHeight = 100;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - headerHeight;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      
      setTimeout(() => {
        setIsAnimating(false);
      }, 800);
    }
  }, []);

  const goToPrevious = () => {
    if (currentSection > 0) {
      triggerHaptic('light');
      scrollToSection(currentSection - 1);
    }
  };

  const goToNext = () => {
    if (currentSection < sections.length - 1) {
      triggerHaptic('light');
      scrollToSection(currentSection + 1);
    }
  };

  const toggleCollapsed = () => {
    triggerHaptic('medium');
    setIsCollapsed(!isCollapsed);
  };

  if (!isVisible || hideWhenMapOpen) return null;

  return (
    <>
      {/* Mobile Version - Collapsible with pull tab - ملتصق بأقصى اليمين تماماً */}
      <div 
        className="md:hidden fixed top-24 z-40"
        style={{ right: 0, marginRight: 0 }}
      >
        {/* Pull Tab - ملتصق بالحافة اليمنى تماماً بدون أي فراغ */}
        <button
          onClick={toggleCollapsed}
          className={`flex items-center justify-center w-6 h-16 bg-primary/95 backdrop-blur-md shadow-lg transition-all duration-300 ${
            isCollapsed 
              ? 'rounded-l-xl rounded-r-none' 
              : 'opacity-0 pointer-events-none absolute'
          }`}
          style={{ 
            right: 0, 
            marginRight: 0, 
            borderTopRightRadius: 0, 
            borderBottomRightRadius: 0 
          }}
        >
          <ChevronRight className={`w-4 h-4 text-primary-foreground transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>

        {/* Navigation Panel - يظهر من اليمين */}
        <div 
          className={`flex flex-col items-center gap-1 bg-card/95 backdrop-blur-md rounded-l-xl border border-border/50 border-r-0 shadow-lg p-1.5 transition-all duration-300 origin-right ${
            isCollapsed 
              ? 'translate-x-full opacity-0 pointer-events-none' 
              : 'translate-x-0 opacity-100'
          }`}
          style={{ marginRight: 0, right: 0 }}
        >
          {/* Close button */}
          <button
            onClick={toggleCollapsed}
            className="w-5 h-5 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground mb-1"
          >
            <ChevronRight className="w-3 h-3" />
          </button>

          {/* زر للأعلى */}
          <button
            onClick={goToPrevious}
            disabled={currentSection === 0}
            className="nav-btn w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
          >
            <ChevronUp className="w-3 h-3" />
          </button>

          {/* مؤشرات الأقسام */}
          <div className="flex flex-col items-center gap-0.5 py-1">
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(index)}
                className={`nav-dot w-5 h-5 rounded-lg flex items-center justify-center transition-all duration-300 active:scale-90 ${
                  currentSection === index
                    ? 'bg-primary text-primary-foreground scale-110 shadow-sm shadow-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {section.icon}
              </button>
            ))}
          </div>

          {/* زر للأسفل */}
          <button
            onClick={goToNext}
            disabled={currentSection === sections.length - 1}
            className="nav-btn w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
          >
            <ChevronDown className="w-3 h-3" />
          </button>

          {/* زر تغيير الوضع */}
          {toggleTheme && (
            <button
              onClick={toggleTheme}
              className="nav-btn mt-1 w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-300 active:scale-90"
            >
              {theme === 'dark' ? (
                <Sun className="w-3 h-3" />
              ) : (
                <Moon className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Desktop Version - Original design */}
      <div 
        ref={dragRef}
        className="hidden md:flex fixed left-4 z-40 flex-col items-center gap-2"
        style={{ 
          top: `${position.y}%`, 
          transform: 'translateY(-50%)'
        }}
      >
        {/* Header Badge */}
        <div className="mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shadow-lg backdrop-blur-md">
            <img 
              src="/logo-symbol.svg" 
              alt="Logo" 
              className="w-5 h-5 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        </div>

        {/* زر للأعلى */}
        <button
          onClick={goToPrevious}
          disabled={currentSection === 0}
          className="nav-btn w-10 h-10 rounded-full bg-card/90 backdrop-blur-md border border-border/50 shadow-md flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 active:scale-95"
          title="القسم السابق"
        >
          <ChevronUp className="w-5 h-5" />
        </button>

        {/* مؤشرات الأقسام */}
        <div className="flex flex-col items-center gap-1.5 py-3 px-2 bg-card/80 backdrop-blur-md rounded-2xl border border-border/50 shadow-md">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(index)}
              className={`nav-dot w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-90 ${
                currentSection === index
                  ? 'bg-primary text-primary-foreground scale-110 shadow-sm shadow-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              title={section.label}
            >
              {section.icon}
            </button>
          ))}
        </div>

        {/* زر للأسفل */}
        <button
          onClick={goToNext}
          disabled={currentSection === sections.length - 1}
          className="nav-btn w-10 h-10 rounded-full bg-card/90 backdrop-blur-md border border-border/50 shadow-md flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 active:scale-95"
          title="القسم التالي"
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        {/* زر تغيير الوضع المظلم/الفاتح */}
        {toggleTheme && (
          <button
            onClick={toggleTheme}
            className="nav-btn mt-2 w-10 h-10 rounded-full bg-card/90 backdrop-blur-md border border-border/50 shadow-md flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-all duration-300 hover:scale-110 active:scale-95"
            title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع المظلم'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      <style>{`
        .nav-btn, .nav-dot {
          -webkit-tap-highlight-color: transparent;
        }
        
        .section-highlight {
          animation: highlight-section 1s ease-out;
        }
        
        @keyframes highlight-section {
          0% {
            box-shadow: 0 0 0 0 hsl(var(--primary) / 0.4);
          }
          50% {
            box-shadow: 0 0 0 10px hsl(var(--primary) / 0.1);
          }
          100% {
            box-shadow: 0 0 0 0 hsl(var(--primary) / 0);
          }
        }
        
        [id$="-section"], #footer {
          scroll-margin-top: 80px;
        }
      `}</style>
    </>
  );
}

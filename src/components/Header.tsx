/**
 * مكون رأس الصفحة - Header Component
 * يحتوي على شعار الشركة وزر الحجز الرئيسي
 * يعرض اسم الشركة باللغتين العربية والإنجليزية
 */

import { Button } from "@/components/ui/button"
import ThemeToggle from "./ThemeToggle"

interface HeaderProps {
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

export default function Header({ theme, toggleTheme }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-background via-card to-background border-b border-border/50 relative z-10">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
      <div className="container mx-auto px-4 py-6 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 rtl:space-x-reverse">
            <div className="relative">
              <div className="flex items-center gap-4 flex-row">
                <div className="relative">
                  <img src="/new-logo.svg" alt="شعار الشركة" className="h-20 object-contain drop-shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-pulse shadow-gold"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            <Button className="bg-gradient-to-r from-primary via-gold-light to-primary hover:from-primary/90 hover:via-gold-light/90 hover:to-primary/90 text-primary-foreground font-black px-8 py-3 rounded-full shadow-gold transform hover:scale-105 transition-all duration-300 text-lg border border-primary/30">
              احجز موقعك الآن
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

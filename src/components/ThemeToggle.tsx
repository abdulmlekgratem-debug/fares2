import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ThemeToggleProps {
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

export default function ThemeToggle({ theme, toggleTheme }: ThemeToggleProps) {
  return (
    <Button
      onClick={toggleTheme}
      variant="outline"
      size="icon"
      className="relative rounded-full w-12 h-12 border-2 border-primary/40 bg-card hover:bg-primary/10 transition-all duration-500 hover:scale-110 hover:shadow-gold overflow-hidden"
      title={theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
    >
      <Sun className={`w-5 h-5 text-primary absolute transition-all duration-500 ${
        theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
      }`} />
      <Moon className={`w-5 h-5 text-primary absolute transition-all duration-500 ${
        theme === 'light' ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'
      }`} />
    </Button>
  )
}

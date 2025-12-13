/**
 * مكون حوار الطباعة - Print Dialog Component
 * يتيح للمستخدم اختيار طباعة PDF بالشعار أو بدونه وبالصور أو بدونها
 */

import { useState } from "react"
import { FileDown, Image, ImageOff, Camera, CameraOff } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PrintDialogProps {
  isOpen: boolean
  onClose: () => void
  onPrint: (includeLogo: boolean, includeImages: boolean) => void
}

export default function PrintDialog({ isOpen, onClose, onPrint }: PrintDialogProps) {
  const [includeLogo, setIncludeLogo] = useState(true)
  const [includeImages, setIncludeImages] = useState(true)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[99999]"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl p-8 max-w-md w-full gold-border-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl font-black text-foreground mb-6 text-center">
          خيارات طباعة التقرير
        </h3>
        
        {/* خيار الشعار */}
        <p className="text-sm text-muted-foreground mb-2 font-bold">رأس التقرير:</p>
        <div className="space-y-3 mb-6">
          <button
            onClick={() => setIncludeLogo(true)}
            className={`w-full p-4 rounded-xl border-2 transition-all duration-300 flex items-center gap-4 ${
              includeLogo
                ? "border-primary bg-primary/10 shadow-gold"
                : "border-border bg-secondary/30 hover:border-primary/50"
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              includeLogo ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}>
              <Image className="w-6 h-6" />
            </div>
            <div className="text-right flex-1">
              <p className="font-bold text-foreground text-lg">طباعة بالشعار</p>
              <p className="text-muted-foreground text-sm">تقرير رسمي مع شعار الشركة</p>
            </div>
          </button>
          
          <button
            onClick={() => setIncludeLogo(false)}
            className={`w-full p-4 rounded-xl border-2 transition-all duration-300 flex items-center gap-4 ${
              !includeLogo
                ? "border-primary bg-primary/10 shadow-gold"
                : "border-border bg-secondary/30 hover:border-primary/50"
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              !includeLogo ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}>
              <ImageOff className="w-6 h-6" />
            </div>
            <div className="text-right flex-1">
              <p className="font-bold text-foreground text-lg">طباعة بدون شعار</p>
              <p className="text-muted-foreground text-sm">تقرير بسيط بدون الشعار</p>
            </div>
          </button>
        </div>
        
        {/* خيار الصور */}
        <p className="text-sm text-muted-foreground mb-2 font-bold">صور اللوحات:</p>
        <div className="space-y-3 mb-8">
          <button
            onClick={() => setIncludeImages(true)}
            className={`w-full p-3 rounded-xl border-2 transition-all duration-300 flex items-center gap-3 ${
              includeImages
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-border bg-secondary/30 hover:border-emerald-500/50"
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              includeImages ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"
            }`}>
              <Camera className="w-5 h-5" />
            </div>
            <div className="text-right flex-1">
              <p className="font-bold text-foreground">مع صور اللوحات</p>
            </div>
          </button>
          
          <button
            onClick={() => setIncludeImages(false)}
            className={`w-full p-3 rounded-xl border-2 transition-all duration-300 flex items-center gap-3 ${
              !includeImages
                ? "border-amber-500 bg-amber-500/10"
                : "border-border bg-secondary/30 hover:border-amber-500/50"
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              !includeImages ? "bg-amber-500 text-white" : "bg-secondary text-muted-foreground"
            }`}>
              <CameraOff className="w-5 h-5" />
            </div>
            <div className="text-right flex-1">
              <p className="font-bold text-foreground">بدون صور</p>
            </div>
          </button>
        </div>
        
        <div className="flex gap-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-border text-muted-foreground hover:bg-secondary"
          >
            إلغاء
          </Button>
          <Button
            onClick={() => {
              onPrint(includeLogo, includeImages)
              onClose()
            }}
            className="flex-1 bg-gradient-to-r from-primary to-gold-dark hover:from-primary/90 hover:to-gold-dark/90 text-primary-foreground font-bold shadow-gold"
          >
            <FileDown className="w-5 h-5 ml-2" />
            طباعة التقرير
          </Button>
        </div>
      </div>
    </div>
  )
}

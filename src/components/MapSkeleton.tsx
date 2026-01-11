export default function MapSkeleton() {
  return (
    <div className="w-full h-full bg-card rounded-xl overflow-hidden relative animate-pulse">
      {/* Map background */}
      <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted/60" />
      
      {/* Fake map grid lines */}
      <div className="absolute inset-0 opacity-10">
        {[...Array(8)].map((_, i) => (
          <div key={`h-${i}`} className="absolute w-full h-px bg-primary/30" style={{ top: `${(i + 1) * 12}%` }} />
        ))}
        {[...Array(6)].map((_, i) => (
          <div key={`v-${i}`} className="absolute h-full w-px bg-primary/30" style={{ left: `${(i + 1) * 15}%` }} />
        ))}
      </div>
      
      {/* Fake markers */}
      <div className="absolute top-[20%] left-[30%] w-6 h-8 bg-primary/20 rounded-full" />
      <div className="absolute top-[45%] left-[55%] w-6 h-8 bg-primary/20 rounded-full" />
      <div className="absolute top-[60%] left-[25%] w-6 h-8 bg-primary/20 rounded-full" />
      <div className="absolute top-[35%] left-[70%] w-6 h-8 bg-primary/20 rounded-full" />
      <div className="absolute top-[70%] left-[60%] w-6 h-8 bg-primary/20 rounded-full" />
      
      {/* Loading indicator in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-card/90 backdrop-blur-sm rounded-2xl px-6 py-4 flex items-center gap-3 shadow-xl border border-border/50">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-right">
            <p className="font-bold text-foreground text-sm">جاري تحميل الخريطة</p>
            <p className="text-xs text-muted-foreground">يرجى الانتظار...</p>
          </div>
        </div>
      </div>
      
      {/* Fake controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <div className="w-9 h-9 bg-muted-foreground/20 rounded-lg" />
        <div className="w-9 h-9 bg-muted-foreground/20 rounded-lg" />
      </div>
      
      {/* Fake zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        <div className="w-8 h-8 bg-muted-foreground/20 rounded-t-lg" />
        <div className="w-8 h-8 bg-muted-foreground/20 rounded-b-lg" />
      </div>
    </div>
  )
}
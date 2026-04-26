interface BillboardCardSkeletonProps {
  isCompact?: boolean
}

export default function BillboardCardSkeleton({ isCompact = false }: BillboardCardSkeletonProps) {
  return (
    <div className={`relative overflow-hidden bg-card border border-border/30 flex flex-col ${isCompact ? 'rounded-xl' : 'rounded-2xl md:rounded-3xl'}`}>
      {/* Shimmer overlay */}
      <div className="absolute inset-0 z-10 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />

      {/* Image Section */}
      <div className={`relative overflow-hidden bg-muted animate-pulse ${isCompact ? 'aspect-[4/3]' : 'aspect-[16/10]'}`}>
        {/* Top gradients */}
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Checkbox skeleton */}
        <div className={`absolute z-20 ${isCompact ? 'top-2 left-2' : 'top-3 left-3'}`}>
          <div className={`rounded-full bg-muted-foreground/20 ${isCompact ? 'w-5 h-5' : 'w-7 h-7'}`} />
        </div>

        {/* Size badge skeleton */}
        <div className={`absolute z-20 ${isCompact ? 'top-2 right-2' : 'top-3 right-3'}`}>
          <div className={`rounded-full bg-primary/20 ${isCompact ? 'h-5 w-14' : 'h-7 w-20'}`} />
        </div>

        {/* Status badge skeleton */}
        <div className={`absolute z-20 ${isCompact ? 'bottom-2 right-2' : 'bottom-3 right-3'}`}>
          <div className={`rounded-full bg-muted-foreground/25 ${isCompact ? 'h-5 w-12' : 'h-8 w-16'}`} />
        </div>
      </div>

      {/* Content Section */}
      <div className={`flex-1 flex flex-col bg-card animate-pulse ${isCompact ? 'p-2 sm:p-3' : 'p-3 sm:p-4 md:p-5'}`}>
        {/* Title skeleton */}
        <div className={`bg-muted-foreground/20 rounded-lg ${isCompact ? 'h-4 w-3/4 mb-1.5' : 'h-5 w-3/4 mb-2 md:mb-3'}`} />
        <div className={`bg-muted-foreground/12 rounded-lg ${isCompact ? 'h-3 w-1/2 mb-2' : 'h-4 w-1/2 mb-3 md:mb-4'}`} />

        {/* Location row skeleton */}
        <div className={`flex items-center border border-border/40 bg-muted/40 ${isCompact ? 'gap-1.5 mb-2 p-1.5 rounded-lg' : 'gap-2 md:gap-3 mb-3 md:mb-4 p-2 md:p-3 rounded-xl'}`}>
          <div className={`rounded-lg bg-primary/15 flex-shrink-0 ${isCompact ? 'w-6 h-6' : 'w-8 h-8 md:w-10 md:h-10 md:rounded-xl'}`} />
          <div className="flex-1 space-y-1">
            <div className={`bg-muted-foreground/20 rounded ${isCompact ? 'h-2.5 w-4/5' : 'h-3 w-4/5'}`} />
            <div className={`bg-muted-foreground/12 rounded ${isCompact ? 'h-2 w-3/5' : 'h-2.5 w-3/5'}`} />
          </div>
        </div>

        {/* Tags skeleton */}
        <div className={`flex flex-wrap items-center mb-auto ${isCompact ? 'gap-1 pb-1.5' : 'gap-1.5 md:gap-2 pb-2 md:pb-3'}`}>
          <div className={`rounded-full bg-amber-500/15 ${isCompact ? 'h-4 w-12' : 'h-6 w-16'}`} />
          <div className={`rounded-full bg-muted-foreground/12 ${isCompact ? 'h-4 w-16' : 'h-6 w-20'}`} />
          <div className={`rounded-full bg-blue-500/12 ${isCompact ? 'h-4 w-10' : 'h-6 w-14'}`} />
        </div>
      </div>

      {/* Action button skeleton */}
      <div className={`border-t border-border/20 animate-pulse`}>
        <div className={`bg-primary/20 w-full ${isCompact ? 'h-8 rounded-b-xl' : 'h-12 md:h-14 rounded-b-2xl md:rounded-b-3xl'}`} />
      </div>
    </div>
  )
}

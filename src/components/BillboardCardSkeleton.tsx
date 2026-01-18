export default function BillboardCardSkeleton() {
  return (
    <div className="relative overflow-hidden bg-card border-0 rounded-2xl animate-pulse">
      {/* Image Section Skeleton */}
      <div className="relative h-56 bg-muted">
        {/* Selection Checkbox Skeleton */}
        <div className="absolute top-4 left-4 z-20">
          <div className="w-7 h-7 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Size Badge Skeleton */}
        <div className="absolute top-4 right-4 z-20">
          <div className="h-8 w-20 rounded-full bg-muted-foreground/20" />
        </div>

        {/* View Image Button Skeleton */}
        <div className="absolute bottom-4 left-4 z-20">
          <div className="h-9 w-20 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Status Badge Skeleton */}
        <div className="absolute bottom-4 right-4 z-20">
          <div className="h-9 w-24 rounded-full bg-muted-foreground/20" />
        </div>
      </div>

      {/* Content Section Skeleton */}
      <div className="p-5">
        {/* Name Skeleton */}
        <div className="h-6 bg-muted-foreground/20 rounded-lg mb-2 w-3/4" />
        <div className="h-4 bg-muted-foreground/15 rounded-lg mb-3 w-1/2" />

        {/* Location Info Skeleton */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-muted-foreground/20 flex-shrink-0" />
          <div className="flex-1">
            <div className="h-4 bg-muted-foreground/20 rounded w-full mb-1" />
          </div>
        </div>

        {/* Tags Row Skeleton */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="h-7 w-16 rounded bg-muted-foreground/15" />
          <div className="h-7 w-20 rounded bg-muted-foreground/15" />
          <div className="h-7 w-14 rounded bg-muted-foreground/15" />
        </div>

        {/* Billboard Type & Faces Skeleton */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="h-7 w-18 rounded bg-muted-foreground/10" />
          <div className="h-7 w-12 rounded bg-muted-foreground/10" />
        </div>
      </div>
      
      {/* Map Button Skeleton */}
      <div className="h-14 bg-muted-foreground/20 rounded-b-2xl" />

      {/* Shimmer Effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  )
}

export default function StatsSectionSkeleton() {
  return (
    <div className="mb-6 animate-pulse">
      {/* Button skeleton */}
      <div className="w-full h-12 bg-muted rounded-lg border border-border/40 flex items-center px-4 gap-3">
        <div className="w-5 h-5 rounded bg-muted-foreground/20" />
        <div className="h-4 w-32 bg-muted-foreground/20 rounded" />
        <div className="h-4 w-40 bg-muted-foreground/15 rounded ml-2" />
      </div>
    </div>
  )
}

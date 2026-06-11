'use client'

type HomeFilteredEmptyProps = {
  onClearFilters: () => void
}

export function HomeFilteredEmpty({ onClearFilters }: HomeFilteredEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center font-mono">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        No tokens match your filters
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        Try widening the market, leverage, or direction.
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="px-4 py-2 text-sm text-primary border border-primary bg-transparent hover:bg-primary/10 transition-colors"
      >
        Clear filters
      </button>
    </div>
  )
}
